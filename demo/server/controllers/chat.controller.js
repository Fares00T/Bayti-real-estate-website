import prisma from "../lib/prisma.js";
import { markRead, messageFrom, postMessage } from "../lib/inquiries.js";
import { can } from "../middleware/requireAgency.js";

// Conversations. There is no socket server: the apps poll these endpoints
// (cheaply, with `after`), so chat works on any host, and every request goes
// through the normal session checks.
//
// Two views of the same tables:
//   marketplace (/api/chats)        — a person's own conversations: as a
//     client, as an individual owner, and older person-to-person chats
//   agency      (/api/agency/chats) — the agency's client conversations, by
//     inquiry: owners and managers see all of them, agents the ones assigned
//     to them. They belong to the agency, not to whoever answered, so a
//     member who leaves loses access and the agency keeps the history.

const THREAD_LIMIT = 200;

const personSelect = { id: true, username: true, avatar: true };
const INQUIRY_SELECT = {
  id: true, type: true, status: true, postId: true, postTitle: true, clientId: true, agencyId: true,
  assignedToId: true, preferredDate: true, preferredTime: true, confirmedDate: true, confirmedTime: true,
  client: { select: personSelect },
  owner: { select: personSelect },
  agency: { select: { id: true, tradeName: true, logo: true, status: true } },
  assignedTo: { select: personSelect },
};

// ---------- who sees what ----------

const marketplaceCtx = (req) => ({ side: "marketplace", userId: req.userId });
const agencyCtx = (req) => ({
  side: "agency",
  userId: req.userId,
  agencyId: req.agency.id,
  all: can(req, "inquiries.all"),
});

// Chats visible in a context. On the marketplace a person sees chats they take
// part in, except the agency side of their agency's inquiries.
const visibleWhere = (ctx) =>
  ctx.side === "agency"
    ? { inquiry: { agencyId: ctx.agencyId, ...(ctx.all ? {} : { assignedToId: ctx.userId }) } }
    : {
        users: { some: { userId: ctx.userId } },
        OR: [{ inquiry: null }, { inquiry: { clientId: ctx.userId } }, { inquiry: { agencyId: null } }],
      };

// Unread messages per chat: what the other side sent after this person last read it
// Demo build: the production raw SQL, expressed with the in-memory client.
const unreadByChat = async (ctx) => {
  const counts = new Map();
  const countAfter = async (chatId, fromUserId, notFromUserId, lastReadAt) => {
    const n = await prisma.message.count({
      where: {
        chatId,
        ...(fromUserId != null ? { userId: fromUserId } : { userId: { not: notFromUserId } }),
        ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
      },
    });
    if (n) counts.set(chatId, n);
  };
  if (ctx.side === "agency") {
    const inquiries = await prisma.inquiry.findMany({
      where: {
        agencyId: ctx.agencyId,
        chatId: { not: null },
        ...(ctx.all ? {} : { assignedToId: ctx.userId }),
      },
      select: { chatId: true, clientId: true },
    });
    for (const i of inquiries) {
      const cu = await prisma.chatUser.findUnique({
        where: { chatId_userId: { chatId: i.chatId, userId: ctx.userId } },
        select: { lastReadAt: true },
      });
      await countAfter(i.chatId, i.clientId, null, cu?.lastReadAt);
    }
  } else {
    const memberships = await prisma.chatUser.findMany({
      where: { userId: ctx.userId },
      select: { chatId: true, lastReadAt: true, chat: { select: { inquiry: { select: { clientId: true, agencyId: true } } } } },
    });
    for (const cu of memberships) {
      const i = cu.chat?.inquiry;
      if (i && i.clientId !== ctx.userId && i.agencyId != null) continue;
      await countAfter(cu.chatId, null, ctx.userId, cu.lastReadAt);
    }
  }
  return counts;
};

// Who the conversation is with, as this context should show it
const counterpart = (chat, ctx) => {
  const inq = chat.inquiry;
  if (inq) {
    if (ctx.side === "agency" || inq.clientId !== ctx.userId) return inq.client && { ...inq.client, kind: "client" };
    if (inq.agency) {
      return {
        id: null,
        username: inq.agency.tradeName,
        agencyName: inq.agency.tradeName,
        avatar: inq.agency.logo,
        kind: "agency",
        agencyId: inq.agency.id,
      };
    }
    return inq.owner && { ...inq.owner, kind: "owner" };
  }
  const other = chat.users.find((u) => u.userId !== ctx.userId)?.user;
  return other && { ...other, kind: "person" };
};

const subjectOf = (inq) =>
  inq && {
    inquiryId: inq.id,
    type: inq.type,
    status: inq.status,
    postId: inq.postId,
    title: inq.postTitle,
    preferredDate: inq.preferredDate,
    preferredTime: inq.preferredTime,
    confirmedDate: inq.confirmedDate,
    confirmedTime: inq.confirmedTime,
    assignedTo: inq.assignedTo,
  };

// On the agency side, colleagues' replies count as "ours", and each message
// says who wrote it
const annotate = (messages, chat, ctx, names) =>
  messages.map((m) => ({
    ...m,
    fromClient: chat.inquiry ? m.userId === chat.inquiry.clientId : undefined,
    senderName: names.get(m.userId) ?? null,
  }));

const senderNames = async (messages) => {
  const ids = [...new Set(messages.map((m) => m.userId))];
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } }) : [];
  return new Map(users.map((u) => [u.id, u.username]));
};

