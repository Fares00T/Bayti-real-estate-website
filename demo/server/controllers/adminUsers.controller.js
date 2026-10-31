import bcrypt from "../shims/bcrypt.js";
import crypto from "../shims/crypto.js";
import prisma from "../lib/prisma.js";
import { agencyDataFrom, attachMember } from "../lib/agency.js";
import { audit, notifyUser, sendEmail } from "../lib/notify.js";
import { DOCUMENT_KEYS } from "../lib/agencyRequirements.js";
import { publicDocument, storeDocument, validateFile } from "../lib/storage.js";
import { EMAIL_RE, omitPassword, str, toId } from "../lib/util.js";
import { createResetLink, sendResetEmail } from "./auth.controller.js";
import { deleteUserCascade } from "./user.controller.js";

// What the team can create in one step: a person, an agency with its owner,
// an agency employee, or a staff account. Only "admin" is a role; the agency
// ones are memberships of an ordinary account.
const ACCOUNT_TYPES = ["client", "agent", "agency", "admin"];
const ROLES = ["client", "admin"];
const STATUSES = ["active", "suspended", "deactivated"];
const PROFILE_FIELDS = ["phone"];

const agencySelect = { select: { id: true, tradeName: true, status: true, verification: true, ownerId: true } };

const conflict = (err, res) => {
  if (err.code !== "P2002") return false;
  const field = String(err.meta?.target || "").includes("email") ? "email" : "username";
  res.status(409).json({ message: `That ${field} is already used by another account.` });
  return true;
};

const validAvatar = (v) => v === null || /^(https:\/\/\S+|data:image\/\S+)$/i.test(String(v));

export const listUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { posts: true } },
        agency: agencySelect,
      },
    });
    res.status(200).json(users.map(omitPassword));
  } catch (err) {
    console.error("Failed to list users:", err);
    res.status(500).json({ message: "Failed to load users." });
  }
};

export const getUser = async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid user ID" });
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        agency: agencySelect,
        ownedAgency: { select: { id: true, tradeName: true } },
        posts: {
          select: {
            id: true, title: true, price: true, type: true, city: true, images: true,
            status: true, availability: true, featured: true, createdAt: true, updatedAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        applications: {
          select: { id: true, tradeName: true, status: true, submittedAt: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
        documents: { orderBy: { createdAt: "desc" } },
        _count: {
          select: {
            savedPosts: true, inquiries: true, inquiriesAssigned: true,
            reportsFiled: true, reportsAgainst: true, chats: true,
          },
        },
      },
    });
    if (!user) return res.status(404).json({ message: "User not found." });

    // What happened to this account, and what this account did (staff actions included)
    const activity = await prisma.auditLog.findMany({
      where: { OR: [{ entityType: "user", entityId: id }, { actorId: id }] },
      include: { actor: { select: { id: true, username: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.status(200).json({
      ...omitPassword(user),
      documents: user.documents.map(publicDocument),
      activity,
    });
  } catch (err) {
    console.error("Failed to load user:", err);
    res.status(500).json({ message: "Failed to load the user." });
  }
};

// POST /admin/users { accountType, username, email, password?, ..., agencyId?, agencyRole?, agency? }
export const createUser = async (req, res) => {
  const b = req.body || {};
  const accountType = b.accountType;
  const username = str(b.username, 60);
  const email = String(b.email || "").trim().toLowerCase();
  const password = String(b.password || "");

  if (!ACCOUNT_TYPES.includes(accountType)) return res.status(400).json({ message: "Choose an account type." });
  if (!username || username.length < 3) return res.status(400).json({ message: "Username must be at least 3 characters." });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Enter a valid email." });
  if (password && password.length < 8) return res.status(400).json({ message: "Passwords set by the team need at least 8 characters." });
  if (b.avatar !== undefined && b.avatar !== "" && !validAvatar(b.avatar)) return res.status(400).json({ message: "Invalid profile picture." });

  let agencyData = null;
  const agencyId = toId(b.agencyId);
  if (accountType === "agency") {
    agencyData = agencyDataFrom(b.agency || {});
    if (!agencyData.tradeName || !agencyData.legalName) {
      return res.status(400).json({ message: "An agency needs its commercial and legal names." });
    }
  }
  if (accountType === "agent") {
    if (!agencyId) return res.status(400).json({ message: "Choose the agency this agent works for." });
    const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
    if (!agency) return res.status(400).json({ message: "That agency doesn't exist." });
  }

  try {
    // Without a password the person sets their own through a reset link.
    // The random placeholder is never shown to anyone.
    const hash = await bcrypt.hash(password || crypto.randomBytes(32).toString("hex"), 10);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username,
          email,
          password: hash,
          role: accountType === "admin" ? "admin" : "client",
          avatar: b.avatar || null,
          ...Object.fromEntries(PROFILE_FIELDS.map((f) => [f, str(b[f], 40)])),
        },
      });
      if (accountType === "agency") {
        const agency = await tx.agency.create({
          data: {
            ...agencyData,
            ownerId: created.id,
            verification: b.verified ? "verified" : "pending",
            verifiedAt: b.verified ? new Date() : null,
          },
        });
        await attachMember(tx, created.id, agency.id, "owner");
      }
      if (accountType === "agent") {
        await attachMember(tx, created.id, agencyId, b.agencyRole === "manager" ? "manager" : "agent");
      }
      return tx.user.findUnique({ where: { id: created.id }, include: { agency: agencySelect } });
    });

    let resetLink = null;
    let emailed = false;
    if (!password) {
      const result = await sendResetEmail(user);
      resetLink = result.link;
      emailed = result.sent;
    }
    await audit(req, {
      action: "user.create",
      entityType: "user",
      entityId: user.id,
      summary: `Created ${accountType} account ${username}`,
      details: { accountType, agencyId: user.agencyId },
    });
    res.status(201).json({ user: omitPassword(user), resetLink, emailed });
  } catch (err) {
    if (conflict(err, res)) return;
    console.error("Failed to create user:", err);
    res.status(500).json({ message: "Couldn't create the account." });
  }
};


