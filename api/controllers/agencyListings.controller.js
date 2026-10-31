import prisma from "../lib/prisma.js";
import { assignListing } from "../lib/agency.js";
import { ListingLimitError, limitResponse, withActiveSlot } from "../lib/listingLimits.js";
import { toId } from "../lib/util.js";
import { can } from "../middleware/requireAgency.js";
import { announceForReview, checkListingRules, generateMatricule, saveListingEdit } from "./post.controller.js";
import { listingFrom } from "./adminPosts.controller.js";
import { agencyAudit } from "./agency.controller.js";

// Listings on the agency platform. The agency always comes from the session
// (req.agency), never from the request body, and owns every listing created
// here. Owners and managers work on the whole portfolio; agents only on the
// listings assigned to them (userId). A listing with no agent is unassigned.

export const listingScope = (req) => ({
  agencyId: req.agency.id,
  ...(can(req, "listings.all") ? {} : { userId: req.userId }),
});

// One word the dashboard can show for where a listing stands
export const listingState = (p) =>
  p.status === "approved" ? (p.hiddenByOwner ? "offline" : "published")
  : p.status === "unpublished" ? "taken_down"
  : p.status;

const STATE_WHERE = {
  published: { status: "approved", hiddenByOwner: false },
  offline: { status: "approved", hiddenByOwner: true },
  taken_down: { status: "unpublished" },
  pending: { status: "pending" },
  rejected: { status: "rejected" },
  archived: { status: "archived" },
};

const LIST_SELECT = {
  id: true, title: true, price: true, type: true, city: true, district: true, images: true,
  propertyType: true, bedroom: true, bathroom: true, status: true, hiddenByOwner: true,
  availability: true, reviewNote: true, createdAt: true, updatedAt: true,
  user: { select: { id: true, username: true, avatar: true } },
  createdBy: { select: { id: true, username: true } },
  postDetail: { select: { views: true, Matricule: true } },
  _count: { select: { inquiries: true, savedPosts: true } },
};

const withState = (p) => ({ ...p, state: listingState(p) });

// An active member of the caller's agency, or null
export const activeMember = (req, userId) =>
  userId
    ? prisma.user.findFirst({
        where: { id: userId, agencyId: req.agency.id, agencyActive: true, status: "active" },
        select: { id: true, username: true },
      })
    : null;

// Loads a listing the caller may work on, or answers 404. Listings of other
// agencies and, for agents, colleagues' listings look the same as missing ones.
const loadListing = async (req, res, include) => {
  const id = toId(req.params.id);
  const post = id && (await prisma.post.findFirst({ where: { id, ...listingScope(req) }, include }));
  if (!post) {
    res.status(404).json({ message: "Listing not found." });
    return null;
  }
  return post;
};

export const listListings = async (req, res) => {
  const { state, type, agent, q } = req.query;
  const and = [listingScope(req)];
  if (STATE_WHERE[state]) and.push(STATE_WHERE[state]);
  if (type === "buy" || type === "rent") and.push({ type });
  if (can(req, "listings.all")) {
    if (agent === "none") and.push({ userId: null });
    else if (toId(agent)) and.push({ userId: toId(agent) });
  }
  if (q) {
    const term = String(q).trim().slice(0, 80);
    and.push({ OR: [{ title: { contains: term } }, { city: { contains: term } }, { district: { contains: term } }] });
  }
  try {
    const posts = await prisma.post.findMany({ where: { AND: and }, select: LIST_SELECT, orderBy: { createdAt: "desc" } });
    res.status(200).json(posts.map(withState));
  } catch (err) {
    console.error("Failed to list agency listings:", err);
    res.status(500).json({ message: "Couldn't load the listings." });
  }
};

