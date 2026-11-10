export const numberFmt = new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 0 });

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

// For <input type="date"> values
export const isoDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export const capitalize = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);

export const ROLE_LABEL = {
  client: "Individual",
  agent: "Agent",
  agency: "Agency owner",
  admin: "Administrator",
};

export const AGENCY_ROLE_LABEL = { owner: "Owner", manager: "Manager", agent: "Agent" };

// The role is only "client" or "admin"; agency membership says the rest.
// Gives the key ROLE_LABEL describes: client, agent (manager or agent), agency (owner) or admin.
export const accountType = (u) =>
  u?.role === "admin" ? "admin" : u?.agencyRole === "owner" ? "agency" : u?.agencyRole ? "agent" : "client";

export const AVAILABILITY_LABEL = {
  available: "Available",
  under_offer: "Under offer",
  sold: "Sold",
  rented: "Rented",
};

export const APPLICATION_STATUS = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  info_required: "Information required",
  resubmitted: "Resubmitted",
  approved: "Approved",
  rejected: "Rejected",
};

// Maps every status the dashboard shows to a label and a colour tone
export const STATUS = {
  // listings
  pending: ["Pending review", "warn"],
  approved: ["Published", "ok"],
  rejected: ["Rejected", "bad"],
  unpublished: ["Unpublished", "muted"],
  archived: ["Archived", "muted"],
  // accounts & agencies
  active: ["Active", "ok"],
  suspended: ["Suspended", "bad"],
  deactivated: ["Deactivated", "muted"],
  // applications
  draft: ["Draft", "muted"],
  submitted: ["Submitted", "info"],
  under_review: ["Under review", "warn"],
  info_required: ["Info required", "warn"],
  resubmitted: ["Resubmitted", "info"],
  // reports
  open: ["Open", "warn"],
  resolved: ["Resolved", "ok"],
  dismissed: ["Dismissed", "muted"],
};

export const DOCUMENT_LABEL = {
  agrement: "Agrément",
  rc_extract: "Registre de Commerce extract",
  representative_id: "Representative ID",
  statuts: "Statuts",
  boal: "BOAL publication",
  appointment: "Manager appointment",
  qualification: "Qualification",
  carte_professionnelle: "Carte professionnelle",
  nationality_residence: "Nationality / residence",
  tax_documents: "Tax identification",
  screenshot: "Screenshot",
  other: "Other",
};

export const fileSize = (n) =>
  n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

export const downloadCsv = (rows, filename) => {
  if (!rows.length) return;
  const escape = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    Object.keys(rows[0]).join(","),
    ...rows.map((r) => Object.values(r).map(escape).join(",")),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
