// Demo build of api/app.js: same routes, mounted on the in-browser Express
// shim instead of a listening server.
import "./runtime/env.js";
import express from "./shims/express.js";
import authRoute from "./routes/auth.route.js";
import testRoute from "./routes/test.route.js";
import userRoute from "./routes/user.route.js";
import postRoute from "./routes/post.rout.js";
import chatRoute from "./routes/chat.rout.js";
import reportRoute from "./routes/report.route.js";
import messageRoute from "./routes/message.route.js";
import inquiryRoute from "./routes/inquiry.route.js";
import invitationRoute from "./routes/invitation.route.js";
import adminRoute from "./routes/admin.route.js";
import applicationRoute from "./routes/application.route.js";
import agencyRoute from "./routes/agency.route.js";
import agenciesRoute from "./routes/agencies.route.js";
import notificationRoute from "./routes/notification.route.js";
import { publicSettings } from "./lib/settings.js";

const app = express();

app.use("/api/auth", authRoute);
app.use("/api/test", testRoute);
app.use("/api/users", userRoute);
app.use("/api/posts", postRoute);
app.use("/api/chats", chatRoute);
app.use("/api/messages", messageRoute);
app.use("/api/report", reportRoute);
app.use("/api/inquiries", inquiryRoute);
app.use("/api/invitations", invitationRoute);
app.use("/api/admin", adminRoute);
app.use("/api/applications", applicationRoute);
app.use("/api/agency", agencyRoute);
app.use("/api/agencies", agenciesRoute);
app.use("/api/notifications", notificationRoute);
app.get("/api/settings/public", async (req, res) => {
  try {
    res.status(200).json(await publicSettings());
  } catch (err) {
    console.error("Failed to load settings:", err);
    res.status(500).json({ message: "Failed to load settings." });
  }
});

export default app;