// The chat if this context may see it, else answers 404 (or 400)
const loadVisible = async (req, res, ctx, chatId) => {
  if (!Number.isInteger(chatId)) {
    res.status(400).json({ message: "Invalid chat ID!" });
    return null;
  }
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, ...visibleWhere(ctx) },
    include: { inquiry: { select: INQUIRY_SELECT }, users: { include: { user: { select: personSelect } } } },
  });
  if (!chat) res.status(404).json({ message: "Conversation not found." });
  return chat;
};

// ---------- handlers ----------

const listChats = (ctxOf) => async (req, res) => {
  const ctx = ctxOf(req);
  try {
    const [chats, unread] = await Promise.all([
      prisma.chat.findMany({
        where: visibleWhere(ctx),
        include: {
          inquiry: { select: INQUIRY_SELECT },
          users: { include: { user: { select: personSelect } } },
          messages: { orderBy: { id: "desc" }, take: 1 },
        },
      }),
      unreadByChat(ctx),
    ]);
    const list = chats
      .map((chat) => {
        const last = chat.messages[0];
        return {
          id: chat.id,
          receiver: counterpart(chat, ctx),
          subject: subjectOf(chat.inquiry),
          lastMessage: last?.text || null,
          lastMessageAt: last?.createdAt || chat.createdAt,
          lastMessageMine:
            ctx.side === "agency" ? Boolean(last && chat.inquiry && last.userId !== chat.inquiry.clientId) : last?.userId === ctx.userId,
          unread: unread.get(chat.id) || 0,
        };
      })
      // an inquiry thread with no message yet has nothing to show
      .filter((c) => c.lastMessage || !c.subject)
      .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
    res.status(200).json(list);
  } catch (err) {
    console.error("Failed to list chats:", err);
    res.status(500).json({ message: "Failed to get chats!" });
  }
};

// Total unread messages across the context's conversations, for badges
export const unreadTotal = async (ctx) => {
  const unread = await unreadByChat(ctx);
  let total = 0;
  for (const n of unread.values()) total += n;
  return { unread: total, conversations: unread.size };
};

const unreadCount = (ctxOf) => async (req, res) => {
  try {
    res.status(200).json(await unreadTotal(ctxOf(req)));
  } catch (err) {
    console.error("Error counting unread messages:", err);
    res.status(500).json({ message: "Failed to count messages!" });
  }
};

// Opening a thread marks it read
const openChat = (ctxOf) => async (req, res) => {
  const ctx = ctxOf(req);
  try {
    const chat = await loadVisible(req, res, ctx, parseInt(req.params.id));
    if (!chat) return;
    const messages = (
      await prisma.message.findMany({ where: { chatId: chat.id }, orderBy: { id: "desc" }, take: THREAD_LIMIT })
    ).reverse();
    await markRead(prisma, chat.id, ctx.userId);
    res.status(200).json({
      id: chat.id,
      createdAt: chat.createdAt,
      receiver: counterpart(chat, ctx),
      subject: subjectOf(chat.inquiry),
      messages: annotate(messages, chat, ctx, await senderNames(messages)),
    });
  } catch (err) {
    console.error("Error while getting chat:", err);
    res.status(500).json({ message: "Failed to get chat!" });
  }
};

// GET .../:id/messages?after=<messageId> — only what's new since the last
// message the client has. This is what an open thread polls.
const newMessages = (ctxOf) => async (req, res) => {
  const ctx = ctxOf(req);
  const after = Math.max(0, parseInt(req.query.after) || 0);
  try {
    const chat = await loadVisible(req, res, ctx, parseInt(req.params.id));
    if (!chat) return;
    const messages = await prisma.message.findMany({
      where: { chatId: chat.id, id: { gt: after } },
      orderBy: { id: "asc" },
      take: THREAD_LIMIT,
    });
    if (messages.some((m) => m.userId !== ctx.userId)) await markRead(prisma, chat.id, ctx.userId);
    res.status(200).json(annotate(messages, chat, ctx, await senderNames(messages)));
  } catch (err) {
    console.error("Error while polling messages:", err);
    res.status(500).json({ message: "Failed to get messages!" });
  }
};

const sendMessage = (ctxOf) => async (req, res) => {
  const ctx = ctxOf(req);
  const { text, error } = messageFrom(req.body?.text);
  if (error) return res.status(400).json({ message: error });
  if (!text) return res.status(400).json({ message: "Message cannot be empty." });
  try {
    const chat = await loadVisible(req, res, ctx, parseInt(req.params.chatId));
    if (!chat) return;
    // someone deleted their account: nobody left to answer
    if (!counterpart(chat, ctx)) return res.status(409).json({ message: "This person is no longer on Bayti." });
    if (ctx.side === "marketplace" && chat.inquiry?.agency && chat.inquiry.agency.status !== "active") {
      return res.status(409).json({ message: "This agency is currently unavailable on Bayti." });
    }
    const message = await prisma.$transaction((tx) => postMessage(tx, chat.id, ctx.userId, text));
    const [annotated] = annotate([message], chat, ctx, new Map([[ctx.userId, req.member?.username ?? null]]));
    res.status(200).json(annotated);
  } catch (err) {
    console.error("Failed to send message:", err);
    res.status(500).json({ message: "Failed to add message!" });
  }
};

export const getChats = listChats(marketplaceCtx);
export const getUnreadTotal = unreadCount(marketplaceCtx);
export const getChat = openChat(marketplaceCtx);
export const getNewMessages = newMessages(marketplaceCtx);
export const addMessage = sendMessage(marketplaceCtx);

export const getAgencyChats = listChats(agencyCtx);
export const getAgencyUnread = unreadCount(agencyCtx);
export const getAgencyChat = openChat(agencyCtx);
export const getAgencyNewMessages = newMessages(agencyCtx);
export const addAgencyMessage = sendMessage(agencyCtx);
export { agencyCtx };
