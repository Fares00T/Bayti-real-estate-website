import bcrypt from "bcrypt";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import { getSettings } from "../lib/settings.js";
import { notifyAdmins, sendEmail } from "../lib/notify.js";
import { EMAIL_RE, omitPassword } from "../lib/util.js";
import { AGENCY_BADGE_SELECT, agencyAppLink, publicAgency } from "../lib/agency.js";
import { PLATFORM_MESSAGE, canUseMarketplace, homePlatformFor, issuedAt, sessionCookie } from "../lib/platform.js";

export const register = async (req, res) => {
  const username = (req.body.username || "").trim();
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";

  if (username.length < 3) {
    return res
      .status(400)
      .json({ message: "Username must be at least 3 characters." });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ message: "Please enter a valid email." });
  }
  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    const settings = await getSettings();
    if (settings.notifications.newUser) {
      await notifyAdmins({
        type: "user_registered",
        title: `New account: ${username}`,
        body: email,
        link: `/users/${user.id}`,
      });
    }

    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    // unique constraint on username or email
    if (err.code === "P2002") {
      const field = String(err.meta?.target || "").includes("email")
        ? "email"
        : "username";
      return res
        .status(409)
        .json({ message: `This ${field} is already taken.` });
    }
    console.log(err);
    res.status(500).json({ message: "Failed to create user!" });
  }
};

// Sets the marketplace session cookie. Shared by login and agency sign-up.
export const startSession = async (res, user) => {
  const age = 1000 * 60 * 60 * 24 * 7;
  const token = jwt.sign({ id: user.id, ...issuedAt() }, process.env.JWT_SECRET_KEY, {
    expiresIn: age / 1000,
  });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  res.cookie("token", token, sessionCookie({ maxAge: age }));
};

export const login = async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Same message for both cases so emails can't be probed
    const isPasswordValid =
      user && (await bcrypt.compare(password, user.password));
    if (!isPasswordValid)
      return res.status(400).json({ message: "Invalid email or password." });

    if (user.status !== "active") {
      return res.status(403).json({
        message:
          user.status === "suspended"
            ? "This account has been suspended. Contact Bayti support."
            : "This account has been deactivated.",
      });
    }

    // Agency members and staff are refused here and pointed at their own
    // sign-in page; no session of any kind is opened.
    if (!canUseMarketplace(user)) {
      const platform = homePlatformFor(user);
      return res.status(403).json({
        message: PLATFORM_MESSAGE[platform],
        platform,
        redirect: platform === "agency" ? agencyAppLink(`/login?email=${encodeURIComponent(email)}`) : process.env.ADMIN_URL || null,
      });
    }

    await startSession(res, user);
    res.status(200).json({
      ...(await accountFor(user.id)),
      platform: "marketplace",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to login!" });
  }
};

export const logout = (req, res) => {
  res.clearCookie("token", sessionCookie()).status(200).json({ message: "Logout Successful" });
};

// The account as the marketplace keeps it: the person, and the agency they
// belong to (with its computed badge), if any
const accountFor = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { agency: { select: AGENCY_BADGE_SELECT } },
  });
  if (!user) return null;
  const agency = user.agency && { ...publicAgency(user.agency), status: user.agency.status };
  return { ...omitPassword(user), agency };
};

// The signed-in user as the database has them now (role changes, approvals)
export const me = async (req, res) => {
  const account = await accountFor(req.userId);
  if (!account) return res.status(401).json({ message: "Not Authenticated!" });
  res.status(200).json(account);
};

// ---------- password reset ----------

const RESET_TTL_MS = 60 * 60 * 1000;
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Returns the one-time link. Only the hash is stored.
export const createResetLink = async (userId) => {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
  });
  return `${process.env.CLIENT_URL || ""}/reset-password/${token}`;
};

export const sendResetEmail = async (user) => {
  const link = await createResetLink(user.id);
  const sent = await sendEmail({
    to: user.email,
    subject: "Reset your Bayti password",
    text: `Hi ${user.username},\n\nUse this link within the next hour to choose a new password:\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
  });
  return { link, sent };
};

const recentRequests = new Map();

// Always answers the same way so it can't be used to discover accounts
export const forgotPassword = async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const answer = { message: "If an account uses that email, a reset link is on its way." };
  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Please enter a valid email." });

  const last = recentRequests.get(email);
  if (last && Date.now() - last < 60 * 1000) return res.status(200).json(answer);
  recentRequests.set(email, Date.now());

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.status === "active") await sendResetEmail(user);
    res.status(200).json(answer);
  } catch (err) {
    console.error("Reset request failed:", err);
    res.status(200).json(answer);
  }
};

export const resetPassword = async (req, res) => {
  const token = String(req.body?.token || "");
  const password = String(req.body?.password || "");
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  }

  try {
    const record = /^[a-f0-9]{64}$/.test(token)
      ? await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } })
      : null;
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return res.status(400).json({ message: "This reset link has expired. Ask for a new one." });
    }
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        // every session opened with the old password stops working
        data: { password: await bcrypt.hash(password, 10), passwordChangedAt: new Date() },
      }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      // any other outstanding links stop working
      prisma.passwordResetToken.deleteMany({ where: { userId: record.userId, usedAt: null, id: { not: record.id } } }),
    ]);
    res.status(200).json({ message: "Your password has been changed. You can log in now." });
  } catch (err) {
    console.error("Password reset failed:", err);
    res.status(500).json({ message: "Couldn't reset the password." });
  }
};
