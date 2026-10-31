import bcrypt from "../shims/bcrypt.js";
import prisma from "../lib/prisma.js";
import {
  DOCUMENT_KEYS,
  DOCUMENT_KINDS,
  ENTITY_TYPES,
  FIELD_LABELS,
  LEGAL_FORMS,
  REQUIRED_FIELDS,
  missingForSubmit,
} from "../lib/agencyRequirements.js";
import { AGENCY_DATE_FIELDS, AGENCY_TEXT_FIELDS } from "../lib/agency.js";
import { getSettings } from "../lib/settings.js";
import { notifyAdmins, sendEmail } from "../lib/notify.js";
import {
  deleteDocuments,
  publicDocument,
  sendDocument,
  storeDocument,
  validateFile,
} from "../lib/storage.js";
import { EMAIL_RE, dateOrNull, pickWith, str, toId } from "../lib/util.js";
import { startAgencySession } from "../middleware/requireAgency.js";
import { ACTIVE_WHERE } from "../lib/listingLimits.js";
import { attemptKey, clearFailures, isLocked, recordFailure } from "../lib/throttle.js";
import { audit } from "../lib/notify.js";
import { sessionCookie } from "../lib/platform.js";

// Applicants may edit their answers and documents only in these states
export const EDITABLE = ["draft", "info_required"];
export const OPEN = ["draft", "submitted", "under_review", "info_required", "resubmitted"];

const TEXT_FIELDS = [
  ...AGENCY_TEXT_FIELDS, "repFullName", "repNationality", "repIdNumber", "repPhone",
  "repEmail", "repPosition", "qualifiedPersonName", "qualification",
];
const DATE_FIELDS = [...AGENCY_DATE_FIELDS, "repBirthDate"];

