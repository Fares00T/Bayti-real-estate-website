// Tests for the in-memory Prisma stand-in: node demo/server/runtime/prisma.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPrisma } from "./prisma.js";

const here = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(here, "..", "schema.prisma"), "utf8");

// ---------- tiny harness ----------

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ---------- seed ----------

const DAY = 86400000;
const today = Math.floor(Date.now() / DAY);
const iso = (s) => new Date(s).toISOString();

const seed = () => ({
  User: [
    { id: 1, email: "admin@bayti.dz", username: "admin", password: "x", role: "admin", createdAt: "2026-08-01T09:00:00Z" },
    { id: 2, email: "alice@x.dz", username: "alice", password: "x", createdAt: "2026-08-02T09:00:00Z" },
    { id: 3, email: "bob@x.dz", username: "bob", password: "x", phone: "0555", createdAt: "2026-08-02T15:00:00Z" },
    { id: 4, email: "olga@casa.dz", username: "olga", password: "x", accountType: "agency", agencyId: 1, agencyRole: "owner", createdAt: "2026-08-03T09:00:00Z" },
    { id: 5, email: "mike@casa.dz", username: "mike", password: "x", agencyId: 1, agencyRole: "manager", createdAt: "2026-08-04T09:00:00Z" },
    { id: 6, email: "amy@casa.dz", username: "amy", password: "x", agencyId: 1, agencyRole: "agent", createdAt: "2026-08-05T09:00:00Z" },
    { id: 7, email: "carl@x.dz", username: "carl", password: "x", status: "suspended", statusReason: "spam", createdAt: "2026-08-06T09:00:00Z" },
    { id: 8, email: "zed@x.dz", username: "zed", password: "x", accountType: "agency", createdAt: "2026-08-07T09:00:00Z" },
  ],
  Agency: [
    { id: 1, ownerId: 4, legalName: "Casa SARL", tradeName: "Casa Immo", verification: "verified", wilaya: "Oran", rcNumber: "RC1", createdAt: "2026-08-03T10:00:00Z" },
    { id: 2, legalName: "Old SARL", tradeName: "Old Immo", status: "suspended", createdAt: "2026-08-01T10:00:00Z" },
  ],
  Post: [
    { id: 1, title: "Sunny apartment", price: 100000, images: ["https://img/1.jpg"], address: "1 rue", city: "Alger", district: "Hydra", bedroom: 3, bathroom: 1, latitude: "36.7", longitude: "3.0", type: "buy", property: "residential", propertyType: "apartment", status: "approved", featured: true, userId: 3, createdById: 3, createdAt: "2026-09-01T10:00:00Z" },
    { id: 2, title: "Oran flat", price: 50000, images: [], address: "2 rue", city: "Oran", district: "Centre", bedroom: 2, bathroom: 1, latitude: "35.7", longitude: "-0.6", type: "rent", property: "residential", propertyType: "apartment", status: "approved", agencyId: 1, userId: 6, createdById: 6, createdAt: "2026-09-05T10:00:00Z", reviewedAt: "2026-09-06T10:00:00Z" },
    { id: 3, title: "Office space", price: 900000, images: [], address: "3 rue", city: "Oran", district: "Est", bedroom: 0, bathroom: 1, latitude: "35.7", longitude: "-0.6", type: "buy", property: "commercial", propertyType: "office", status: "pending", agencyId: 1, userId: 5, createdById: 5, createdAt: "2026-09-07T10:00:00Z" },
    { id: 4, title: "Hidden villa", price: 300000, images: [], address: "4 rue", city: "Oran", district: "Ouest", bedroom: 5, bathroom: 3, latitude: "35.7", longitude: "-0.6", type: "buy", property: "residential", propertyType: "individual_house", status: "approved", hiddenByOwner: true, agencyId: 1, userId: null, createdAt: "2026-09-08T10:00:00Z", reviewedAt: "2026-09-09T10:00:00Z" },
    { id: 5, title: "Carl's studio", price: 20000, images: [], address: "5 rue", city: "Alger", district: "Bab", bedroom: 1, bathroom: 1, latitude: "36.7", longitude: "3.0", type: "rent", property: "residential", propertyType: "apartment", status: "approved", userId: 7, createdAt: "2026-09-02T10:00:00Z" },
    { id: 6, title: "Old agency shop", price: 70000, images: [], address: "6 rue", city: "Alger", district: "Bab", bedroom: 0, bathroom: 1, latitude: "36.7", longitude: "3.0", type: "buy", property: "commercial", propertyType: "retail", status: "approved", agencyId: 2, createdAt: "2026-09-03T10:00:00Z" },
    { id: 7, title: "Archived house", price: 150000, images: [], address: "7 rue", city: "Blida", district: "X", bedroom: 4, bathroom: 2, latitude: "36.4", longitude: "2.8", type: "buy", property: "residential", propertyType: "individual_house", status: "archived", userId: 3, createdAt: "2026-09-04T10:00:00Z" },
  ],
  PostDetail: [
    { id: 1, postId: 1, desc: "Nice", views: 10, Matricule: "PROP-000001", size: 90 },
    { id: 2, postId: 2, desc: "Flat", views: 20 },
    { id: 3, postId: 3, desc: "Office" },
    { id: 4, postId: 4, desc: "Villa", views: 5 },
  ],
  SavedPost: [
    { id: 1, userId: 2, postId: 1, createdAt: "2026-09-10T10:00:00Z" },
    { id: 2, userId: 2, postId: 2, createdAt: "2026-09-11T10:00:00Z" },
  ],
  PostView: [
    { postId: 2, viewerKey: "u:2", day: today },
    { postId: 2, viewerKey: "v:abc", day: today },
    { postId: 2, viewerKey: "u:2", day: today - 1 },
    { postId: 3, viewerKey: "u:2", day: today },
  ],
  Chat: [
    { id: 1, lastMessage: "Hello", createdAt: "2026-09-12T10:00:00Z" },
    { id: 2, lastMessage: "Still available?", createdAt: "2026-09-12T11:00:00Z" },
    { id: 3, lastMessage: "hey", createdAt: "2026-09-12T12:00:00Z" },
  ],
  ChatUser: [
    { chatId: 1, userId: 2, lastReadAt: "2026-09-12T10:00:00Z" },
    { chatId: 2, userId: 2, lastReadAt: "2026-09-12T11:05:00Z" },
    { chatId: 2, userId: 3 },
    { chatId: 3, userId: 2 },
    { chatId: 3, userId: 7 },
  ],
  Message: [
    { id: 1, chatId: 1, userId: 2, text: "Hi, is it free?", createdAt: "2026-09-12T10:00:00Z" },
    { id: 2, chatId: 1, userId: 6, text: "Hello", createdAt: "2026-09-12T10:10:00Z" },
    { id: 3, chatId: 2, userId: 2, text: "Still available?", createdAt: "2026-09-12T11:00:00Z" },
    { id: 4, chatId: 3, userId: 7, text: "hey", createdAt: "2026-09-12T12:00:00Z" },
  ],
  Inquiry: [
    { id: 1, clientId: 2, postId: 2, postTitle: "Oran flat", agencyId: 1, assignedToId: 6, chatId: 1, message: "Hi, is it free?", createdAt: "2026-09-12T10:00:00Z", updatedAt: "2026-09-12T10:00:00Z" },
    { id: 2, clientId: 2, postId: 1, postTitle: "Sunny apartment", ownerId: 3, chatId: 2, type: "visit", preferredDate: "2026-11-02", preferredTime: "10:00", createdAt: "2026-09-12T11:00:00Z", updatedAt: "2026-09-13T11:00:00Z" },
    { id: 3, clientId: 7, postId: 3, postTitle: "Office space", agencyId: 1, assignedToId: 5, status: "closed", createdAt: "2026-09-13T11:00:00Z" },
  ],
  AgencyApplication: [
    { id: 1, applicantId: 8, status: "submitted", tradeName: "Zed Immo", legalName: "Zed SARL", rcNumber: "RC1", email: "contact@zed.dz", submittedAt: "2026-09-20T10:00:00Z", createdAt: "2026-09-19T10:00:00Z", checklist: { rc: { by: "admin" } } },
    { id: 2, applicantId: 2, status: "draft", tradeName: "Draft Immo", createdAt: "2026-09-21T10:00:00Z" },
  ],
  ApplicationEvent: [
    { id: 1, applicationId: 1, type: "created", toStatus: "draft", actorId: 8, createdAt: "2026-09-19T10:00:00Z" },
    { id: 2, applicationId: 1, type: "status", fromStatus: "draft", toStatus: "submitted", actorId: 8, createdAt: "2026-09-20T10:00:00Z" },
  ],
  ApplicationNote: [{ id: 1, applicationId: 1, authorId: 1, body: "Looks fine" }],
  Document: [
    { id: 1, kind: "rc", originalName: "rc.pdf", mimeType: "application/pdf", size: 1000, storageKey: "k1", sha256: "h1", applicationId: 1, createdAt: "2026-09-19T11:00:00Z" },
    { id: 2, kind: "id", originalName: "id.pdf", mimeType: "application/pdf", size: 1000, storageKey: "k2", sha256: "h2", userId: 7 },
  ],
  AgencyInvitation: [
    { id: 1, agencyId: 1, userId: 2, agencyRole: "agent", invitedById: 4, expiresAt: new Date(Date.now() + 7 * DAY).toISOString() },
  ],
  Notification: [
    { id: 1, audience: "admin", type: "listing_submitted", title: "New listing" },
    { id: 2, audience: "user", userId: 6, type: "x", title: "Hello amy" },
  ],
  AuditLog: [
    { id: 1, actorId: 4, action: "agency.listing_create", entityType: "agency", entityId: 1, summary: "Created Office space", details: { postId: 3 }, createdAt: "2026-09-07T10:00:00Z" },
    { id: 2, actorId: 1, action: "user.suspend", entityType: "user", entityId: 7, summary: "carl suspended", createdAt: "2026-09-08T10:00:00Z" },
    { id: 3, actorId: 1, action: "post.approved", entityType: "post", entityId: 2, summary: "approved", createdAt: "2026-09-06T10:00:00Z" },
  ],
  Report: [
    { id: 1, kind: "post", reason: "scam", postId: 1, reporterId: 2 },
    { id: 2, kind: "user", reason: "rude", reportedUserId: 7, reporterId: 2, status: "resolved" },
  ],
  Setting: [{ key: "listings", value: { maxImages: 10 } }],
  PasswordResetToken: [
    { id: 1, userId: 2, tokenHash: "t1", expiresAt: new Date(Date.now() + DAY).toISOString() },
    { id: 2, userId: 2, tokenHash: "t2", expiresAt: new Date(Date.now() + DAY).toISOString() },
  ],
});

