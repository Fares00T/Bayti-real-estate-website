import express from "express";
import { requireAgency, requireAgencySession, requireApplicant, requirePermission } from "../middleware/requireAgency.js";
import { acceptFiles, uploadMiddleware } from "../lib/storage.js";
import {
  createApplication,
  deleteApplicationDocument,
  downloadApplicationDocument,
  getMyApplications,
  getRequirements,
  convertToAgency,
  registerAgency,
  submitApplication,
  updateApplication,
  uploadApplicationDocuments,
} from "../controllers/application.controller.js";
import {
  agencyLogin,
  agencyLogout,
  agencyMe,
  getAgencyDetails,
  listMyNotifications,
  markMyNotifications,
  updateAgencyDetails,
  updateMyProfile,
} from "../controllers/agency.controller.js";
import {
  assignListingTo,
  createListing,
  deleteListing,
  getListing,
  listListings,
  setListingArchived,
  setListingVisibility,
  updateListing,
} from "../controllers/agencyListings.controller.js";
import {
  addTeamMember,
  getTeamMember,
  listInvitations,
  listTeam,
  removeTeamMember,
  revokeInvitation,
  updateTeamMember,
} from "../controllers/agencyTeam.controller.js";
import {
  assignInquiry,
  getActivity,
  getAnalytics,
  getCounters,
  getOverview,
  listInquiries,
  startClientChat,
  updateInquiry,
} from "../controllers/agencyInsights.controller.js";
import {
  addAgencyMessage,
  getAgencyChat,
  getAgencyChats,
  getAgencyNewMessages,
  getAgencyUnread,
} from "../controllers/chat.controller.js";

// The agency platform (agency.baytiy.com). Its own session cookie, scoped to
// /api/agency; every route after sign-in is limited to the member's agency.
const router = express.Router();

router.post("/auth/login", agencyLogin);
router.post("/auth/logout", agencyLogout);
// Registering an agency opens an agency account (never a marketplace one)
router.post("/auth/register", registerAgency);
// ...or turns a personal account registered by mistake into the agency's account
router.post("/auth/convert", convertToAgency);
router.get("/auth/me", requireAgencySession, agencyMe);

// The applicant area: an agency account in review can only follow and edit
// its own application here, nothing else on the platform
router.get("/application/requirements", getRequirements);
const application = express.Router();
application.use(requireApplicant);
application.get("/", getMyApplications);
application.post("/", createApplication);
application.put("/:id", updateApplication);
application.post("/:id/submit", submitApplication);
application.post("/:id/documents", acceptFiles(uploadMiddleware.array("files")), uploadApplicationDocuments);
application.get("/:id/documents/:docId", downloadApplicationDocument);
application.delete("/:id/documents/:docId", deleteApplicationDocument);
router.use("/application", application);

router.use(requireAgency);
router.put("/profile", updateMyProfile);

router.get("/details", getAgencyDetails);
router.put("/details", requirePermission("agency.edit"), updateAgencyDetails);

router.get("/overview", getOverview);
router.get("/counters", getCounters);
router.get("/analytics", getAnalytics);
router.get("/activity", getActivity);

router.get("/listings", listListings);
router.post("/listings", createListing);
router.get("/listings/:id", getListing);
router.put("/listings/:id", updateListing);
router.put("/listings/:id/visibility", setListingVisibility);
router.put("/listings/:id/archive", setListingArchived);
router.put("/listings/:id/assign", requirePermission("listings.assign"), assignListingTo);
router.delete("/listings/:id", deleteListing);

router.get("/team", requirePermission("team.view"), listTeam);
router.post("/team", requirePermission("team.manage"), addTeamMember);
router.get("/team/invitations", requirePermission("team.view"), listInvitations);
router.delete("/team/invitations/:id", requirePermission("team.manage"), revokeInvitation);
router.get("/team/:userId", requirePermission("team.view"), getTeamMember);
router.put("/team/:userId", requirePermission("team.manage"), updateTeamMember);
// anyone may leave; removing someone else is checked in the handler
router.delete("/team/:userId", removeTeamMember);

router.get("/inquiries", listInquiries);
router.put("/inquiries/:id", updateInquiry);
router.put("/inquiries/:id/assign", requirePermission("inquiries.all"), assignInquiry);

// The agency's client conversations, one per inquiry (agents: assigned ones)
router.get("/chats", getAgencyChats);
router.get("/chats/unread", getAgencyUnread);
router.post("/chats", startClientChat);
router.get("/chats/:id", getAgencyChat);
router.get("/chats/:id/messages", getAgencyNewMessages);
router.post("/chats/:chatId/messages", addAgencyMessage);

router.get("/notifications", listMyNotifications);
router.put("/notifications/read", markMyNotifications);

export default router;