// Turns a request body into application columns, or throws a user-facing message
export const applicationDataFrom = (body = {}) => {
  const data = {
    ...pickWith(body, TEXT_FIELDS),
    ...pickWith(body, DATE_FIELDS, dateOrNull),
  };
  if (body.message !== undefined) data.message = str(body.message, 3000);
  if (body.entityType !== undefined) {
    if (!ENTITY_TYPES.includes(body.entityType)) throw new Error("Choose a natural person or a company.");
    data.entityType = body.entityType;
  }
  if (data.legalForm && !LEGAL_FORMS.includes(data.legalForm)) throw new Error("Unknown legal structure.");
  for (const key of ["email", "repEmail"]) {
    if (data[key] && !EMAIL_RE.test(data[key])) throw new Error(`${FIELD_LABELS[key]} isn't a valid email.`);
  }
  if (data.website && !/^https?:\/\//i.test(data.website)) data.website = `https://${data.website}`;
  if (data.logo && !/^(https:\/\/|data:image\/)/i.test(data.logo)) throw new Error("The logo must be an uploaded image.");
  if (data.repBirthDate && data.repBirthDate > new Date()) throw new Error("The date of birth is in the future.");
  if (data.approvalIssueDate && data.approvalExpiryDate && data.approvalExpiryDate <= data.approvalIssueDate) {
    throw new Error("The agrément expiry date must be after its issue date.");
  }
  return data;
};

// What the applicant may see: no internal notes, checklist or reviewer
const forApplicant = (app) => {
  const { checklist, reviewerId, notes, ...rest } = app;
  return {
    ...rest,
    documents: (app.documents || []).map(publicDocument),
    events: (app.events || []).map((e) => ({
      id: e.id,
      type: e.type,
      toStatus: e.toStatus,
      message: e.message,
      createdAt: e.createdAt,
      by: e.actorId === app.applicantId ? "you" : "team",
    })),
    missing: OPEN.includes(app.status) ? missingForSubmit(app, app.documents || []) : [],
  };
};

const withRelations = {
  documents: { orderBy: { createdAt: "asc" } },
  events: { orderBy: { createdAt: "asc" } },
};

const loadOwn = async (req, res) => {
  const id = toId(req.params.id);
  const app = id && (await prisma.agencyApplication.findUnique({ where: { id }, include: withRelations }));
  // Someone else's application looks the same as a missing one
  if (!app || app.applicantId !== req.userId) {
    res.status(404).json({ message: "Application not found." });
    return null;
  }
  return app;
};

export const getRequirements = async (req, res) => {
  const settings = await getSettings();
  res.status(200).json({
    entityTypes: ENTITY_TYPES,
    legalForms: LEGAL_FORMS,
    fieldLabels: FIELD_LABELS,
    requiredFields: REQUIRED_FIELDS,
    documents: DOCUMENT_KINDS,
    acceptApplications: settings.agencies.acceptApplications,
  });
};

export const getMyApplications = async (req, res) => {
  try {
    const apps = await prisma.agencyApplication.findMany({
      where: { applicantId: req.userId },
      include: withRelations,
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(apps.map(forApplicant));
  } catch (err) {
    console.error("Failed to load applications:", err);
    res.status(500).json({ message: "Failed to load your application." });
  }
};

export const createApplication = async (req, res) => {
  const { role, agencyId } = req.user;
  if (role === "admin") {
    return res.status(400).json({ message: "Staff accounts can't apply as an agency." });
  }
  if (agencyId) {
    return res.status(400).json({ message: "Your account already belongs to an agency." });
  }

  let data;
  try {
    data = applicationDataFrom(req.body);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }

  try {
    const open = await prisma.agencyApplication.findFirst({
      where: { applicantId: req.userId, status: { in: OPEN } },
      select: { id: true },
    });
    if (open) {
      return res.status(409).json({ message: "You already have an application in progress.", id: open.id });
    }
    const settings = await getSettings();
    if (!settings.agencies.acceptApplications) {
      return res.status(503).json({ message: "Agency applications are closed for now." });
    }

    const app = await prisma.agencyApplication.create({
      data: {
        ...data,
        applicantId: req.userId,
        status: "draft",
        events: { create: { type: "created", toStatus: "draft", actorId: req.userId } },
      },
      include: withRelations,
    });
    res.status(201).json(forApplicant(app));
  } catch (err) {
    console.error("Failed to create application:", err);
    res.status(500).json({ message: "Couldn't start your application." });
  }
};

// POST /agency/auth/register { username, email, password, ...application fields }
// Registering an agency opens an agency account (never a marketplace one)
// with a draft application, and signs it in on the agency platform. Until the
// agency is approved the account can only follow and edit its application.
export const registerAgency = async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (username.length < 3) return res.status(400).json({ message: "Your name must be at least 3 characters." });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Please enter a valid email." });
  if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters." });

  let data;
  try {
    const { username: _u, password: _p, ...fields } = req.body;
    data = applicationDataFrom(fields);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }

  try {
    const settings = await getSettings();
    if (!settings.agencies.acceptApplications) {
      return res.status(503).json({ message: "Agency applications are closed for now." });
    }
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { email: true, accountType: true, agencyId: true },
    });
    if (existing) {
      const agencySide = existing.accountType === "agency" || existing.agencyId;
      return res.status(409).json({
        message:
          existing.email !== email
            ? "This name is already taken. Try another one."
            : agencySide
            ? "An agency account already uses this email. Sign in to continue your application."
            : "This email belongs to a personal Bayti account. Register your agency with its own email address.",
        login: existing.email === email && Boolean(agencySide),
        // a personal account with this email can be turned into the agency's
        // account instead (POST /agency/auth/convert)
        code: existing.email === email && !agencySide ? "PERSONAL_ACCOUNT" : undefined,
      });
    }

    const hash = await bcrypt.hash(password, 10);
    const { user, app } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { username, email, password: hash, accountType: "agency" } });
      const app = await tx.agencyApplication.create({
        data: {
          ...data,
          email: data.email || email,
          applicantId: user.id,
          status: "draft",
          events: { create: { type: "created", toStatus: "draft", actorId: user.id } },
        },
        include: withRelations,
      });
      return { user, app };
    });

    if (settings.notifications.newUser) {
      await notifyAdmins({
        type: "user_registered",
        title: `New account: ${username}`,
        body: `${email} · agency account, application started`,
        link: `/users/${user.id}`,
      });
    }
    await startAgencySession(res, user);
    res.status(201).json({
      user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, applicant: true, agency: null, permissions: [] },
      application: forApplicant(app),
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "An account already uses this email or name. Log in to continue." });
    }
    console.error("Failed to register agency applicant:", err);
    res.status(500).json({ message: "We couldn't create your account. Please try again." });
  }
};

