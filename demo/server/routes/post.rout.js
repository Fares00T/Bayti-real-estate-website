import express from "../shims/express.js";
import { verifyToken } from "../middleware/verifyToken.js";

import {
  addPost,
  deletePost,
  getPost,
  getPosts,
  updatePost,
  recordView,
  setPostArchived,
  getListingUsage,
  setPostAvailability,
} from "../controllers/post.controller.js";

const router = express.Router();

router.get("/", getPosts);
router.get("/usage", verifyToken, getListingUsage);
router.post("/:id/view", recordView);
router.get("/:id", getPost);
router.post("/", verifyToken, addPost);
router.put("/:id", verifyToken, updatePost);
router.put("/:id/archive", verifyToken, setPostArchived);
router.put("/:id/availability", verifyToken, setPostAvailability);
router.delete("/:id", verifyToken, deletePost);

export default router;
