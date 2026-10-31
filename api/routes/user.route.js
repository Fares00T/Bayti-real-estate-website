import express from "express";
import {
  deleteUser,
  updateUser,
  savePost,
  profilePosts,
} from "../controllers/user.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/save", verifyToken, savePost);
router.get("/profilePosts", verifyToken, profilePosts);
router.put("/:id", verifyToken, updateUser);
router.delete("/:id", verifyToken, deleteUser);

export default router;
