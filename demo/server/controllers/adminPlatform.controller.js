import prisma from "../lib/prisma.js";
import { audit } from "../lib/notify.js";
import { DEFAULT_SETTINGS, getSettings, saveSettings } from "../lib/settings.js";
import { deleteDocuments, publicDocument, sendDocument } from "../lib/storage.js";
import { str, toId } from "../lib/util.js";

// ---------- notifications (shared team inbox) ----------

export const listNotifications = async (req, res) => {
  const unreadOnly = req.query.unread === "1";
  const take = Math.min(toId(req.query.limit) || 50, 200);
  try {
    const where = { audience: "admin", ...(unreadOnly ? { readAt: null } : {}) };
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take }),
      prisma.notification.count({ where: { audience: "admin", readAt: null } }),
    ]);
    res.status(200).json({ items, unread });
  } catch (err) {
    console.error("Failed to load notifications:", err);
    res.status(500).json({ message: "Couldn't load notifications." });
  }
};

// Sidebar counters in one request
export const getCounters = async (req, res) => {
  try {
    const [notifications, pendingListings, openApplications, openReports] = await Promise.all([
      prisma.notification.count({ where: { audience: "admin", readAt: null } }),
      prisma.post.count({ where: { status: "pending" } }),
      prisma.agencyApplication.count({ where: { status: { in: ["submitted", "resubmitted", "under_review"] } } }),
      prisma.report.count({ where: { status: "open" } }),
    ]);
    res.status(200).json({ notifications, pendingListings, openApplications, openReports });
  } catch (err) {
    console.error("Failed to load counters:", err);
    res.status(500).json({ message: "Couldn't load counters." });
  }
};

// PUT /admin/notifications/read { ids?: [...], read?: bool }
export const markNotifications = async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(toId).filter(Boolean) : null;
  const read = req.body?.read !== false;
  try {
    await prisma.notification.updateMany({
      where: { audience: "admin", ...(ids ? { id: { in: ids } } : { readAt: null }) },
      data: { readAt: read ? new Date() : null },
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Failed to mark notifications:", err);
    res.status(500).json({ message: "Couldn't update notifications." });
  }
};

// ---------- audit log ----------

export const listAudit = async (req, res) => {
  const take = Math.min(toId(req.query.limit) || 100, 500);
  const where = {};
  if (req.query.entityType) where.entityType = String(req.query.entityType);
  if (toId(req.query.entityId)) where.entityId = toId(req.query.entityId);
  if (toId(req.query.actorId)) where.actorId = toId(req.query.actorId);
  if (req.query.q) where.summary = { contains: String(req.query.q).slice(0, 100) };
  const before = toId(req.query.before);
  if (before) where.id = { lt: before };
  try {
    const items = await prisma.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, username: true, role: true } } },
      orderBy: { id: "desc" },
      take,
    });
    res.status(200).json({ items, next: items.length === take ? items[items.length - 1].id : null });
  } catch (err) {
    console.error("Failed to load audit log:", err);
    res.status(500).json({ message: "Couldn't load the activity log." });
  }
};

// ---------- reports ----------

const REPORT_STATUSES = ["open", "resolved", "dismissed"];