let changes = 0;
const fresh = () => {
  changes = 0;
  return createPrisma({ schema, data: seed(), onChange: () => changes++ });
};

const rejects = async (promise, code) => {
  try {
    await promise;
  } catch (err) {
    if (code) assert.equal(err.code, code, `expected ${code}, got ${err.code}: ${err.message}`);
    return err;
  }
  assert.fail(`expected a rejection${code ? ` with ${code}` : ""}`);
};

// ---------- copies of backend helpers (verbatim where it matters) ----------

const AGENCY_BADGE_SELECT = { id: true, tradeName: true, logo: true, wilaya: true, commune: true, status: true, verification: true, approvalExpiryDate: true };
const CLOSED_AVAILABILITY = ["sold", "rented"];
const LIVE_POST_WHERE = {
  status: "approved",
  hiddenByOwner: false,
  OR: [{ agencyId: null, user: { status: "active" } }, { agencyId: { not: null }, agency: { status: "active" } }],
};
const PUBLIC_POST_WHERE = { ...LIVE_POST_WHERE, availability: { notIn: CLOSED_AVAILABILITY } };
const ROLE_PERMISSIONS = {
  owner: ["agency.edit", "team.view", "team.manage", "team.roles", "listings.all", "listings.assign", "inquiries.all", "analytics.agency", "activity.agency"],
  manager: ["team.view", "team.manage", "listings.all", "listings.assign", "inquiries.all", "analytics.agency", "activity.agency"],
  agent: [],
};
const can = (req, p) => ROLE_PERMISSIONS[req.member.agencyRole].includes(p);
const agencyReq = (userId, role) => ({ userId, member: { agencyRole: role }, agency: { id: 1, tradeName: "Casa Immo" } });
const listingScope = (req) => ({ agencyId: req.agency.id, ...(can(req, "listings.all") ? {} : { userId: req.userId }) });
const inquiryScope = (req) => ({ agencyId: req.agency.id, ...(can(req, "inquiries.all") ? {} : { assignedToId: req.userId }) });

// lib/inquiries.js
const markRead = (db, chatId, userId) =>
  db.chatUser.upsert({
    where: { chatId_userId: { chatId, userId } },
    update: { lastReadAt: new Date() },
    create: { chatId, userId, lastReadAt: new Date() },
  });
const postMessage = async (tx, chatId, userId, text) => {
  const message = await tx.message.create({ data: { text, userId, chatId } });
  await tx.chat.update({ where: { id: chatId }, data: { lastMessage: text } });
  await markRead(tx, chatId, userId);
  return message;
};
const routeFor = (post) =>
  post.agencyId
    ? { agencyId: post.agencyId, ownerId: null, assignedToId: post.userId ?? null }
    : { agencyId: null, ownerId: post.userId, assignedToId: null };
const openInquiry = async (prisma, clientId, post, { text, visit }) => {
  const route = routeFor(post);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM \`User\` WHERE id = ${clientId} FOR UPDATE`;
    let inquiry = await tx.inquiry.findUnique({ where: { clientId_postId: { clientId, postId: post.id } } });
    const created = !inquiry;
    const reopen = inquiry && !["open", "scheduled"].includes(inquiry.status);
    if (!inquiry) {
      const chat = await tx.chat.create({
        data: { users: { create: [{ userId: clientId }, ...(route.ownerId ? [{ userId: route.ownerId }] : [])] } },
      });
      inquiry = await tx.inquiry.create({
        data: {
          ...route, clientId, postId: post.id, postTitle: post.title.slice(0, 190), chatId: chat.id,
          type: visit ? "visit" : "question", message: text || null, ...(visit || {}),
        },
      });
    } else {
      inquiry = await tx.inquiry.update({
        where: { id: inquiry.id },
        data: {
          ...(reopen ? { status: "open", declineReason: null, ...route } : {}),
          ...(visit ? { type: "visit", status: "open", confirmedDate: null, confirmedTime: null, declineReason: null, ...visit } : {}),
        },
      });
    }
    if (text) await postMessage(tx, inquiry.chatId, clientId, text);
    return { inquiry, created, reopened: Boolean(reopen) };
  });
};

// lib/agency.js
const attachMember = async (tx, userId, agencyId, agencyRole = "agent") => {
  await tx.user.update({ where: { id: userId }, data: { agencyId, agencyRole, agencyActive: true } });
  if (agencyRole === "owner") {
    await tx.post.updateMany({ where: { userId, agencyId: null }, data: { agencyId } });
    await tx.inquiry.updateMany({ where: { ownerId: userId, agencyId: null }, data: { agencyId, ownerId: null, assignedToId: userId } });
  }
};
const OPEN_INQUIRY = ["open", "scheduled"];
const firstActiveMember = async (tx, agencyId, candidates) => {
  for (const id of candidates) {
    if (!id) continue;
    const m = await tx.user.findUnique({ where: { id }, select: { id: true, agencyId: true, agencyActive: true, status: true } });
    if (m && m.agencyId === agencyId && m.agencyActive && m.status === "active") return m.id;
  }
  return null;
};
const handOverAssignments = async (tx, userId, agencyId, { reassignTo } = {}) => {
  const agency = await tx.agency.findUnique({ where: { id: agencyId }, select: { ownerId: true } });
  const posts = await tx.post.findMany({ where: { userId, agencyId }, select: { id: true } });
  const ids = posts.map((p) => p.id);
  const to = await firstActiveMember(tx, agencyId, [reassignTo, agency?.ownerId].filter((id) => id !== userId));
  if (ids.length) await tx.post.updateMany({ where: { id: { in: ids } }, data: { userId: to } });
  await tx.inquiry.updateMany({ where: { agencyId, assignedToId: userId, status: { in: OPEN_INQUIRY } }, data: { assignedToId: to } });
  return { reassigned: to ? ids.length : 0, unassigned: to ? 0 : ids.length, to };
};
const detachMember = async (tx, userId, options = {}) => {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { agencyId: true } });
  if (!user?.agencyId) return { reassigned: 0, unassigned: 0, to: null };
  const result = await handOverAssignments(tx, userId, user.agencyId, options);
  await tx.user.update({ where: { id: userId }, data: { agencyId: null, agencyRole: null, agencyActive: true } });
  return result;
};
const agencyFromApplication = async (tx, app) => {
  const data = {
    entityType: app.entityType, legalName: app.legalName || app.tradeName, tradeName: app.tradeName || app.legalName,
    approvalIssueDate: app.approvalIssueDate ?? null, repFullName: app.repFullName ?? null,
    status: "active", verification: "verified", verificationNote: null, verifiedAt: new Date(),
  };
  const existing = app.agencyId
    ? await tx.agency.findUnique({ where: { id: app.agencyId } })
    : await tx.agency.findUnique({ where: { ownerId: app.applicantId } });
  const agency = existing
    ? await tx.agency.update({ where: { id: existing.id }, data: { ...data, ownerId: app.applicantId } })
    : await tx.agency.create({ data: { ...data, ownerId: app.applicantId } });
  await attachMember(tx, app.applicantId, agency.id, "owner");
  await tx.document.updateMany({ where: { applicationId: app.id }, data: { agencyId: agency.id } });
  await tx.agencyApplication.update({ where: { id: app.id }, data: { agencyId: agency.id } });
  return agency;
};

// chat.controller.js
const personSelect = { id: true, username: true, avatar: true };
const INQUIRY_SELECT = {
  id: true, type: true, status: true, postId: true, postTitle: true, clientId: true, agencyId: true,
  assignedToId: true, preferredDate: true, preferredTime: true, confirmedDate: true, confirmedTime: true,
  client: { select: personSelect }, owner: { select: personSelect },
  agency: { select: { id: true, tradeName: true, logo: true, status: true } }, assignedTo: { select: personSelect },
};
const visibleWhere = (ctx) =>
  ctx.side === "agency"
    ? { inquiry: { agencyId: ctx.agencyId, ...(ctx.all ? {} : { assignedToId: ctx.userId }) } }
    : { users: { some: { userId: ctx.userId } }, OR: [{ inquiry: null }, { inquiry: { clientId: ctx.userId } }, { inquiry: { agencyId: null } }] };
const unreadByChat = async (prisma, ctx) => {
  const rows =
    ctx.side === "agency"
      ? await prisma.$queryRaw`
          SELECT i.chatId AS chatId, COUNT(m.id) AS unread
          FROM \`Inquiry\` i
          JOIN \`Message\` m ON m.chatId = i.chatId AND m.userId = i.clientId
          LEFT JOIN \`ChatUser\` cu ON cu.chatId = i.chatId AND cu.userId = ${ctx.userId}
          WHERE i.agencyId = ${ctx.agencyId} AND i.chatId IS NOT NULL
            AND (${ctx.all ? 1 : 0} = 1 OR i.assignedToId = ${ctx.userId})
            AND (cu.lastReadAt IS NULL OR m.createdAt > cu.lastReadAt)
          GROUP BY i.chatId`
      : await prisma.$queryRaw`
          SELECT cu.chatId AS chatId, COUNT(m.id) AS unread
          FROM \`ChatUser\` cu
          JOIN \`Message\` m ON m.chatId = cu.chatId AND m.userId <> cu.userId
            AND (cu.lastReadAt IS NULL OR m.createdAt > cu.lastReadAt)
          LEFT JOIN \`Inquiry\` i ON i.chatId = cu.chatId
          WHERE cu.userId = ${ctx.userId}
            AND (i.id IS NULL OR i.clientId = ${ctx.userId} OR i.agencyId IS NULL)
          GROUP BY cu.chatId`;
  return new Map(rows.map((r) => [Number(r.chatId), Number(r.unread)]));
};
const listChats = async (prisma, ctx) => {
  const [chats, unread] = await Promise.all([
    prisma.chat.findMany({
      where: visibleWhere(ctx),
      include: {
        inquiry: { select: INQUIRY_SELECT },
        users: { include: { user: { select: personSelect } } },
        messages: { orderBy: { id: "desc" }, take: 1 },
      },
    }),
    unreadByChat(prisma, ctx),
  ]);
  return chats.map((chat) => ({ chat, last: chat.messages[0], unread: unread.get(chat.id) || 0 }));
};

// ---------- feature tests ----------

