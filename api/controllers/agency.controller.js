import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import { LEGAL_FIELDS, agencyDataFrom, isAgencyVerified } from "../lib/agency.js";
export { agencyAppLink } from "../lib/agency.js";
import { audit, notifyAdmins } from "../lib/notify.js";
import { attemptKey, clearFailures, isLocked, recordFailure } from "../lib/throttle.js";
import { EMAIL_RE, str, toId } from "../lib/util.js";
import {
  AGENCY_COOKIE,
  MEMBER_SELECT,
  agencyAccessError,
  agencyCookieOptions as cookieOptions,
  can,
  permissionsFor,
  startAgencySession,
} from "../middleware/requireAgency.js";
import { getSettings } from "../lib/settings.js";
import { PLATFORM_MESSAGE, homePlatformFor, isApplicant } from "../lib/platform.js";

// The agency platform (agency.baytiy.com): sign-in, the member's own profile,
// the agency's details and the member's notifications. Every handler after
// sign-in runs behind requireAgency and is scoped to req.agency.

// Records an action in the agency's own activity feed
export const agencyAudit = (req, { action, summary, details }) =>
  audit(req, { action, entityType: "agency", entityId: req.agency.id, summary, details });

// An agency account waiting for its application: it can only follow and
// edit that application, so the app shows nothing else
const applicantSession = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  avatar: user.avatar,
  applicant: true,
  agency: null,
  permissions: [],
});

// The session payload the dashboard renders from
const sessionFor = (member, permissions) => ({
  id: member.id,
  username: member.username,
  email: member.email,
  avatar: member.avatar,
  phone: member.phone,
  agencyRole: member.agencyRole,
  agency: {
    id: member.agency.id,
    tradeName: member.agency.tradeName,
    logo: member.agency.logo,
    status: member.agency.status,
    statusReason: member.agency.status === "active" ? null : member.agency.statusReason,
    verified: isAgencyVerified(member.agency),
    verification: member.agency.verification,
    // verified by Bayti, but the agrément has expired
    verificationLapsed:
      member.agency.verification === "verified" && !isAgencyVerified(member.agency) && member.agency.status === "active",
  },
  permissions: [...permissions],
});

// ---------- auth ----------

export const agencyLogin = async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const key = attemptKey(req, email);

  if (isLocked(key)) {
    return res.status(429).json({ message: "Too many attempts. Try again in 15 minutes." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { ...MEMBER_SELECT, password: true },
    });
    const valid = user && (await bcrypt.compare(password, user.password));
    if (!valid) {
      recordFailure(key);
      return res.status(401).json({ message: "Invalid email or password." });
    }
    // The password was right, so saying where the account belongs leaks nothing
    const platform = homePlatformFor(user);
    if (platform !== "agency") {
      const redirect =
        platform === "marketplace"
          ? `${process.env.CLIENT_URL || ""}/login?email=${encodeURIComponent(email)}`
          : process.env.ADMIN_URL || null;
      return res.status(403).json({ message: PLATFORM_MESSAGE[platform], platform, redirect });
    }
    if (user.status !== "active") return res.status(403).json({ message: "This account is not active." });
    // An agency account still in review signs in to follow its application
    if (isApplicant(user)) {
      clearFailures(key);
      await startAgencySession(res, user);
      return res.status(200).json(applicantSession(user));
    }
    const denied = agencyAccessError(user);
    if (denied) return res.status(403).json({ message: denied });
    clearFailures(key);

    await startAgencySession(res, user);
    res.status(200).json(sessionFor(user, permissionsFor(user, await getSettings())));
  } catch (err) {
    console.error("Agency login failed:", err);
    res.status(500).json({ message: "Sign-in failed. Please try again." });
  }
};

export const agencyLogout = (req, res) => {
  res.clearCookie(AGENCY_COOKIE, cookieOptions()).status(200).json({ ok: true });
};

// GET /auth/me — for a member or an applicant (mounted before requireAgency)
export const agencyMe = (req, res) =>
  req.member
    ? res.status(200).json(sessionFor(req.member, req.permissions))
    : res.status(200).json(applicantSession(req.user));

// ---------- own profile ----------