export const getListing = async (req, res) => {
  const post = await loadListing(req, res, {
    postDetail: true,
    user: { select: { id: true, username: true, avatar: true } },
    createdBy: { select: { id: true, username: true } },
    _count: { select: { inquiries: true, savedPosts: true } },
  });
  if (!post) return;
  const since = Math.floor(Date.now() / 86400000) - 29;
  const [views, inquiries] = await Promise.all([
    prisma.postView.groupBy({ by: ["day"], where: { postId: post.id, day: { gte: since } }, _count: { _all: true } }),
    prisma.inquiry.groupBy({ by: ["status"], where: { postId: post.id }, _count: { _all: true } }),
  ]);
  res.status(200).json({
    ...withState(post),
    stats: {
      viewsByDay: views.map((v) => ({ day: v.day, count: v._count._all })),
      inquiries: Object.fromEntries(inquiries.map((i) => [i.status, i._count._all])),
    },
  });
};

// The agent a listing goes to: someone else only for those allowed to assign
const resolveAgent = async (req, res, agentId) => {
  const id = toId(agentId);
  if (!id || id === req.userId) return req.userId;
  if (!can(req, "listings.assign")) {
    res.status(403).json({ message: "You can only create listings for yourself." });
    return null;
  }
  const member = await activeMember(req, id);
  if (!member) {
    res.status(400).json({ message: "That agent isn't an active member of your agency." });
    return null;
  }
  return member.id;
};

// Fields only the Bayti team sets; the listing's agency always comes from the session
const TEAM_ONLY = ["status", "featured", "userId", "agencyId", "createdById"];

// Validates and normalises a listing payload with the same rules as the admin
// API (numbers, coordinates, types, photo links). Throws an Error to show.
const parseListing = ({ postData = {}, postDetail = {} } = {}, { creating, current, userId }) => {
  const clean = { ...postData };
  for (const k of TEAM_ONLY) delete clean[k];
  if (creating) clean.userId = userId;
  return listingFrom({ postData: clean, postDetail }, { creating, current });
};

const validationError = (err) => err instanceof Error && !err.code && !err.clientVersion;

export const createListing = async (req, res) => {
  const { agentId } = req.body || {};
  const userId = await resolveAgent(req, res, agentId);
  if (!userId) return;

  const ruleError = await checkListingRules(req.body?.postData, userId, { creating: true });
  if (ruleError) return res.status(400).json({ message: ruleError });

  try {
    const { data, detail } = await parseListing(req.body, { creating: true, userId });
    // Agencies have their own active-listing policy (unlimited for now)
    const post = await withActiveSlot({ agencyId: req.agency.id }, async (tx) => {
      const created = await tx.post.create({
        data: { ...data, userId, createdById: req.userId, agencyId: req.agency.id, status: "pending" },
      });
      await tx.postDetail.create({
        data: { desc: "", ...detail, postId: created.id, Matricule: generateMatricule(created.id) },
      });
      return created;
    });
    await announceForReview(post, false);
    await agencyAudit(req, {
      action: "agency.listing_create",
      summary: `Created “${post.title}”`,
      details: { postId: post.id, agentId: userId },
    });
    res.status(201).json(withState(post));
  } catch (err) {
    if (err instanceof ListingLimitError) return limitResponse(res, err);
    if (validationError(err)) return res.status(400).json({ message: err.message });
    console.error("Failed to create agency listing:", err);
    res.status(500).json({ message: "Couldn't create the listing." });
  }
};

export const updateListing = async (req, res) => {
  const post = await loadListing(req, res, { postDetail: true });
  if (!post) return;

  const ruleError = await checkListingRules(req.body?.postData, post.userId, { creating: false, current: post });
  if (ruleError) return res.status(400).json({ message: ruleError });

  try {
    const { data, detail } = await parseListing(req.body, { creating: false, current: post });
    // saveListingEdit replaces the photo list, so keep it when none was sent
    const updated = await saveListingEdit(
      post,
      { ...data, images: data.images ?? post.images },
      detail,
      data.availability ? { availability: data.availability } : {}
    );
    await agencyAudit(req, {
      action: "agency.listing_update",
      summary: `Edited “${updated.title}”`,
      details: { postId: post.id },
    });
    res.status(200).json(withState(updated));
  } catch (err) {
    if (err instanceof ListingLimitError) return limitResponse(res, err);
    if (validationError(err)) return res.status(400).json({ message: err.message });
    console.error("Failed to update agency listing:", err);
    res.status(500).json({ message: "Couldn't save the listing." });
  }
};