test("schema: delegates, compound keys and relations are parsed", async () => {
  const prisma = fresh();
  for (const d of ["user", "post", "postDetail", "postView", "savedPost", "chat", "chatUser", "message", "inquiry", "agency", "agencyInvitation", "agencyApplication", "applicationEvent", "applicationNote", "document", "notification", "auditLog", "report", "setting", "passwordResetToken"]) {
    assert.equal(typeof prisma[d]?.findMany, "function", d);
  }
  const { models } = prisma.$schema;
  assert.deepEqual(models.ChatUser.compound.chatId_userId, ["chatId", "userId"]);
  assert.deepEqual(models.Inquiry.compound.clientId_postId, ["clientId", "postId"]);
  assert.deepEqual(models.PostView.compound.postId_viewerKey_day, ["postId", "viewerKey", "day"]);
  assert.equal(models.User.rels.posts.to, "Post");
  assert.deepEqual(models.User.rels.posts.foreignKeys, ["userId"]);
  assert.deepEqual(models.User.rels.postsCreated.foreignKeys, ["createdById"]);
  assert.equal(models.User.rels.ownedAgency.isList, false);
  assert.deepEqual(models.User.rels.ownedAgency.foreignKeys, ["ownerId"]);
  assert.equal(models.Chat.rels.inquiry.owner, false);
});

test("load: defaults filled, autoincrement continues, dates are Dates, copies are fresh", async () => {
  const prisma = fresh();
  const alice = await prisma.user.findUnique({ where: { id: 2 } });
  assert.equal(alice.role, "client");
  assert.equal(alice.accountType, "individual");
  assert.equal(alice.status, "active");
  assert.equal(alice.verified, false);
  assert.equal(alice.agencyActive, true);
  assert.equal(alice.avatar, null);
  assert.ok(alice.createdAt instanceof Date);
  assert.ok(alice.updatedAt instanceof Date);
  const views = await prisma.postView.findMany();
  assert.deepEqual(views.map((v) => v.id), [1, 2, 3, 4]);
  const u = await prisma.user.create({ data: { email: "n@x.dz", username: "newbie", password: "x" } });
  assert.equal(u.id, 9);
  alice.username = "mutated";
  const post = await prisma.post.findUnique({ where: { id: 1 } });
  post.images.push("bad");
  assert.equal((await prisma.user.findUnique({ where: { id: 2 } })).username, "alice");
  assert.deepEqual((await prisma.post.findUnique({ where: { id: 1 } })).images, ["https://img/1.jpg"]);
  assert.equal(typeof prisma.$data.User[0].createdAt, "string");
  assert.doesNotThrow(() => JSON.stringify(prisma.$data));
});

