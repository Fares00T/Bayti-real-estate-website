// Runs the in-browser API under Node against the seed data: signs in as each
// demo role and calls every read endpoint plus the main write flows.
// Usage: node scripts/smoke.mjs   (exit code 1 on any 5xx or unexpected status)
import "../server/runtime/env.js";
import { dispatch } from "../server/runtime/http.js";
import { clearAllCookies } from "../server/runtime/cookies.js";
import { prisma } from "../server/runtime/database.js";

let failures = 0;
const call = async (method, url, body, expect = (s) => s < 400) => {
  const res = await dispatch({ method, url, body });
  const ok = expect(res.status);
  if (!ok) failures++;
  const size = res.isJson ? JSON.stringify(res.data).length : res.data?.length ?? 0;
  const note = ok ? "" : `  <-- ${JSON.stringify(res.data)?.slice(0, 160)}`;
  console.log(`${ok ? "ok  " : "FAIL"} ${res.status} ${method.padEnd(6)} ${url}  (${size}b)${note}`);
  return res.data;
};
const login = async (url, email) => {
  clearAllCookies();
  const me = await call("POST", url, { email, password: "demo1234" });
  return me;
};

const first = async (model, where = {}) => (await prisma[model].findFirst({ where }))?.id;

console.log("\n=== public marketplace");
await call("GET", "/api/settings/public");
const posts = await call("GET", "/api/posts");
await call("GET", "/api/posts?city=Algiers&type=buy");
const postId = Array.isArray(posts) ? posts[0]?.id : posts?.posts?.[0]?.id;
await call("GET", `/api/posts/${postId}`);
await call("POST", `/api/posts/${postId}/view`);
const agencies = await call("GET", "/api/agencies");
const agencyId = (Array.isArray(agencies) ? agencies : agencies?.agencies)?.[0]?.id;
await call("GET", `/api/agencies/${agencyId}`);
await call("GET", "/api/applications/requirements");

console.log("\n=== marketplace: client@bayti.dz");
await login("/api/auth/login", "client@bayti.dz");
for (const u of ["/api/auth/me", "/api/users/profilePosts", "/api/chats", "/api/chats/unread", "/api/inquiries/mine", "/api/inquiries/received", "/api/notifications", "/api/invitations", "/api/posts/usage"]) await call("GET", u);
const sara = await prisma.user.findUnique({ where: { email: "client@bayti.dz" } });
const saraChat = (await prisma.chatUser.findFirst({ where: { userId: sara.id } }))?.chatId;
if (saraChat) {
  await call("GET", `/api/chats/${saraChat}`);
  await call("GET", `/api/chats/${saraChat}/messages`);
  await call("POST", `/api/messages/${saraChat}`, { text: "Smoke test message" });
}
await call("GET", `/api/inquiries/post/${postId}`);
await call("POST", "/api/users/save", { postId });
const agencyPost = await prisma.post.findFirst({ where: { status: "approved", agencyId: { not: null }, inquiries: { none: { clientId: sara.id } } } });
if (agencyPost) await call("POST", "/api/inquiries", { postId: agencyPost.id, message: "Is it still available?", type: "visit", preferredDate: "2026-12-01", preferredTime: "10:00", contactPhone: "0550000000" });
await call("POST", "/api/report", { reportType: "post", reportedPostId: String(postId), reason: "Wrong price", details: "smoke", submittedBy: "Sara", submittedEmail: "client@bayti.dz" });

console.log("\n=== marketplace: seller@bayti.dz");
await login("/api/auth/login", "seller@bayti.dz");
await call("GET", "/api/users/profilePosts");
await call("GET", "/api/posts/usage");
await call("GET", "/api/inquiries/received");

console.log("\n=== marketplace: invited@bayti.dz");
await login("/api/auth/login", "invited@bayti.dz");
await call("GET", "/api/invitations");

