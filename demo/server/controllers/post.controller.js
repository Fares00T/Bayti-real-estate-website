import prisma from "../lib/prisma.js";
import jwt from "../shims/jsonwebtoken.js";
import crypto from "../shims/crypto.js";
import { getSettings } from "../lib/settings.js";
import { notifyAdmins } from "../lib/notify.js";
import { AGENCY_BADGE_SELECT, agencyAppLink, publicAgency } from "../lib/agency.js";
import {
  ACTIVE_STATUSES,
  CLOSED_AVAILABILITY,
  ListingLimitError,
  limitResponse,
  listingUsage,
  ownerOf,
  withActiveSlot,
} from "../lib/listingLimits.js";
import { listingFrom } from "./adminPosts.controller.js";

// A listing's page is open to the public while it is approved, its lister
// hasn't paused it, and its owner is live: the individual's account, or the
// agency (an agency listing doesn't depend on which agent is assigned)
export const LIVE_POST_WHERE = {
  status: "approved",
  hiddenByOwner: false,
  OR: [{ agencyId: null, user: { status: "active" } }, { agencyId: { not: null }, agency: { status: "active" } }],
};
// Search, agency pages and inquiries only show what's still on the market
export const PUBLIC_POST_WHERE = { ...LIVE_POST_WHERE, availability: { notIn: CLOSED_AVAILABILITY } };

const isLive = (post) =>
  post.status === "approved" &&
  !post.hiddenByOwner &&
  (post.agencyId ? post.agency?.status === "active" : post.user?.status === "active");

// The marketplace manages personal listings only: agency listings are worked
// on from the agency platform, whoever is assigned to them
const ownsPersonally = (post, userId) => !post.agencyId && post.userId === userId;

// Fields only Bayti sets; a lister can't publish, feature or re-own a listing
const TEAM_ONLY = ["status", "featured", "userId", "agencyId", "createdById"];
const listerPayload = ({ postData = {}, postDetail = {} } = {}) => {
  const clean = { ...postData };
  for (const k of TEAM_ONLY) delete clean[k];
  return { postData: clean, postDetail };
};
// listingFrom throws plain Errors for bad input
const isValidationError = (err) => err instanceof Error && !err.code && !err.clientVersion;

export const PREVIEW_AUDIENCE = "bayti-preview";
const previewSecret = () => `${process.env.JWT_SECRET_KEY}:preview`;
// Short-lived link the admin dashboard hands out to view an unpublished listing
export const signPreview = (postId) =>
  jwt.sign({ postId }, previewSecret(), { audience: PREVIEW_AUDIENCE, expiresIn: "30m" });
const validPreview = (token, postId) => {
  try {
    return jwt.verify(String(token), previewSecret(), { audience: PREVIEW_AUDIENCE }).postId === postId;
  } catch {
    return false;
  }
};

// Settings-driven rules for what an owner may publish. Returns an error message or null.
// On edits, a type disabled later or a photo count above a lowered limit is
// only refused if the edit changes it.
export const checkListingRules = async (postData = {}, userId, { creating, current }) => {
  const { listings } = await getSettings();
  if (
    postData.propertyType &&
    postData.propertyType !== current?.propertyType &&
    !listings.enabledPropertyTypes.includes(postData.propertyType)
  ) {
    return "This property type isn't accepted on Bayti right now.";
  }
  const before = Array.isArray(current?.images) ? current.images.length : 0;
  if (Array.isArray(postData.images) && postData.images.length > Math.max(listings.maxImages, before)) {
    return `A listing can have up to ${listings.maxImages} photos.`;
  }
  // How many active listings an owner may have is enforced separately, under
  // a lock, by withActiveSlot (lib/listingLimits.js)
  return null;
};

export const announceForReview = async (post, edited) => {
  const { notifications } = await getSettings();
  if (!notifications.newListing) return;
  await notifyAdmins({
    type: edited ? "listing_edited" : "listing_submitted",
    title: edited ? `Edited listing to review: ${post.title}` : `New listing to review: ${post.title}`,
    body: [post.district, post.city].filter(Boolean).join(", ") || null,
    link: `/listings/${post.id}`,
  });
};

// Fields an owner may set on a listing. Anything else in the body (status,
// userId, review fields...) is ignored so owners can't self-approve.
export const POST_FIELDS = [
  "title", "price", "images", "address", "city", "district", "bedroom",
  "bathroom", "latitude", "longitude", "type", "property", "propertyType",
];
export const DETAIL_FIELDS = [
  "desc", "utilities", "pet", "size", "Furnished", "primarySchool",
  "kindergarten", "university", "carPark", "transportation", "highSchool",
  "middleSchool", "mosque", "pharmacy", "commercialArea",
];
export const pick = (obj = {}, keys) =>
  Object.fromEntries(
    keys.filter((k) => obj?.[k] !== undefined).map((k) => [k, obj[k]])
  );