export const updateMyProfile = async (req, res) => {
  const data = {};
  const username = str(req.body?.username, 60);
  if (req.body?.username !== undefined) {
    if (!username || username.length < 3) return res.status(400).json({ message: "Username must be at least 3 characters." });
    data.username = username;
  }
  if (req.body?.phone !== undefined) data.phone = str(req.body.phone, 40);
  if (req.body?.avatar !== undefined) data.avatar = str(req.body.avatar, 500);

  if (req.body?.newPassword) {
    const next = String(req.body.newPassword);
    if (next.length < 6) return res.status(400).json({ message: "The new password must be at least 6 characters." });
    const me = await prisma.user.findUnique({ where: { id: req.userId }, select: { password: true } });
    if (!(await bcrypt.compare(String(req.body.currentPassword || ""), me.password))) {
      return res.status(400).json({ message: "Your current password isn't right." });
    }
    data.password = await bcrypt.hash(next, 10);
    // signs out every other session; this one is renewed below
    data.passwordChangedAt = new Date();
  }

  try {
    await prisma.user.update({ where: { id: req.userId }, data });
    const member = await prisma.user.findUnique({ where: { id: req.userId }, select: MEMBER_SELECT });
    if (data.password) await startAgencySession(res, member);
    res.status(200).json(sessionFor(member, req.permissions));
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ message: "That username is already taken." });
    console.error("Failed to update profile:", err);
    res.status(500).json({ message: "Couldn't save your profile." });
  }
};

// ---------- the agency ----------

// Everyone sees the public details; the owner and managers see the legal file
export const getAgencyDetails = async (req, res) => {
  const agency = await prisma.agency.findUnique({ where: { id: req.agency.id } });
  const leads = can(req, "team.view");
  const visible = leads
    ? agency
    : Object.fromEntries(
        ["id", "tradeName", "logo", "phone", "email", "website", "address", "wilaya", "commune", "about", "status"]
          .map((f) => [f, agency[f]])
      );
  res.status(200).json({ ...visible, verified: isAgencyVerified(agency), canEdit: can(req, "agency.edit") });
};

export const updateAgencyDetails = async (req, res) => {
  const agency = await prisma.agency.findUnique({ where: { id: req.agency.id } });
  const data = agencyDataFrom(req.body);
  // Identity and verification state are the platform's to change
  delete data.entityType;
  if (data.email && !EMAIL_RE.test(data.email)) return res.status(400).json({ message: "Enter a valid email." });
  if (data.tradeName === null || data.legalName === null) {
    return res.status(400).json({ message: "The agency name can't be empty." });
  }

  const changedLegal = LEGAL_FIELDS.filter((f) => {
    if (!(f in data)) return false;
    const before = agency[f] instanceof Date ? agency[f].toISOString() : agency[f] ?? null;
    const after = data[f] instanceof Date ? data[f].toISOString() : data[f] ?? null;
    return before !== after;
  });

  try {
    const updated = await prisma.agency.update({ where: { id: agency.id }, data });
    if (changedLegal.length) {
      await notifyAdmins({
        type: "agency_legal_update",
        title: `${updated.tradeName} updated its legal information`,
        body: `Changed: ${changedLegal.join(", ")}`,
        link: `/agencies/${agency.id}`,
      });
      await agencyAudit(req, {
        action: "agency.legal_update",
        summary: `Changed ${changedLegal.join(", ")}`,
        details: Object.fromEntries(changedLegal.map((f) => [f, { from: agency[f], to: data[f] }])),
      });
    } else {
      await agencyAudit(req, { action: "agency.profile_update", summary: "Updated the agency profile" });
    }
    res.status(200).json({ ...updated, verified: isAgencyVerified(updated), canEdit: true });
  } catch (err) {
    console.error("Failed to update agency:", err);
    res.status(500).json({ message: "Couldn't save the agency details." });
  }
};

// ---------- notifications (the member's own) ----------

export const listMyNotifications = async (req, res) => {
  const where = { audience: "user", userId: req.userId };
  const take = Math.min(toId(req.query.limit) || 50, 100);
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take }),
    prisma.notification.count({ where: { ...where, readAt: null } }),
  ]);
  res.status(200).json({ items, unread });
};

export const markMyNotifications = async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(toId).filter(Boolean) : null;
  await prisma.notification.updateMany({
    where: { audience: "user", userId: req.userId, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  });
  res.status(200).json({ ok: true });
};
