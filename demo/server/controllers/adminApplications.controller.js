import { agencyAppLink } from "../lib/agency.js";
import prisma from "../lib/prisma.js";
import { agencyFromApplication } from "../lib/agency.js";
import { CHECKLIST, DOCUMENT_KEYS, DOCUMENT_KINDS, FIELD_LABELS, missingForSubmit, requirementsFor } from "../lib/agencyRequirements.js";
import { applicationDataFrom } from "./application.controller.js";
import { audit, notifyUser } from "../lib/notify.js";
import { getSettings } from "../lib/settings.js";
import { publicDocument, storeDocument, validateFile } from "../lib/storage.js";
import { str, toId } from "../lib/util.js";

const STATUSES = ["draft", "submitted", "under_review", "info_required", "resubmitted", "approved", "rejected"];

// Which decisions the team can take from each status
const ACTIONS = {
  start_review: { from: ["submitted", "resubmitted"], to: "under_review" },
  request_info: { from: ["submitted", "under_review", "resubmitted"], to: "info_required", needsMessage: true },
  approve: { from: ["submitted", "under_review", "resubmitted"], to: "approved" },
  reject: { from: ["submitted", "under_review", "resubmitted", "info_required"], to: "rejected", needsMessage: true },
};

// What the applicant is told, in-platform and by email
const APPLICANT_MESSAGES = {
  under_review: (n) => [`We're reviewing ${n}`, "Our team has started checking your application and documents."],
  info_required: (n, m) => [`${n}: more information needed`, `Our team needs more from you before deciding:\n\n${m}\n\nOpen your application to update it and upload documents.`],
  approved: (n, m) => [`${n} is now a verified agency on Bayti`, `Your application was approved. Your account is now the agency's main account.${m ? `\n\n${m}` : ""}`],
  rejected: (n, m) => [`Your agency application for ${n} was not approved`, `Reason: ${m}\n\nYou can submit a new application once the issue is resolved.`],
};

