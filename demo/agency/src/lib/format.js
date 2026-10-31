export const numberFmt = new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 0 });

export const price = (p) => `${numberFmt.format(p.price)} DZD${p.type === "rent" ? " / month" : ""}`;

export const dateFmt = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";

export const dateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const timeAgo = (d) => {
  const s = Math.round((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return dateFmt(d);
};

export const place = (p) => [p.district, p.city].filter(Boolean).join(", ");

export const AGENCY_ROLE_LABEL = { owner: "Owner", manager: "Manager", agent: "Agent" };

export const AVAILABILITY_LABEL = {
  available: "Available",
  under_offer: "Under offer",
  sold: "Sold",
  rented: "Rented",
};

// Listing states as the API reports them (`state`), with a label and a tone
export const STATUS = {
  published: ["Published", "ok"],
  offline: ["Offline", "muted"],
  taken_down: ["Taken down by Bayti", "bad"],
  pending: ["In review", "warn"],
  rejected: ["Rejected", "bad"],
  archived: ["Archived", "muted"],
  // people
  active: ["Active", "ok"],
  inactive: ["Deactivated", "muted"],
  suspended: ["Suspended", "bad"],
};

export const STATE_HELP = {
  published: "Live on the marketplace.",
  offline: "You took it off the market. Put it back online at any time.",
  taken_down: "The Bayti team took this listing down. Contact support to discuss it.",
  pending: "The Bayti team reviews every new or edited listing, usually within a day.",
  rejected: "Fix what the reviewer asked for and save: it goes back to review.",
  archived: "Kept for your records. Restoring it sends it back to review.",
};

export const INQUIRY_STATUS = {
  open: ["Open", "warn"],
  scheduled: ["Visit confirmed", "ok"],
  declined: ["Declined", "muted"],
  closed: ["Closed", "info"],
  cancelled: ["Cancelled by client", "muted"],
};

export { formatPropertyType } from "../../../shared/format.js";
