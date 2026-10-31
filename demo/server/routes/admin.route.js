import express from "../shims/express.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { acceptFiles, uploadMiddleware } from "../lib/storage.js";
import { adminLogin, adminLogout, adminMe } from "../controllers/admin.controller.js";
import {
  createPostAdmin,
  deletePostAdmin,
  getOverview,
  getPostAdmin,
  getPreviewLink,
  listPosts,
  reviewPost,
  setPostStatus,
  updatePostAdmin,
} from "../controllers/adminPosts.controller.js";
import {
  createUser,
  deleteUserAdmin,
  getUser,
  listUsers,
  sendUserResetLink,
  setUserPassword,
  setUserStatus,
  updateUserAdmin,
  updateUserRole,
  uploadUserDocuments,
} from "../controllers/adminUsers.controller.js";
import {
  addAgencyMember,
  createAgency,
  getAgency,
  listAgencies,
  removeAgencyMember,
  setAgencyStatus,
  setAgencyVerified,
  updateAgency,
  updateAgencyMember,
  uploadAgencyDocuments,
} from "../controllers/adminAgencies.controller.js";
import {
  addApplicationNote,
  decideApplication,
  getApplication,
  listApplications,
  updateApplicationAdmin,
  updateChecklist,
  uploadApplicationDocumentsAdmin,
} from "../controllers/adminApplications.controller.js";
import {
  deleteDocumentAdmin,
  downloadDocument,
  findDuplicates,
  getCounters,
  getReport,
  getSettingsAdmin,
  listAudit,
  listNotifications,
  listReports,
  markNotifications,
  updateReport,
  updateSettingsAdmin,
} from "../controllers/adminPlatform.controller.js";

// Everything the internal dashboard uses lives here, behind requireAdmin.
const router = express.Router();
const files = acceptFiles(uploadMiddleware.array("files"));

router.post("/auth/login", adminLogin);
router.post("/auth/logout", adminLogout);

router.use(requireAdmin);

router.get("/auth/me", adminMe);
router.get("/overview", getOverview);
router.get("/counters", getCounters);

router.get("/posts", listPosts);
router.get("/posts/duplicates", findDuplicates);
router.post("/posts", createPostAdmin);
router.get("/posts/:id", getPostAdmin);
router.put("/posts/:id", updatePostAdmin);
router.put("/posts/:id/review", reviewPost);
router.put("/posts/:id/status", setPostStatus);
router.get("/posts/:id/preview", getPreviewLink);
router.delete("/posts/:id", deletePostAdmin);

router.get("/users", listUsers);
router.post("/users", createUser);
router.get("/users/:id", getUser);
router.put("/users/:id", updateUserAdmin);
router.put("/users/:id/role", updateUserRole);
router.put("/users/:id/status", setUserStatus);
router.put("/users/:id/password", setUserPassword);
router.post("/users/:id/reset-link", sendUserResetLink);
router.post("/users/:id/documents", files, uploadUserDocuments);
router.delete("/users/:id", deleteUserAdmin);

router.get("/agencies", listAgencies);
router.post("/agencies", createAgency);
router.get("/agencies/:id", getAgency);
router.put("/agencies/:id", updateAgency);
router.put("/agencies/:id/status", setAgencyStatus);
router.put("/agencies/:id/verify", setAgencyVerified);
router.post("/agencies/:id/members", addAgencyMember);
router.put("/agencies/:id/members/:userId", updateAgencyMember);
router.delete("/agencies/:id/members/:userId", removeAgencyMember);
router.post("/agencies/:id/documents", files, uploadAgencyDocuments);

router.get("/applications", listApplications);
router.get("/applications/:id", getApplication);
router.put("/applications/:id", updateApplicationAdmin);
router.post("/applications/:id/documents", files, uploadApplicationDocumentsAdmin);
router.post("/applications/:id/decision", decideApplication);
router.post("/applications/:id/notes", addApplicationNote);
router.put("/applications/:id/checklist", updateChecklist);

router.get("/documents/:id", downloadDocument);
router.delete("/documents/:id", deleteDocumentAdmin);

router.get("/notifications", listNotifications);
router.put("/notifications/read", markNotifications);
router.get("/audit", listAudit);

router.get("/reports", listReports);
router.get("/reports/:id", getReport);
router.put("/reports/:id", updateReport);

router.get("/settings", getSettingsAdmin);
router.put("/settings", updateSettingsAdmin);

export default router;
