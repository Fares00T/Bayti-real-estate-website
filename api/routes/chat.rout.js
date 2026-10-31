import express from "express";
import { getChats, getChat, getNewMessages, getUnreadTotal } from "../controllers/chat.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

// A person's own conversations. New ones start from an inquiry
// (POST /api/inquiries), never with an arbitrary account.
const router = express.Router();

router.get("/", verifyToken, getChats);
router.get("/unread", verifyToken, getUnreadTotal);
router.get("/:id", verifyToken, getChat);
router.get("/:id/messages", verifyToken, getNewMessages);

export default router;
