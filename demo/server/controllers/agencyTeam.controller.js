import bcrypt from "../shims/bcrypt.js";
import crypto from "../shims/crypto.js";
import prisma from "../lib/prisma.js";
import { attachMember, detachMember } from "../lib/agency.js";
import { INVITE_DAYS, joinRefusal } from "../lib/invitations.js";
import { notifyUser, sendEmail } from "../lib/notify.js";
import { EMAIL_RE, str, toId } from "../lib/util.js";
import { can } from "../middleware/requireAgency.js";
import { createResetLink } from "./auth.controller.js";
import { agencyAppLink, agencyAudit } from "./agency.controller.js";

// The agency's team. Owners manage everyone; managers (when the platform
// allows it) manage agents only; agents can only leave.

const MEMBER_FIELDS = {
  id: true, username: true, email: true, phone: true, avatar: true, agencyRole: true,
  agencyActive: true, status: true, createdAt: true, lastLoginAt: true,
};

const ROLE_RANK = { agent: 0, manager: 1, owner: 2 };

// May the caller manage this member at all?
const canManageMember = (req, member) =>
  can(req, "team.manage") &&
  member.id !== req.userId &&
  member.agencyRole !== "owner" &&
  (req.member.agencyRole === "owner" || ROLE_RANK[member.agencyRole] < ROLE_RANK[req.member.agencyRole]);

const loadMember = async (req, res) => {
  const id = toId(req.params.userId);
  const member = id && (await prisma.user.findFirst({ where: { id, agencyId: req.agency.id }, select: MEMBER_FIELDS }));
  if (!member) {
    res.status(404).json({ message: "Team member not found." });
    return null;
  }
  return member;
};

export const listTeam = async (req, res) => {
  const members = await prisma.user.findMany({
    where: { agencyId: req.agency.id },
    select: MEMBER_FIELDS,
    orderBy: { createdAt: "asc" },
  });
  const ids = members.map((m) => m.id);
  const [listings, published, inquiries] = await Promise.all([
    prisma.post.groupBy({ by: ["userId"], where: { agencyId: req.agency.id, userId: { in: ids } }, _count: { _all: true } }),
    prisma.post.groupBy({
      by: ["userId"],
      where: { agencyId: req.agency.id, userId: { in: ids }, status: "approved", hiddenByOwner: false },
      _count: { _all: true },
    }),
    prisma.inquiry.groupBy({
      by: ["assignedToId"],
      where: { agencyId: req.agency.id, assignedToId: { in: ids }, status: "open" },
      _count: { _all: true },
    }),
  ]);
  const count = (rows, key, id) => rows.find((r) => r[key] === id)?._count._all || 0;
  res.status(200).json(
    members.map((m) => ({
      ...m,
      listings: count(listings, "userId", m.id),
      published: count(published, "userId", m.id),
      openInquiries: count(inquiries, "assignedToId", m.id),
      canManage: canManageMember(req, m),
    }))
  );
};