export const updateApplication = async (req, res) => {
  const app = await loadOwn(req, res);
  if (!app) return;
  if (!EDITABLE.includes(app.status)) {
    return res.status(409).json({ message: "This application is with our team and can't be edited right now." });
  }

  let data;
  try {
    data = applicationDataFrom(req.body);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }

  try {
    const updated = await prisma.agencyApplication.update({
      where: { id: app.id },
      data,
      include: withRelations,
    });
    res.status(200).json(forApplicant(updated));
  } catch (err) {
    console.error("Failed to save application:", err);
    res.status(500).json({ message: "Couldn't save your answers." });
  }
};

// POST multipart: field "kind" + one or more "files"
export const uploadApplicationDocuments = async (req, res) => {
  const app = await loadOwn(req, res);
  if (!app) return;
  if (!EDITABLE.includes(app.status)) {
    return res.status(409).json({ message: "Documents can't be changed while the application is being reviewed." });
  }
  const kind = req.body?.kind;
  if (!DOCUMENT_KEYS.includes(kind)) return res.status(400).json({ message: "Choose which document this is." });
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ message: "Choose a file to upload." });
  const invalid = files.map(validateFile).find(Boolean);
  if (invalid) return res.status(400).json({ message: invalid });

  try {
    for (const file of files) {
      await storeDocument(file, { kind, applicationId: app.id, uploadedById: req.userId });
    }
    await prisma.applicationEvent.create({
      data: {
        applicationId: app.id,
        type: "documents_uploaded",
        message: `${files.length} file${files.length > 1 ? "s" : ""}: ${DOCUMENT_KINDS.find((d) => d.key === kind).label}`,
        actorId: req.userId,
      },
    });
    // Additional documents for an application the team is waiting on
    if (app.status === "info_required") {
      await notifyAdmins({
        type: "application_documents",
        title: `New documents for ${app.tradeName || "an agency application"}`,
        body: `${files.length} file(s) uploaded: ${DOCUMENT_KINDS.find((d) => d.key === kind).label}.`,
        link: `/applications/${app.id}`,
      });
    }
    const fresh = await prisma.agencyApplication.findUnique({ where: { id: app.id }, include: withRelations });
    res.status(201).json(forApplicant(fresh));
  } catch (err) {
    console.error("Failed to store documents:", err);
    res.status(500).json({ message: "The upload failed. Please try again." });
  }
};

export const deleteApplicationDocument = async (req, res) => {
  const app = await loadOwn(req, res);
  if (!app) return;
  const docId = toId(req.params.docId);
  const doc = app.documents.find((d) => d.id === docId);
  if (!doc) return res.status(404).json({ message: "Document not found." });
  // Once submitted, documents stay on file; while more information is
  // requested only the new uploads can be withdrawn.
  const lastRequest = [...app.events].reverse().find((e) => e.toStatus === "info_required");
  const removable =
    app.status === "draft" ||
    (app.status === "info_required" && lastRequest && doc.createdAt > lastRequest.createdAt);
  if (!removable) {
    return res.status(409).json({ message: "Documents already sent to our team can't be removed." });
  }
  try {
    await deleteDocuments({ id: doc.id });
    const fresh = await prisma.agencyApplication.findUnique({ where: { id: app.id }, include: withRelations });
    res.status(200).json(forApplicant(fresh));
  } catch (err) {
    console.error("Failed to delete document:", err);
    res.status(500).json({ message: "Couldn't remove the document." });
  }
};

export const downloadApplicationDocument = async (req, res) => {
  const app = await loadOwn(req, res);
  if (!app) return;
  const doc = app.documents.find((d) => d.id === toId(req.params.docId));
  if (!doc) return res.status(404).json({ message: "Document not found." });
  sendDocument(res, doc, { download: req.query.download === "1" });
};

