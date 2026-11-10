import express from "express";
import {
  createInquiry,
  getInquiryForPost,
  getMyInquiries,
  getReceivedInquiries,
  updateInquiry,
} from "../controllers/inquiry.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

// Questions and visit requests about listings (replaces /api/tours)
const router = express.Router();

router.use(verifyToken);
router.post("/", createInquiry);
router.get("/mine", getMyInquiries);
router.get("/received", getReceivedInquiries);
router.get("/post/:postId", getInquiryForPost);
router.put("/:id", updateInquiry);

export default router;