export const getTeamMember = async (req, res) => {
  const member = await loadMember(req, res);
  if (!member) return;
  const [listings, activity] = await Promise.all([
    prisma.post.findMany({
      where: { agencyId: req.agency.id, userId: member.id },
      select: {
        id: true, title: true, price: true, type: true, city: true, district: true, images: true,
        status: true, hiddenByOwner: true, createdAt: true, postDetail: { select: { views: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      where: { entityType: "agency", entityId: req.agency.id, actorId: member.id },
      select: { id: true, action: true, summary: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
  res.status(200).json({ ...member, canManage: canManageMember(req, member), listings, activity });
};

const inviteText = (agencyName, role, link) =>
  `${agencyName} added you to its team on Bayti as ${role === "manager" ? "a manager" : "an agent"}.\n\n` +
  (link ? `Choose your password here (valid for one hour):\n${link}\n\n` : "") +
  `Then sign in to the agency platform: ${agencyAppLink("/login")}`;

// { email, agencyRole } invites an existing Bayti account: they join only
// once they accept, from their marketplace account.
// { create: true, email, username, phone, agencyRole } opens a new account for
// a new employee and returns a one-time link to choose its password.
export const addTeamMember = async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  // Managers may add agents only; owners may also add managers
  const agencyRole = req.body?.agencyRole === "manager" && can(req, "team.roles") ? "manager" : "agent";
  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Enter a valid email." });

  try {
    let user = await prisma.user.findUnique({ where: { email } });
    let setupLink = null;

    if (req.body?.create) {
      if (user) return res.status(409).json({ message: "A Bayti account already uses that email. Add it instead." });
      const username = str(req.body.username, 60);
      if (!username || username.length < 3) return res.status(400).json({ message: "The username must be at least 3 characters." });
      user = await prisma.user.create({
        data: {
          email,
          username,
          phone: str(req.body.phone, 40),
          // unusable until they choose their own through the setup link
          password: await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10),
        },
      });
      setupLink = await createResetLink(user.id);
    } else {
      if (!user) {
        return res.status(404).json({ message: "No Bayti account uses that email. Create one for them instead." });
      }
      if (user.agencyId === req.agency.id) return res.status(409).json({ message: "They're already on your team." });
      const refusal = await joinRefusal(prisma, user);
      if (refusal) return res.status(409).json({ message: refusal });
      const pending = await prisma.agencyInvitation.findFirst({
        where: { agencyId: req.agency.id, userId: user.id, status: "pending", expiresAt: { gt: new Date() } },
      });
      if (pending) return res.status(409).json({ message: "They already have an invitation waiting." });

      const invitation = await prisma.agencyInvitation.create({
        data: {
          agencyId: req.agency.id,
          userId: user.id,
          agencyRole,
          invitedById: req.userId,
          expiresAt: new Date(Date.now() + INVITE_DAYS * 86400000),
        },
      });
      await notifyUser(user.id, {
        type: "agency_invitation",
        title: `${req.agency.tradeName} invited you to join its team`,
        body: `As ${agencyRole === "manager" ? "a manager" : "an agent"}. Accept or decline from your profile.`,
        link: "/profile?tab=invitations",
      });
      const emailed = await sendEmail({
        to: email,
        subject: `${req.agency.tradeName} invited you to join its team on Bayti`,
        text:
          `${req.agency.tradeName} would like you to join its team on Bayti as ${agencyRole === "manager" ? "a manager" : "an agent"}.\n\n` +
          `Sign in to Bayti and open your profile to accept or decline: ${process.env.CLIENT_URL || ""}/profile?tab=invitations\n\n` +
          `The invitation expires in ${INVITE_DAYS} days.`,
      });
      await agencyAudit(req, {
        action: "agency.member_invite",
        summary: `Invited ${user.username} as ${agencyRole}`,
        details: { userId: user.id, invitationId: invitation.id },
      });
      return res.status(202).json({ invitation: { ...invitation, user: { id: user.id, username: user.username, email } }, emailed });
    }

    await prisma.$transaction((tx) => attachMember(tx, user.id, req.agency.id, agencyRole));
    await notifyUser(user.id, {
      type: "agency_joined",
      title: `You joined ${req.agency.tradeName}`,
      body: `You were added as ${agencyRole === "manager" ? "a manager" : "an agent"}. Sign in to the agency platform to manage your listings.`,
      link: agencyAppLink("/"),
    });
    const emailed = await sendEmail({
      to: email,
      subject: `You've joined ${req.agency.tradeName} on Bayti`,
      text: inviteText(req.agency.tradeName, agencyRole, setupLink),
    });
    await agencyAudit(req, {
      action: "agency.member_create",
      summary: `Created an account for ${user.username} as ${agencyRole}`,
      details: { userId: user.id },
    });
    const member = await prisma.user.findUnique({ where: { id: user.id }, select: MEMBER_FIELDS });
    // The link is shown once so it can be handed over if email isn't set up
    res.status(201).json({ member, setupLink, emailed });
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ message: "That username is already taken." });
    console.error("Failed to add team member:", err);
    res.status(500).json({ message: "Couldn't add them to the team." });
  }
};

// { agencyRole?, active?, username?, phone? }
export const updateTeamMember = async (req, res) => {
  const member = await loadMember(req, res);
  if (!member) return;
  if (!canManageMember(req, member)) return res.status(403).json({ message: "You can't manage this team member." });

  const data = {};
  const changes = [];
  if (req.body?.agencyRole !== undefined) {
    if (!can(req, "team.roles")) return res.status(403).json({ message: "Only the owner can change roles." });
    if (!["manager", "agent"].includes(req.body.agencyRole)) return res.status(400).json({ message: "Unknown role." });
    if (req.body.agencyRole !== member.agencyRole) {
      data.agencyRole = req.body.agencyRole;
      changes.push(`role ${req.body.agencyRole}`);
    }
  }
  if (req.body?.active !== undefined && Boolean(req.body.active) !== member.agencyActive) {
    data.agencyActive = Boolean(req.body.active);
    changes.push(data.agencyActive ? "reactivated" : "deactivated");
  }
  if (req.body?.username !== undefined) {
    const username = str(req.body.username, 60);
    if (!username || username.length < 3) return res.status(400).json({ message: "The username must be at least 3 characters." });
    data.username = username;
  }
  if (req.body?.phone !== undefined) data.phone = str(req.body.phone, 40);

  try {
    await prisma.user.update({ where: { id: member.id }, data });
    if ("agencyActive" in data) {
      await notifyUser(member.id, {
        type: data.agencyActive ? "agency_reactivated" : "agency_deactivated",
        title: data.agencyActive
          ? `${req.agency.tradeName} reactivated your access`
          : `${req.agency.tradeName} switched off your access`,
        body: data.agencyActive ? null : "You can't use the agency platform or publish for the agency until you're reactivated.",
        link: data.agencyActive ? agencyAppLink("/") : null,
      });
    }
    await agencyAudit(req, {
      action: "agency.member_update",
      summary: `Updated ${member.username}${changes.length ? `: ${changes.join(", ")}` : ""}`,
      details: { userId: member.id, ...data },
    });
    const updated = await prisma.user.findUnique({ where: { id: member.id }, select: MEMBER_FIELDS });
    res.status(200).json({ ...updated, canManage: canManageMember(req, updated) });
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ message: "That username is already taken." });
    console.error("Failed to update team member:", err);
    res.status(500).json({ message: "Couldn't save the change." });
  }
};

// DELETE /team/:userId { reassignTo? } — removing someone, or leaving.
// Their agency listings go to `reassignTo` or the owner (see detachMember).
export const removeTeamMember = async (req, res) => {
  const member = await loadMember(req, res);
  if (!member) return;
  const self = member.id === req.userId;
  if (member.agencyRole === "owner") {
    return res.status(400).json({ message: "The owner's place can only be changed by Bayti support." });
  }
  if (!self && !canManageMember(req, member)) return res.status(403).json({ message: "You can't remove this team member." });

  const reassignTo = toId(req.body?.reassignTo ?? req.query.reassignTo);
  try {
    const moved = await prisma.$transaction((tx) => detachMember(tx, member.id, { reassignTo }));
    let to = null;
    if (moved.to) to = await prisma.user.findUnique({ where: { id: moved.to }, select: { id: true, username: true } });
    if (!self) {
      await notifyUser(member.id, {
        type: "agency_removed",
        title: `You were removed from ${req.agency.tradeName}`,
        body: "Your account is now a regular member account. The agency's listings stay with the agency.",
        link: "/profile",
      });
    }
    await agencyAudit(req, {
      action: self ? "agency.member_leave" : "agency.member_remove",
      summary:
        (self ? `${member.username} left the agency` : `Removed ${member.username}`) +
        (moved.reassigned ? `; ${moved.reassigned} listing(s) moved to ${to?.username}` : "") +
        (moved.unassigned ? `; ${moved.unassigned} listing(s) left unassigned` : ""),
      details: { userId: member.id, ...moved },
    });
    res.status(200).json({ ok: true, ...moved, toUser: to });
  } catch (err) {
    console.error("Failed to remove team member:", err);
    res.status(500).json({ message: "Couldn't remove them from the team." });
  }
};

// ---------- invitations ----------

export const listInvitations = async (req, res) => {
  const items = await prisma.agencyInvitation.findMany({
    where: { agencyId: req.agency.id, status: "pending", expiresAt: { gt: new Date() } },
    include: { user: { select: { id: true, username: true, email: true, avatar: true } }, invitedBy: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.status(200).json(items);
};

export const revokeInvitation = async (req, res) => {
  const id = toId(req.params.id);
  const { count } = await prisma.agencyInvitation.updateMany({
    where: { id: id || 0, agencyId: req.agency.id, status: "pending" },
    data: { status: "revoked", respondedAt: new Date() },
  });
  if (!count) return res.status(404).json({ message: "Invitation not found." });
  await agencyAudit(req, { action: "agency.invite_revoke", summary: "Withdrew an invitation", details: { invitationId: id } });
  res.status(200).json({ ok: true });
};
