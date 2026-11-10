import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import {
  ADMIN_AUDIENCE,
  ADMIN_COOKIE,
  adminSecret,
} from "../middleware/requireAdmin.js";

import { omitPassword } from "./user.controller.js";
import { attemptKey, clearFailures, isLocked, recordFailure } from "../lib/throttle.js";
import { issuedAt, sessionCookie } from "../lib/platform.js";




const SESSION_HOURS = 8;

// only ever sent to the admin API
const cookieOptions = () => sessionCookie({ path: "/api/admin" });

const toId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// ---------- auth ----------

export const adminLogin = async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const key = attemptKey(req, email);

  if (isLocked(key)) {
    return res
      .status(429)
      .json({ message: "Too many attempts. Try again in 15 minutes." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    const valid = user && (await bcrypt.compare(password, user.password));

    // Same answer for "no account", "wrong password" and "not staff"
    if (!valid || user.role !== "admin" || user.status !== "active") {
      recordFailure(key);
      return res
        .status(401)
        .json({ message: "These credentials don't have admin access." });
    }
    clearFailures(key);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const token = jwt.sign({ id: user.id, ...issuedAt() }, adminSecret(), {
      audience: ADMIN_AUDIENCE,
      expiresIn: `${SESSION_HOURS}h`,
    });

    res
      .cookie(ADMIN_COOKIE, token, {
        ...cookieOptions(),
        maxAge: SESSION_HOURS * 60 * 60 * 1000,
      })
      .status(200)
      .json(omitPassword(user));
  } catch (err) {
    console.error("Admin login failed:", err);
    res.status(500).json({ message: "Sign-in failed. Please try again." });
  }
};

export const adminLogout = (req, res) => {
  res.clearCookie(ADMIN_COOKIE, cookieOptions()).status(200).json({ ok: true });
};

export const adminMe = (req, res) => res.status(200).json(req.admin);

