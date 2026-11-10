import nodemailer from "../shims/nodemailer.js";
import prisma from "./prisma.js";

// In-platform notifications are the source of truth. Email is a best-effort
// extra: it's skipped when no mail account is configured and never fails the
// request that triggered it.

let transporter = null;
const mailer = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  transporter ||= nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  return transporter;
};

export const sendEmail = async ({ to, subject, text }) => {
  const t = mailer();
  if (!t || !to || (Array.isArray(to) && !to.length)) return false;
  try {
    await t.sendMail({ from: `"Bayti" <${process.env.EMAIL_USER}>`, to, subject, text });
    return true;
  } catch (err) {
    console.error("Email failed:", err.message);
    return false;
  }
};

// Shared team inbox in the admin dashboard
export const notifyAdmins = async ({ type, title, body, link }) => {
  try {
    await prisma.notification.create({
      data: { audience: "admin", type, title: title.slice(0, 190), body, link },
    });
  } catch (err) {
    console.error("Admin notification failed:", err);
  }
};

export const notifyUser = async (userId, { type, title, body, link }, email) => {
  try {
    await prisma.notification.create({
      data: { audience: "user", userId, type, title: title.slice(0, 190), body, link },
    });
  } catch (err) {
    console.error("User notification failed:", err);
  }
  if (email?.to) {
    // agency platform links are already absolute
    const full = /^https?:\/\//.test(link || "") ? link : link && process.env.CLIENT_URL ? `${process.env.CLIENT_URL}${link}` : "";
    const url = full ? `\n\n${full}` : "";
    await sendEmail({ to: email.to, subject: title, text: `${body || title}${url}` });
  }
};

// Records a sensitive action taken by an admin (or by a user on their agency)
export const audit = async (req, { action, entityType, entityId, summary, details }) => {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: req.admin?.id ?? req.userId ?? null,
        action,
        entityType,
        entityId: entityId ?? null,
        summary: summary.slice(0, 190),
        details: details ?? undefined,
        ip: String(req.ip || "").slice(0, 64) || null,
      },
    });
  } catch (err) {
    console.error("Audit log failed:", err);
  }
};
