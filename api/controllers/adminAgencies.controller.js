import prisma from "../lib/prisma.js";
import {
  agencyAppLink,
  agencyDataFrom,
  attachMember,
  detachMember,
  isAgencyVerified,
  personalListingsBlockJoin,
} from "../lib/agency.js";
import { DOCUMENT_KEYS } from "../lib/agencyRequirements.js";
import { audit, notifyUser } from "../lib/notify.js";
import { publicDocument, storeDocument, validateFile } from "../lib/storage.js";
import { EMAIL_RE, str, toId } from "../lib/util.js";

const memberSelect = {
  id: true, username: true, email: true, avatar: true, phone: true, role: true,
  agencyRole: true, agencyActive: true, status: true, createdAt: true, lastLoginAt: true,
  _count: { select: { posts: true } },
};

export const listAgencies = async (req, res) => {
  try {
    const agencies = await prisma.agency.findMany({
      include: {
        owner: { select: { id: true, username: true, email: true, avatar: true } },
        _count: { select: { members: true, posts: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const live = await prisma.post.groupBy({
      by: ["agencyId"],
      where: { agencyId: { not: null }, status: "approved" },
      _count: { _all: true },
    });
    const liveBy = Object.fromEntries(live.map((r) => [r.agencyId, r._count._all]));
    res.status(200).json(agencies.map((a) => ({ ...a, liveListings: liveBy[a.id] || 0 })));
  } catch (err) {
    console.error("Failed to list agencies:", err);
    res.status(500).json({ message: "Failed to load agencies." });
  }
};

export const getAgency = async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid agency ID" });
  try {
    const agency = await prisma.agency.findUnique({
      where: { id },
      include: {
        owner: { select: memberSelect },
        members: { select: memberSelect, orderBy: { createdAt: "asc" } },
        posts: {
          select: {
            id: true, title: true, price: true, type: true, city: true, images: true,
            status: true, availability: true, featured: true, createdAt: true,
            user: { select: { id: true, username: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        applications: {
          select: {
            id: true, status: true, submittedAt: true, reviewedAt: true, createdAt: true,
            events: { select: { id: true, type: true, fromStatus: true, toStatus: true, message: true, createdAt: true }, orderBy: { createdAt: "asc" } },
          },
          orderBy: { createdAt: "desc" },
        },
        documents: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!agency) return res.status(404).json({ message: "Agency not found." });
    const history = await prisma.auditLog.findMany({
      where: { entityType: "agency", entityId: id },
      include: { actor: { select: { id: true, username: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.status(200).json({ ...agency, documents: agency.documents.map(publicDocument), history });
  } catch (err) {
    console.error("Failed to load agency:", err);
    res.status(500).json({ message: "Failed to load the agency." });
  }
};

// POST /admin/agencies { ...agency fields, ownerId } — for an existing account.
// (Creating a brand-new owner account goes through POST /admin/users.)
export const createAgency = async (req, res) => {
  const data = agencyDataFrom(req.body);
  const ownerId = toId(req.body?.ownerId);
  if (!data.tradeName || !data.legalName) {
    return res.status(400).json({ message: "An agency needs its commercial and legal names." });
  }
  if (data.email && !EMAIL_RE.test(data.email)) return res.status(400).json({ message: "Enter a valid email." });
  if (!ownerId) return res.status(400).json({ message: "Choose the account that will own the agency." });

  try {
    const owner = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) return res.status(400).json({ message: "That account doesn't exist." });
    if (owner.role === "admin") return res.status(400).json({ message: "Staff accounts can't own an agency." });
    if (owner.agencyId) return res.status(400).json({ message: "That account already belongs to an agency." });

    const verified = Boolean(req.body?.verified);
    const agency = await prisma.$transaction(async (tx) => {
      const a = await tx.agency.create({
        data: { ...data, ownerId, verification: verified ? "verified" : "pending", verifiedAt: verified ? new Date() : null },
      });
      await attachMember(tx, ownerId, a.id, "owner");
      return a;
    });
    await audit(req, {
      action: "agency.create",
      entityType: "agency",
      entityId: agency.id,
      summary: `Created agency ${agency.tradeName} owned by ${owner.username}`,
    });
    await notifyUser(ownerId, {
      type: "agency_created",
      title: `${agency.tradeName} is set up on Bayti`,
      body: "Your account is now the agency's main account.",
      link: agencyAppLink("/"),
    });
    res.status(201).json(agency);
  } catch (err) {
    console.error("Failed to create agency:", err);
    res.status(500).json({ message: "Couldn't create the agency." });
  }
};

export const updateAgency = async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid agency ID" });
  const data = agencyDataFrom(req.body);
  if (data.tradeName === null || data.legalName === null) {
    return res.status(400).json({ message: "The agency names can't be empty." });
  }
  if (data.email && !EMAIL_RE.test(data.email)) return res.status(400).json({ message: "Enter a valid email." });

  try {
    const before = await prisma.agency.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ message: "Agency not found." });
    const agency = await prisma.agency.update({ where: { id }, data });
    const changed = Object.keys(data).filter(
      (k) => String(before[k] ?? "") !== String(data[k] ?? "")
    );
    if (changed.length) {
      await audit(req, {
        action: "agency.update",
        entityType: "agency",
        entityId: id,
        summary: `Edited ${agency.tradeName}: ${changed.join(", ")}`,
        details: Object.fromEntries(changed.map((k) => [k, { from: before[k], to: data[k] }])),
      });
    }
    res.status(200).json(agency);
  } catch (err) {
    console.error("Failed to update agency:", err);
    res.status(500).json({ message: "Couldn't save the agency." });
  }
};

// PUT /admin/agencies/:id/status { status: active|suspended, reason }
export const setAgencyStatus = async (req, res) => {
  const id = toId(req.params.id);
  const { status } = req.body || {};
  const reason = str(req.body?.reason, 1000);
  if (!id) return res.status(400).json({ message: "Invalid agency ID" });
  if (!["active", "suspended"].includes(status)) return res.status(400).json({ message: "Unknown status." });
  if (status === "suspended" && !reason) return res.status(400).json({ message: "Give a reason for the suspension." });

  try {
    const agency = await prisma.agency.findUnique({ where: { id } });
    if (!agency) return res.status(404).json({ message: "Agency not found." });
    if (status === "active" && !agency.ownerId) {
      return res.status(400).json({ message: "Give the agency an owner before reactivating it." });
    }
    const updated = await prisma.agency.update({
      where: { id },
      data: { status, statusReason: status === "active" ? null : reason },
    });
    await audit(req, {
      action: status === "active" ? "agency.reactivate" : "agency.suspend",
      entityType: "agency",
      entityId: id,
      summary: `${agency.tradeName} ${status === "active" ? "reactivated" : `suspended: ${reason}`}`,
    });
    if (agency.ownerId) {
      await notifyUser(
        agency.ownerId,
        {
          type: status === "active" ? "agency_reactivated" : "agency_suspended",
          title: status === "active" ? `${agency.tradeName} is active again` : `${agency.tradeName} has been suspended`,
          body: status === "active" ? "Your listings are visible again." : `Your listings are hidden until this is resolved. Reason: ${reason}`,
          link: agencyAppLink("/"),
        },
        { to: agency.email }
      );
    }
    res.status(200).json(updated);
  } catch (err) {
    console.error("Failed to change agency status:", err);
    res.status(500).json({ message: "Couldn't change the agency status." });
  }
};

// PUT /admin/agencies/:id/verify { verification: verified|revoked, reason }
// (or the older { verified: bool }). Revoking needs a reason; it is kept on
// the agency and in its history, and the badge disappears everywhere at once.
export const setAgencyVerified = async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid agency ID" });
  const verification =
    req.body?.verification ?? (req.body?.verified === undefined ? null : req.body.verified ? "verified" : "revoked");
  if (!["verified", "revoked"].includes(verification)) return res.status(400).json({ message: "Unknown verification." });
  const reason = str(req.body?.reason, 1000);
  if (verification === "revoked" && !reason) return res.status(400).json({ message: "Give a reason for revoking the verification." });

  try {
    const before = await prisma.agency.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ message: "Agency not found." });
    const agency = await prisma.agency.update({
      where: { id },
      data:
        verification === "verified"
          ? { verification, verificationNote: reason, verifiedAt: new Date() }
          : { verification, verificationNote: reason },
    });
    await audit(req, {
      action: verification === "verified" ? "agency.verify" : "agency.revoke",
      entityType: "agency",
      entityId: id,
      summary: `${agency.tradeName} ${verification === "verified" ? "verified" : `verification revoked: ${reason}`}`,
      details: { from: before.verification, to: verification, reason },
    });
    if (agency.ownerId && before.verification !== verification) {
      await notifyUser(
        agency.ownerId,
        verification === "verified"
          ? { type: "agency_verified", title: `${agency.tradeName} is verified on Bayti`, body: "Your listings show the verified badge.", link: agencyAppLink("/") }
          : {
              type: "agency_verification_revoked",
              title: `${agency.tradeName}'s verification was revoked`,
              body: `Your listings stay online without the verified badge. Reason: ${reason}`,
              link: agencyAppLink("/settings"),
            },
        { to: agency.email }
      );
    }
    res.status(200).json({ ...agency, badge: isAgencyVerified(agency) });
  } catch (err) {
    console.error("Failed to verify agency:", err);
    res.status(500).json({ message: "Couldn't change the verification." });
  }
};

// POST /admin/agencies/:id/members { userId | email, agencyRole }
export const addAgencyMember = async (req, res) => {
  const id = toId(req.params.id);
  const agency = id && (await prisma.agency.findUnique({ where: { id } }));
  if (!agency) return res.status(404).json({ message: "Agency not found." });
  const agencyRole = req.body?.agencyRole === "manager" ? "manager" : "agent";
  const userId = toId(req.body?.userId);
  const email = String(req.body?.email || "").trim().toLowerCase();

  try {
    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "No account found." });
    if (user.role === "admin") return res.status(400).json({ message: "Staff accounts can't join an agency." });
    if (user.agencyId === id) return res.status(409).json({ message: "Already a member of this agency." });
    if (user.agencyRole === "owner") return res.status(409).json({ message: "That person owns another agency." });
    const blocked = await personalListingsBlockJoin(prisma, user.id);
    if (blocked) return res.status(409).json({ message: blocked });
    await prisma.$transaction(async (tx) => {
      if (user.agencyId) await detachMember(tx, user.id);
      await attachMember(tx, user.id, id, agencyRole);
    });
    await audit(req, {
      action: "agency.member_add",
      entityType: "agency",
      entityId: id,
      summary: `Added ${user.username} to ${agency.tradeName} as ${agencyRole}`,
      details: { userId: user.id },
    });
    await notifyUser(user.id, {
      type: "agency_joined",
      title: `You joined ${agency.tradeName}`,
      body: `Bayti added you as ${agencyRole === "manager" ? "a manager" : "an agent"}.`,
      link: agencyAppLink("/"),
    });
    res.status(201).json(await prisma.user.findUnique({ where: { id: user.id }, select: memberSelect }));
  } catch (err) {
    console.error("Failed to add member:", err);
    res.status(500).json({ message: "Couldn't add the member." });
  }
};

// PUT /admin/agencies/:id/members/:userId { agencyRole?: owner|manager|agent, active?: bool }
// Making someone the owner transfers ownership; the old owner becomes a manager.
// `active` switches the member's access to the agency platform on or off.
export const updateAgencyMember = async (req, res) => {
  const id = toId(req.params.id);
  const userId = toId(req.params.userId);
  const agencyRole = req.body?.agencyRole;
  const active = req.body?.active;
  if (agencyRole === undefined && typeof active !== "boolean") return res.status(400).json({ message: "Nothing to change." });
  if (agencyRole !== undefined && !["owner", "manager", "agent"].includes(agencyRole)) return res.status(400).json({ message: "Unknown role." });

  try {
    const agency = id && (await prisma.agency.findUnique({ where: { id } }));
    const member = userId && (await prisma.user.findUnique({ where: { id: userId } }));
    if (!agency || !member || member.agencyId !== id) return res.status(404).json({ message: "Member not found." });

    if (agencyRole === undefined) {
      if (member.agencyRole === "owner" && !active) {
        return res.status(400).json({ message: "Suspend the agency or transfer ownership instead." });
      }
      await prisma.user.update({ where: { id: userId }, data: { agencyActive: active } });
      await audit(req, {
        action: "agency.member_update",
        entityType: "agency",
        entityId: id,
        summary: `Bayti ${active ? "reactivated" : "deactivated"} ${member.username}`,
        details: { userId, agencyActive: active },
      });
      return res.status(200).json({ ok: true });
    }
    if (member.agencyRole === "owner" && agencyRole !== "owner") {
      return res.status(400).json({ message: "Make another member the owner instead." });
    }

    await prisma.$transaction(async (tx) => {
      if (agencyRole === "owner") {
        if (agency.ownerId && agency.ownerId !== userId) {
          await tx.user.update({ where: { id: agency.ownerId }, data: { agencyRole: "manager" } });
        }
        await tx.agency.update({ where: { id }, data: { ownerId: userId } });
        await tx.user.update({ where: { id: userId }, data: { agencyRole: "owner" } });
      } else {
        await tx.user.update({ where: { id: userId }, data: { agencyRole } });
      }
    });
    await audit(req, {
      action: agencyRole === "owner" ? "agency.transfer" : "agency.member_role",
      entityType: "agency",
      entityId: id,
      summary: agencyRole === "owner"
        ? `Transferred ${agency.tradeName} to ${member.username}`
        : `${member.username} is now ${agencyRole}`,
      details: { userId },
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Failed to update member:", err);
    res.status(500).json({ message: "Couldn't change the member's role." });
  }
};

export const removeAgencyMember = async (req, res) => {
  const id = toId(req.params.id);
  const userId = toId(req.params.userId);
  try {
    const member = userId && (await prisma.user.findUnique({ where: { id: userId } }));
    if (!member || member.agencyId !== id) return res.status(404).json({ message: "Member not found." });
    if (member.agencyRole === "owner") {
      return res.status(400).json({ message: "Transfer ownership before removing the owner." });
    }
    const moved = await prisma.$transaction((tx) => detachMember(tx, userId, { reassignTo: toId(req.body?.reassignTo) }));
    await audit(req, {
      action: "agency.member_remove",
      entityType: "agency",
      entityId: id,
      summary:
        `Bayti removed ${member.username} from the agency` +
        (moved.reassigned ? `; ${moved.reassigned} listing(s) reassigned` : "") +
        (moved.unassigned ? `; ${moved.unassigned} listing(s) left unassigned` : ""),
      details: { userId, ...moved },
    });
    res.status(200).json({ ok: true, ...moved });
  } catch (err) {
    console.error("Failed to remove member:", err);
    res.status(500).json({ message: "Couldn't remove the member." });
  }
};

// POST /admin/agencies/:id/documents (multipart: kind, files)
export const uploadAgencyDocuments = async (req, res) => {
  const id = toId(req.params.id);
  const agency = id && (await prisma.agency.findUnique({ where: { id }, select: { id: true, tradeName: true } }));
  if (!agency) return res.status(404).json({ message: "Agency not found." });
  const kind = DOCUMENT_KEYS.includes(req.body?.kind) ? req.body.kind : "other";
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ message: "Choose a file to upload." });
  const invalid = files.map(validateFile).find(Boolean);
  if (invalid) return res.status(400).json({ message: invalid });
  try {
    const docs = [];
    for (const f of files) docs.push(await storeDocument(f, { kind, agencyId: id, uploadedById: req.admin.id }));
    await audit(req, {
      action: "document.upload",
      entityType: "agency",
      entityId: id,
      summary: `Uploaded ${docs.length} document(s) to ${agency.tradeName}`,
    });
    res.status(201).json(docs.map(publicDocument));
  } catch (err) {
    console.error("Failed to upload agency documents:", err);
    res.status(500).json({ message: "The upload failed." });
  }
};
