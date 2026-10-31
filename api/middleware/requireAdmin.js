import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { sessionOutdated } from "../lib/platform.js";

export const ADMIN_COOKIE = "admin_token";
export const ADMIN_AUDIENCE = "bayti-admin";
// Admin sessions are signed with their own secret so a marketplace token can
// never be replayed against the admin API.
export const adminSecret = () =>
  process.env.ADMIN_JWT_SECRET || `${process.env.JWT_SECRET_KEY}:admin`;

// Guards every /api/admin route. The role is read from the database on each
// request, so demoting or deleting an admin takes effect immediately.
export const requireAdmin = async (req, res, next) => {
  const token = req.cookies?.[ADMIN_COOKIE];
  if (!token) return res.status(401).json({ message: "Not signed in." });

  let payload;
  try {
    payload = jwt.verify(token, adminSecret(), { audience: ADMIN_AUDIENCE });
  } catch {
    return res.status(401).json({ message: "Your session has expired." });
  }

  try {
    const admin = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, username: true, email: true, avatar: true, role: true, status: true, passwordChangedAt: true },
    });
    if (admin && sessionOutdated(payload, admin)) return res.status(401).json({ message: "Your session has expired." });
    if (!admin || admin.role !== "admin" || admin.status !== "active") {
      return res.status(403).json({ message: "Admin access only." });
    }
    delete admin.passwordChangedAt;
    req.admin = admin;
    req.userId = admin.id;
    next();
  } catch (err) {
    console.error("Admin auth failed:", err);
    res.status(500).json({ message: "Authentication failed." });
  }
};
