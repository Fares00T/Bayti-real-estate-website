import express from "express";
import prisma from "../lib/prisma.js";
import { agencyAppLink } from "../lib/agency.js";
import { acceptInvitation } from "../lib/invitations.js";
import { audit, notifyUser } from "../lib/notify.js";
import { toId } from "../lib/util.js";
import { sessionCookie } from "../lib/platform.js";
import { verifyToken } from "../middleware/verifyToken.js";

// The signed-in person's invitations to join an agency. Accepting is the only
// way an existing account becomes an agency member.
const router = express.Router();

router.use(verifyToken);

router.get("/", async (req, res) => {
  const items = await prisma.agencyInvitation.findMany({
    where: { userId: req.userId, status: "pending", expiresAt: { gt: new Date() } },
    include: {
      agency: { select: { id: true, tradeName: true, logo: true, wilaya: true } },
      invitedBy: { select: { username: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.status(200).json(items);
});

router.post("/:id/accept", async (req, res) => {
  try {
    const result = await acceptInvitation(toId(req.params.id) || 0, req.userId);
    if (result.error) return res.status(result.status).json({ message: result.error });
    const { agency, invitation } = result;
    const me = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
    await audit(req, {
      action: "agency.member_join",
      entityType: "agency",
      entityId: agency.id,
      summary: `${me.username} accepted the invitation and joined as ${invitation.agencyRole}`,
      details: { userId: req.userId, invitationId: invitation.id },
    });
    if (invitation.invitedById) {
      await notifyUser(invitation.invitedById, {
        type: "agency_invite_accepted",
        title: `${me.username} joined ${agency.tradeName}`,
        link: agencyAppLink("/team"),
      });
    }
    // From now on this account works on the agency platform only
    const me2 = await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true } });
    res
      .clearCookie("token", sessionCookie())
      .status(200)
      .json({ agency, redirect: agencyAppLink(`/login?email=${encodeURIComponent(me2.email)}`) });
  } catch (err) {
    console.error("Failed to accept invitation:", err);
    res.status(500).json({ message: "Couldn't accept the invitation." });
  }
});

router.post("/:id/decline", async (req, res) => {
  const id = toId(req.params.id) || 0;
  const invitation = await prisma.agencyInvitation.findFirst({ where: { id, userId: req.userId, status: "pending" } });
  if (!invitation) return res.status(404).json({ message: "This invitation is no longer valid." });
  await prisma.agencyInvitation.update({ where: { id }, data: { status: "declined", respondedAt: new Date() } });
  if (invitation.invitedById) {
    await notifyUser(invitation.invitedById, {
      type: "agency_invite_declined",
      title: "An invitation to your team was declined",
      link: agencyAppLink("/team"),
    });
  }
  res.status(200).json({ ok: true });
});

export default router;
