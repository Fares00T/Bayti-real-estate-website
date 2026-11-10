import prisma from "../lib/prisma.js";
import { toId } from "../lib/util.js";
import { can } from "../middleware/requireAgency.js";
import { agencyAudit } from "./agency.controller.js";
import { listingScope } from "./agencyListings.controller.js";
import { agencyCtx, unreadTotal } from "./chat.controller.js";
import { changeInquiryStatus } from "./inquiry.controller.js";

// Overview, analytics, activity and customer inquiries for the agency
// platform. Agents get the same screens limited to their own listings.

const dayIndex = (date = new Date()) => Math.floor(date.getTime() / 86400000);

// Inquiries belong to the agency; agents see the ones assigned to them
export const inquiryScope = (req) => ({
  agencyId: req.agency.id,
  ...(can(req, "inquiries.all") ? {} : { assignedToId: req.userId }),
});

// Listing review outcomes are recorded on the listing, not in the audit log
const reviewEvents = async (req, take) => {
  const posts = await prisma.post.findMany({
    where: { ...listingScope(req), reviewedAt: { not: null }, status: { in: ["approved", "rejected", "unpublished"] } },
    select: { id: true, title: true, status: true, reviewedAt: true },
    orderBy: { reviewedAt: "desc" },
    take,
  });
  const verb = { approved: "Bayti published", rejected: "Bayti rejected", unpublished: "Bayti took down" };
  return posts.map((p) => ({
    id: `review-${p.id}-${p.reviewedAt.getTime()}`,
    action: `review.${p.status}`,
    summary: `${verb[p.status]} “${p.title}”`,
    createdAt: p.reviewedAt,
    actor: null,
    postId: p.id,
  }));
};

const recentActivity = async (req, take = 12) => {
  const [logs, reviews] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        entityType: "agency",
        entityId: req.agency.id,
        // agents follow their own actions; leads see the whole agency
        ...(can(req, "activity.agency") ? {} : { actorId: req.userId }),
      },
      select: { id: true, action: true, summary: true, createdAt: true, details: true, actor: { select: { id: true, username: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
      take,
    }),
    reviewEvents(req, take),
  ]);
  return [...logs.map(({ details, ...l }) => ({ ...l, postId: details?.postId ?? null })), ...reviews]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, take);
};

export const getOverview = async (req, res) => {
  try {
    const scope = listingScope(req);
    const [byStatus, hidden, byType, members, inquiries, views] = await Promise.all([
      prisma.post.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
      prisma.post.count({ where: { ...scope, status: "approved", hiddenByOwner: true } }),
      prisma.post.groupBy({ by: ["type"], where: { ...scope, status: { not: "archived" } }, _count: { _all: true } }),
      prisma.user.groupBy({ by: ["agencyRole", "agencyActive"], where: { agencyId: req.agency.id }, _count: { _all: true } }),
      prisma.inquiry.groupBy({ by: ["status"], where: inquiryScope(req), _count: { _all: true } }),
      prisma.postDetail.aggregate({ where: { post: scope }, _sum: { views: true } }),
    ]);
    const status = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all]));
    const type = Object.fromEntries(byType.map((t) => [t.type, t._count._all]));
    const inq = Object.fromEntries(inquiries.map((i) => [i.status, i._count._all]));
    const sum = (rows, test) => rows.filter(test).reduce((n, r) => n + r._count._all, 0);

    res.status(200).json({
      scope: can(req, "listings.all") ? "agency" : "mine",
      listings: {
        total: byStatus.reduce((n, s) => n + s._count._all, 0),
        published: (status.approved || 0) - hidden,
        offline: hidden + (status.unpublished || 0),
        pending: status.pending || 0,
        rejected: status.rejected || 0,
        archived: status.archived || 0,
        forSale: type.buy || 0,
        forRent: type.rent || 0,
      },
      team: {
        total: sum(members, () => true),
        agents: sum(members, (m) => m.agencyRole === "agent"),
        managers: sum(members, (m) => m.agencyRole === "manager"),
        inactive: sum(members, (m) => !m.agencyActive),
      },
      inquiries: {
        total: inquiries.reduce((n, i) => n + i._count._all, 0),
        open: inq.open || 0,
        scheduled: inq.scheduled || 0,
      },
      views: views._sum.views || 0,
      activity: await recentActivity(req),
    });
  } catch (err) {
    console.error("Failed to load agency overview:", err);
    res.status(500).json({ message: "Couldn't load the overview." });
  }
};

