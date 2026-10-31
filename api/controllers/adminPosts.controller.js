import prisma from "../lib/prisma.js";
import { audit, notifyUser } from "../lib/notify.js";
import { PROPERTY_TYPES } from "../lib/settings.js";
import { str, toId } from "../lib/util.js";
import { DETAIL_FIELDS, signPreview } from "./post.controller.js";

const STATUSES = ["pending", "approved", "rejected", "unpublished", "archived"];
const AVAILABILITY = ["available", "under_offer", "sold", "rented"];
const COMMERCIAL_TYPES = ["office", "retail", "hospitality", "industrial"];

// ---------- overview ----------

export const getOverview = async (req, res) => {
  try {
    const [usersByRole, postsByStatus, viewsAgg, usersByDay, postsByDay, applications, agencies, openReports, inactive] =
      await Promise.all([
        prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
        prisma.post.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.postDetail.aggregate({ _sum: { views: true } }),
        prisma.$queryRawUnsafe(
          "SELECT DATE(createdAt) AS date, COUNT(*) AS count FROM `User` GROUP BY date ORDER BY date ASC"
        ),
        prisma.$queryRawUnsafe(
          "SELECT DATE(createdAt) AS date, COUNT(*) AS count FROM `Post` GROUP BY date ORDER BY date ASC"
        ),
        prisma.agencyApplication.count({ where: { status: { in: ["submitted", "resubmitted", "under_review"] } } }),
        prisma.agency.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.report.count({ where: { status: "open" } }),
        prisma.user.count({ where: { status: { not: "active" } } }),
      ]);

    const day = (rows) =>
      rows.map((r) => ({
        date: new Date(r.date).toISOString().slice(0, 10),
        count: Number(r.count),
      }));

    res.status(200).json({
      usersByRole: Object.fromEntries(usersByRole.map((r) => [r.role, r._count._all])),
      postsByStatus: Object.fromEntries(
        STATUSES.map((s) => [s, postsByStatus.find((r) => r.status === s)?._count._all || 0])
      ),
      totalViews: viewsAgg._sum.views || 0,
      usersByDay: day(usersByDay),
      postsByDay: day(postsByDay),
      applicationsWaiting: applications,
      agenciesByStatus: Object.fromEntries(agencies.map((r) => [r.status, r._count._all])),
      openReports,
      inactiveUsers: inactive,
    });
  } catch (err) {
    console.error("Failed to load overview:", err);
    res.status(500).json({ message: "Failed to load statistics." });
  }
};

// ---------- listings ----------

const ownerSelect = {
  select: {
    id: true, username: true, email: true, role: true, avatar: true,
    phone: true, status: true, agencyId: true,
  },
};
const agencyBrief = { select: { id: true, tradeName: true, status: true } };