// Reads the optional auth cookie on public routes. The role comes from the
// database, not the token, so a role change takes effect immediately.
const getViewer = async (req) => {
  const token = req.cookies?.token;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET_KEY);
    return await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, role: true },
    });
  } catch {
    return null;
  }
};

export const getPosts = async (req, res) => {
  const query = req.query;

  try {
    const posts = await prisma.post.findMany({
      where: {
        ...PUBLIC_POST_WHERE,
        featured: query.featured === "1" ? true : undefined,
        city: query.city || undefined,
        district: query.district || undefined,
        type: query.type || undefined,
        property: query.property || undefined,
        propertyType: query.propertyType || undefined,
        bedroom: parseInt(query.bedroom) ? { gte: parseInt(query.bedroom) } : undefined,
        price: {
          gte: parseInt(query.minPrice) || undefined,
          lte: parseInt(query.maxPrice) || undefined,
        },
      },
      include: {
        user: { select: { id: true, username: true } },
        postDetail: { select: { views: true } },
        agency: { select: AGENCY_BADGE_SELECT },
      },
      // featured listings first, newest first within each group
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });

    res.status(200).json(posts.map((p) => ({ ...p, agency: publicAgency(p.agency) })));
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
};

export const getPost = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  try {
    // Fetch the post including postDetail and user info
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        postDetail: true,
        user: { select: { id: true, username: true, avatar: true, phone: true, status: true } },
        agency: { select: AGENCY_BADGE_SELECT },
      },
    });

    if (!post) return res.status(404).json({ message: "Post not found!" });

    const viewer = await getViewer(req);
    const isOwner = Boolean(viewer && ownsPersonally(post, viewer.id));

    // Pending and rejected listings are only visible to their owner here;
    // admins review them through the admin API
    const isPublic = isLive(post);
    const isPreview = !isPublic && req.query.preview && validPreview(req.query.preview, post.id);
    if (!isPublic && !isOwner && !isPreview) {
      return res.status(404).json({ message: "Post not found!" });
    }
    if (post.user) delete post.user.status;

    let isSaved = false;
    if (viewer) {
      const saved = await prisma.savedPost.findUnique({
        where: { userId_postId: { postId: id, userId: viewer.id } },
      });
      isSaved = !!saved;
    }

    res.status(200).json({ ...post, agency: publicAgency(post.agency), isSaved, isOwner });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to get post" });
  }
};

export const generateMatricule = (postId) => `PROP-${postId.toString().padStart(6, "0")}`;

// Agency members publish for their agency, from the agency platform
const memberRefusal = (res) =>
  res.status(403).json({
    message: "You're a member of an agency: publish properties from your agency workspace.",
    code: "AGENCY_MEMBER",
    workspace: agencyAppLink("/listings/new"),
  });

export const addPost = async (req, res) => {
  const tokenUserId = req.userId;
  if (req.user.agencyId) return memberRefusal(res);

  const body = listerPayload(req.body);
  const ruleError = await checkListingRules(body.postData, tokenUserId, { creating: true });
  if (ruleError) return res.status(400).json({ message: ruleError });

  try {
    const { data, detail } = await listingFrom(
      { postData: { ...body.postData, userId: tokenUserId }, postDetail: body.postDetail },
      { creating: true }
    );

    // Every new listing waits for review in the admin dashboard. It takes one
    // of the owner's active slots, checked and written under one lock.
    const newPost = await withActiveSlot({ userId: tokenUserId }, async (tx) => {
      const created = await tx.post.create({
        data: { ...data, userId: tokenUserId, createdById: tokenUserId, agencyId: null, status: "pending" },
      });
      const postDetail = await tx.postDetail.create({
        data: {
          desc: "",
          ...detail,
          postId: created.id,
          Matricule: generateMatricule(created.id),
        },
      });
      return { ...created, postDetail };
    });

    await announceForReview(newPost, false);

    res.status(200).json(newPost);
  } catch (err) {
    if (err instanceof ListingLimitError) return limitResponse(res, err);
    if (isValidationError(err)) return res.status(400).json({ message: err.message });
    console.error("Failed to create post:", err);
    res.status(500).json({ message: "Failed to create post" });
  }
};