console.log("\n=== agency: agency@bayti.dz (owner)");
await login("/api/agency/auth/login", "agency@bayti.dz");
for (const u of ["/api/agency/auth/me", "/api/agency/details", "/api/agency/overview", "/api/agency/counters", "/api/agency/analytics", "/api/agency/activity", "/api/agency/listings", "/api/agency/listings?state=pending", "/api/agency/team", "/api/agency/team/invitations", "/api/agency/inquiries", "/api/agency/inquiries?status=open", "/api/agency/chats", "/api/agency/chats/unread", "/api/agency/notifications", "/api/agency/application/requirements"]) await call("GET", u);
const owner = await prisma.user.findUnique({ where: { email: "agency@bayti.dz" } });
const ownListing = await prisma.post.findFirst({ where: { agencyId: owner.agencyId } });
await call("GET", `/api/agency/listings/${ownListing.id}`);
const member = await prisma.user.findFirst({ where: { agencyId: owner.agencyId, id: { not: owner.id } } });
await call("GET", `/api/agency/team/${member.id}`);
const agChat = (await prisma.inquiry.findFirst({ where: { agencyId: owner.agencyId, chatId: { not: null } } }))?.chatId;
if (agChat) {
  await call("GET", `/api/agency/chats/${agChat}`);
  await call("POST", `/api/agency/chats/${agChat}/messages`, { text: "Hello from the agency" });
}
await call("PUT", `/api/agency/listings/${ownListing.id}/visibility`, { hidden: true });
await call("PUT", `/api/agency/listings/${ownListing.id}/visibility`, { hidden: false });

console.log("\n=== agency: agent@bayti.dz");
await login("/api/agency/auth/login", "agent@bayti.dz");
for (const u of ["/api/agency/auth/me", "/api/agency/overview", "/api/agency/listings", "/api/agency/inquiries"]) await call("GET", u);
await call("GET", "/api/agency/team", undefined, (s) => s === 403);

console.log("\n=== agency: applicant@bayti.dz");
await login("/api/agency/auth/login", "applicant@bayti.dz");
await call("GET", "/api/agency/auth/me");
await call("GET", "/api/agency/application");
await call("GET", "/api/agency/overview", undefined, (s) => s === 403);

console.log("\n=== admin: admin@bayti.dz");
await login("/api/admin/auth/login", "admin@bayti.dz");
for (const u of ["/api/admin/auth/me", "/api/admin/overview", "/api/admin/counters", "/api/admin/posts", "/api/admin/posts?status=pending", "/api/admin/posts/duplicates", "/api/admin/users", "/api/admin/agencies", "/api/admin/applications", "/api/admin/notifications", "/api/admin/audit", "/api/admin/reports", "/api/admin/settings"]) await call("GET", u);
const pending = await prisma.post.findFirst({ where: { status: "pending" } });
if (pending) {
  await call("GET", `/api/admin/posts/${pending.id}`);
  await call("GET", `/api/admin/posts/${pending.id}/preview`);
  await call("PUT", `/api/admin/posts/${pending.id}/review`, { decision: "approve", action: "approve", status: "approved" });
}
await call("GET", `/api/admin/users/${sara.id}`);
await call("GET", `/api/admin/agencies/${owner.agencyId}`);
const app = await prisma.agencyApplication.findFirst({ where: { status: { in: ["submitted", "under_review"] } } });
if (app) await call("GET", `/api/admin/applications/${app.id}`);
const doc = await prisma.document.findFirst();
if (doc) await call("GET", `/api/admin/documents/${doc.id}`);
const report = await prisma.report.findFirst();
if (report) await call("GET", `/api/admin/reports/${report.id}`);

console.log("\n=== cross-platform isolation");
clearAllCookies();
await call("POST", "/api/auth/login", { email: "agency@bayti.dz", password: "demo1234" }, (s) => s >= 400 && s < 500);
await call("POST", "/api/admin/auth/login", { email: "client@bayti.dz", password: "demo1234" }, (s) => s >= 400 && s < 500);
await call("GET", "/api/admin/overview", undefined, (s) => s === 401);

console.log(`\n${failures ? `${failures} FAILED` : "all passed"}`);
process.exit(failures ? 1 : 0);
