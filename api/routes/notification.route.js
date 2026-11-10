import express from "express";
import prisma from "../lib/prisma.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { toId } from "../lib/util.js";

// A marketplace account's own notifications
const router = express.Router();

router.use(verifyToken);

router.get("/", async (req, res) => {
  try {
    const where = { audience: "user", userId: req.userId };
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);
    res.status(200).json({ items, unread });
  } catch (err) {
    console.error("Failed to load notifications:", err);
    res.status(500).json({ message: "Couldn't load notifications." });
  }
});

// { ids: [..] } marks those read; no ids marks everything read
router.put("/read", async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(toId).filter(Boolean) : null;
  try {
    await prisma.notification.updateMany({
      where: { audience: "user", userId: req.userId, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
      data: { readAt: new Date() },
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Failed to mark notifications:", err);
    res.status(500).json({ message: "Couldn't update notifications." });
  }
});

export default router;