// Applies a lister's edit (marketplace or agency platform). Changes go back
// through review (configurable in the dashboard); listings the team took
// offline or archived stay that way. `extra` holds already-validated fields.
export const saveListingEdit = async (post, postData, postDetail, extra = {}) => {
  const { listings } = await getSettings();
  const locked = ["unpublished", "archived"].includes(post.status);
  const needsReview = !locked && (listings.reviewOwnerEdits || post.status !== "approved");
  const reviewData = needsReview
    ? { status: "pending", reviewNote: null, reviewedAt: null }
    : {};
  const postId = post.id;

  // A rejected listing that goes back to review, or a sold or rented one put
  // back on the market, becomes active again: it needs a free slot like a new one
  const availability = extra.availability ?? post.availability;
  const reopening =
    CLOSED_AVAILABILITY.includes(post.availability) &&
    !CLOSED_AVAILABILITY.includes(availability) &&
    ACTIVE_STATUSES.includes(needsReview ? "pending" : post.status);
  const reactivating = (needsReview && post.status === "rejected") || reopening;
  const run = (fn) => (reactivating ? withActiveSlot(ownerOf(post), fn) : prisma.$transaction(fn));

  const updatedPost = await run(async (tx) => {
    const updatedPost = await tx.post.update({
      where: { id: postId },
      data: {
        ...pick(postData, POST_FIELDS),
        images: postData?.images || [],
        ...extra,
        ...reviewData,
      },
    });

    const updatedPostDetail = await tx.postDetail.upsert({
      where: { postId },
      update: pick(postDetail, DETAIL_FIELDS),
      create: {
        ...pick(postDetail, DETAIL_FIELDS),
        desc: postDetail?.desc || "",
        postId,
      },
    });

    return {
      ...updatedPost,
      postDetail: updatedPostDetail,
    };
  });

  if (needsReview) await announceForReview(updatedPost, true);
  return updatedPost;
};

export const updatePost = async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const userId = req.userId;
  const { postData, postDetail } = req.body;

  if (isNaN(postId)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { postDetail: true },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found!" });
    }

    if (!ownsPersonally(post, userId)) {
      return res.status(403).json({ message: "Not Authorized!" });
    }

    const ruleError = await checkListingRules(postData, userId, { creating: false, current: post });
    if (ruleError) return res.status(400).json({ message: ruleError });

    const { data, detail } = await listingFrom(listerPayload({ postData, postDetail }), { creating: false, current: post });
    const updatedPost = await saveListingEdit(
      post,
      // the photo list is replaced as a whole; keep it when none was sent
      { ...data, images: data.images ?? post.images },
      detail,
      data.availability ? { availability: data.availability } : {}
    );
    res.status(200).json(updatedPost);
  } catch (err) {
    if (err instanceof ListingLimitError) return limitResponse(res, err);
    if (isValidationError(err)) return res.status(400).json({ message: err.message });
    console.error("Failed to update post:", err);
    res.status(500).json({ message: "Failed to update post" });
  }
};

// PUT /posts/:id/archive { archived } — an owner takes a listing off the
// market (freeing a slot) or brings it back, which needs a free slot and a
// new review
export const setPostArchived = async (req, res) => {
  const id = Number(req.params.id);
  const archived = Boolean(req.body?.archived);
  const post = Number.isInteger(id) && (await prisma.post.findUnique({ where: { id } }));
  if (!post) return res.status(404).json({ message: "Post not found!" });
  if (!ownsPersonally(post, req.userId)) return res.status(403).json({ message: "Not Authorized!" });
  if (post.status === "unpublished") {
    return res.status(409).json({ message: "Bayti took this listing down. Contact support to discuss it." });
  }
  if (archived === (post.status === "archived")) return res.status(200).json(post);

  try {
    const updated = archived
      ? await prisma.post.update({ where: { id }, data: { status: "archived" } })
      : await withActiveSlot(ownerOf(post), (tx) =>
          tx.post.update({ where: { id }, data: { status: "pending", reviewNote: null, reviewedAt: null } })
        );
    if (!archived) await announceForReview(updated, true);
    res.status(200).json(updated);
  } catch (err) {
    if (err instanceof ListingLimitError) return limitResponse(res, err);
    console.error("Failed to archive post:", err);
    res.status(500).json({ message: "Couldn't update the listing." });
  }
};

// GET /posts/usage — the signed-in account's active listings and allowance
export const getListingUsage = async (req, res) => {
  if (req.user.agencyId) {
    return res.status(200).json({ active: 0, limit: 0, remaining: 0, agencyMember: true, workspace: agencyAppLink("/listings") });
  }
  res.status(200).json(await listingUsage({ userId: req.userId }));
};