export const listReports = async (req, res) => {
  const status = req.query.status || "open";
  if (status !== "all" && !REPORT_STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status" });
  try {
    const [reports, counts] = await Promise.all([
      prisma.report.findMany({
        where: status === "all" ? {} : { status },
        include: {
          post: { select: { id: true, title: true, status: true, images: true } },
          reportedUser: { select: { id: true, username: true, status: true, avatar: true } },
          reporter: { select: { id: true, username: true } },
          _count: { select: { documents: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.report.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
    res.status(200).json({
      reports,
      counts: Object.fromEntries(REPORT_STATUSES.map((s) => [s, counts.find((c) => c.status === s)?._count._all || 0])),
    });
  } catch (err) {
    console.error("Failed to list reports:", err);
    res.status(500).json({ message: "Couldn't load reports." });
  }
};

export const getReport = async (req, res) => {
  const id = toId(req.params.id);
  try {
    const report = id && (await prisma.report.findUnique({
      where: { id },
      include: {
        post: { select: { id: true, title: true, status: true, images: true, city: true, userId: true } },
        reportedUser: { select: { id: true, username: true, email: true, status: true, avatar: true, role: true } },
        reporter: { select: { id: true, username: true, email: true } },
        documents: true,
      },
    }));
    if (!report) return res.status(404).json({ message: "Report not found." });
    // Earlier reports about the same listing or person help spot patterns
    const related = await prisma.report.findMany({
      where: {
        id: { not: id },
        OR: [
          report.postId ? { postId: report.postId } : null,
          report.reportedUserId ? { reportedUserId: report.reportedUserId } : null,
        ].filter(Boolean),
      },
      select: { id: true, reason: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({
      ...report,
      documents: report.documents.map(publicDocument),
      related: report.postId || report.reportedUserId ? related : [],
    });
  } catch (err) {
    console.error("Failed to load report:", err);
    res.status(500).json({ message: "Couldn't load the report." });
  }
};

// PUT /admin/reports/:id { status, resolution }
export const updateReport = async (req, res) => {
  const id = toId(req.params.id);
  const { status } = req.body || {};
  const resolution = str(req.body?.resolution, 3000);
  if (!REPORT_STATUSES.includes(status)) return res.status(400).json({ message: "Unknown status." });
  if (status !== "open" && !resolution) return res.status(400).json({ message: "Note what was done about it." });
  try {
    const report = await prisma.report.update({
      where: { id },
      data: {
        status,
        resolution: status === "open" ? null : resolution,
        resolvedAt: status === "open" ? null : new Date(),
        resolvedById: status === "open" ? null : req.admin.id,
      },
    });
    await audit(req, {
      action: `report.${status}`,
      entityType: "report",
      entityId: id,
      summary: `Report #${id} ${status}${resolution ? `: ${resolution}` : ""}`,
    });
    res.status(200).json(report);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Report not found." });
    console.error("Failed to update report:", err);
    res.status(500).json({ message: "Couldn't update the report." });
  }
};

// ---------- settings ----------

export const getSettingsAdmin = async (req, res) => {
  try {
    res.status(200).json({ settings: await getSettings(), defaults: DEFAULT_SETTINGS });
  } catch (err) {
    console.error("Failed to load settings:", err);
    res.status(500).json({ message: "Couldn't load settings." });
  }
};

export const updateSettingsAdmin = async (req, res) => {
  try {
    const before = await getSettings();
    const settings = await saveSettings(req.body || {}, req.admin.id);
    const sections = Object.keys(req.body || {}).filter((k) => k in DEFAULT_SETTINGS);
    await audit(req, {
      action: "settings.update",
      entityType: "settings",
      summary: `Changed settings: ${sections.join(", ")}`,
      details: Object.fromEntries(sections.map((s) => [s, { from: before[s], to: settings[s] }])),
    });
    res.status(200).json({ settings });
  } catch (err) {
    if (err instanceof Error && !err.code) return res.status(400).json({ message: err.message });
    console.error("Failed to save settings:", err);
    res.status(500).json({ message: "Couldn't save settings." });
  }
};

// ---------- documents ----------

// Any private document, for staff only. Every download is logged.
export const downloadDocument = async (req, res) => {
  const id = toId(req.params.id);
  const doc = id && (await prisma.document.findUnique({ where: { id } }));
  if (!doc) return res.status(404).json({ message: "Document not found." });
  await audit(req, {
    action: "document.view",
    entityType: "document",
    entityId: id,
    summary: `Opened ${doc.originalName}`,
    details: { applicationId: doc.applicationId, agencyId: doc.agencyId, userId: doc.userId, reportId: doc.reportId },
  });
  sendDocument(res, doc, { download: req.query.download === "1" });
};

export const deleteDocumentAdmin = async (req, res) => {
  const id = toId(req.params.id);
  const doc = id && (await prisma.document.findUnique({ where: { id } }));
  if (!doc) return res.status(404).json({ message: "Document not found." });
  // Application files are evidence of what was submitted; keep them
  if (doc.applicationId) {
    return res.status(400).json({ message: "Documents submitted with an application are kept as a record." });
  }
  await deleteDocuments({ id });
  await audit(req, {
    action: "document.delete",
    entityType: doc.agencyId ? "agency" : doc.userId ? "user" : "document",
    entityId: doc.agencyId || doc.userId || id,
    summary: `Deleted document ${doc.originalName}`,
  });
  res.status(200).json({ ok: true });
};

// ---------- moderation helpers ----------

// Listings that look like copies: same pin, or same title and price
export const findDuplicates = async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { status: { not: "archived" } },
      select: {
        id: true, title: true, price: true, latitude: true, longitude: true, city: true,
        status: true, images: true, createdAt: true, userId: true,
        user: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    const groups = new Map();
    const add = (key, reason, p) => {
      if (!groups.has(key)) groups.set(key, { reason, posts: [] });
      groups.get(key).posts.push(p);
    };
    for (const p of posts) {
      const lat = Number(p.latitude);
      const lng = Number(p.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng)) {
        add(`pin:${lat.toFixed(5)},${lng.toFixed(5)}`, "Same map pin", p);
      }
      add(`tp:${p.title.trim().toLowerCase()}|${p.price}`, "Same title and price", p);
    }
    const seen = new Set();
    const result = [];
    for (const g of groups.values()) {
      if (g.posts.length < 2) continue;
      const sig = g.posts.map((p) => p.id).join(",");
      if (seen.has(sig)) continue;
      seen.add(sig);
      result.push(g);
    }
    res.status(200).json(result);
  } catch (err) {
    console.error("Failed to find duplicates:", err);
    res.status(500).json({ message: "Couldn't check for duplicates." });
  }
};