export const listApplications = async (req, res) => {
  const status = req.query.status || "open";
  const where =
    status === "open" ? { status: { in: ["submitted", "under_review", "info_required", "resubmitted"] } }
    : status === "all" ? { status: { not: "draft" } }
    : STATUSES.includes(status) ? { status }
    : null;
  if (!where) return res.status(400).json({ message: "Invalid status" });

  try {
    const [applications, counts] = await Promise.all([
      prisma.agencyApplication.findMany({
        where,
        select: {
          id: true, status: true, entityType: true, tradeName: true, legalName: true, wilaya: true,
          approvalNumber: true, submittedAt: true, updatedAt: true, createdAt: true,
          applicant: { select: { id: true, username: true, email: true, avatar: true } },
          _count: { select: { documents: true } },
        },
        // oldest waiting first
        orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
      }),
      prisma.agencyApplication.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
    res.status(200).json({
      applications,
      counts: Object.fromEntries(STATUSES.map((s) => [s, counts.find((c) => c.status === s)?._count._all || 0])),
    });
  } catch (err) {
    console.error("Failed to list applications:", err);
    res.status(500).json({ message: "Failed to load applications." });
  }
};

const fullInclude = {
  applicant: {
    select: {
      id: true, username: true, email: true, avatar: true, role: true, status: true,
      agencyId: true, createdAt: true, lastLoginAt: true,
    },
  },
  agency: { select: { id: true, tradeName: true, status: true } },
  documents: { orderBy: { createdAt: "asc" } },
  events: { include: { actor: { select: { id: true, username: true, role: true } } }, orderBy: { createdAt: "asc" } },
  notes: { include: { author: { select: { id: true, username: true } } }, orderBy: { createdAt: "desc" } },
};

const present = (app) => ({
  ...app,
  documents: app.documents.map(publicDocument),
  requirements: requirementsFor(app.entityType),
  checklistItems: CHECKLIST.filter((c) => !c.appliesTo || c.appliesTo.includes(app.entityType)),
  fieldLabels: FIELD_LABELS,
  missing: missingForSubmit(app, app.documents),
  actions: Object.entries(ACTIONS).filter(([, a]) => a.from.includes(app.status)).map(([k]) => k),
  // Possible duplicates: same RC, NIF or agrément already on file
  duplicates: [],
});

export const getApplication = async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid application ID" });
  try {
    const app = await prisma.agencyApplication.findUnique({ where: { id }, include: fullInclude });
    if (!app) return res.status(404).json({ message: "Application not found." });
    const out = present(app);

    const same = [
      app.rcNumber && { rcNumber: app.rcNumber },
      app.nif && { nif: app.nif },
      app.approvalNumber && { approvalNumber: app.approvalNumber },
    ].filter(Boolean);
    if (same.length) {
      const [agencies, others] = await Promise.all([
        prisma.agency.findMany({ where: { OR: same, id: app.agencyId ? { not: app.agencyId } : undefined }, select: { id: true, tradeName: true, rcNumber: true, nif: true, approvalNumber: true } }),
        prisma.agencyApplication.findMany({ where: { OR: same, id: { not: id }, status: { not: "draft" } }, select: { id: true, tradeName: true, status: true } }),
      ]);
      out.duplicates = [
        ...agencies.map((a) => ({ kind: "agency", id: a.id, name: a.tradeName })),
        ...others.map((a) => ({ kind: "application", id: a.id, name: a.tradeName, status: a.status })),
      ];
    }
    res.status(200).json(out);
  } catch (err) {
    console.error("Failed to load application:", err);
    res.status(500).json({ message: "Failed to load the application." });
  }
};

// POST /admin/applications/:id/decision { action, message }
export const decideApplication = async (req, res) => {
  const id = toId(req.params.id);
  const { action } = req.body || {};
  const message = str(req.body?.message, 3000);
  const rule = ACTIONS[action];
  if (!id) return res.status(400).json({ message: "Invalid application ID" });
  if (!rule) return res.status(400).json({ message: "Unknown action." });
  if (rule.needsMessage && !message) {
    return res.status(400).json({
      message: action === "reject" ? "Tell the applicant why it was rejected." : "Tell the applicant what you need.",
    });
  }

  try {
    const app = await prisma.agencyApplication.findUnique({
      where: { id },
      include: { applicant: { select: { id: true, email: true, role: true, agencyId: true, username: true } } },
    });
    if (!app) return res.status(404).json({ message: "Application not found." });
    if (!rule.from.includes(app.status)) {
      return res.status(409).json({ message: "This application has moved on. Refresh to see its current status." });
    }
    if (action === "approve") {
      if (app.applicant.role === "admin") return res.status(400).json({ message: "Staff accounts can't become agencies." });
      if (app.applicant.agencyId && app.applicant.agencyId !== app.agencyId) {
        return res.status(400).json({ message: "The applicant has since joined another agency. Remove them from it first." });
      }
    }

    let agency = null;
    await prisma.$transaction(async (tx) => {
      await tx.agencyApplication.update({
        where: { id },
        data: {
          status: rule.to,
          reviewedAt: new Date(),
          reviewerId: req.admin.id,
          ...(action === "request_info" ? { requestMessage: message } : {}),
          ...(["approve", "reject"].includes(action) ? { decisionNote: message } : {}),
          events: {
            create: { type: "status", fromStatus: app.status, toStatus: rule.to, message, actorId: req.admin.id },
          },
        },
      });
      if (action === "approve") agency = await agencyFromApplication(tx, app);
    });

    const name = app.tradeName || app.legalName || "your agency";
    const [title, body] = APPLICANT_MESSAGES[rule.to](name, message);
    const settings = await getSettings();
    const recipients = [...new Set([app.applicant.email, app.email].filter(Boolean))];
    await notifyUser(
      app.applicantId,
      { type: `application_${rule.to}`, title, body, link: agencyAppLink(rule.to === "approved" ? "/" : "/application") },
      settings.notifications.emailApplicants ? { to: recipients } : null
    );
    await audit(req, {
      action: `application.${action}`,
      entityType: "application",
      entityId: id,
      summary: `${name}: ${app.status} → ${rule.to}`,
      details: { message, agencyId: agency?.id },
    });

    const fresh = await prisma.agencyApplication.findUnique({ where: { id }, include: fullInclude });
    res.status(200).json(present(fresh));
  } catch (err) {
    console.error("Failed to decide application:", err);
    res.status(500).json({ message: "Couldn't record the decision." });
  }
};

export const addApplicationNote = async (req, res) => {
  const id = toId(req.params.id);
  const body = str(req.body?.body, 5000);
  if (!id) return res.status(400).json({ message: "Invalid application ID" });
  if (!body) return res.status(400).json({ message: "Write a note first." });
  try {
    const note = await prisma.applicationNote.create({
      data: { applicationId: id, authorId: req.admin.id, body },
      include: { author: { select: { id: true, username: true } } },
    });
    res.status(201).json(note);
  } catch (err) {
    if (err.code === "P2003") return res.status(404).json({ message: "Application not found." });
    console.error("Failed to add note:", err);
    res.status(500).json({ message: "Couldn't save the note." });
  }
};

// PUT /admin/applications/:id/checklist { key, checked }
export const updateChecklist = async (req, res) => {
  const id = toId(req.params.id);
  const { key } = req.body || {};
  if (!CHECKLIST.some((c) => c.key === key)) return res.status(400).json({ message: "Unknown checklist item." });
  try {
    const app = id && (await prisma.agencyApplication.findUnique({ where: { id }, select: { checklist: true, tradeName: true } }));
    if (!app) return res.status(404).json({ message: "Application not found." });
    const checklist = { ...(app.checklist || {}) };
    if (req.body.checked) {
      checklist[key] = { by: req.admin.username, at: new Date().toISOString() };
    } else {
      delete checklist[key];
    }
    await prisma.agencyApplication.update({ where: { id }, data: { checklist } });
    await audit(req, {
      action: "application.checklist",
      entityType: "application",
      entityId: id,
      summary: `${req.body.checked ? "Checked" : "Unchecked"} "${CHECKLIST.find((c) => c.key === key).label}"`,
    });
    res.status(200).json(checklist);
  } catch (err) {
    console.error("Failed to update checklist:", err);
    res.status(500).json({ message: "Couldn't update the checklist." });
  }
};

// ---------- the team completes an application ----------
// Applicants often send paperwork by email or phone: the team can correct
// the answers and file documents on their behalf. Each change is recorded in
// the application's history (seen by the applicant) and in the audit log.

const loadForTeam = async (req, res) => {
  const id = toId(req.params.id);
  const app = id && (await prisma.agencyApplication.findUnique({ where: { id }, include: fullInclude }));
  if (!app) {
    res.status(404).json({ message: "Application not found." });
    return null;
  }
  // An approved application became the agency: edit the agency instead
  if (app.status === "approved") {
    res.status(409).json({ message: "This application was approved. Edit the agency's record instead." });
    return null;
  }
  return app;
};

const sameValue = (a, b) =>
  (a instanceof Date ? a.toISOString().slice(0, 10) : a ?? null) === (b instanceof Date ? b.toISOString().slice(0, 10) : b ?? null);

// PUT /admin/applications/:id { ...application fields }
export const updateApplicationAdmin = async (req, res) => {
  const app = await loadForTeam(req, res);
  if (!app) return;
  let data;
  try {
    data = applicationDataFrom(req.body);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
  const changed = Object.keys(data).filter((k) => !sameValue(app[k], data[k]));
  if (!changed.length) return res.status(200).json(present(app));

  try {
    const labels = changed.map((k) => FIELD_LABELS[k] || k);
    const updated = await prisma.agencyApplication.update({
      where: { id: app.id },
      data: {
        ...data,
        events: {
          create: { type: "edited", message: `Updated by the Bayti team: ${labels.join(", ")}`, actorId: req.admin.id },
        },
      },
      include: fullInclude,
    });
    await audit(req, {
      action: "application.update",
      entityType: "application",
      entityId: app.id,
      summary: `Edited application ${app.tradeName || `#${app.id}`}: ${labels.join(", ")}`,
      details: Object.fromEntries(changed.map((k) => [k, { from: app[k], to: data[k] }])),
    });
    res.status(200).json(present(updated));
  } catch (err) {
    console.error("Failed to edit application:", err);
    res.status(500).json({ message: "Couldn't save the application." });
  }
};

// POST /admin/applications/:id/documents (multipart: kind, files)
export const uploadApplicationDocumentsAdmin = async (req, res) => {
  const app = await loadForTeam(req, res);
  if (!app) return;
  const kind = req.body?.kind;
  if (!DOCUMENT_KEYS.includes(kind)) return res.status(400).json({ message: "Choose which document this is." });
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ message: "Choose a file to upload." });
  const invalid = files.map(validateFile).find(Boolean);
  if (invalid) return res.status(400).json({ message: invalid });

  try {
    for (const file of files) await storeDocument(file, { kind, applicationId: app.id, uploadedById: req.admin.id });
    const label = DOCUMENT_KINDS.find((d) => d.key === kind).label;
    await prisma.applicationEvent.create({
      data: {
        applicationId: app.id,
        type: "documents_uploaded",
        message: `Filed by the Bayti team: ${files.length} file${files.length > 1 ? "s" : ""}, ${label}`,
        actorId: req.admin.id,
      },
    });
    await audit(req, {
      action: "document.upload",
      entityType: "application",
      entityId: app.id,
      summary: `Uploaded ${files.length} document(s) (${label}) to application ${app.tradeName || `#${app.id}`}`,
    });
    const fresh = await prisma.agencyApplication.findUnique({ where: { id: app.id }, include: fullInclude });
    res.status(201).json(present(fresh));
  } catch (err) {
    console.error("Failed to upload application documents:", err);
    res.status(500).json({ message: "The upload failed." });
  }
};
