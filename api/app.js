import express from "express";
import cors from "cors";
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
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
dotenv.config();
const app = express();
app.use(express.json());
app.use(cookieParser());

// The marketplace, the agency platform and the admin dashboard are separate
// front ends that share this API; only those origins may call it with
// credentials. Each private platform has its own session cookie.
const allowedOrigins = [process.env.CLIENT_URL, process.env.AGENCY_URL, process.env.ADMIN_URL].filter(Boolean);
app.use(
  cors({
    origin: (origin, done) =>
      done(null, !origin || allowedOrigins.includes(origin)),
    credentials: true,
  })
);

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

const PORT = Number(process.env.PORT) || 8800;
app.listen(PORT, () => {
  console.log("Server is running!");
});