test("where: scalar filters, undefined ignored, null, logic", async () => {
  const prisma = fresh();
  const ids = async (where, orderBy = { id: "asc" }) => (await prisma.post.findMany({ where, orderBy })).map((p) => p.id);
  assert.deepEqual(await ids({ city: undefined, price: { gte: undefined } }), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(await ids({ city: "Oran" }), [2, 3, 4]);
  assert.deepEqual(await ids({ city: { equals: "Oran" } }), [2, 3, 4]);
  assert.deepEqual(await ids({ agencyId: null }), [1, 5, 7]);
  assert.deepEqual(await ids({ agencyId: { not: null } }), [2, 3, 4, 6]);
  assert.deepEqual(await ids({ userId: { not: 3 } }), [2, 3, 5]); // SQL: NULLs never match <>
  assert.deepEqual(await ids({ status: { in: ["pending", "archived"] } }), [3, 7]);
  assert.deepEqual(await ids({ status: { notIn: ["approved"] } }), [3, 7]);
  assert.deepEqual(await ids({ price: { gt: 50000, lte: 150000 } }), [1, 6, 7]);
  assert.deepEqual(await ids({ createdAt: { gte: new Date("2026-09-05T00:00:00Z") } }), [2, 3, 4]);
  assert.deepEqual(await ids({ createdAt: { lt: "2026-09-02T10:00:00.000Z" } }), [1]);
  assert.deepEqual(await ids({ title: { contains: "FLAT" } }), [2]);
  assert.deepEqual(await ids({ title: { contains: "flat", mode: "insensitive" } }), [2]);
  assert.deepEqual(await ids({ title: { startsWith: "sun" } }), [1]);
  assert.deepEqual(await ids({ title: { endsWith: "house" } }), [7]);
  assert.deepEqual(await ids({ title: { not: { contains: "O" } } }), [1, 4]);
  assert.deepEqual(await ids({ OR: [{ city: "Blida" }, { price: 20000 }] }), [5, 7]);
  assert.deepEqual(await ids({ AND: [{ city: "Oran" }, { type: "buy" }] }), [3, 4]);
  assert.deepEqual(await ids({ AND: { city: "Oran", type: "rent" } }), [2]);
  assert.deepEqual(await ids({ NOT: { city: "Oran" } }), [1, 5, 6, 7]);
  assert.deepEqual(await ids({ NOT: [{ city: "Oran" }, { city: "Alger" }] }), [7]);
  assert.deepEqual(await ids({ OR: [] }), []);
  assert.deepEqual(await ids({ featured: true }), [1]);
  assert.deepEqual(await ids({ reviewedAt: { not: null } }), [2, 4]);
});

test("where: relation filters (to-one, is/isNot, null, some/every/none)", async () => {
  const prisma = fresh();
  const ids = async (model, where) => (await prisma[model].findMany({ where, orderBy: { id: "asc" } })).map((p) => p.id);
  assert.deepEqual(await ids("post", { user: { status: "active" } }), [1, 2, 3, 7]);
  assert.deepEqual(await ids("post", { user: { is: { status: "suspended" } } }), [5]);
  assert.deepEqual(await ids("post", { agency: { isNot: { status: "active" } } }), [1, 5, 6, 7]);
  assert.deepEqual(await ids("post", { user: null }), [4, 6]);
  assert.deepEqual(await ids("post", { agency: { is: null } }), [1, 5, 7]);
  assert.deepEqual(await ids("chat", { inquiry: null }), [3]);
  assert.deepEqual(await ids("chat", { users: { some: { userId: 3 } } }), [2]);
  assert.deepEqual(await ids("chat", { users: { every: { userId: { in: [2, 7] } } } }), [1, 3]);
  assert.deepEqual(await ids("chat", { messages: { none: { userId: 6 } } }), [2, 3]);
  assert.deepEqual(await ids("user", { posts: { some: { status: "archived" } } }), [3]);
  assert.deepEqual(await ids("postDetail", { post: { agencyId: 1, userId: 6 } }), [2]);
  assert.deepEqual(await ids("postView", { post: { agencyId: 1 }, day: { gte: today } }), [1, 2, 4]);
});

test("findUnique / compound keys / OrThrow / findFirst", async () => {
  const prisma = fresh();
  assert.equal((await prisma.chatUser.findUnique({ where: { chatId_userId: { chatId: 2, userId: 3 } } })).lastReadAt, null);
  assert.equal((await prisma.inquiry.findUnique({ where: { clientId_postId: { clientId: 2, postId: 1 } } })).id, 2);
  assert.equal((await prisma.savedPost.findUnique({ where: { userId_postId: { postId: 2, userId: 2 } } })).id, 2);
  assert.equal(await prisma.savedPost.findUnique({ where: { userId_postId: { postId: 3, userId: 2 } } }), null);
  assert.equal((await prisma.postView.findUnique({ where: { postId_viewerKey_day: { postId: 2, viewerKey: "v:abc", day: today } } })).id, 2);
  assert.equal((await prisma.agency.findUnique({ where: { ownerId: 4 } })).id, 1);
  assert.equal((await prisma.postDetail.findUnique({ where: { postId: 1 } })).Matricule, "PROP-000001");
  assert.equal((await prisma.setting.findUnique({ where: { key: "listings" } })).value.maxImages, 10);
  await rejects(prisma.user.findUniqueOrThrow({ where: { id: 99 } }), "P2025");
  await rejects(prisma.user.findFirstOrThrow({ where: { username: "nobody" } }), "P2025");
  await rejects(prisma.user.findUnique({ where: { id: undefined } }));
  assert.equal((await prisma.post.findFirst({ where: { city: "Oran" }, orderBy: { price: "desc" } })).id, 3);
});

test("select / include nested, _count, omit, relation args", async () => {
  const prisma = fresh();
  const u = await prisma.user.findUnique({
    where: { id: 3 },
    select: {
      username: true,
      posts: { select: { id: true, postDetail: { select: { views: true } } }, where: { status: "approved" }, orderBy: { id: "asc" } },
      _count: { select: { posts: true, savedPosts: true, chats: { where: { lastReadAt: null } } } },
    },
  });
  assert.deepEqual(u, { username: "bob", posts: [{ id: 1, postDetail: { views: 10 } }], _count: { posts: 2, savedPosts: 0, chats: 1 } });
  const p = await prisma.post.findUnique({ where: { id: 4 }, include: { user: true, agency: { select: { tradeName: true } }, _count: true } });
  assert.equal(p.user, null);
  assert.equal(p.agency.tradeName, "Casa Immo");
  assert.equal(p._count.savedPosts, 0);
  assert.ok(!("reports" in p));
  const omitted = await prisma.user.findUnique({ where: { id: 2 }, omit: { password: true } });
  assert.ok(!("password" in omitted));
  const chat = await prisma.chat.findUnique({ where: { id: 1 }, include: { messages: { orderBy: { id: "desc" }, take: 1, skip: 0 }, users: { include: { user: { select: { username: true } } } } } });
  assert.equal(chat.messages.length, 1);
  assert.equal(chat.messages[0].text, "Hello");
  assert.equal(chat.users[0].user.username, "alice");
  const sp = await prisma.savedPost.findFirst({ select: { post: true } });
  assert.equal(sp.post.title, "Sunny apartment");
  assert.ok(sp.post.createdAt instanceof Date);
});

test("orderBy: arrays, relation fields, _count, nulls; take/skip/negative take/distinct/cursor", async () => {
  const prisma = fresh();
  const ids = (rows) => rows.map((r) => r.id);
  assert.deepEqual(ids(await prisma.post.findMany({ orderBy: [{ featured: "desc" }, { createdAt: "desc" }] })), [1, 4, 3, 2, 7, 6, 5]);
  assert.deepEqual(ids(await prisma.post.findMany({ orderBy: { reviewedAt: "asc" }, take: 3 })), [1, 3, 5]);
  assert.deepEqual(ids(await prisma.post.findMany({ where: { id: { in: [1, 2, 4] } }, orderBy: { reviewedAt: "desc" } })), [4, 2, 1]);
  assert.deepEqual(ids(await prisma.post.findMany({ orderBy: { reviewedAt: { sort: "asc", nulls: "last" } }, take: 2 })), [2, 4]);
  assert.deepEqual(ids(await prisma.savedPost.findMany({ orderBy: { post: { price: "asc" } } })), [2, 1]);
  assert.deepEqual(ids(await prisma.post.findMany({ where: { id: { in: [1, 2, 4] } }, orderBy: { user: { username: "asc" } } })), [4, 2, 1]);
  assert.deepEqual(ids(await prisma.user.findMany({ where: { id: { in: [2, 3, 6] } }, orderBy: { posts: { _count: "desc" } } })), [3, 6, 2]);
  assert.deepEqual(ids(await prisma.post.findMany({ orderBy: { id: "asc" }, skip: 2, take: 2 })), [3, 4]);
  assert.deepEqual(ids(await prisma.post.findMany({ orderBy: { id: "asc" }, take: -2 })), [6, 7]);
  assert.deepEqual((await prisma.post.findMany({ distinct: ["city"], orderBy: { id: "asc" } })).map((p) => p.city), ["Alger", "Oran", "Blida"]);
  assert.deepEqual(ids(await prisma.post.findMany({ cursor: { id: 5 }, orderBy: { id: "asc" }, take: 2 })), [5, 6]);
});

test("count / aggregate / groupBy", async () => {
  const prisma = fresh();
  assert.equal(await prisma.post.count(), 7);
  assert.equal(await prisma.post.count({ where: { city: "Oran" } }), 3);
  assert.deepEqual(await prisma.post.count({ select: { _all: true, reviewedAt: true } }), { _all: 7, reviewedAt: 2 });
  const agg = await prisma.post.aggregate({ where: { city: "Oran" }, _sum: { price: true }, _avg: { bedroom: true }, _min: { createdAt: true }, _max: { price: true }, _count: { _all: true, reviewedAt: true } });
  assert.equal(agg._sum.price, 1250000);
  assert.equal(agg._avg.bedroom, 7 / 3);
  assert.ok(agg._min.createdAt instanceof Date);
  assert.equal(agg._max.price, 900000);
  assert.deepEqual(agg._count, { _all: 3, reviewedAt: 2 });
  const none = await prisma.postDetail.aggregate({ where: { postId: 99 }, _sum: { views: true }, _count: true });
  assert.deepEqual(none, { _count: 0, _sum: { views: null } });
  const g = await prisma.post.groupBy({ by: ["city"], _count: { _all: true, reviewedAt: true }, _sum: { price: true }, orderBy: { city: "asc" } });
  assert.deepEqual(g.map((r) => [r.city, r._count._all, r._count.reviewedAt, r._sum.price]), [["Alger", 3, 0, 190000], ["Blida", 1, 0, 150000], ["Oran", 3, 2, 1250000]]);
  const g2 = await prisma.user.groupBy({ by: ["agencyRole", "agencyActive"], where: { agencyId: 1 }, _count: { _all: true } });
  assert.equal(g2.length, 3);
  const g3 = await prisma.post.groupBy({ by: ["status"], _count: { _all: true }, orderBy: { _count: { status: "desc" } } });
  assert.equal(g3[0].status, "approved");
  assert.equal(g3[0]._count._all, 5);
});

test("create: defaults, validation, P2002, P2003, nested create/createMany/connect", async () => {
  const prisma = fresh();
  const n = await prisma.notification.create({ data: { audience: "user", userId: 2, type: "t", title: "x", body: undefined } });
  assert.equal(n.body, null);
  assert.equal(n.readAt, null);
  assert.ok(n.createdAt instanceof Date);
  assert.equal(changes, 1);
  const dup = await rejects(prisma.user.create({ data: { email: "ALICE@x.dz", username: "other", password: "x" } }), "P2002");
  assert.ok(String(dup.meta.target).includes("email"));
  await rejects(prisma.user.create({ data: { email: "q@x.dz", username: "bob", password: "x" } }), "P2002");
  await rejects(prisma.applicationNote.create({ data: { applicationId: 999, authorId: 1, body: "x" } }), "P2003");
  const missing = await rejects(prisma.user.create({ data: { email: "q@x.dz" } }));
  assert.ok(missing.clientVersion && !missing.code);
  await rejects(prisma.user.create({ data: { email: "q@x.dz", username: "q", password: "x", role: "superuser" } }));
  assert.equal(changes, 1);

  const chat = await prisma.chat.create({ data: { users: { create: [{ userId: 2 }, { userId: 3 }] } }, include: { users: true } });
  assert.deepEqual(chat.users.map((u) => u.userId), [2, 3]);
  const app = await prisma.agencyApplication.create({
    data: { applicant: { connect: { id: 2 } }, tradeName: "T", events: { create: { type: "created", toStatus: "draft", actorId: 2 } } },
    include: { events: true, applicant: { select: { username: true } } },
  });
  assert.equal(app.applicantId, 2);
  assert.equal(app.events[0].applicationId, app.id);
  assert.equal(app.applicant.username, "alice");
  const post = await prisma.post.create({
    data: {
      title: "N", price: 1, images: [], address: "a", city: "c", district: "d", bedroom: 1, bathroom: 1, latitude: "0", longitude: "0",
      type: "buy", property: "residential", propertyType: "apartment", user: { connect: { id: 2 } },
      postDetail: { create: { desc: "d" } }, savedPosts: { createMany: { data: [{ userId: 3 }] } },
    },
    include: { postDetail: true, savedPosts: true },
  });
  assert.equal(post.id, 8);
  assert.equal(post.status, "pending");
  assert.equal(post.postDetail.postId, 8);
  assert.equal(post.savedPosts[0].userId, 3);
  // an atomic failure leaves nothing behind
  const before = prisma.$data.Chat.length;
  await rejects(prisma.chat.create({ data: { users: { create: [{ userId: 2 }, { userId: 2 }] } } }), "P2002");
  assert.equal(prisma.$data.Chat.length, before);
  const many = await prisma.savedPost.createMany({ data: [{ userId: 3, postId: 2 }, { userId: 2, postId: 1 }], skipDuplicates: true });
  assert.equal(many.count, 1);
});

test("update: operators, updatedAt, P2025, P2002, nested writes", async () => {
  const prisma = fresh();
  const before = await prisma.post.findUnique({ where: { id: 2 } });
  await new Promise((r) => setTimeout(r, 5));
  const p = await prisma.post.update({ where: { id: 2 }, data: { price: { increment: 500 }, bedroom: { set: 4 }, title: "Renamed", reviewNote: undefined } });
  assert.equal(p.price, 50500);
  assert.equal(p.bedroom, 4);
  assert.ok(p.updatedAt > before.updatedAt);
  assert.equal((await prisma.postDetail.update({ where: { postId: 2 }, data: { views: { increment: 1 } }, select: { views: true } })).views, 21);
  assert.equal((await prisma.postDetail.update({ where: { postId: 2 }, data: { views: { multiply: 2 } } })).views, 42);
  assert.equal((await prisma.postDetail.update({ where: { postId: 2 }, data: { views: { decrement: 2 } } })).views, 40);
  assert.equal((await prisma.postDetail.update({ where: { postId: 2 }, data: { views: { divide: 3 } } })).views, 13);
  const err = await rejects(prisma.user.update({ where: { id: 999 }, data: { phone: "1" } }), "P2025");
  assert.ok(err instanceof Error);
  await rejects(prisma.user.update({ where: { id: 2 }, data: { username: "bob" } }), "P2002");
  await prisma.user.update({ where: { id: 2 }, data: { username: "alice" } }); // unchanged unique is fine

  const app = await prisma.agencyApplication.update({
    where: { id: 1 },
    data: { status: "under_review", reviewedAt: new Date(), events: { create: { type: "status", fromStatus: "submitted", toStatus: "under_review", actorId: 1 } } },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });
  assert.equal(app.events.length, 3);
  const chat = await prisma.chat.update({
    where: { id: 3 },
    data: { users: { deleteMany: { userId: 7 }, create: { userId: 3 } }, messages: { updateMany: { where: { userId: 7 }, data: { text: "edited" } } } },
    include: { users: true, messages: true },
  });
  assert.deepEqual(chat.users.map((u) => u.userId), [2, 3]);
  assert.equal(chat.messages[0].text, "edited");
  const post = await prisma.post.update({ where: { id: 1 }, data: { user: { disconnect: true }, agency: { connect: { id: 1 } }, postDetail: { update: { views: 99 } } }, include: { postDetail: true } });
  assert.equal(post.userId, null);
  assert.equal(post.agencyId, 1);
  assert.equal(post.postDetail.views, 99);
  const p3 = await prisma.post.update({ where: { id: 3 }, data: { postDetail: { upsert: { create: { desc: "x" }, update: { desc: "Office!" } } } }, include: { postDetail: true } });
  assert.equal(p3.postDetail.desc, "Office!");
  const um = await prisma.notification.updateMany({ where: { audience: "admin", readAt: null }, data: { readAt: new Date() } });
  assert.equal(um.count, 1);
  const json = await prisma.agencyApplication.update({ where: { id: 1 }, data: { checklist: { a: { by: "x" } } } });
  assert.deepEqual(json.checklist, { a: { by: "x" } });
});

test("upsert", async () => {
  const prisma = fresh();
  const a = await markRead(prisma, 2, 3);
  assert.ok(a.lastReadAt instanceof Date);
  const b = await markRead(prisma, 1, 6);
  assert.equal(b.userId, 6);
  assert.equal(await prisma.chatUser.count({ where: { chatId: 1 } }), 2);
  const s = await prisma.setting.upsert({ where: { key: "marketplace" }, update: { value: 1 }, create: { key: "marketplace", value: { supportEmail: "a@b.c" } } });
  assert.equal(s.value.supportEmail, "a@b.c");
  const s2 = await prisma.setting.upsert({ where: { key: "listings" }, update: { value: { maxImages: 3 }, updatedById: 1 }, create: { key: "listings", value: {} } });
  assert.equal(s2.value.maxImages, 3);
});

test("delete / deleteMany with referential actions", async () => {
  const prisma = fresh();
  const deleted = await prisma.post.delete({ where: { id: 2 }, include: { postDetail: true } });
  assert.equal(deleted.postDetail.views, 20);
  assert.equal(await prisma.postDetail.count({ where: { postId: 2 } }), 0); // Cascade
  assert.equal(await prisma.postView.count({ where: { postId: 2 } }), 0); // Cascade
  assert.equal((await prisma.inquiry.findUnique({ where: { id: 1 } })).postId, null); // SetNull
  assert.equal(await prisma.savedPost.count({ where: { postId: 2 } }), 1); // no action: left alone
  await rejects(prisma.post.delete({ where: { id: 2 } }), "P2025");

  // a user takes their chats' memberships, notifications and applications with them
  const r = await prisma.user.deleteMany({ where: { id: 7 } });
  assert.equal(r.count, 1);
  assert.equal(await prisma.chatUser.count({ where: { userId: 7 } }), 0);
  assert.equal(await prisma.inquiry.count({ where: { clientId: 7 } }), 0); // Cascade
  assert.equal((await prisma.post.findUnique({ where: { id: 5 } })).userId, null); // SetNull
  assert.equal(await prisma.document.count({ where: { userId: 7 } }), 0); // Cascade

  // deleting a user who owns an agency nulls Agency.ownerId; members keep their row
  await prisma.user.delete({ where: { id: 4 } });
  assert.equal((await prisma.agency.findUnique({ where: { id: 1 } })).ownerId, null);
  assert.equal((await prisma.auditLog.findUnique({ where: { id: 1 } })).actorId, null);

  // chat delete cascades to messages and chat users, Inquiry.chatId set null
  await prisma.chat.delete({ where: { id: 1 } });
  assert.equal(await prisma.message.count({ where: { chatId: 1 } }), 0);
  assert.equal((await prisma.inquiry.findUnique({ where: { id: 1 } })).chatId, null);
});

test("$transaction: arrays, functions, rollback, onChange", async () => {
  const prisma = fresh();
  const results = await prisma.$transaction([prisma.savedPost.deleteMany({ where: { postId: 1 } }), prisma.post.count()]);
  assert.deepEqual(results, [{ count: 1 }, 7]);
  assert.equal(changes, 1);

  changes = 0;
  await rejects(
    prisma.$transaction([
      prisma.user.update({ where: { id: 2 }, data: { phone: "123" } }),
      prisma.user.update({ where: { id: 999 }, data: { phone: "1" } }),
    ]),
    "P2025"
  );
  assert.equal((await prisma.user.findUnique({ where: { id: 2 } })).phone, null);
  assert.equal(changes, 0);

  await rejects(
    prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: 2 }, data: { phone: "555" } });
      assert.equal((await tx.user.findUnique({ where: { id: 2 } })).phone, "555");
      throw new Error("boom");
    })
  );
  assert.equal((await prisma.user.findUnique({ where: { id: 2 } })).phone, null);
  assert.equal(changes, 0);

  const out = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: 2 }, data: { phone: "777" } });
    await tx.user.update({ where: { id: 3 }, data: { phone: "888" } });
    return tx.user.findUnique({ where: { id: 3 } });
  });
  assert.equal(out.phone, "888");
  assert.equal(changes, 1);
  const raw = await prisma.$transaction((tx) => tx.$queryRaw`SELECT id FROM \`User\` WHERE id = ${2} FOR UPDATE`);
  assert.deepEqual(raw, []);
  // queries are lazy: nothing runs until awaited
  changes = 0;
  const pending = prisma.notification.create({ data: { audience: "admin", type: "t", title: "lazy" } });
  assert.equal(changes, 0);
  await pending;
  assert.equal(changes, 1);
});