// { online: bool } — the agency takes a published listing off the market or
// puts it back. Moderation status is untouched, so this can't undo a
// takedown by the Bayti team.
export const setListingVisibility = async (req, res) => {
  const post = await loadListing(req, res);
  if (!post) return;
  if (["archived", "unpublished"].includes(post.status)) {
    return res.status(409).json({
      message: post.status === "archived" ? "Restore the listing first." : "Bayti took this listing down. Contact support.",
    });
  }
  const online = Boolean(req.body?.online);
  const updated = await prisma.post.update({ where: { id: post.id }, data: { hiddenByOwner: !online } });
  await agencyAudit(req, {
    action: online ? "agency.listing_online" : "agency.listing_offline",
    summary: `${online ? "Put back online" : "Took offline"} “${post.title}”`,
    details: { postId: post.id },
  });
  res.status(200).json(withState(updated));
};

// { archived: bool } — restoring sends the listing back to review
export const setListingArchived = async (req, res) => {
  const post = await loadListing(req, res);
  if (!post) return;
  const archived = Boolean(req.body?.archived);
  if (archived === (post.status === "archived")) return res.status(200).json(withState(post));
  let updated;
  try {
    updated = archived
      ? await prisma.post.update({ where: { id: post.id }, data: { status: "archived" } })
      : await withActiveSlot({ agencyId: req.agency.id }, (tx) =>
          tx.post.update({
            where: { id: post.id },
            data: { status: "pending", hiddenByOwner: false, reviewNote: null, reviewedAt: null },
          })
        );
  } catch (err) {
    if (err instanceof ListingLimitError) return limitResponse(res, err);
    throw err;
  }
  if (!archived) await announceForReview(updated, true);
  await agencyAudit(req, {
    action: archived ? "agency.listing_archive" : "agency.listing_restore",
    summary: `${archived ? "Archived" : "Restored"} “${post.title}”`,
    details: { postId: post.id },
  });
  res.status(200).json(withState(updated));
};

// { userId | null } — hands a listing (and its open inquiries) to another
// agent, or leaves it unassigned for the leads. The agency keeps it either way.
export const assignListingTo = async (req, res) => {
  const post = await loadListing(req, res);
  if (!post) return;
  const unassign = req.body?.userId === null;
  const member = unassign ? null : await activeMember(req, toId(req.body?.userId));
  if (!unassign && !member) return res.status(400).json({ message: "Choose an active member of your agency." });
  const to = member?.id ?? null;
  if (to === post.userId) return res.status(200).json({ ok: true });

  await prisma.$transaction((tx) => assignListing(tx, post.id, to));
  await agencyAudit(req, {
    action: "agency.listing_assign",
    summary: member ? `Assigned “${post.title}” to ${member.username}` : `Unassigned “${post.title}”`,
    details: { postId: post.id, from: post.userId, to },
  });
  res.status(200).json({ ok: true });
};

export const deleteListing = async (req, res) => {
  const post = await loadListing(req, res);
  if (!post) return;
  try {
    await prisma.$transaction([
      prisma.savedPost.deleteMany({ where: { postId: post.id } }),
      prisma.post.delete({ where: { id: post.id } }),
    ]);
    await agencyAudit(req, {
      action: "agency.listing_delete",
      summary: `Deleted “${post.title}”`,
      details: { postId: post.id },
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Failed to delete agency listing:", err);
    res.status(500).json({ message: "Couldn't delete the listing." });
  }
};