export const getAnalytics = async (req, res) => {
  const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const since = dayIndex() - (days - 1);
  const sinceDate = new Date(since * 86400000);
  const scope = listingScope(req);

  try {
    const [views, inquiries, posts, perAgentListings] = await Promise.all([
      prisma.postView.groupBy({ by: ["day"], where: { post: scope, day: { gte: since } }, _count: { _all: true } }),
      prisma.inquiry.findMany({ where: { ...inquiryScope(req), createdAt: { gte: sinceDate } }, select: { createdAt: true } }),
      prisma.post.findMany({
        where: { ...scope, status: { not: "archived" } },
        select: {
          id: true, title: true, city: true, status: true, hiddenByOwner: true, userId: true,
          postDetail: { select: { views: true } },
          _count: { select: { inquiries: true, savedPosts: true } },
        },
      }),
      can(req, "analytics.agency")
        ? prisma.user.findMany({ where: { agencyId: req.agency.id }, select: { id: true, username: true, avatar: true, agencyRole: true } })
        : null,
    ]);

    // One point per day, including the quiet ones
    const viewsByDay = new Map(views.map((v) => [v.day, v._count._all]));
    const inquiriesByDay = new Map();
    for (const i of inquiries) {
      const d = dayIndex(i.createdAt);
      inquiriesByDay.set(d, (inquiriesByDay.get(d) || 0) + 1);
    }
    const series = Array.from({ length: days }, (_, k) => {
      const day = since + k;
      return { date: new Date(day * 86400000).toISOString().slice(0, 10), views: viewsByDay.get(day) || 0, inquiries: inquiriesByDay.get(day) || 0 };
    });

    const top = posts
      .map((p) => ({
        id: p.id, title: p.title, city: p.city, published: p.status === "approved" && !p.hiddenByOwner,
        views: p.postDetail?.views || 0, inquiries: p._count.inquiries, saves: p._count.savedPosts,
      }))
      .sort((a, b) => b.views - a.views || b.inquiries - a.inquiries)
      .slice(0, 10);

    const agents = perAgentListings?.map((m) => {
      const mine = posts.filter((p) => p.userId === m.id);
      return {
        ...m,
        listings: mine.length,
        published: mine.filter((p) => p.status === "approved" && !p.hiddenByOwner).length,
        views: mine.reduce((n, p) => n + (p.postDetail?.views || 0), 0),
        inquiries: mine.reduce((n, p) => n + p._count.inquiries, 0),
      };
    });

    res.status(200).json({
      days,
      series,
      totals: {
        views: series.reduce((n, d) => n + d.views, 0),
        inquiries: inquiries.length,
        saves: posts.reduce((n, p) => n + p._count.savedPosts, 0),
      },
      top,
      agents: agents || null,
    });
  } catch (err) {
    console.error("Failed to load agency analytics:", err);
    res.status(500).json({ message: "Couldn't load analytics." });
  }
};

// Sidebar badges, polled by the dashboard
export const getCounters = async (req, res) => {
  const [inquiries, rejected, notifications, messages] = await Promise.all([
    prisma.inquiry.count({ where: { ...inquiryScope(req), status: "open" } }),
    prisma.post.count({ where: { ...listingScope(req), status: "rejected" } }),
    prisma.notification.count({ where: { audience: "user", userId: req.userId, readAt: null } }),
    unreadTotal(agencyCtx(req)),
  ]);
  res.status(200).json({ inquiries, rejected, notifications, messages: messages.unread });
};

