import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { PLATFORM_MESSAGE, canUseMarketplace, homePlatformFor, sessionOutdated } from "../lib/platform.js";

// The role and account status come from the database on every request, so a
// suspension or a role change by an admin takes effect immediately.
export const verifyToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) return res.status(401).json({ message: "Not Authenticated!" });

  jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, payload) => {
    if (err) return res.status(403).json({ message: "Token is not Valid!" });
    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, role: true, accountType: true, status: true, agencyId: true, agencyRole: true, passwordChangedAt: true },
      });
      if (!user || sessionOutdated(payload, user)) return res.status(401).json({ message: "Not Authenticated!" });
      if (user.status !== "active") {
        return res.status(401).json({ message: "This account has been suspended." });
      }
      // Marketplace sessions are for marketplace accounts only. A session
      // opened before someone joined an agency or the team stops working here.
      if (!canUseMarketplace(user)) {
        const platform = homePlatformFor(user);
        return res.status(401).json({ message: PLATFORM_MESSAGE[platform], platform });
      }
      req.userId = user.id;
      req.role = user.role;
      req.user = user;
      next();
    } catch (e) {
      console.error("Auth check failed:", e);
      res.status(500).json({ message: "Authentication failed." });
    }
  });
};
