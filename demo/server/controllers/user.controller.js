import prisma from "../lib/prisma.js";
import bcrypt from "../shims/bcrypt.js";
import { deleteDocuments } from "../lib/storage.js";
import { AGENCY_BADGE_SELECT, detachMember, publicAgency } from "../lib/agency.js";
import { startSession } from "./auth.controller.js";

// Never send password hashes to the client
export const omitPassword = ({ password, ...rest }) => rest;

export const updateUser = async (req, res) => {
  const id = Number(req.params.id);
  const tokenUserId = req.userId;

  try {
    // People edit their own account only; roles change in the admin dashboard
    if (id !== tokenUserId) {
      return res.status(403).json({ message: "Not authorized!" });
    }

    const { password, avatar } = req.body;

    if (password && password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters." });
    }

    // Whitelist editable fields; empty strings clear the optional ones
    const data = {};
    for (const key of ["username", "email"]) {
      if (typeof req.body[key] === "string" && req.body[key].trim()) {
        data[key] = req.body[key].trim();
      }
    }
    // A person's own contact details. An agency's public profile is edited
    // from the agency platform (legal changes are reported to Bayti).
    if (typeof req.body.phone === "string") data.phone = req.body.phone.trim().slice(0, 40) || null;
    if (password) {
      data.password = await bcrypt.hash(password, 10);
      // other sessions end; this one is renewed below
      data.passwordChangedAt = new Date();
    }
    if (avatar) data.avatar = avatar;

    const updatedUser = await prisma.user.update({ where: { id }, data });
    if (password) await startSession(res, updatedUser);

    res.status(200).json(omitPassword(updatedUser));
  } catch (err) {
    if (err.code === "P2002") {
      return res
        .status(409)
        .json({ message: "That username or email is already taken." });
    }
    console.error(err);
    res.status(500).json({ message: "Failed to update user!" });
  }
};

export const deleteUser = async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) return res.status(400).json({ message: "Invalid user ID!" });
  // Users may delete themselves; admins use the admin API
  if (id !== req.userId) {
    return res.status(403).json({ message: "Not authorized!" });
  }

  try {
    // An agency can't be left without its owner by accident
    const me = await prisma.user.findUnique({ where: { id }, select: { agencyRole: true } });
    if (me?.agencyRole === "owner") {
      return res.status(409).json({
        message: "You own an agency. Contact Bayti support to hand it over before deleting your account.",
      });
    }
    await deleteUserCascade(id);
    res
      .status(200)
      .json({ message: "User and related data deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete user." });
  }
};

// Removes a user together with their personal listings, saved homes and
// chats. Agency property is never deleted with a person: their agency
// listings and inquiries are handed over (or left unassigned) first.
// Shared by self-deletion here and by the admin API.
export const deleteUserCascade = async (id) => {
  // Private files first: the rows that point at them cascade away below
  await deleteDocuments({ OR: [{ userId: id }, { application: { applicantId: id } }] });

  // An agency outlives its owner's account: it is suspended until Bayti gives
  // it a new owner; its members and listings stay where they are
  const owned = await prisma.agency.findUnique({ where: { ownerId: id } });
  if (owned) {
    await prisma.agency.update({
      where: { id: owned.id },
      data: { ownerId: null, status: "suspended", statusReason: "The owner's account was deleted." },
    });
  }
  await prisma.$transaction((tx) => detachMember(tx, id));

  const personal = { userId: id, agencyId: null };
  await prisma.postDetail.deleteMany({ where: { post: personal } });
  await prisma.savedPost.deleteMany({
    where: { OR: [{ userId: id }, { post: personal }] },
  });
  await prisma.post.deleteMany({ where: personal });

  const chatUsers = await prisma.chatUser.findMany({
    where: { userId: id },
    select: { chatId: true },
  });
  const chatIds = [...new Set(chatUsers.map((cu) => cu.chatId))];
  await prisma.chatUser.deleteMany({ where: { userId: id } });
  // Chats left with nobody in them go too
  for (const chatId of chatIds) {
    const remaining = await prisma.chatUser.count({ where: { chatId } });
    if (remaining === 0) await prisma.chat.delete({ where: { id: chatId } });
  }

  await prisma.user.delete({ where: { id } });
};

export const savePost = async (req, res) => {
  const postId = parseInt(req.body.postId);
  const tokenUserId = req.userId;

  if (isNaN(postId)) {
    return res.status(400).json({ message: "Invalid post ID!" });
  }

  try {
    const savedPost = await prisma.savedPost.findUnique({
      where: {
        userId_postId: {
          userId: tokenUserId,
          postId,
        },
      },
    });

    if (savedPost) {
      // If the post is already saved, remove it
      await prisma.savedPost.delete({
        where: {
          id: savedPost.id,
        },
      });
      res.status(200).json({ message: "Post removed from saved list" });
    } else {
      // If the post is not saved, add it to the saved list
      await prisma.savedPost.create({
        data: {
          userId: tokenUserId,
          postId,
        },
      });
      res.status(200).json({ message: "Post saved" });
    }
  } catch (err) {
    console.error("Error saving post:", err);
    res.status(500).json({ message: "Failed to save post!" });
  }
};

export const profilePosts = async (req, res) => {
  const tokenUserId = req.userId;
  const userSelect = { select: { id: true, username: true, avatar: true, role: true } };
  try {
    const userPosts = await prisma.post.findMany({
      // personal listings only; agency listings live on the agency platform
      where: { userId: tokenUserId, agencyId: null },
      include: { user: userSelect, agency: { select: AGENCY_BADGE_SELECT } },
      orderBy: { createdAt: "desc" },
    });
    // Saved listings that were since unpublished drop out until re-approved
    const saved = await prisma.savedPost.findMany({
      where: { userId: tokenUserId, post: { status: "approved" } },
      include: {
        post: { include: { user: userSelect, agency: { select: AGENCY_BADGE_SELECT } } },
      },
      orderBy: { createdAt: "desc" },
    });

    const savedIds = new Set(saved.map((item) => item.postId));
    const savedPosts = saved.map((item) => ({ ...item.post, agency: publicAgency(item.post.agency), isSaved: true }));
    res.status(200).json({
      userPosts: userPosts.map((post) => ({ ...post, agency: publicAgency(post.agency), isSaved: savedIds.has(post.id) })),
      savedPosts,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to get profile posts!" });
  }
};