export const submitApplication = async (req, res) => {
  const app = await loadOwn(req, res);
  if (!app) return;
  if (!EDITABLE.includes(app.status)) {
    return res.status(409).json({ message: "This application has already been sent." });
  }
  const missing = missingForSubmit(app, app.documents);
  if (missing.length) {
    return res.status(400).json({ message: "Some required information is missing.", missing });
  }

  const resubmitting = app.status === "info_required";
  const settings = await getSettings();
  if (!resubmitting && !settings.agencies.acceptApplications) {
    return res.status(503).json({ message: "Agency applications are closed for now." });
  }
  const toStatus = resubmitting ? "resubmitted" : "submitted";
  const message = str(req.body?.message, 2000);

  try {
    const updated = await prisma.agencyApplication.update({
      where: { id: app.id },
      data: {
        status: toStatus,
        submittedAt: app.submittedAt || new Date(),
        events: {
          create: { type: "status", fromStatus: app.status, toStatus, message, actorId: req.userId },
        },
      },
      include: withRelations,
    });

    const name = app.tradeName || app.legalName;
    await notifyAdmins({
      type: resubmitting ? "application_resubmitted" : "application_submitted",
      title: resubmitting ? `${name} resubmitted their application` : `New agency application: ${name}`,
      body: `${app.wilaya || ""}${app.approvalNumber ? ` · Agrément ${app.approvalNumber}` : ""}`.trim() || null,
      link: `/applications/${app.id}`,
    });
    if (!resubmitting) {
      sendEmail({
        to: settings.notifications.adminEmails,
        subject: `New agency application: ${name}`,
        text: `${name} applied to become a verified agency. Review it in the admin dashboard${
          process.env.ADMIN_URL ? `: ${process.env.ADMIN_URL}/applications/${app.id}` : "."
        }`,
      });
    }
    res.status(200).json(forApplicant(updated));
  } catch (err) {
    console.error("Failed to submit application:", err);
    res.status(500).json({ message: "Couldn't send your application." });
  }
};

// POST /agency/auth/convert { email, password, tradeName }
// For someone who signed up on the marketplace by mistake: their personal
// account becomes the agency's account (no second account), after proving
// it's theirs with its password. From then on it signs in on the agency
// platform only, and its marketplace sessions stop working. Personal listings
// still on the market must be archived first: an agency account can't manage
// them, and on approval they join the agency.
export const convertToAgency = async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const tradeName = str(req.body?.tradeName);
  const key = attemptKey(req, email);
  if (isLocked(key)) return res.status(429).json({ message: "Too many attempts. Try again in 15 minutes." });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      recordFailure(key);
      return res.status(401).json({ message: "That password doesn't match this personal account." });
    }
    clearFailures(key);
    if (user.status !== "active") return res.status(403).json({ message: "This account is suspended. Contact Bayti support." });
    if (user.role === "admin") return res.status(403).json({ message: "Bayti staff accounts can't become agency accounts." });
    if (user.accountType === "agency" || user.agencyId) {
      return res.status(409).json({ message: "This is already an agency account. Sign in instead.", login: true });
    }
    const active = await prisma.post.count({ where: { userId: user.id, agencyId: null, ...ACTIVE_WHERE } });
    if (active) {
      return res.status(409).json({
        message: `This account has ${active} property listing${active > 1 ? "s" : ""} on the marketplace. Archive ${
          active > 1 ? "them" : "it"
        } from your profile first, or register your agency with another email.`,
        code: "ACTIVE_LISTINGS",
      });
    }
    const settings = await getSettings();
    if (!settings.agencies.acceptApplications) {
      return res.status(503).json({ message: "Agency applications are closed for now." });
    }

    const application = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { accountType: "agency" } });
      // an application started earlier on the marketplace carries on
      const open = await tx.agencyApplication.findFirst({
        where: { applicantId: user.id, status: { in: OPEN } },
        include: withRelations,
      });
      if (open) return open;
      return tx.agencyApplication.create({
        data: {
          tradeName,
          email,
          applicantId: user.id,
          status: "draft",
          events: { create: { type: "created", toStatus: "draft", actorId: user.id, message: "From an existing personal account" } },
        },
        include: withRelations,
      });
    });
    req.userId = user.id;
    await audit(req, {
      action: "user.convert_agency",
      entityType: "user",
      entityId: user.id,
      summary: `${user.username} turned their personal account into an agency account`,
    });
    // the marketplace session in this browser, if any, is closed too
    res.clearCookie("token", sessionCookie());
    await startAgencySession(res, user);
    res.status(200).json({
      user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, applicant: true, agency: null, permissions: [] },
      application: forApplicant(application),
    });
  } catch (err) {
    console.error("Failed to convert account:", err);
    res.status(500).json({ message: "We couldn't change your account. Please try again." });
  }
};
