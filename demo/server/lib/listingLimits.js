import prisma from "./prisma.js";
import { getSettings } from "./settings.js";

// How many listings an owner may have on the market at once.
//
// A listing is "active" while it is published or waiting for review: a
// pending listing goes live as soon as the team approves it, without any
// further action from its owner, so it already takes a slot. Rejected,
// archived, taken-down, deleted, sold and rented listings don't count.
export const ACTIVE_STATUSES = ["pending", "approved"];
export const CLOSED_AVAILABILITY = ["sold", "rented"];
export const ACTIVE_WHERE = { status: { in: ACTIVE_STATUSES }, availability: { notIn: CLOSED_AVAILABILITY } };

export const LIMIT_CODE = "LISTING_LIMIT";

// Individual accounts are capped by `listings.individualActiveLimit`.
// Agencies have their own policy (`agencies.activeListingLimit`, 0 = no
// limit) so per-agency plans can later replace it without touching callers.
const limitFor = (owner, settings) =>
  owner.agencyId ? settings.agencies.activeListingLimit : settings.listings.individualActiveLimit;

// Listings that count against `owner`: an individual's own listings, or every
// listing of an agency
const ownedWhere = (owner) =>
  owner.agencyId ? { agencyId: owner.agencyId } : { userId: owner.userId, agencyId: null };

export const ownerOf = (post) => (post.agencyId ? { agencyId: post.agencyId } : { userId: post.userId });

export class ListingLimitError extends Error {
  constructor(owner, limit, active) {
    super(
      owner.agencyId
        ? `Your agency has reached its limit of ${limit} active listings. Archive one to publish another.`
        : `You've reached your limit of ${limit} active properties. To publish more properties, register your real estate agency with Bayti.`
    );
    this.code = LIMIT_CODE;
    this.limit = limit;
    this.active = active;
  }
}

export const limitResponse = (res, err) =>
  res.status(403).json({ message: err.message, code: LIMIT_CODE, limit: err.limit, active: err.active });

export const listingUsage = async (owner) => {
  const settings = await getSettings();
  const limit = limitFor(owner, settings);
  const active = await prisma.post.count({ where: { ...ownedWhere(owner), ...ACTIVE_WHERE } });
  return { active, limit, remaining: limit > 0 ? Math.max(0, limit - active) : null };
};

// Runs `write(tx)` — which must make one more listing active — only if the
// owner has a free slot. The owner's row is locked first, so simultaneous
// submissions from the same account or agency queue up behind each other
// instead of all seeing the same count and all getting through.
export const withActiveSlot = async (owner, write) => {
  const settings = await getSettings();
  const limit = limitFor(owner, settings);
  return prisma.$transaction(async (tx) => {
    if (limit > 0) {
      if (owner.agencyId) await tx.$queryRaw`SELECT id FROM \`Agency\` WHERE id = ${owner.agencyId} FOR UPDATE`;
      else await tx.$queryRaw`SELECT id FROM \`User\` WHERE id = ${owner.userId} FOR UPDATE`;
      const active = await tx.post.count({ where: { ...ownedWhere(owner), ...ACTIVE_WHERE } });
      if (active >= limit) throw new ListingLimitError(owner, limit, active);
    }
    return write(tx);
  });
};
