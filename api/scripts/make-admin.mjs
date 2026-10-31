// Gives an existing account Bayti staff access. Run on the server only:
//   npm run make-admin -- someone@example.com
// After the first admin exists, grant the role from the admin dashboard
// instead (Users → account → Role), where it is audited.
import prisma from "../lib/prisma.js";

const email = String(process.argv[2] || "").trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run make-admin -- <email>");
  process.exit(1);
}

const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  console.error(`No account uses ${email}. Register it on the marketplace first.`);
  process.exit(1);
}
if (user.agencyId) {
  console.error("This account belongs to an agency. Staff accounts must be separate.");
  process.exit(1);
}
await prisma.user.update({ where: { id: user.id }, data: { role: "admin", status: "active" } });
await prisma.auditLog.create({
  data: { action: "user.role", entityType: "user", entityId: user.id, summary: `${user.username}: made admin from the server console` },
});
console.log(`${user.username} <${email}> is now an admin. Sign in at ${process.env.ADMIN_URL || "the admin dashboard"}.`);
await prisma.$disconnect();
