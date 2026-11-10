import prisma from "./prisma.js";
import { dateOrNull, pickWith, str } from "./util.js";

// Text fields shared by Agency and AgencyApplication
export const AGENCY_TEXT_FIELDS = [
  "legalName", "tradeName", "legalForm", "rcNumber", "nif", "nis", "articleImposition",
  "address", "wilaya", "commune", "phone", "email", "website", "logo",
  "approvalNumber", "approvalWilaya",
];
export const AGENCY_DATE_FIELDS = ["approvalIssueDate", "approvalExpiryDate"];
export const AGENCY_REP_FIELDS = ["repFullName", "repPosition", "repPhone", "repEmail"];

// Changing any of these on a live agency is reported to the admin team
export const LEGAL_FIELDS = [
  "legalName", "legalForm", "rcNumber", "nif", "nis", "articleImposition", "address",
  "wilaya", "commune", "approvalNumber", "approvalWilaya", "approvalIssueDate",
  "approvalExpiryDate", "repFullName", "repPosition",
];

export const agencyDataFrom = (body = {}) => {
  const data = {
    ...pickWith(body, [...AGENCY_TEXT_FIELDS, ...AGENCY_REP_FIELDS]),
    ...pickWith(body, AGENCY_DATE_FIELDS, dateOrNull),
  };
  if (body.about !== undefined) data.about = str(body.about, 5000);
  if (body.entityType !== undefined) {
    data.entityType = body.entityType === "natural_person" ? "natural_person" : "legal_entity";
  }
  if (data.website && !/^https?:\/\//i.test(data.website)) data.website = `https://${data.website}`;
  return data;
};

// Absolute link into the agency platform, for notifications read elsewhere
export const agencyAppLink = (path = "/") => `${process.env.AGENCY_URL || ""}${path}`;

// ---------- verification ----------

// What a listing needs to know about its agency to decide on the badge
export const AGENCY_BADGE_SELECT = {
  id: true, tradeName: true, logo: true, wilaya: true, commune: true,
  status: true, verification: true, approvalExpiryDate: true,
};

// The single source of truth for the verified badge. It is computed from the
// agency's live record on every request, never stored on a listing, so a
// suspension, a revoked verification or an expired agrément removes the badge
// from every listing at once.
export const isAgencyVerified = (agency, now = new Date()) =>
  Boolean(
    agency &&
      agency.status === "active" &&
      agency.verification === "verified" &&
      (!agency.approvalExpiryDate || new Date(agency.approvalExpiryDate) > now)
  );

// The agency as the public sees it next to a listing. `verified` here is the
// computed value; the raw flag never leaves the server.
export const publicAgency = (agency) =>
  agency
    ? {
        id: agency.id,
        tradeName: agency.tradeName,
        logo: agency.logo,
        wilaya: agency.wilaya,
        commune: agency.commune,
        verified: isAgencyVerified(agency),
      }
    : null;

// ---------- membership ----------

// Makes `userId` a member of `agencyId` on the same account: they keep
// their login, favourites and inquiries. Only a new owner brings personal
// listings along (they were the agency's listings before it was approved);
// anyone else must have none active, see `personalListingsBlockJoin`.
export const attachMember = async (tx, userId, agencyId, agencyRole = "agent") => {
  await tx.user.update({
    where: { id: userId },
    data: { agencyId, agencyRole, agencyActive: true },
  });
  if (agencyRole === "owner") {
    await tx.post.updateMany({ where: { userId, agencyId: null }, data: { agencyId } });
    // and the client conversations about them, now answered by the agency
    await tx.inquiry.updateMany({
      where: { ownerId: userId, agencyId: null },
      data: { agencyId, ownerId: null, assignedToId: userId },
    });
  }
};

// An agency member can't also run personal listings: why `userId` can't join
// an agency as a member yet, or null
export const personalListingsBlockJoin = async (db, userId) => {
  const active = await db.post.count({
    where: { userId, agencyId: null, status: { in: ["pending", "approved"] } },
  });
  return active
    ? `This account has ${active} personal listing(s) on Bayti. They must be archived before joining an agency.`
    : null;
};

// Open inquiries follow the listing they're about
export const OPEN_INQUIRY = ["open", "scheduled"];
const moveOpenInquiries = (tx, postIds, toUserId) =>
  tx.inquiry.updateMany({
    where: { postId: { in: postIds }, status: { in: OPEN_INQUIRY } },
    data: { assignedToId: toUserId },
  });

// The first active member of `agencyId` among `candidates`, or null
const firstActiveMember = async (tx, agencyId, candidates) => {
  for (const id of candidates) {
    if (!id) continue;
    const m = await tx.user.findUnique({
      where: { id },
      select: { id: true, agencyId: true, agencyActive: true, status: true },
    });
    if (m && m.agencyId === agencyId && m.agencyActive && m.status === "active") return m.id;
  }
  return null;
};

// Hands everything `userId` is responsible for in `agencyId` to someone else.
// The agency keeps ownership in every case: the listings and their open
// inquiries go to `reassignTo`, else the owner, else they stay with the
// agency unassigned for its leads to hand out. Nothing is unpublished.
export const handOverAssignments = async (tx, userId, agencyId, { reassignTo } = {}) => {
  const agency = await tx.agency.findUnique({ where: { id: agencyId }, select: { ownerId: true } });
  const posts = await tx.post.findMany({ where: { userId, agencyId }, select: { id: true } });
  const ids = posts.map((p) => p.id);
  const to = await firstActiveMember(tx, agencyId, [reassignTo, agency?.ownerId].filter((id) => id !== userId));

  if (ids.length) await tx.post.updateMany({ where: { id: { in: ids } }, data: { userId: to } });
  // including inquiries on listings that were reassigned earlier
  await tx.inquiry.updateMany({
    where: { agencyId, assignedToId: userId, status: { in: OPEN_INQUIRY } },
    data: { assignedToId: to },
  });
  return { reassigned: to ? ids.length : 0, unassigned: to ? 0 : ids.length, to };
};

// Reverses attachMember: the person keeps their account but loses all access
// to the agency, its listings and its client conversations
export const detachMember = async (tx, userId, options = {}) => {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { agencyId: true } });
  if (!user?.agencyId) return { reassigned: 0, unassigned: 0, to: null };
  const result = await handOverAssignments(tx, userId, user.agencyId, options);
  await tx.user.update({
    where: { id: userId },
    data: { agencyId: null, agencyRole: null, agencyActive: true },
  });
  return result;
};

