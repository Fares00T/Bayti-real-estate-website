import jwt from "../shims/jsonwebtoken.js";
import prisma from "../lib/prisma.js";
import { getSettings } from "../lib/settings.js";
import { isApplicant, issuedAt, sessionCookie, sessionOutdated } from "../lib/platform.js";

export const AGENCY_COOKIE = "agency_token";
export const AGENCY_AUDIENCE = "bayti-agency";
// Agency sessions have their own secret, like admin sessions, so neither a
// marketplace nor an admin token can be replayed against the agency API.
export const agencySecret = () =>
  process.env.AGENCY_JWT_SECRET || `${process.env.JWT_SECRET_KEY}:agency`;

export const SESSION_HOURS = 12;

// only ever sent to the agency API
export const agencyCookieOptions = () => sessionCookie({ path: "/api/agency" });

// Opens an agency-platform session. `agencyId` is null for an applicant.
export const startAgencySession = async (res, user) => {
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const token = jwt.sign({ id: user.id, agencyId: user.agencyId ?? null, ...issuedAt() }, agencySecret(), {
    audience: AGENCY_AUDIENCE,
    expiresIn: `${SESSION_HOURS}h`,
  });
  res.cookie(AGENCY_COOKIE, token, { ...agencyCookieOptions(), maxAge: SESSION_HOURS * 60 * 60 * 1000 });
};

export const MEMBER_SELECT = {
  id: true, username: true, email: true, avatar: true, phone: true, status: true,
  role: true, accountType: true, agencyId: true, agencyRole: true, agencyActive: true, passwordChangedAt: true,
  agency: {
    select: {
      id: true, tradeName: true, logo: true, status: true, statusReason: true, verification: true,
      approvalExpiryDate: true, ownerId: true,
    },
  },
};

// Why `user` can't use the agency platform, or null when they can
export const agencyAccessError = (user) => {
  if (!user || user.status !== "active") return "This account is not active.";
  if (isApplicant(user)) return "Your agency application hasn't been approved yet.";
  if (!user.agencyId || !user.agencyRole || !user.agency) return "This account isn't part of an agency.";
  if (!user.agencyActive) return "Your agency has switched off your access.";
  return null;
};

// ---------- permissions ----------

// Everything an agency member can do beyond their own listings, by role.
// Checked on the server for every request; the dashboard only mirrors it.
const ROLE_PERMISSIONS = {
  owner: [
    "agency.edit", "team.view", "team.manage", "team.roles",
    "listings.all", "listings.assign", "inquiries.all", "analytics.agency", "activity.agency",
  ],
  manager: [
    "team.view", "team.manage", "listings.all", "listings.assign",
    "inquiries.all", "analytics.agency", "activity.agency",
  ],
  agent: [],
};

export const permissionsFor = (member, settings) => {
  const list = new Set(ROLE_PERMISSIONS[member.agencyRole] || []);
  if (member.agencyRole === "manager" && !settings.agencies.managersCanManageAgents) list.delete("team.manage");
  return list;
};

export const can = (req, permission) => req.permissions.has(permission);

export const requirePermission = (permission) => (req, res, next) =>
  can(req, permission)
    ? next()
    : res.status(403).json({ message: "Your role in the agency doesn't allow this." });

// The account behind a valid agency-platform session, or null after answering
const sessionAccount = async (req, res) => {
  const token = req.cookies?.[AGENCY_COOKIE];
  if (!token) {
    res.status(401).json({ message: "Not signed in." });
    return null;
  }
  let payload;
  try {
    payload = jwt.verify(token, agencySecret(), { audience: AGENCY_AUDIENCE });
  } catch {
    res.status(401).json({ message: "Your session has expired." });
    return null;
  }
  const user = await prisma.user.findUnique({ where: { id: payload.id }, select: MEMBER_SELECT });
  if (!user || user.status !== "active" || sessionOutdated(payload, user)) {
    res.status(401).json({ message: user && user.status !== "active" ? "This account is not active." : "Your session has expired." });
    return null;
  }
  return { user, payload };
};

// Guards the applicant area (/api/agency/application): an agency account
// still waiting for its application. Members are sent to their workspace.
export const requireApplicant = async (req, res, next) => {
  try {
    const session = await sessionAccount(req, res);
    if (!session) return;
    if (!isApplicant(session.user)) {
      return res.status(403).json({ message: "Your agency is approved: use the agency workspace.", approved: true });
    }
    req.user = session.user;
    req.userId = session.user.id;
    next();
  } catch (err) {
    console.error("Applicant auth failed:", err);
    res.status(500).json({ message: "Authentication failed." });
  }
};

// Guards every other /api/agency route. The member, their role and their
// agency are read from the database on each request, so removing someone,
// switching them off or suspending the agency takes effect immediately.
// Applicants can't use any of it.
export const requireAgency = async (req, res, next) => {
  try {
    const session = await sessionAccount(req, res);
    if (!session) return;
    const { user: member, payload } = session;
    const denied = agencyAccessError(member);
    if (denied) return res.status(isApplicant(member) ? 403 : 401).json({ message: denied, applicant: isApplicant(member) });
    if (member.agencyId !== payload.agencyId) {
      // An applicant whose agency was just approved carries on in the
      // workspace with a session for their new agency
      if (payload.agencyId === null && member.agencyRole === "owner") await startAgencySession(res, member);
      // A session belongs to one agency: moving to another one needs a new sign-in
      else return res.status(401).json({ message: "Your agency membership changed. Sign in again." });
    }
    // A suspended agency can still look at its data but can't change anything
    if (member.agency.status !== "active" && req.method !== "GET") {
      return res.status(403).json({ message: "This agency is suspended. Contact Bayti support." });
    }

    req.member = member;
    req.agency = member.agency;
    req.userId = member.id;
    req.permissions = permissionsFor(member, await getSettings());
    next();
  } catch (err) {
    console.error("Agency auth failed:", err);
    res.status(500).json({ message: "Authentication failed." });
  }
};

// Either kind of agency-platform session: an applicant, or a member (which
// goes through the full requireAgency checks). Used by /auth/me.
export const requireAgencySession = async (req, res, next) => {
  try {
    const session = await sessionAccount(req, res);
    if (!session) return;
    if (isApplicant(session.user)) {
      req.user = session.user;
      req.userId = session.user.id;
      return next();
    }
    return requireAgency(req, res, next);
  } catch (err) {
    console.error("Agency auth failed:", err);
    res.status(500).json({ message: "Authentication failed." });
  }
};
