import express from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { notifyAdmins, sendEmail } from "../lib/notify.js";
import { getSettings } from "../lib/settings.js";
import { acceptFiles, storeDocument, uploadMiddleware, validateFile } from "../lib/storage.js";
import { EMAIL_RE, str, toId } from "../lib/util.js";

// Reports are stored and handled in the admin dashboard. The screenshot is a
// private document, never a public URL.
const router = express.Router();

const reporterFrom = (req) => {
  try {
    return req.cookies?.token ? jwt.verify(req.cookies.token, process.env.JWT_SECRET_KEY).id : null;
  } catch {
    return null;
  }
};

router.post("/", acceptFiles(uploadMiddleware.single("screenshot")), async (req, res) => {
  const { reportType, reportedUser, reportedPostId, reason, details, submittedBy, submittedEmail } = req.body;

  if (!["user", "post"].includes(reportType) || !str(reason) || !EMAIL_RE.test(String(submittedEmail || "").trim())) {
    return res.status(400).json({ message: "Please fill in all required fields." });
  }
  if (req.file) {
    const invalid = validateFile(req.file);
    if (invalid) return res.status(400).json({ message: invalid });
  }

  try {
    const reporterId = reporterFrom(req);
    let postId = null;
    let reportedUserId = null;
    if (reportType === "post") {
      const id = toId(String(reportedPostId || "").replace(/^PROP-0*/i, ""));
      const post = id && (await prisma.post.findUnique({ where: { id }, select: { id: true, userId: true } }));
      postId = post?.id ?? null;
      reportedUserId = post?.userId ?? null;
    } else if (str(reportedUser)) {
      const user = await prisma.user.findFirst({
        where: { OR: [{ username: str(reportedUser) }, { email: str(reportedUser).toLowerCase() }] },
        select: { id: true },
      });
      reportedUserId = user?.id ?? null;
    }

    const report = await prisma.report.create({
      data: {
        kind: reportType,
        reason: str(reason),
        details: str(details, 5000),
        reporterId: reporterId && (await prisma.user.count({ where: { id: reporterId } })) ? reporterId : null,
        reporterName: str(submittedBy),
        reporterEmail: str(submittedEmail),
        postId,
        reportedUserId,
        reportedUserText: reportType === "user" ? str(reportedUser) : str(reportedPostId),
      },
    });
    if (req.file) await storeDocument(req.file, { kind: "screenshot", reportId: report.id, uploadedById: reporterId });

    await notifyAdmins({
      type: "report",
      title: `New report: ${reportType === "post" ? "listing" : "user"} — ${report.reason}`,
      body: report.details?.slice(0, 200) || null,
      link: `/reports/${report.id}`,
    });
    const settings = await getSettings();
    sendEmail({
      to: settings.notifications.adminEmails,
      subject: `New report: ${report.reason}`,
      text: `A ${reportType} was reported. Review it in the admin dashboard.`,
    });
    res.status(200).json({ message: "Report submitted successfully." });
  } catch (err) {
    console.error("Failed to save report:", err);
    res.status(500).json({ message: "Failed to submit report." });
  }
});

export default router;
