import prisma from "../lib/prisma.js";
import {
  CLIENT_INQUIRY_INCLUDE,
  inquiryRefusal,
  messageFrom,
  notifyInquiry,
  openInquiry,
  visitFrom,
} from "../lib/inquiries.js";
import { agencyAppLink } from "../lib/agency.js";
import { notifyUser } from "../lib/notify.js";
import { str, toId } from "../lib/util.js";
import { PUBLIC_POST_WHERE } from "./post.controller.js";

// Inquiries on the marketplace: a client asking about a listing or requesting
// a visit, tracking them, and individual owners answering theirs. Agencies
// answer from the agency platform (agencyInsights.controller.js).

// POST /inquiries { postId, message?, visit?: { contactPhone, preferredDate, preferredTime } }
export const createInquiry = async (req, res) => {
  const postId = toId(req.body?.postId);
  const { text, error } = messageFrom(req.body?.message);
  if (error) return res.status(400).json({ message: error });

  let visit = null;
  if (req.body?.visit) {
    const parsed = visitFrom(req.body.visit);
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    visit = parsed.visit;
  }
  if (!text && !visit) return res.status(400).json({ message: "Write a message or choose a visit time." });

  try {
    // Only live listings take inquiries; a suspended agency's are not live
    const post = postId && (await prisma.post.findFirst({ where: { id: postId, ...PUBLIC_POST_WHERE } }));
    if (!post) return res.status(404).json({ message: "This listing is no longer available." });
    const refusal = inquiryRefusal(req.user, post);
    if (refusal) return res.status(400).json({ message: refusal });

    const { inquiry, created, reopened } = await openInquiry(req.userId, post, { text, visit });
    if (created || reopened || visit) {
      const me = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
      await notifyInquiry(inquiry, { clientName: me.username, visit: Boolean(visit) });
    }
    res.status(created ? 201 : 200).json(inquiry);
  } catch (err) {
    console.error("Failed to create inquiry:", err);
    res.status(500).json({ message: "Couldn't send your inquiry." });
  }
};

// GET /inquiries/mine — the client's inquiries, newest activity first
export const getMyInquiries = async (req, res) => {
  const items = await prisma.inquiry.findMany({
    where: { clientId: req.userId },
    include: CLIENT_INQUIRY_INCLUDE,
    orderBy: { updatedAt: "desc" },
  });
  res.status(200).json(items);
};

// GET /inquiries/post/:postId — the caller's inquiry about a listing, if any
export const getInquiryForPost = async (req, res) => {
  const postId = toId(req.params.postId);
  const inquiry =
    postId &&
    (await prisma.inquiry.findUnique({
      where: { clientId_postId: { clientId: req.userId, postId } },
      include: CLIENT_INQUIRY_INCLUDE,
    }));
  res.status(200).json(inquiry || null);
};

// GET /inquiries/received — inquiries about the caller's own (individual) listings
export const getReceivedInquiries = async (req, res) => {
  const items = await prisma.inquiry.findMany({
    where: { ownerId: req.userId, agencyId: null },
    include: {
      post: { select: { id: true, title: true, images: true, city: true } },
      client: { select: { id: true, username: true, avatar: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  res.status(200).json(items);
};

// What each side may do next with an inquiry
export const OWNER_NEXT = {
  open: ["scheduled", "declined", "closed"],
  scheduled: ["closed", "declined"],
};

const NOTICE = {
  scheduled: (i) => [`Your visit of “${i.postTitle}” is confirmed`, `${i.confirmedDate} at ${i.confirmedTime}.`],
  declined: (i) => [`Your request about “${i.postTitle}” was declined`, i.declineReason],
};

// Applies an owner-side status change and tells the client. Shared with the
// agency platform. Returns the updated inquiry, or { error, status }.
export const changeInquiryStatus = async (inquiry, body, { by }) => {
  const status = body?.status;
  if (!OWNER_NEXT[inquiry.status]?.includes(status)) {
    return { error: `An inquiry that is ${inquiry.status} can't be marked ${status}.`, status: 409 };
  }
  const data = { status };
  if (status === "scheduled") {
    data.confirmedDate = str(body.confirmedDate, 20) || inquiry.preferredDate;
    data.confirmedTime = str(body.confirmedTime, 20) || inquiry.preferredTime;
    if (!data.confirmedDate || !data.confirmedTime) return { error: "Choose the visit date and time.", status: 400 };
  }
  if (status === "declined") data.declineReason = str(body.declineReason, 1000);

  const updated = await prisma.inquiry.update({ where: { id: inquiry.id }, data });
  if (NOTICE[status]) {
    const [title, text] = NOTICE[status](updated);
    await notifyUser(updated.clientId, {
      type: `inquiry_${status}`,
      title,
      body: [text, by && `— ${by}`].filter(Boolean).join(" "),
      link: "/profile?tab=inquiries",
    });
  }
  return { inquiry: updated };
};

// PUT /inquiries/:id — the client cancels; an individual owner answers
export const updateInquiry = async (req, res) => {
  const id = toId(req.params.id);
  const inquiry = id && (await prisma.inquiry.findUnique({ where: { id } }));
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found." });

  if (inquiry.clientId === req.userId) {
    if (req.body?.status !== "cancelled") return res.status(400).json({ message: "You can only cancel your inquiry." });
    if (!["open", "scheduled"].includes(inquiry.status)) return res.status(409).json({ message: "This inquiry is already closed." });
    const updated = await prisma.inquiry.update({ where: { id }, data: { status: "cancelled" } });
    const to = inquiry.assignedToId || inquiry.ownerId;
    if (to) {
      await notifyUser(to, {
        type: "inquiry_cancelled",
        title: `A client cancelled their request about “${inquiry.postTitle}”`,
        link: inquiry.agencyId ? agencyAppLink("/inquiries") : "/profile?tab=messages",
      });
    }
    return res.status(200).json(updated);
  }

  // Agency inquiries are answered from the agency platform
  if (inquiry.agencyId || inquiry.ownerId !== req.userId) return res.status(404).json({ message: "Inquiry not found." });
  const result = await changeInquiryStatus(inquiry, req.body, {});
  if (result.error) return res.status(result.status).json({ message: result.error });
  res.status(200).json(result.inquiry);
};
