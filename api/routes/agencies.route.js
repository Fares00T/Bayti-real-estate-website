import express from "express";
import { getPublicAgency, listPublicAgencies } from "../controllers/publicAgency.controller.js";

// Public agency directory and profile pages on the marketplace
const router = express.Router();

router.get("/", listPublicAgencies);
router.get("/:id", getPublicAgency);

export default router;
