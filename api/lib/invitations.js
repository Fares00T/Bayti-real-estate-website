import prisma from "./prisma.js";
import { attachMember, personalListingsBlockJoin } from "./agency.js";

// Agency invitations: an agency asks an existing account to join its team,
// and nothing changes for that person until they accept.

export const INVITE_DAYS = 14;

// Applications still being worked on (an applicant can't also join someone else)
const OPEN_APPLICATION = ["draft", "submitted", "under_review", "info_required", "resubmitted"];

// Why `user` can't join an agency right now, or null
export const joinRefusal = async (db, user) => {
  if (user.role === "admin") return "Bayti staff accounts can't join an agency.";
  if (user.status !== "active") return "That account is suspended.";
  if (user.agencyId) return "That account already belongs to an agency.";
  const open = await db.agencyApplication.count({ where: { applicantId: user.id, status: { in: OPEN_APPLICATION } } });
  if (open) return "That account has its own agency application in progress.";
  return personalListingsBlockJoin(db, user.id);
};

// Accepts invitation `id` for `userId`. Re-checks everything under a lock on
// the account, so two invitations accepted at once can't both go through.
// Returns { agency } or { error, status }.
export const acceptInvitation = (id, userId) =>
  prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM \`User\` WHERE id = ${userId} FOR UPDATE`;
    const invitation = await tx.agencyInvitation.findFirst({
      where: { id, userId, status: "pending" },
      include: { agency: { select: { id: true, tradeName: true, status: true, ownerId: true } } },
    });
    if (!invitation || invitation.expiresAt < new Date()) return { error: "This invitation is no longer valid.", status: 404 };
    if (invitation.agency.status !== "active") return { error: "This agency is currently suspended.", status: 409 };
    const user = await tx.user.findUnique({ where: { id: userId } });
    const refusal = await joinRefusal(tx, user);
    if (refusal) return { error: refusal.replace("That account", "Your account"), status: 409 };

    await attachMember(tx, userId, invitation.agencyId, invitation.agencyRole);
    await tx.agencyInvitation.update({ where: { id }, data: { status: "accepted", respondedAt: new Date() } });
    // other agencies' invitations lapse: one agency at a time
    await tx.agencyInvitation.updateMany({
      where: { userId, status: "pending", id: { not: id } },
      data: { status: "revoked", respondedAt: new Date() },
    });
    return { agency: invitation.agency, invitation };
  });