export const getActivity = async (req, res) => {
  res.status(200).json(await recentActivity(req, 60));
};

// ---------- inquiries ----------

const INQUIRY_STATUSES = ["open", "scheduled", "closed", "declined", "cancelled"];

export const listInquiries = async (req, res) => {
  const where = { ...inquiryScope(req) };
  if (INQUIRY_STATUSES.includes(req.query.status)) where.status = req.query.status;
  if (req.query.type === "visit" || req.query.type === "question") where.type = req.query.type;
  if (req.query.assigned === "none" && can(req, "inquiries.all")) where.assignedToId = null;
  const items = await prisma.inquiry.findMany({
    where,
    include: {
      post: { select: { id: true, title: true, images: true, city: true, district: true } },
      client: { select: { id: true, username: true, email: true, avatar: true } },
      assignedTo: { select: { id: true, username: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  res.status(200).json(items);
};

// POST /chats { inquiryId } — the conversation behind an inquiry the caller
// can see, created for inquiries that started as a bare visit request
export const startClientChat = async (req, res) => {
  const id = toId(req.body?.inquiryId);
  const inquiry = id && (await prisma.inquiry.findFirst({ where: { id, ...inquiryScope(req) } }));
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found." });
  if (inquiry.chatId) return res.status(200).json({ id: inquiry.chatId });
  const chat = await prisma.$transaction(async (tx) => {
    const created = await tx.chat.create({ data: { users: { create: [{ userId: inquiry.clientId }] } } });
    // conditional so two clicks can't attach two chats
    const linked = await tx.inquiry.updateMany({ where: { id: inquiry.id, chatId: null }, data: { chatId: created.id } });
    if (!linked.count) {
      await tx.chat.delete({ where: { id: created.id } });
      return tx.inquiry.findUnique({ where: { id: inquiry.id }, select: { chatId: true } }).then((i) => ({ id: i.chatId }));
    }
    return created;
  });
  res.status(200).json({ id: chat.id });
};

// { status: scheduled|declined|closed, confirmedDate?, confirmedTime?, declineReason? }
export const updateInquiry = async (req, res) => {
  const id = toId(req.params.id);
  const inquiry = id && (await prisma.inquiry.findFirst({ where: { id, ...inquiryScope(req) } }));
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found." });

  const result = await changeInquiryStatus(inquiry, req.body, { by: req.agency.tradeName });
  if (result.error) return res.status(result.status).json({ message: result.error });
  const status = result.inquiry.status;
  await agencyAudit(req, {
    action: `agency.inquiry_${status}`,
    summary: `Marked the inquiry about “${inquiry.postTitle}” ${status}`,
    details: { postId: inquiry.postId, inquiryId: inquiry.id },
  });
  res.status(200).json(result.inquiry);
};

// PUT /inquiries/:id/assign { userId | null } — leads hand an inquiry to an agent
export const assignInquiry = async (req, res) => {
  const id = toId(req.params.id);
  const inquiry = id && (await prisma.inquiry.findFirst({ where: { id, agencyId: req.agency.id } }));
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found." });
  const to = toId(req.body?.userId);
  const member =
    to &&
    (await prisma.user.findFirst({
      where: { id: to, agencyId: req.agency.id, agencyActive: true, status: "active" },
      select: { id: true, username: true },
    }));
  if (to && !member) return res.status(400).json({ message: "Choose an active member of your agency." });
  const updated = await prisma.inquiry.update({ where: { id }, data: { assignedToId: member?.id ?? null } });
  await agencyAudit(req, {
    action: "agency.inquiry_assign",
    summary: member ? `Assigned the inquiry about “${inquiry.postTitle}” to ${member.username}` : `Unassigned the inquiry about “${inquiry.postTitle}”`,
    details: { postId: inquiry.postId, inquiryId: id, to: member?.id ?? null },
  });
  res.status(200).json(updated);
};