// Hands one listing to another member of the same agency (null = unassigned)
export const assignListing = async (tx, postId, toUserId) => {
  await tx.post.update({ where: { id: postId }, data: { userId: toUserId } });
  await moveOpenInquiries(tx, [postId], toUserId);
};

// Approving an application: create (or refresh) the agency, make the
// applicant its owner and carry the documents over to the agency's file.
export const agencyFromApplication = async (tx, app) => {
  const data = {
    entityType: app.entityType,
    legalName: app.legalName || app.tradeName,
    tradeName: app.tradeName || app.legalName,
    ...Object.fromEntries(
      [...AGENCY_TEXT_FIELDS.filter((f) => !["legalName", "tradeName"].includes(f)), ...AGENCY_DATE_FIELDS, ...AGENCY_REP_FIELDS]
        .map((f) => [f, app[f] ?? null])
    ),
    status: "active",
    verification: "verified",
    verificationNote: null,
    verifiedAt: new Date(),
  };

  const existing =
    app.agencyId ? await tx.agency.findUnique({ where: { id: app.agencyId } })
    : await tx.agency.findUnique({ where: { ownerId: app.applicantId } });

  const agency = existing
    ? await tx.agency.update({ where: { id: existing.id }, data: { ...data, ownerId: app.applicantId } })
    : await tx.agency.create({ data: { ...data, ownerId: app.applicantId } });

  await attachMember(tx, app.applicantId, agency.id, "owner");
  const applicant = await tx.user.findUnique({ where: { id: app.applicantId }, select: { avatar: true } });
  if (app.logo && !applicant?.avatar) {
    await tx.user.update({ where: { id: app.applicantId }, data: { avatar: app.logo } });
  }
  await tx.document.updateMany({ where: { applicationId: app.id }, data: { agencyId: agency.id } });
  await tx.agencyApplication.update({ where: { id: app.id }, data: { agencyId: agency.id } });
  return agency;
};
