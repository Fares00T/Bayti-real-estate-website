import prisma from "./prisma.js";
import { agencyAppLink } from "./agency.js";
import { notifyUser } from "./notify.js";
import { str } from "./util.js";

// Inquiries: a client's question or visit request about one property, with
// its conversation. Where an inquiry goes is always worked out here from the
// listing in the database, never from anything the client sends:
//   agency listing     → the agency (agencyId) and its assigned agent
//   individual listing → the owner (ownerId)

export const MAX_MESSAGE = 2000;

export const routeFor = (post) =>
  post.agencyId
    ? { agencyId: post.agencyId, ownerId: null, assignedToId: post.userId ?? null }
    : { agencyId: null, ownerId: post.userId, assignedToId: null };

// Why `user` can't send an inquiry about `post`, or null
export const inquiryRefusal = (user, post) => {
  if (!post.agencyId && post.userId === user.id) return "This is your own listing.";
  if (post.agencyId && post.agencyId === user.agencyId) return "This listing belongs to your agency.";
  return null;
};

const VISIT_FIELDS = ["contactPhone", "preferredDate", "preferredTime"];

// Validated visit details from a request body, or an error message
export const visitFrom = (body = {}) => {
  const visit = {
    contactPhone: str(body.contactPhone, 40),
    preferredDate: str(body.preferredDate, 20),
    preferredTime: str(body.preferredTime, 20),
  };
  if (VISIT_FIELDS.some((k) => !visit[k])) return { error: "Give a phone number, a date and a time for the visit." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(visit.preferredDate)) return { error: "Choose a valid date." };
  return { visit };
};

export const messageFrom = (value) => {
  const text = String(value ?? "").trim();
  if (text.length > MAX_MESSAGE) return { error: `Messages are limited to ${MAX_MESSAGE} characters.` };
  return { text };
};

// Adds a message to a conversation and keeps its preview and the sender's
// read position in step
export const postMessage = async (tx, chatId, userId, text) => {
  const message = await tx.message.create({ data: { text, userId, chatId } });
  await tx.chat.update({ where: { id: chatId }, data: { lastMessage: text } });
  await markRead(tx, chatId, userId);
  return message;
};

// The reader's position in a conversation; agency members get their row the
// first time they open a thread of their agency
export const markRead = (db, chatId, userId) =>
  db.chatUser.upsert({
    where: { chatId_userId: { chatId, userId } },
    update: { lastReadAt: new Date() },
    create: { chatId, userId, lastReadAt: new Date() },
  });

// Opens a client's inquiry about `post`, or adds to the one they already
// have (one thread per client and property). `visit` turns it into a visit
// request; `text` is the first or next message. Returns { inquiry, created }.
export const openInquiry = async (clientId, post, { text, visit }) => {
  const route = routeFor(post);
  return prisma.$transaction(async (tx) => {
      // One client's inquiries are written one at a time: simultaneous first
      // messages queue here instead of racing to create two threads
      await tx.$queryRaw`SELECT id FROM \`User\` WHERE id = ${clientId} FOR UPDATE`;
      let inquiry = await tx.inquiry.findUnique({ where: { clientId_postId: { clientId, postId: post.id } } });
      const created = !inquiry;
      const reopen = inquiry && !["open", "scheduled"].includes(inquiry.status);

      if (!inquiry) {
        const chat = await tx.chat.create({
          data: {
            users: {
              // the individual owner is a participant; agency members are added
              // as they open the thread
              create: [{ userId: clientId }, ...(route.ownerId ? [{ userId: route.ownerId }] : [])],
            },
          },
        });
        inquiry = await tx.inquiry.create({
          data: {
            ...route,
            clientId,
            postId: post.id,
            postTitle: post.title.slice(0, 190),
            chatId: chat.id,
            type: visit ? "visit" : "question",
            message: text || null,
            ...(visit || {}),
          },
        });
      } else {
        inquiry = await tx.inquiry.update({
          where: { id: inquiry.id },
          data: {
            // a closed or declined inquiry comes back to life; the routing is
            // refreshed in case the listing changed hands since
            ...(reopen ? { status: "open", declineReason: null, ...route } : {}),
            ...(visit
              ? { type: "visit", status: "open", confirmedDate: null, confirmedTime: null, declineReason: null, ...visit }
              : {}),
          },
        });
      }
      if (text) await postMessage(tx, inquiry.chatId, clientId, text);
      return { inquiry, created, reopened: Boolean(reopen) };
    });
};

// Who hears about a new inquiry: the assigned agent, else the agency's owner,
// else the individual owner
export const notifyInquiry = async (inquiry, { clientName, visit }) => {
  let to = inquiry.assignedToId || inquiry.ownerId;
  if (!to && inquiry.agencyId) {
    to = (await prisma.agency.findUnique({ where: { id: inquiry.agencyId }, select: { ownerId: true } }))?.ownerId;
  }
  if (!to) return;
  await notifyUser(to, {
    type: visit ? "inquiry_visit" : "inquiry_new",
    title: visit ? `${clientName} asked to visit “${inquiry.postTitle}”` : `New inquiry about “${inquiry.postTitle}”`,
    body: visit ? `${inquiry.preferredDate} at ${inquiry.preferredTime}` : `From ${clientName}`,
    link: inquiry.agencyId ? agencyAppLink(`/messages?chat=${inquiry.chatId}`) : "/profile?tab=messages",
  });
};

// What a client sees of an inquiry (their own, from the marketplace)
export const CLIENT_INQUIRY_INCLUDE = {
  post: { select: { id: true, title: true, images: true, city: true, district: true, price: true, type: true } },
  agency: { select: { id: true, tradeName: true, logo: true } },
  owner: { select: { id: true, username: true, avatar: true } },
  assignedTo: { select: { id: true, username: true, avatar: true } },
};