export const updateUserAdmin = async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid user ID" });
  const b = req.body || {};
  const data = {};
  if (b.username !== undefined) {
    const u = str(b.username, 60);
    if (!u || u.length < 3) return res.status(400).json({ message: "Username must be at least 3 characters." });
    data.username = u;
  }
  if (b.email !== undefined) {
    const e = String(b.email).trim().toLowerCase();
    if (!EMAIL_RE.test(e)) return res.status(400).json({ message: "Enter a valid email." });
    data.email = e;
  }
  for (const f of PROFILE_FIELDS) if (b[f] !== undefined) data[f] = str(b[f], 40);
  if (b.avatar !== undefined) {
    const avatar = b.avatar || null;
    if (!validAvatar(avatar)) return res.status(400).json({ message: "Invalid profile picture." });
    data.avatar = avatar;
  }
  if (b.verified !== undefined) data.verified = Boolean(b.verified);

  try {
    const before = await prisma.user.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ message: "User not found." });
    const user = await prisma.user.update({ where: { id }, data, include: { agency: agencySelect } });
    const changed = Object.keys(data).filter((k) => before[k] !== data[k]);
    if (changed.length) {
      await audit(req, {
        action: "user.update",
        entityType: "user",
        entityId: id,
        summary: `Edited ${user.username}: ${changed.join(", ")}`,
        details: Object.fromEntries(changed.map((k) => [k, { from: before[k], to: data[k] }])),
      });
    }
    res.status(200).json(omitPassword(user));
  } catch (err) {
    if (conflict(err, res)) return;
    console.error("Failed to update user:", err);
    res.status(500).json({ message: "Couldn't save the account." });
  }
};

// PUT /admin/users/:id/role { role: client|admin }
// Staff access only. Agency membership is managed from the agency's page.
// Granting admin is the most sensitive action in the dashboard: it is
// refused for agency members and always audited.
export const updateUserRole = async (req, res) => {
  const id = toId(req.params.id);
  const { role } = req.body || {};
  if (!id) return res.status(400).json({ message: "Invalid user ID" });
  if (!ROLES.includes(role)) return res.status(400).json({ message: "Unknown role." });
  if (id === req.admin.id) return res.status(400).json({ message: "You can't change your own role." });

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ message: "User not found." });
    if (role === "admin" && user.agencyId) {
      return res.status(400).json({ message: "Agency members can't be Bayti staff. Remove them from their agency first." });
    }
    if (role === "admin" && user.status !== "active") {
      return res.status(400).json({ message: "Reactivate the account before giving it staff access." });
    }
    await prisma.user.update({ where: { id }, data: { role } });

    await audit(req, {
      action: "user.role",
      entityType: "user",
      entityId: id,
      summary: `${user.username}: ${user.role} → ${role}`,
      details: { from: user.role, to: role },
    });
    const fresh = await prisma.user.findUnique({ where: { id }, include: { agency: agencySelect } });
    res.status(200).json(omitPassword(fresh));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error("Failed to change role:", err);
    res.status(500).json({ message: "Failed to change the role." });
  }
};