// GET /admin/posts?status=pending|approved|rejected|unpublished|archived|all
export const listPosts = async (req, res) => {
  const status = req.query.status || "all";
  if (status !== "all" && !STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const [posts, counts] = await Promise.all([
      prisma.post.findMany({
        where: status === "all" ? {} : { status },
        include: {
          user: ownerSelect,
          agency: agencyBrief,
          postDetail: { select: { desc: true, views: true, size: true } },
          _count: { select: { reports: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.post.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

    const summary = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    counts.forEach((c) => (summary[c.status] = c._count._all));
    res.status(200).json({ posts, counts: summary });
  } catch (err) {
    console.error("Failed to list posts:", err);
    res.status(500).json({ message: "Failed to load listings." });
  }
};

export const getPostAdmin = async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid post ID" });

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        user: ownerSelect,
        agency: agencyBrief,
        postDetail: true,
        reports: { select: { id: true, reason: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" } },
        createdBy: { select: { id: true, username: true } },
        _count: { select: { savedPosts: true, inquiries: true } },
      },
    });
    if (!post) return res.status(404).json({ message: "Listing not found." });
    const history = await prisma.auditLog.findMany({
      where: { entityType: "post", entityId: id },
      include: { actor: { select: { id: true, username: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    res.status(200).json({ ...post, history });
  } catch (err) {
    console.error("Failed to load post:", err);
    res.status(500).json({ message: "Failed to load listing." });
  }
};

const int = (v, label) => {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n) || n < 0) throw new Error(`Invalid ${label}.`);
  return n;
};

// Validates an admin listing payload; `creating` makes the core fields required.
// Throws an Error whose message is shown to the admin.
export const listingFrom = async ({ postData = {}, postDetail = {} }, { creating, current }) => {
  const data = {};
  const has = (k) => postData[k] !== undefined;

  if (has("title") || creating) {
    data.title = str(postData.title, 190);
    if (!data.title) throw new Error("The title can't be empty.");
  }
  if (has("price") || creating) data.price = int(postData.price, "price");
  for (const k of ["bedroom", "bathroom"]) if (has(k) || creating) data[k] = int(postData[k] ?? 0, k);
  for (const k of ["address", "city", "district"]) {
    if (has(k) || creating) {
      data[k] = str(postData[k]);
      if (!data[k]) throw new Error(`The ${k === "city" ? "wilaya" : k} is required.`);
    }
  }
  for (const k of ["latitude", "longitude"]) {
    if (has(k) || creating) {
      const n = Number(postData[k]);
      if (postData[k] === "" || postData[k] === null || !Number.isFinite(n)) throw new Error(`Invalid ${k}.`);
      data[k] = String(n);
    }
  }
  if (has("type") || creating) {
    if (!["buy", "rent"].includes(postData.type)) throw new Error("Choose sale or rent.");
    data.type = postData.type;
  }
  if (has("property") || creating) {
    if (!["residential", "commercial"].includes(postData.property)) throw new Error("Choose a category.");
    data.property = postData.property;
  }
  if (has("propertyType") || creating) {
    if (!PROPERTY_TYPES.includes(postData.propertyType)) throw new Error("Choose a property type.");
    data.propertyType = postData.propertyType;
  }
  const property = data.property || current?.property;
  const propertyType = data.propertyType || current?.propertyType;
  if (property && propertyType && COMMERCIAL_TYPES.includes(propertyType) !== (property === "commercial")) {
    throw new Error("The property type doesn't match the category.");
  }
  if (has("images") || creating) {
    const images = postData.images ?? [];
    if (!Array.isArray(images) || images.length > 50 || images.some((u) => !/^https:\/\/\S+$/i.test(String(u)))) {
      throw new Error("Photos must be uploaded image links.");
    }
    data.images = images;
  }
  if (has("availability")) {
    if (!AVAILABILITY.includes(postData.availability)) throw new Error("Unknown availability.");
    data.availability = postData.availability;
  }
  if (has("featured")) data.featured = Boolean(postData.featured);
  if (has("status")) {
    if (!STATUSES.includes(postData.status)) throw new Error("Unknown status.");
    data.status = postData.status;
  }

  // Ownership: an agency listing belongs to the agency and may have an agent
  // (userId) or none; a personal listing belongs to the account in userId
  let responsible = null;
  if (has("userId") || creating) {
    const empty = postData.userId === null || postData.userId === "";
    const userId = toId(postData.userId);
    responsible = userId && (await prisma.user.findUnique({ where: { id: userId }, select: { id: true, agencyId: true } }));
    if (!responsible && !(empty && !creating)) throw new Error("Choose the account that owns this listing.");
    data.userId = responsible?.id ?? null;
    if (responsible && !has("agencyId")) data.agencyId = responsible.agencyId;
  }
  if (has("agencyId")) {
    const agencyId = postData.agencyId === null || postData.agencyId === "" ? null : toId(postData.agencyId);
    if (agencyId && !(await prisma.agency.findUnique({ where: { id: agencyId }, select: { id: true } }))) {
      throw new Error("That agency doesn't exist.");
    }
    data.agencyId = agencyId;
  }
  const agencyId = "agencyId" in data ? data.agencyId : current?.agencyId ?? null;
  const userId = "userId" in data ? data.userId : current?.userId ?? null;
  if (!agencyId && !userId) throw new Error("A personal listing needs its owner.");
  if (agencyId && userId && ("userId" in data || "agencyId" in data)) {
    const member = responsible || (await prisma.user.findUnique({ where: { id: userId }, select: { agencyId: true } }));
    if (member?.agencyId !== agencyId) throw new Error("The assigned agent must be a member of the listing's agency.");
  }

  const detail = {};
  for (const k of DETAIL_FIELDS) {
    if (postDetail[k] === undefined) continue;
    detail[k] =
      k === "size" ? parseInt(postDetail[k], 10) || null
      : k === "desc" ? String(postDetail[k] ?? "").slice(0, 10000)
      : str(postDetail[k]);
  }
  return { data, detail };
};

const postLabel = (p) => `"${p.title}" (#${p.id})`;

export const createPostAdmin = async (req, res) => {
  let parsed;
  try {
    parsed = await listingFrom(req.body || {}, { creating: true });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
  const { data, detail } = parsed;
  // Listings created by the team go live unless told otherwise
  data.status = data.status || "approved";
  data.reviewedAt = new Date();

  try {
    const post = await prisma.$transaction(async (tx) => {
      const created = await tx.post.create({ data: { ...data, createdById: req.admin.id } });
      await tx.postDetail.create({
        data: {
          ...detail,
          desc: detail.desc || "",
          postId: created.id,
          Matricule: `PROP-${created.id.toString().padStart(6, "0")}`,
        },
      });
      return created;
    });
    await audit(req, {
      action: "post.create",
      entityType: "post",
      entityId: post.id,
      summary: `Created listing ${postLabel(post)} for user #${post.userId}`,
    });
    res.status(201).json(post);
  } catch (err) {
    console.error("Failed to create post:", err);
    res.status(500).json({ message: "Couldn't create the listing." });
  }
};

// Admin corrections keep the listing's review status unless one is sent
export const updatePostAdmin = async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid post ID" });

  try {
    const current = await prisma.post.findUnique({ where: { id }, include: { postDetail: true } });
    if (!current) return res.status(404).json({ message: "Listing not found." });

    let parsed;
    try {
      parsed = await listingFrom(req.body || {}, { creating: false, current });
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
    const { data, detail } = parsed;
    if (data.status && data.status !== current.status) data.reviewedAt = new Date();

    const post = await prisma.$transaction(async (tx) => {
      const updated = await tx.post.update({ where: { id }, data });
      if (Object.keys(detail).length) {
        await tx.postDetail.upsert({
          where: { postId: id },
          update: detail,
          create: { ...detail, desc: detail.desc || "", postId: id },
        });
      }
      return updated;
    });

    const changedPost = Object.keys(data).filter(
      (k) => k !== "reviewedAt" && JSON.stringify(current[k]) !== JSON.stringify(data[k])
    );
    const changedDetail = Object.keys(detail).filter(
      (k) => String(current.postDetail?.[k] ?? "") !== String(detail[k] ?? "")
    );
    if (changedPost.length || changedDetail.length) {
      const brief = (k, from, to) => (["images", "desc"].includes(k) ? [k, "changed"] : [k, { from, to }]);
      await audit(req, {
        action: "post.update",
        entityType: "post",
        entityId: id,
        summary: `Edited ${postLabel(post)}: ${[...changedPost, ...changedDetail].join(", ")}`,
        details: Object.fromEntries([
          ...changedPost.map((k) => brief(k, current[k], data[k])),
          ...changedDetail.map((k) => brief(k, current.postDetail?.[k], detail[k])),
        ]),
      });
    }
    res.status(200).json(post);
  } catch (err) {
    console.error("Failed to update post:", err);
    res.status(500).json({ message: "Failed to save the listing." });
  }
};

const STATUS_NOTICE = {
  approved: (t) => [`Your listing "${t}" is live`, "It's now visible on the marketplace."],
  rejected: (t, n) => [`Your listing "${t}" needs changes`, `Reason: ${n}\n\nEdit the listing to send it back for review.`],
  unpublished: (t, n) => [`Your listing "${t}" was taken offline`, n ? `Reason: ${n}` : "Contact Bayti support for details."],
  archived: (t) => [`Your listing "${t}" was archived`, "It's no longer on the market."],
};

// PUT /admin/posts/:id/status { status, note }
export const setPostStatus = async (req, res) => {
  const id = toId(req.params.id);
  const { status } = req.body || {};
  const reason = str(req.body?.note, 1000) || "";

  if (!id) return res.status(400).json({ message: "Invalid post ID" });
  if (!STATUSES.includes(status)) return res.status(400).json({ message: "Unknown status." });
  if (status === "rejected" && !reason) {
    return res.status(400).json({ message: "Please give the owner a reason for the rejection" });
  }

  try {
    const before = await prisma.post.findUnique({ where: { id }, select: { status: true } });
    if (!before) return res.status(404).json({ message: "Listing not found." });
    const post = await prisma.post.update({
      where: { id },
      data: {
        status,
        reviewNote: ["rejected", "unpublished"].includes(status) ? reason || null : null,
        reviewedAt: new Date(),
      },
      select: { id: true, title: true, status: true, reviewNote: true, reviewedAt: true, userId: true },
    });
    await audit(req, {
      action: `post.${status}`,
      entityType: "post",
      entityId: id,
      summary: `${postLabel(post)}: ${before.status} → ${status}${reason ? ` (${reason})` : ""}`,
    });
    if (before.status !== status && STATUS_NOTICE[status]) {
      const [title, body] = STATUS_NOTICE[status](post.title, reason);
      await notifyUser(post.userId, { type: `listing_${status}`, title, body, link: `/${post.id}` });
    }
    res.status(200).json(post);
  } catch (err) {
    console.error("Failed to change post status:", err);
    res.status(500).json({ message: "Failed to update listing status" });
  }
};

// PUT /admin/posts/:id/review { decision: "approve" | "reject", note } — kept for older clients
export const reviewPost = (req, res) => {
  const { decision } = req.body || {};
  if (!["approve", "reject"].includes(decision)) {
    return res.status(400).json({ message: "Decision must be approve or reject" });
  }
  req.body.status = decision === "approve" ? "approved" : "rejected";
  return setPostStatus(req, res);
};

// A 30-minute token to see the listing exactly as the marketplace renders it,
// even while it isn't public
export const getPreviewLink = async (req, res) => {
  const id = toId(req.params.id);
  const post = id && (await prisma.post.findUnique({ where: { id }, select: { id: true } }));
  if (!post) return res.status(404).json({ message: "Listing not found." });
  res.status(200).json({ token: signPreview(post.id) });
};

export const deletePostAdmin = async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid post ID" });

  try {
    const post = await prisma.post.findUnique({ where: { id }, select: { id: true, title: true, userId: true } });
    if (!post) return res.status(404).json({ message: "Listing not found." });
    await prisma.$transaction([
      prisma.savedPost.deleteMany({ where: { postId: id } }),
      prisma.postDetail.deleteMany({ where: { postId: id } }),
      prisma.post.delete({ where: { id } }),
    ]);
    await audit(req, {
      action: "post.delete",
      entityType: "post",
      entityId: id,
      summary: `Deleted listing ${postLabel(post)} of user #${post.userId}`,
    });
    res.status(200).json({ message: "Listing deleted." });
  } catch (err) {
    console.error("Failed to delete post:", err);
    res.status(500).json({ message: "Failed to delete the listing." });
  }
};