test("$queryRawUnsafe daily counts, $replace, $connect", async () => {
  const prisma = fresh();
  const users = await prisma.$queryRawUnsafe("SELECT DATE(createdAt) AS date, COUNT(*) AS count FROM `User` GROUP BY date ORDER BY date ASC");
  assert.ok(users[0].date instanceof Date);
  assert.equal(users[0].date.toISOString(), "2026-08-01T00:00:00.000Z");
  assert.deepEqual(users.map((r) => r.count), [1, 2, 1, 1, 1, 1, 1]);
  const posts = await prisma.$queryRawUnsafe("SELECT DATE(createdAt) AS date, COUNT(*) AS count FROM `Post` GROUP BY date ORDER BY date ASC");
  assert.equal(posts.length, 7);
  assert.deepEqual(await prisma.$queryRawUnsafe("SELECT 1"), []);
  await prisma.$connect();
  await prisma.$disconnect();
  changes = 0;
  prisma.$replace({ User: [{ email: "only@x.dz", username: "only", password: "x" }] });
  assert.equal(changes, 1);
  assert.equal((await prisma.user.findMany())[0].id, 1);
  assert.equal(await prisma.post.count(), 0);
  assert.equal((await prisma.user.create({ data: { email: "b@x.dz", username: "b", password: "x" } })).id, 2);
});

// ---------- real backend queries ----------