// PUT /admin/users/:id/status { status, reason }
export const setUserStatus = async (req, res) => {
  const id = toId(req.params.id);
  const { status } = req.body || {};
  const reason = str(req.body?.reason, 1000);
  if (!id) return res.status(400).json({ message: "Invalid user ID" });
  if (!STATUSES.includes(status)) return res.status(400).json({ message: "Unknown status." });
  if (id === req.admin.id) return res.status(400).json({ message: "You can't change your own account status." });
  if (status !== "active" && !reason) return res.status(400).json({ message: "Give a reason. It's kept in the account history." });

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { status, statusReason: status === "active" ? null : reason },
      include: { agency: agencySelect },
    });
    await audit(req, {
      action: `user.${status === "active" ? "reactivate" : status === "suspended" ? "suspend" : "deactivate"}`,
      entityType: "user",
      entityId: id,
      summary: `${user.username} is now ${status}${reason ? `: ${reason}` : ""}`,
    });
    if (status !== "active") {
      sendEmail({
        to: user.email,
        subject: status === "suspended" ? "Your Bayti account has been suspended" : "Your Bayti account has been deactivated",
        text: `Hi ${user.username},\n\nYour account is now ${status}.\nReason: ${reason}\n\nReply to this email if you think this is a mistake.`,
      });
    } else {
      await notifyUser(id, { type: "account_reactivated", title: "Your account is active again", link: "/profile" });
    }
    res.status(200).json(omitPassword(user));
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "User not found." });
    console.error("Failed to change status:", err);
    res.status(500).json({ message: "Couldn't change the account status." });
  }
};

// PUT /admin/users/:id/password { password }
export const setUserPassword = async (req, res) => {
  const id = toId(req.params.id);
  const password = String(req.body?.password || "");
  if (!id) return res.status(400).json({ message: "Invalid user ID" });
  if (password.length < 8) return res.status(400).json({ message: "Use at least 8 characters." });
  try {
    // passwordChangedAt ends every session the account has open
    const user = await prisma.user.update({
      where: { id },
      data: { password: await bcrypt.hash(password, 10), passwordChangedAt: new Date() },
    });
    await prisma.passwordResetToken.deleteMany({ where: { userId: id, usedAt: null } });
    await audit(req, { action: "user.password_set", entityType: "user", entityId: id, summary: `Set a new password for ${user.username}` });
    res.status(200).json({ ok: true });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "User not found." });
    console.error("Failed to set password:", err);
    res.status(500).json({ message: "Couldn't change the password." });
  }
};

// POST /admin/users/:id/reset-link — emails a reset link (if mail is set up)
// and returns it so the team can pass it on another way
export const sendUserResetLink = async (req, res) => {
  const id = toId(req.params.id);
  const user = id && (await prisma.user.findUnique({ where: { id } }));
  if (!user) return res.status(404).json({ message: "User not found." });
  try {
    const { link, sent } = req.body?.email === false
      ? { link: await createResetLink(id), sent: false }
      : await sendResetEmail(user);
    await audit(req, {
      action: "user.reset_link",
      entityType: "user",
      entityId: id,
      summary: `Created a password reset link for ${user.username}${sent ? " (emailed)" : ""}`,
    });
    res.status(200).json({ link, emailed: sent });
  } catch (err) {
    console.error("Failed to create reset link:", err);
    res.status(500).json({ message: "Couldn't create the reset link." });
  }
};

// DELETE /admin/users/:id { confirm: username }
export const deleteUserAdmin = async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid user ID" });
  if (id === req.admin.id) {
    return res.status(400).json({ message: "You can't delete your own account from here." });
  }

  try {
    const target = await prisma.user.findUnique({
      where: { id },
      select: { role: true, username: true, email: true, _count: { select: { posts: true } } },
    });
    if (!target) return res.status(404).json({ message: "User not found." });
    if (target.role === "admin") {
      return res.status(400).json({ message: "Remove their admin role before deleting the account." });
    }
    // Bulk deletes from the table pass confirm: true; single deletes type the username
    const confirm = req.body?.confirm;
    if (confirm !== true && confirm !== target.username) {
      return res.status(400).json({ message: "Type the username to confirm." });
    }
    await deleteUserCascade(id);
    await audit(req, {
      action: "user.delete",
      entityType: "user",
      entityId: id,
      summary: `Deleted ${target.username} (${target.email}) and ${target._count.posts} listing(s)`,
    });
    res.status(200).json({ message: "User deleted." });
  } catch (err) {
    console.error("Failed to delete user:", err);
    res.status(500).json({ message: "Failed to delete the user." });
  }
};

// POST /admin/users/:id/documents (multipart: kind, files)
export const uploadUserDocuments = async (req, res) => {
  const id = toId(req.params.id);
  const user = id && (await prisma.user.findUnique({ where: { id }, select: { id: true, username: true } }));
  if (!user) return res.status(404).json({ message: "User not found." });
  const kind = DOCUMENT_KEYS.includes(req.body?.kind) ? req.body.kind : "other";
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ message: "Choose a file to upload." });
  const invalid = files.map(validateFile).find(Boolean);
  if (invalid) return res.status(400).json({ message: invalid });
  try {
    const docs = [];
    for (const f of files) docs.push(await storeDocument(f, { kind, userId: id, uploadedById: req.admin.id }));
    await audit(req, {
      action: "document.upload",
      entityType: "user",
      entityId: id,
      summary: `Uploaded ${docs.length} document(s) to ${user.username}`,
    });
    res.status(201).json(docs.map(publicDocument));
  } catch (err) {
    console.error("Failed to upload user documents:", err);
    res.status(500).json({ message: "The upload failed." });
  }
};
