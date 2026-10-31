import prisma from "../lib/prisma.js";
import { AGENCY_BADGE_SELECT, isAgencyVerified, publicAgency } from "../lib/agency.js";
import { toId } from "../lib/util.js";
import { PUBLIC_POST_WHERE } from "./post.controller.js";

// Agency pages on the public marketplace. Suspended agencies don't appear;
// `verified` is always the computed value, never the stored flag.

const PUBLIC_FIELDS = {
  ...AGENCY_BADGE_SELECT,
  address: true, phone: true, email: true, website: true, about: true,
  verifiedAt: true, createdAt: true,
};

const publicProfile = (a) => ({
  ...publicAgency(a),
  address: a.address,
  phone: a.phone,
  email: a.email,
  website: a.website,
  about: a.about,
  verifiedAt: isAgencyVerified(a) ? a.verifiedAt : null,
  createdAt: a.createdAt,
});

export const listPublicAgencies = async (req, res) => {
  try {
    const agencies = await prisma.agency.findMany({
      where: { status: "active" },
      select: {
        ...PUBLIC_FIELDS,
        _count: { select: { posts: { where: PUBLIC_POST_WHERE }, members: { where: { agencyActive: true, status: "active" } } } },
      },
      orderBy: { createdAt: "asc" },
    });
    const rows = agencies.map((a) => ({ ...publicProfile(a), listings: a._count.posts, agents: a._count.members }));
    // verified agencies first
    rows.sort((a, b) => Number(b.verified) - Number(a.verified));
    res.status(200).json(rows);
  } catch (err) {
    console.error("Failed to list agencies:", err);
    res.status(500).json({ message: "Couldn't load agencies." });
  }
};

export const getPublicAgency = async (req, res) => {
  const id = toId(req.params.id);
  try {
    const agency = id && (await prisma.agency.findFirst({ where: { id, status: "active" }, select: PUBLIC_FIELDS }));
    if (!agency) return res.status(404).json({ message: "Agency not found." });

    const [posts, members] = await Promise.all([
      prisma.post.findMany({
        where: { ...PUBLIC_POST_WHERE, agencyId: agency.id },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          postDetail: { select: { views: true } },
        },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      }),
      prisma.user.findMany({
        where: { agencyId: agency.id, agencyActive: true, status: "active" },
        select: { id: true, username: true, avatar: true, agencyRole: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    const badge = publicAgency(agency);
    const listed = (id) => posts.filter((p) => p.userId === id).length;
    res.status(200).json({
      ...publicProfile(agency),
      listings: posts.map((p) => ({ ...p, agency: badge })),
      // the people buyers can deal with: anyone with a live listing, plus the leads
      agents: members
        .map((m) => ({ ...m, listings: listed(m.id) }))
        .filter((m) => m.listings > 0 || m.agencyRole !== "agent"),
    });
  } catch (err) {
    console.error("Failed to load agency:", err);
    res.status(500).json({ message: "Couldn't load this agency." });
  }
};
