import express from "../shims/express.js";
import {
  forgotPassword,
  login,
  logout,
  me,
  register,
  resetPassword,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/register", register);

router.post("/login", login);

router.post("/logout", logout);

router.get("/me", verifyToken, me);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

export default router;
