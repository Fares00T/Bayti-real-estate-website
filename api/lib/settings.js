import prisma from "./prisma.js";

export const PROPERTY_TYPES = [
  "apartment", "individual_house", "traditional_house", "other_residential",
  "office", "retail", "hospitality", "industrial",
];

// Every setting the dashboard can change, with its default. Stored values are
// merged over these, so adding a new key never needs a migration.
export const DEFAULT_SETTINGS = {
  listings: {
    maxImages: 20,
    // active (published or in review) listings per individual account; 0 = unlimited
    individualActiveLimit: 3,
    reviewOwnerEdits: true, // owner edits send a published listing back to review
    enabledPropertyTypes: PROPERTY_TYPES,
  },
  marketplace: {
    supportEmail: "",
    homeBanner: { enabled: false, title: "", text: "", linkUrl: "", linkLabel: "" },
  },
  agencies: {
    acceptApplications: true,
    managersCanManageAgents: true,
    // active listings per agency; 0 = unlimited (room for future plans)
    activeListingLimit: 0,
  },
  notifications: {
    newUser: true,
    newListing: true,
    emailApplicants: true,
    adminEmails: [], // also emailed when an application is submitted
  },
};

let cache = null;
let cachedAt = 0;
const TTL_MS = 30 * 1000;

const merge = (defaults, stored) => {
  if (!stored || typeof stored !== "object" || Array.isArray(defaults)) {
    return stored === undefined ? defaults : stored;
  }
  const out = {};
  for (const key of Object.keys(defaults)) {
    const d = defaults[key];
    out[key] =
      d && typeof d === "object" && !Array.isArray(d)
        ? merge(d, stored[key])
        : stored[key] === undefined
        ? d
        : stored[key];
  }
  return out;
};

export const getSettings = async () => {
  if (cache && Date.now() - cachedAt < TTL_MS) return cache;
  const rows = await prisma.setting.findMany();
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  cache = merge(DEFAULT_SETTINGS, stored);
  cachedAt = Date.now();
  return cache;
};

const isPlainObject = (v) => v && typeof v === "object" && !Array.isArray(v);

// Validates one section against the defaults' shape and types
const clean = (defaults, input, path) => {
  if (!isPlainObject(input)) throw new Error(`${path} must be an object.`);
  const out = {};
  for (const [key, d] of Object.entries(defaults)) {
    const v = input[key];
    const here = `${path}.${key}`;
    if (v === undefined) continue;
    if (isPlainObject(d)) out[key] = clean(d, v, here);
    else if (Array.isArray(d)) {
      if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) throw new Error(`${here} must be a list.`);
      out[key] = v.map((x) => x.trim()).filter(Boolean).slice(0, 50);
    } else if (typeof d === "number") {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 100000) throw new Error(`${here} must be a whole number.`);
      out[key] = n;
    } else if (typeof d === "boolean") out[key] = Boolean(v);
    else out[key] = String(v).slice(0, 500);
  }
  return out;
};

export const saveSettings = async (input, adminId) => {
  const current = await getSettings();
  const writes = [];
  for (const [section, defaults] of Object.entries(DEFAULT_SETTINGS)) {
    if (input[section] === undefined) continue;
    const value = merge(current[section], clean(defaults, input[section], section));
    if (section === "listings") {
      value.enabledPropertyTypes = value.enabledPropertyTypes.filter((t) => PROPERTY_TYPES.includes(t));
      if (!value.enabledPropertyTypes.length) throw new Error("Keep at least one property type enabled.");
      if (value.maxImages < 1) throw new Error("Allow at least one photo per listing.");
    }
    if (section === "notifications") {
      const bad = value.adminEmails.find((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
      if (bad) throw new Error(`${bad} isn't a valid email.`);
    }
    writes.push(
      prisma.setting.upsert({
        where: { key: section },
        update: { value, updatedById: adminId },
        create: { key: section, value, updatedById: adminId },
      })
    );
  }
  await prisma.$transaction(writes);
  cache = null;
  return getSettings();
};

// The subset the public marketplace may read
export const publicSettings = async () => {
  const s = await getSettings();
  return {
    listings: {
      maxImages: s.listings.maxImages,
      individualActiveLimit: s.listings.individualActiveLimit,
      enabledPropertyTypes: s.listings.enabledPropertyTypes,
    },
    marketplace: s.marketplace,
    agencies: { acceptApplications: s.agencies.acceptApplications },
  };
};