test("real: agencyInsights getOverview (owner and agent)", async () => {
  const prisma = fresh();
  for (const [req, expected] of [[agencyReq(4, "owner"), { total: 3, open: 1 }], [agencyReq(6, "agent"), { total: 1, open: 1 }]]) {
    const scope = listingScope(req);
    const [byStatus, hidden, byType, members, inquiries, views] = await Promise.all([
      prisma.post.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
      prisma.post.count({ where: { ...scope, status: "approved", hiddenByOwner: true } }),
      prisma.post.groupBy({ by: ["type"], where: { ...scope, status: { not: "archived" } }, _count: { _all: true } }),
      prisma.user.groupBy({ by: ["agencyRole", "agencyActive"], where: { agencyId: req.agency.id }, _count: { _all: true } }),
      prisma.inquiry.groupBy({ by: ["status"], where: inquiryScope(req), _count: { _all: true } }),
      prisma.postDetail.aggregate({ where: { post: scope }, _sum: { views: true } }),
    ]);
    assert.equal(byStatus.reduce((n, s) => n + s._count._all, 0), expected.total);
    assert.equal(typeof hidden, "number");
    assert.ok(byType.every((t) => ["buy", "rent"].includes(t.type)));
    assert.equal(members.reduce((n, m) => n + m._count._all, 0), 3);
    const inq = Object.fromEntries(inquiries.map((i) => [i.status, i._count._all]));
    assert.equal(inq.open, expected.open);
    assert.ok(views._sum.views >= 20);
    const logs = await prisma.auditLog.findMany({
      where: { entityType: "agency", entityId: req.agency.id, ...(can(req, "activity.agency") ? {} : { actorId: req.userId }) },
      select: { id: true, action: true, summary: true, createdAt: true, details: true, actor: { select: { id: true, username: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    const reviews = await prisma.post.findMany({
      where: { ...listingScope(req), reviewedAt: { not: null }, status: { in: ["approved", "rejected", "unpublished"] } },
      select: { id: true, title: true, status: true, reviewedAt: true },
      orderBy: { reviewedAt: "desc" },
      take: 12,
    });
    reviews.forEach((p) => assert.equal(typeof p.reviewedAt.getTime(), "number"));
    if (can(req, "activity.agency")) assert.equal(logs[0].details.postId, 3);
  }
});

test("real: agencyInsights getAnalytics", async () => {
  const prisma = fresh();
  const req = agencyReq(4, "owner");
  const days = 30;
  const since = today - (days - 1);
  const scope = listingScope(req);
  const [views, inquiries, posts, perAgent] = await Promise.all([
    prisma.postView.groupBy({ by: ["day"], where: { post: scope, day: { gte: since } }, _count: { _all: true } }),
    prisma.inquiry.findMany({ where: { ...inquiryScope(req), createdAt: { gte: new Date(since * DAY) } }, select: { createdAt: true } }),
    prisma.post.findMany({
      where: { ...scope, status: { not: "archived" } },
      select: { id: true, title: true, city: true, status: true, hiddenByOwner: true, userId: true, postDetail: { select: { views: true } }, _count: { select: { inquiries: true, savedPosts: true } } },
    }),
    prisma.user.findMany({ where: { agencyId: req.agency.id }, select: { id: true, username: true, avatar: true, agencyRole: true } }),
  ]);
  const byDay = new Map(views.map((v) => [v.day, v._count._all]));
  assert.equal(byDay.get(today), 3);
  assert.equal(byDay.get(today - 1), 1);
  assert.ok(Array.isArray(inquiries));
  assert.equal(posts.length, 3);
  assert.equal(posts.find((p) => p.id === 2)._count.inquiries, 1);
  assert.equal(posts.find((p) => p.id === 2)._count.savedPosts, 1);
  assert.equal(perAgent.length, 3);
});

test("real: adminPosts getOverview", async () => {
  const prisma = fresh();
  const [usersByRole, postsByStatus, viewsAgg, usersByDay, postsByDay, applications, agencies, openReports, inactive] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.post.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.postDetail.aggregate({ _sum: { views: true } }),
    prisma.$queryRawUnsafe("SELECT DATE(createdAt) AS date, COUNT(*) AS count FROM `User` GROUP BY date ORDER BY date ASC"),
    prisma.$queryRawUnsafe("SELECT DATE(createdAt) AS date, COUNT(*) AS count FROM `Post` GROUP BY date ORDER BY date ASC"),
    prisma.agencyApplication.count({ where: { status: { in: ["submitted", "resubmitted", "under_review"] } } }),
    prisma.agency.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.report.count({ where: { status: "open" } }),
    prisma.user.count({ where: { status: { not: "active" } } }),
  ]);
  assert.deepEqual(Object.fromEntries(usersByRole.map((r) => [r.role, r._count._all])), { admin: 1, client: 7 });
  assert.equal(postsByStatus.find((r) => r.status === "approved")._count.all, undefined);
  assert.equal(postsByStatus.find((r) => r.status === "approved")._count._all, 5);
  assert.equal(viewsAgg._sum.views, 35);
  const day = (rows) => rows.map((r) => ({ date: new Date(r.date).toISOString().slice(0, 10), count: Number(r.count) }));
  assert.equal(day(usersByDay)[1].date, "2026-08-02");
  assert.equal(day(postsByDay).length, 7);
  assert.equal(applications, 1);
  assert.equal(agencies.length, 2);
  assert.equal(openReports, 1);
  assert.equal(inactive, 1);
});

test("real: adminPosts listPosts + getPostAdmin", async () => {
  const prisma = fresh();
  const ownerSelect = { select: { id: true, username: true, email: true, role: true, avatar: true, phone: true, status: true, agencyId: true } };
  const agencyBrief = { select: { id: true, tradeName: true, status: true } };
  const [posts, counts] = await Promise.all([
    prisma.post.findMany({
      where: {},
      include: { user: ownerSelect, agency: agencyBrief, postDetail: { select: { desc: true, views: true, size: true } }, _count: { select: { reports: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.post.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  assert.equal(posts.length, 7);
  assert.equal(posts[0].id, 4);
  assert.equal(posts.find((p) => p.id === 1)._count.reports, 1);
  assert.equal(posts.find((p) => p.id === 1).postDetail.size, 90);
  assert.equal(posts.find((p) => p.id === 6).user, null);
  assert.equal(counts.length, 3);
  const post = await prisma.post.findUnique({
    where: { id: 1 },
    include: {
      user: ownerSelect, agency: agencyBrief, postDetail: true,
      reports: { select: { id: true, reason: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      createdBy: { select: { id: true, username: true } },
      _count: { select: { savedPosts: true, inquiries: true } },
    },
  });
  assert.equal(post.createdBy.username, "bob");
  assert.deepEqual(post._count, { savedPosts: 1, inquiries: 1 });
  assert.equal(post.reports[0].reason, "scam");
  const history = await prisma.auditLog.findMany({ where: { entityType: "post", entityId: 2 }, include: { actor: { select: { id: true, username: true } } }, orderBy: { createdAt: "desc" }, take: 30 });
  assert.equal(history[0].actor.username, "admin");
});

test("real: post.controller getPosts with filters + getPost", async () => {
  const prisma = fresh();
  const getPosts = (query) =>
    prisma.post.findMany({
      where: {
        ...PUBLIC_POST_WHERE,
        featured: query.featured === "1" ? true : undefined,
        city: query.city || undefined,
        district: query.district || undefined,
        type: query.type || undefined,
        property: query.property || undefined,
        propertyType: query.propertyType || undefined,
        bedroom: parseInt(query.bedroom) ? { gte: parseInt(query.bedroom) } : undefined,
        price: { gte: parseInt(query.minPrice) || undefined, lte: parseInt(query.maxPrice) || undefined },
      },
      include: { user: { select: { id: true, username: true } }, postDetail: { select: { views: true } }, agency: { select: AGENCY_BADGE_SELECT } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });
  const all = await getPosts({});
  assert.deepEqual(all.map((p) => p.id), [1, 2]); // not hidden, suspended owner/agency or archived
  assert.equal(all[1].agency.verification, "verified");
  assert.equal(all[0].agency, null);
  assert.deepEqual((await getPosts({ city: "Oran", type: "rent" })).map((p) => p.id), [2]);
  assert.deepEqual((await getPosts({ minPrice: "60000", maxPrice: "" })).map((p) => p.id), [1]);
  assert.deepEqual((await getPosts({ bedroom: "3" })).map((p) => p.id), [1]);
  assert.deepEqual((await getPosts({ featured: "1" })).map((p) => p.id), [1]);
  await prisma.post.update({ where: { id: 2 }, data: { availability: "rented" } });
  assert.deepEqual((await getPosts({})).map((p) => p.id), [1]);

  const post = await prisma.post.findUnique({
    where: { id: 1 },
    include: { postDetail: true, user: { select: { id: true, username: true, avatar: true, phone: true, status: true } }, agency: { select: AGENCY_BADGE_SELECT } },
  });
  assert.equal(post.user.phone, "0555");
  const saved = await prisma.savedPost.findUnique({ where: { userId_postId: { postId: 1, userId: 2 } } });
  assert.ok(saved);
  const live = await prisma.post.findFirst({ where: { id: 1, ...PUBLIC_POST_WHERE } });
  assert.equal(live.id, 1);
});

test("real: post.controller recordView (P2002 on second view) + addPost/withActiveSlot", async () => {
  const prisma = fresh();
  const record = (viewerKey) =>
    prisma.$transaction(async (tx) => {
      await tx.postView.create({ data: { postId: 1, viewerKey, day: today } });
      return tx.postDetail.update({ where: { postId: 1 }, data: { views: { increment: 1 } }, select: { views: true } });
    });
  assert.deepEqual(await record("u:9"), { views: 11 });
  await rejects(record("u:9"), "P2002");
  assert.equal((await prisma.postDetail.findUnique({ where: { postId: 1 } })).views, 11);

  // listingLimits.withActiveSlot
  const ACTIVE_WHERE = { status: { in: ["pending", "approved"] }, availability: { notIn: CLOSED_AVAILABILITY } };
  const withActiveSlot = (owner, limit, write) =>
    prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM \`User\` WHERE id = ${owner.userId} FOR UPDATE`;
      const active = await tx.post.count({ where: { userId: owner.userId, agencyId: null, ...ACTIVE_WHERE } });
      if (active >= limit) throw Object.assign(new Error("limit"), { code: "LISTING_LIMIT" });
      return write(tx);
    });
  const data = { title: "New", price: 1, images: [], address: "a", city: "Alger", district: "d", bedroom: 1, bathroom: 1, latitude: "1", longitude: "1", type: "buy", property: "residential", propertyType: "apartment" };
  const create = (tx) =>
    tx.post.create({ data: { ...data, userId: 3, createdById: 3, agencyId: null, status: "pending" } }).then(async (created) => {
      const postDetail = await tx.postDetail.create({ data: { desc: "", postId: created.id, Matricule: `PROP-${created.id.toString().padStart(6, "0")}` } });
      return { ...created, postDetail };
    });
  const made = await withActiveSlot({ userId: 3 }, 2, create);
  assert.equal(made.postDetail.Matricule, "PROP-000008");
  await rejects(withActiveSlot({ userId: 3 }, 2, create), "LISTING_LIMIT");
  assert.equal(await prisma.post.count(), 8);
});

test("real: chat listChats (marketplace + agency) with unread counts, loadVisible, sendMessage", async () => {
  const prisma = fresh();
  const mine = await listChats(prisma, { side: "marketplace", userId: 2 });
  assert.deepEqual(mine.map((c) => c.chat.id).sort(), [1, 2, 3]);
  const c1 = mine.find((c) => c.chat.id === 1);
  assert.equal(c1.chat.inquiry.agency.tradeName, "Casa Immo");
  assert.equal(c1.chat.inquiry.assignedTo.username, "amy");
  assert.equal(c1.last.text, "Hello");
  assert.equal(c1.unread, 1);
  assert.equal(mine.find((c) => c.chat.id === 3).unread, 1);
  assert.equal(mine.find((c) => c.chat.id === 3).chat.inquiry, null);
  const bob = await listChats(prisma, { side: "marketplace", userId: 3 });
  assert.deepEqual(bob.map((c) => [c.chat.id, c.unread]), [[2, 1]]);

  const agency = await listChats(prisma, { side: "agency", userId: 6, agencyId: 1, all: false });
  assert.deepEqual(agency.map((c) => [c.chat.id, c.unread]), [[1, 1]]);
  const owner = await listChats(prisma, { side: "agency", userId: 4, agencyId: 1, all: true });
  assert.deepEqual(owner.map((c) => c.chat.id), [1]);
  const mike = await listChats(prisma, { side: "agency", userId: 5, agencyId: 1, all: false });
  assert.deepEqual(mike, []);

  const ctx = { side: "agency", userId: 6, agencyId: 1, all: false };
  const chat = await prisma.chat.findFirst({
    where: { id: 1, ...visibleWhere(ctx) },
    include: { inquiry: { select: INQUIRY_SELECT }, users: { include: { user: { select: personSelect } } } },
  });
  assert.equal(chat.inquiry.client.username, "alice");
  const msg = await prisma.$transaction((tx) => postMessage(tx, chat.id, 6, "Visit tomorrow?"));
  assert.equal(msg.chatId, 1);
  assert.equal((await unreadByChat(prisma, ctx)).get(1), undefined); // amy just read it
  assert.equal((await unreadByChat(prisma, { side: "marketplace", userId: 2 })).get(1), 2);
  const after = await prisma.message.findMany({ where: { chatId: 1, id: { gt: 2 } }, orderBy: { id: "asc" }, take: 200 });
  assert.deepEqual(after.map((m) => m.text), ["Visit tomorrow?"]);
  const ids = [...new Set(after.map((m) => m.userId))];
  assert.equal((await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } }))[0].username, "amy");
});

test("real: lib/inquiries openInquiry (new, existing, reopened)", async () => {
  const prisma = fresh();
  const post3 = await prisma.post.findUnique({ where: { id: 3 } });
  const first = await openInquiry(prisma, 3, post3, { text: "Is the office free?" });
  assert.equal(first.created, true);
  assert.equal(first.inquiry.agencyId, 1);
  assert.equal(first.inquiry.assignedToId, 5);
  const chat = await prisma.chat.findUnique({ where: { id: first.inquiry.chatId }, include: { users: true, messages: true } });
  assert.deepEqual(chat.users.map((u) => u.userId), [3]);
  assert.equal(chat.lastMessage, "Is the office free?");
  assert.equal(chat.messages.length, 1);
  const again = await openInquiry(prisma, 3, post3, { text: "Hello?", visit: { contactPhone: "1", preferredDate: "2026-11-01", preferredTime: "09:00" } });
  assert.equal(again.created, false);
  assert.equal(again.inquiry.type, "visit");
  // carl's closed inquiry comes back
  const reopened = await openInquiry(prisma, 7, post3, { visit: { contactPhone: "2", preferredDate: "2026-11-03", preferredTime: "11:00" } });
  assert.equal(reopened.reopened, true);
  assert.equal(reopened.inquiry.status, "open");
  assert.equal(reopened.inquiry.chatId, null);
  const post1 = await prisma.post.findUnique({ where: { id: 1 } });
  const individual = await openInquiry(prisma, 6, post1, { text: "hi bob" });
  const parts = await prisma.chatUser.findMany({ where: { chatId: individual.inquiry.chatId } });
  assert.deepEqual(parts.map((p) => p.userId).sort(), [3, 6]);

  const CLIENT_INQUIRY_INCLUDE = {
    post: { select: { id: true, title: true, images: true, city: true, district: true, price: true, type: true } },
    agency: { select: { id: true, tradeName: true, logo: true } },
    owner: { select: { id: true, username: true, avatar: true } },
    assignedTo: { select: { id: true, username: true, avatar: true } },
  };
  const mine = await prisma.inquiry.findMany({ where: { clientId: 2 }, include: CLIENT_INQUIRY_INCLUDE, orderBy: { updatedAt: "desc" } });
  assert.deepEqual(mine.map((i) => i.id), [2, 1]);
  assert.equal(mine[0].owner.username, "bob");
  assert.equal(mine[1].agency.tradeName, "Casa Immo");
});

test("real: agencyTeam listTeam + getTeamMember + removeTeamMember (detachMember)", async () => {
  const prisma = fresh();
  const req = agencyReq(4, "owner");
  const MEMBER_FIELDS = { id: true, username: true, email: true, phone: true, avatar: true, agencyRole: true, agencyActive: true, status: true, createdAt: true, lastLoginAt: true };
  const members = await prisma.user.findMany({ where: { agencyId: req.agency.id }, select: MEMBER_FIELDS, orderBy: { createdAt: "asc" } });
  const ids = members.map((m) => m.id);
  const [listings, published, inquiries] = await Promise.all([
    prisma.post.groupBy({ by: ["userId"], where: { agencyId: req.agency.id, userId: { in: ids } }, _count: { _all: true } }),
    prisma.post.groupBy({ by: ["userId"], where: { agencyId: req.agency.id, userId: { in: ids }, status: "approved", hiddenByOwner: false }, _count: { _all: true } }),
    prisma.inquiry.groupBy({ by: ["assignedToId"], where: { agencyId: req.agency.id, assignedToId: { in: ids }, status: "open" }, _count: { _all: true } }),
  ]);
  const count = (rows, key, id) => rows.find((r) => r[key] === id)?._count._all || 0;
  assert.deepEqual(members.map((m) => m.username), ["olga", "mike", "amy"]);
  assert.deepEqual(members.map((m) => count(listings, "userId", m.id)), [0, 1, 1]);
  assert.deepEqual(members.map((m) => count(published, "userId", m.id)), [0, 0, 1]);
  assert.deepEqual(members.map((m) => count(inquiries, "assignedToId", m.id)), [0, 0, 1]);

  const member = await prisma.user.findFirst({ where: { id: 6, agencyId: req.agency.id }, select: MEMBER_FIELDS });
  const listingRows = await prisma.post.findMany({
    where: { agencyId: req.agency.id, userId: member.id },
    select: { id: true, title: true, price: true, type: true, city: true, district: true, images: true, status: true, hiddenByOwner: true, createdAt: true, postDetail: { select: { views: true } } },
    orderBy: { createdAt: "desc" },
  });
  assert.deepEqual(listingRows.map((p) => p.postDetail.views), [20]);

  const moved = await prisma.$transaction((tx) => detachMember(tx, 6, { reassignTo: 5 }));
  assert.deepEqual(moved, { reassigned: 1, unassigned: 0, to: 5 });
  assert.equal((await prisma.post.findUnique({ where: { id: 2 } })).userId, 5);
  assert.equal((await prisma.inquiry.findUnique({ where: { id: 1 } })).assignedToId, 5);
  assert.equal((await prisma.user.findUnique({ where: { id: 6 } })).agencyId, null);

  const invites = await prisma.agencyInvitation.findMany({
    where: { agencyId: req.agency.id, status: "pending", expiresAt: { gt: new Date() } },
    include: { user: { select: { id: true, username: true, email: true, avatar: true } }, invitedBy: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
  });
  assert.equal(invites[0].invitedBy.username, "olga");
  const { count: revoked } = await prisma.agencyInvitation.updateMany({ where: { id: 0, agencyId: 1, status: "pending" }, data: { status: "revoked" } });
  assert.equal(revoked, 0);
});

test("real: lib/invitations acceptInvitation", async () => {
  const prisma = fresh();
  const OPEN_APPLICATION = ["draft", "submitted", "under_review", "info_required", "resubmitted"];
  const joinRefusal = async (db, user) => {
    if (user.agencyId) return "That account already belongs to an agency.";
    const open = await db.agencyApplication.count({ where: { applicantId: user.id, status: { in: OPEN_APPLICATION } } });
    if (open) return "That account has its own agency application in progress.";
    const active = await db.post.count({ where: { userId: user.id, agencyId: null, status: { in: ["pending", "approved"] } } });
    return active ? "personal listings" : null;
  };
  const accept = (id, userId) =>
    prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM \`User\` WHERE id = ${userId} FOR UPDATE`;
      const invitation = await tx.agencyInvitation.findFirst({
        where: { id, userId, status: "pending" },
        include: { agency: { select: { id: true, tradeName: true, status: true, ownerId: true } } },
      });
      if (!invitation || invitation.expiresAt < new Date()) return { error: "invalid" };
      const user = await tx.user.findUnique({ where: { id: userId } });
      const refusal = await joinRefusal(tx, user);
      if (refusal) return { error: refusal };
      await attachMember(tx, userId, invitation.agencyId, invitation.agencyRole);
      await tx.agencyInvitation.update({ where: { id }, data: { status: "accepted", respondedAt: new Date() } });
      await tx.agencyInvitation.updateMany({ where: { userId, status: "pending", id: { not: id } }, data: { status: "revoked", respondedAt: new Date() } });
      return { agency: invitation.agency, invitation };
    });
  // alice has a draft application open
  assert.ok((await accept(1, 2)).error.includes("application"));
  await prisma.agencyApplication.delete({ where: { id: 2 } });
  const ok = await accept(1, 2);
  assert.equal(ok.agency.tradeName, "Casa Immo");
  assert.equal((await prisma.user.findUnique({ where: { id: 2 } })).agencyRole, "agent");
  assert.equal((await prisma.agencyInvitation.findUnique({ where: { id: 1 } })).status, "accepted");
});

test("real: adminUsers listUsers + getUser + createUser transaction", async () => {
  const prisma = fresh();
  const agencySelect = { select: { id: true, tradeName: true, status: true, verification: true, ownerId: true } };
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { posts: true } }, agency: agencySelect } });
  assert.equal(users[0].username, "zed");
  assert.equal(users.find((u) => u.id === 3)._count.posts, 2);
  const user = await prisma.user.findUnique({
    where: { id: 2 },
    include: {
      agency: agencySelect,
      ownedAgency: { select: { id: true, tradeName: true } },
      posts: { select: { id: true, title: true, price: true, type: true, city: true, images: true, status: true, availability: true, featured: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: "desc" } },
      applications: { select: { id: true, tradeName: true, status: true, submittedAt: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      _count: { select: { savedPosts: true, inquiries: true, inquiriesAssigned: true, reportsFiled: true, reportsAgainst: true, chats: true } },
    },
  });
  assert.equal(user.ownedAgency, null);
  assert.deepEqual(user._count, { savedPosts: 2, inquiries: 2, inquiriesAssigned: 0, reportsFiled: 2, reportsAgainst: 0, chats: 3 });
  assert.equal(user.applications[0].tradeName, "Draft Immo");
  const olga = await prisma.user.findUnique({ where: { id: 4 }, include: { ownedAgency: { select: { id: true, tradeName: true } } } });
  assert.equal(olga.ownedAgency.tradeName, "Casa Immo");
  const activity = await prisma.auditLog.findMany({ where: { OR: [{ entityType: "user", entityId: 7 }, { actorId: 7 }] }, include: { actor: { select: { id: true, username: true } } }, orderBy: { createdAt: "desc" }, take: 50 });
  assert.equal(activity.length, 1);

  const created = await prisma.$transaction(async (tx) => {
    const c = await tx.user.create({ data: { username: "newagency", email: "na@x.dz", password: "h", role: "client", avatar: null, phone: null } });
    const agency = await tx.agency.create({ data: { legalName: "NA", tradeName: "NA Immo", ownerId: c.id, verification: "verified", verifiedAt: new Date() } });
    await attachMember(tx, c.id, agency.id, "owner");
    return tx.user.findUnique({ where: { id: c.id }, include: { agency: agencySelect } });
  });
  assert.equal(created.agency.tradeName, "NA Immo");
  assert.equal(created.agencyRole, "owner");
  const conflict = await rejects(prisma.user.create({ data: { username: "x2", email: "NA@x.dz", password: "h" } }), "P2002");
  assert.ok(String(conflict.meta?.target || "").includes("email"));
});

test("real: adminAgencies listAgencies + getAgency, publicAgency listPublicAgencies", async () => {
  const prisma = fresh();
  const agencies = await prisma.agency.findMany({
    include: { owner: { select: { id: true, username: true, email: true, avatar: true } }, _count: { select: { members: true, posts: true } } },
    orderBy: { createdAt: "desc" },
  });
  assert.deepEqual(agencies.map((a) => [a.id, a._count.members, a._count.posts, a.owner?.username ?? null]), [[1, 3, 3, "olga"], [2, 0, 1, null]]);
  const live = await prisma.post.groupBy({ by: ["agencyId"], where: { agencyId: { not: null }, status: "approved" }, _count: { _all: true } });
  assert.deepEqual(Object.fromEntries(live.map((r) => [r.agencyId, r._count._all])), { 1: 2, 2: 1 });
  const memberSelect = { id: true, username: true, agencyRole: true, _count: { select: { posts: true } } };
  const agency = await prisma.agency.findUnique({
    where: { id: 1 },
    include: {
      owner: { select: memberSelect },
      members: { select: memberSelect, orderBy: { createdAt: "asc" } },
      posts: { select: { id: true, title: true, status: true, user: { select: { id: true, username: true } } }, orderBy: { createdAt: "desc" } },
      applications: { select: { id: true, status: true, events: { select: { id: true, type: true }, orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
  assert.equal(agency.owner.username, "olga");
  assert.deepEqual(agency.members.map((m) => m.agencyRole), ["owner", "manager", "agent"]);
  assert.deepEqual(agency.posts.map((p) => p.user?.username ?? null), [null, "mike", "amy"]);
  assert.deepEqual(agency.applications, []);

  const PUBLIC_FIELDS = { ...AGENCY_BADGE_SELECT, address: true, phone: true, email: true, website: true, about: true, verifiedAt: true, createdAt: true };
  const pub = await prisma.agency.findMany({
    where: { status: "active" },
    select: { ...PUBLIC_FIELDS, _count: { select: { posts: { where: PUBLIC_POST_WHERE }, members: { where: { agencyActive: true, status: "active" } } } } },
    orderBy: { createdAt: "asc" },
  });
  assert.equal(pub.length, 1);
  assert.deepEqual(pub[0]._count, { posts: 1, members: 3 });
  const [posts, members] = await Promise.all([
    prisma.post.findMany({ where: { ...PUBLIC_POST_WHERE, agencyId: 1 }, include: { user: { select: { id: true, username: true, avatar: true } }, postDetail: { select: { views: true } } }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }] }),
    prisma.user.findMany({ where: { agencyId: 1, agencyActive: true, status: "active" }, select: { id: true, username: true, avatar: true, agencyRole: true }, orderBy: { createdAt: "asc" } }),
  ]);
  assert.deepEqual(posts.map((p) => p.id), [2]);
  assert.equal(members.length, 3);
});

test("real: user profilePosts + savePost toggle", async () => {
  const prisma = fresh();
  const userSelect = { select: { id: true, username: true, avatar: true, role: true } };
  const userPosts = await prisma.post.findMany({ where: { userId: 3, agencyId: null }, include: { user: userSelect, agency: { select: AGENCY_BADGE_SELECT } }, orderBy: { createdAt: "desc" } });
  assert.deepEqual(userPosts.map((p) => p.id), [7, 1]);
  const saved = await prisma.savedPost.findMany({
    where: { userId: 2, post: { status: "approved" } },
    include: { post: { include: { user: userSelect, agency: { select: AGENCY_BADGE_SELECT } } } },
    orderBy: { createdAt: "desc" },
  });
  assert.deepEqual(saved.map((s) => s.post.id), [2, 1]);
  assert.equal(saved[0].post.agency.tradeName, "Casa Immo");
  assert.equal(saved[1].post.user.username, "bob");
  const existing = await prisma.savedPost.findUnique({ where: { userId_postId: { userId: 2, postId: 1 } } });
  await prisma.savedPost.delete({ where: { id: existing.id } });
  await prisma.savedPost.create({ data: { userId: 2, postId: 7 } });
  assert.equal(await prisma.savedPost.count({ where: { userId: 2 } }), 2);
});

test("real: user.controller deleteUserCascade", async () => {
  const prisma = fresh();
  const id = 3; // bob: personal listings, a chat, an inquiry as owner
  const docs = await prisma.document.findMany({ where: { OR: [{ userId: id }, { application: { applicantId: id } }] }, select: { id: true, storageKey: true } });
  if (docs.length) await prisma.document.deleteMany({ where: { id: { in: docs.map((d) => d.id) } } });
  const owned = await prisma.agency.findUnique({ where: { ownerId: id } });
  assert.equal(owned, null);
  await prisma.$transaction((tx) => detachMember(tx, id));
  const personal = { userId: id, agencyId: null };
  await prisma.postDetail.deleteMany({ where: { post: personal } });
  await prisma.savedPost.deleteMany({ where: { OR: [{ userId: id }, { post: personal }] } });
  await prisma.post.deleteMany({ where: personal });
  const chatUsers = await prisma.chatUser.findMany({ where: { userId: id }, select: { chatId: true } });
  const chatIds = [...new Set(chatUsers.map((cu) => cu.chatId))];
  await prisma.chatUser.deleteMany({ where: { userId: id } });
  for (const chatId of chatIds) {
    const remaining = await prisma.chatUser.count({ where: { chatId } });
    if (remaining === 0) await prisma.chat.delete({ where: { id: chatId } });
  }
  await prisma.user.delete({ where: { id } });
  assert.equal(await prisma.post.count({ where: { id: { in: [1, 7] } } }), 0);
  assert.equal(await prisma.postDetail.count({ where: { postId: 1 } }), 0);
  assert.equal(await prisma.savedPost.count({ where: { postId: 1 } }), 0);
  assert.equal((await prisma.inquiry.findUnique({ where: { id: 2 } })).ownerId, null);
  assert.equal((await prisma.inquiry.findUnique({ where: { id: 2 } })).postId, null);
  assert.equal(await prisma.chat.count({ where: { id: 2 } }), 1); // alice still in it
  assert.equal(await prisma.report.count({ where: { postId: null } }), 2);
});

test("real: agencyListings listListings (AND/OR/contains) + getListing", async () => {
  const prisma = fresh();
  const req = agencyReq(5, "manager");
  const LIST_SELECT = {
    id: true, title: true, price: true, type: true, city: true, status: true, hiddenByOwner: true, createdAt: true,
    user: { select: { id: true, username: true, avatar: true } },
    createdBy: { select: { id: true, username: true } },
    postDetail: { select: { views: true, Matricule: true } },
    _count: { select: { inquiries: true, savedPosts: true } },
  };
  const list = (q, extra = []) => {
    const and = [listingScope(req), ...extra];
    if (q) and.push({ OR: [{ title: { contains: q } }, { city: { contains: q } }, { district: { contains: q } }] });
    return prisma.post.findMany({ where: { AND: and }, select: LIST_SELECT, orderBy: { createdAt: "desc" } });
  };
  assert.deepEqual((await list()).map((p) => p.id), [4, 3, 2]);
  assert.deepEqual((await list("oran", [{ status: "approved", hiddenByOwner: false }])).map((p) => p.id), [2]);
  assert.deepEqual((await list("VILLA")).map((p) => p.id), [4]);
  assert.deepEqual((await list(null, [{ userId: null }])).map((p) => p.id), [4]);
  const p = (await list("office"))[0];
  assert.equal(p.createdBy.username, "mike");
  assert.equal(p.postDetail.views, 0);
  assert.deepEqual(p._count, { inquiries: 1, savedPosts: 0 });

  const post = await prisma.post.findFirst({ where: { id: 2, ...listingScope(req) }, include: { postDetail: true, _count: { select: { inquiries: true, savedPosts: true } } } });
  const since = today - 29;
  const [views, inquiries] = await Promise.all([
    prisma.postView.groupBy({ by: ["day"], where: { postId: post.id, day: { gte: since } }, _count: { _all: true } }),
    prisma.inquiry.groupBy({ by: ["status"], where: { postId: post.id }, _count: { _all: true } }),
  ]);
  assert.equal(views.length, 2);
  assert.deepEqual(Object.fromEntries(inquiries.map((i) => [i.status, i._count._all])), { open: 1 });
  // deleteListing
  await prisma.$transaction([prisma.savedPost.deleteMany({ where: { postId: 2 } }), prisma.post.delete({ where: { id: 2 } })]);
  assert.equal(await prisma.post.count({ where: { id: 2 } }), 0);
});

test("real: adminApplications listApplications + decide (approve) + note", async () => {
  const prisma = fresh();
  const [applications, counts] = await Promise.all([
    prisma.agencyApplication.findMany({
      where: { status: { in: ["submitted", "under_review", "info_required", "resubmitted"] } },
      select: { id: true, status: true, tradeName: true, submittedAt: true, applicant: { select: { id: true, username: true, email: true, avatar: true } }, _count: { select: { documents: true } } },
      orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.agencyApplication.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  assert.equal(applications[0].applicant.username, "zed");
  assert.equal(applications[0]._count.documents, 1);
  assert.equal(counts.length, 2);
  const fullInclude = {
    applicant: { select: { id: true, username: true, email: true, role: true, status: true, agencyId: true } },
    agency: { select: { id: true, tradeName: true, status: true } },
    documents: { orderBy: { createdAt: "asc" } },
    events: { include: { actor: { select: { id: true, username: true, role: true } } }, orderBy: { createdAt: "asc" } },
    notes: { include: { author: { select: { id: true, username: true } } }, orderBy: { createdAt: "desc" } },
  };
  const app = await prisma.agencyApplication.findUnique({ where: { id: 1 }, include: fullInclude });
  assert.equal(app.events[1].actor.username, "zed");
  assert.equal(app.notes[0].author.username, "admin");
  assert.deepEqual(app.checklist, { rc: { by: "admin" } });
  const same = [app.rcNumber && { rcNumber: app.rcNumber }, app.nif && { nif: app.nif }].filter(Boolean);
  const dupes = await prisma.agency.findMany({ where: { OR: same, id: app.agencyId ? { not: app.agencyId } : undefined }, select: { id: true, tradeName: true } });
  assert.deepEqual(dupes.map((d) => d.id), [1]);

  let agency = null;
  await prisma.$transaction(async (tx) => {
    await tx.agencyApplication.update({
      where: { id: 1 },
      data: { status: "approved", reviewedAt: new Date(), reviewerId: 1, decisionNote: "ok", events: { create: { type: "status", fromStatus: app.status, toStatus: "approved", message: "ok", actorId: 1 } } },
    });
    agency = await agencyFromApplication(tx, app);
  });
  const fresh2 = await prisma.agencyApplication.findUnique({ where: { id: 1 }, include: fullInclude });
  assert.equal(fresh2.status, "approved");
  assert.equal(fresh2.agency.id, agency.id);
  assert.equal(fresh2.events.length, 3);
  assert.equal(fresh2.documents[0].agencyId, agency.id);
  assert.equal((await prisma.user.findUnique({ where: { id: 8 } })).agencyRole, "owner");
  const note = await prisma.applicationNote.create({ data: { applicationId: 1, authorId: 1, body: "approved" }, include: { author: { select: { id: true, username: true } } } });
  assert.equal(note.author.username, "admin");
});

test("real: settings saveSettings + auth resetPassword + adminPosts deletePostAdmin (array transactions)", async () => {
  const prisma = fresh();
  const writes = ["listings", "agencies"].map((section) =>
    prisma.setting.upsert({ where: { key: section }, update: { value: { v: section }, updatedById: 1 }, create: { key: section, value: { v: section }, updatedById: 1 } })
  );
  await prisma.$transaction(writes);
  const rows = await prisma.setting.findMany();
  assert.deepEqual(Object.fromEntries(rows.map((r) => [r.key, r.value])), { listings: { v: "listings" }, agencies: { v: "agencies" } });

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: "t1" } });
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: "new", passwordChangedAt: new Date() } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId, usedAt: null, id: { not: record.id } } }),
  ]);
  assert.deepEqual((await prisma.passwordResetToken.findMany()).map((t) => t.id), [1]);
  assert.ok((await prisma.user.findUnique({ where: { id: 2 } })).passwordChangedAt.getTime() > 0);

  await prisma.$transaction([
    prisma.savedPost.deleteMany({ where: { postId: 1 } }),
    prisma.postDetail.deleteMany({ where: { postId: 1 } }),
    prisma.post.delete({ where: { id: 1 } }),
  ]);
  assert.equal(await prisma.post.count({ where: { id: 1 } }), 0);
});

test("real: adminPlatform listReports + listAudit + notifications + findDuplicates", async () => {
  const prisma = fresh();
  const [reports, counts] = await Promise.all([
    prisma.report.findMany({
      where: {},
      include: { post: { select: { id: true, title: true, status: true, images: true } }, reportedUser: { select: { id: true, username: true, status: true, avatar: true } }, reporter: { select: { id: true, username: true } }, _count: { select: { documents: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.report.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  assert.equal(reports.length, 2);
  assert.equal(reports.find((r) => r.id === 2).reportedUser.username, "carl");
  assert.equal(counts.length, 2);
  const related = await prisma.report.findMany({
    where: { id: { not: 1 }, OR: [{ postId: 1 }, null].filter(Boolean) },
    select: { id: true, reason: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  assert.deepEqual(related, []);
  const audit = await prisma.auditLog.findMany({ where: { summary: { contains: "CARL" }, id: { lt: 100 } }, include: { actor: { select: { id: true, username: true, role: true } } }, orderBy: { id: "desc" }, take: 100 });
  assert.equal(audit[0].actor.role, "admin");
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { audience: "admin" }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.notification.count({ where: { audience: "admin", readAt: null } }),
  ]);
  assert.equal(items.length, 1);
  assert.equal(unread, 1);
  const posts = await prisma.post.findMany({
    where: { status: { not: "archived" } },
    select: { id: true, title: true, price: true, latitude: true, longitude: true, user: { select: { id: true, username: true } } },
    orderBy: { createdAt: "asc" },
  });
  assert.equal(posts.length, 6);
});

// ---------- run ----------

let passed = 0;
const failures = [];
for (const t of tests) {
  try {
    await t.fn();
    passed++;
    console.log(`  ok   ${t.name}`);
  } catch (err) {
    failures.push(t.name);
    console.log(`  FAIL ${t.name}\n       ${String(err.stack || err).split("\n").slice(0, 6).join("\n       ")}`);
  }
}
console.log(`\n${passed}/${tests.length} passed${failures.length ? `, ${failures.length} failed` : ""}`);
process.exit(failures.length ? 1 : 0);
