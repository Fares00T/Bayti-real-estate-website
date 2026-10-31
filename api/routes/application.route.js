import express from "express";
import { getRequirements } from "../controllers/application.controller.js";

// Agencies apply from the agency platform (/api/agency/auth/register and
// /api/agency/application), with an agency account. The marketplace only
// shows what an application needs.
const router = express.Router();

router.get("/requirements", getRequirements);

export default router;