// PUT /posts/:id/availability { availability } — the owner marks a listing
// sold or rented (it leaves search and frees a slot) or back on the market
// (which needs a free slot). No new review: nothing about the property changed.
export const setPostAvailability = async (req, res) => {
  const id = Number(req.params.id);
  const availability = req.body?.availability;
  if (!["available", "under_offer", "sold", "rented"].includes(availability)) {
    return res.status(400).json({ message: "Unknown availability." });
  }
  const post = Number.isInteger(id) && (await prisma.post.findUnique({ where: { id } }));
  if (!post) return res.status(404).json({ message: "Post not found!" });
  if (!ownsPersonally(post, req.userId)) return res.status(403).json({ message: "Not Authorized!" });
  try {
    const reopening =
      CLOSED_AVAILABILITY.includes(post.availability) &&
      !CLOSED_AVAILABILITY.includes(availability) &&
      ACTIVE_STATUSES.includes(post.status);
    const write = (tx) => tx.post.update({ where: { id }, data: { availability } });
    const updated = reopening ? await withActiveSlot(ownerOf(post), write) : await prisma.$transaction(write);
    res.status(200).json(updated);
  } catch (err) {
    if (err instanceof ListingLimitError) return limitResponse(res, err);
    console.error("Failed to change availability:", err);
    res.status(500).json({ message: "Couldn't update the listing." });
  }
};

export const deletePost = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const tokenUserId = req.userId;

  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      include: { postDetail: true, savedPosts: true }, // Include savedPosts too
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found!" });
    }

    // Owners only; admins delete through the admin API and agencies through theirs
    if (!ownsPersonally(post, tokenUserId)) {
      return res.status(403).json({ message: "Not Authorized!" });
    }

    // 🔥 Ensure correct deletion order
    await prisma.$transaction(async (tx) => {
      // 1️⃣ Delete SavedPosts first (if any exist)
      if (post.savedPosts.length > 0) {
        await tx.savedPost.deleteMany({
          where: { postId: id },
        });
      }

      // 2️⃣ Delete PostDetail if it exists
      if (post.postDetail) {
        await tx.postDetail.delete({
          where: { postId: id },
        });
      }

      // 3️⃣ Finally, delete the Post
      await tx.post.delete({
        where: { id },
      });
    });

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("Error deleting post:", err);
    res.status(500).json({ message: "Failed to delete post" });
  }
};

const VISITOR_COOKIE = "bayti_vid";
const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|curl|wget|python|headless/i;

// POST /posts/:id/view — called once when the listing page opens.
// Counts at most one view per visitor per listing per UTC day, and never
// counts the owner, admins, unpublished listings or obvious bots.
export const recordView = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      select: { userId: true, status: true, hiddenByOwner: true, postDetail: { select: { views: true } } },
    });
    if (!post) return res.status(404).json({ message: "Post not found!" });

    const views = post.postDetail?.views ?? 0;
    const viewer = await getViewer(req);
    const ua = req.get("user-agent") || "";

    const skip =
      post.status !== "approved" ||
      post.hiddenByOwner ||
      !post.postDetail ||
      viewer?.id === post.userId ||
      viewer?.role === "admin" ||
      !ua ||
      BOT_UA.test(ua);
    if (skip) return res.status(200).json({ views, counted: false });

    // Logged-in visitors are identified by account, guests by an anonymous cookie
    let viewerKey;
    if (viewer) {
      viewerKey = `u:${viewer.id}`;
    } else {
      let vid = req.cookies?.[VISITOR_COOKIE];
      if (!/^[a-f0-9]{32}$/.test(vid || "")) {
        vid = crypto.randomBytes(16).toString("hex");
        res.cookie(VISITOR_COOKIE, vid, {
          httpOnly: true,
          sameSite: "lax",
          maxAge: 365 * 24 * 60 * 60 * 1000,
        });
      }
      viewerKey = `v:${vid}`;
    }

    const day = Math.floor(Date.now() / 86400000);
    try {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.postView.create({ data: { postId: id, viewerKey, day } });
        return tx.postDetail.update({
          where: { postId: id },
          data: { views: { increment: 1 } },
          select: { views: true },
        });
      });
      return res.status(200).json({ views: updated.views, counted: true });
    } catch (err) {
      // Unique (postId, viewerKey, day): this visitor was already counted today
      if (err.code === "P2002") {
        return res.status(200).json({ views, counted: false });
      }
      throw err;
    }
  } catch (err) {
    console.error("Failed to record view:", err);
    res.status(500).json({ message: "Failed to record view" });
  }
};
