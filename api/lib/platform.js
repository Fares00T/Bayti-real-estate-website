// Every account belongs to exactly one of Baytiy's three platforms, and can
// only sign in and hold a session there:
//   admin       — the Bayti team (admin dashboard)
//   agency      — owners, managers and agents of an agency (agency workspace),
//                 and agency accounts still waiting for their application to
//                 be approved (they can only follow and edit it there);
//                 everything they do happens there, never on the marketplace
//   marketplace — buyers, tenants and individual sellers
export const isAgencyMember = (user) => Boolean(user.agencyId && user.agencyRole);
export const isAgencyAccount = (user) => isAgencyMember(user) || user.accountType === "agency";
// An agency account that isn't (yet) part of an agency: an applicant
export const isApplicant = (user) => user.accountType === "agency" && !isAgencyMember(user);
export const canUseMarketplace = (user) => user.role !== "admin" && !isAgencyAccount(user);

// Where a sign-in page sends an account that doesn't belong there
export const homePlatformFor = (user) =>
  user.role === "admin" ? "admin" : isAgencyAccount(user) ? "agency" : "marketplace";

// What a sign-in page says when an account belongs somewhere else
export const PLATFORM_MESSAGE = {
  admin: "Bayti staff accounts sign in on the admin dashboard.",
  agency: "Your account belongs to an agency, so it signs in on the agency workspace.",
  marketplace: "This is the agency platform. Your account is a personal Bayti account: sign in on the Bayti marketplace.",
};

// Every session token carries the millisecond it was issued (`iatMs`). A
// session issued before the password last changed is no longer valid, so
// resetting a stolen password signs the thief out. Tokens without `iatMs`
// only know the second (`iat`), and count as issued at its end.
export const issuedAt = () => ({ iatMs: Date.now() });
export const sessionOutdated = (payload, user) => {
  if (!user.passwordChangedAt) return false;
  const issued = payload.iatMs ?? (payload.iat + 1) * 1000;
  return issued < user.passwordChangedAt.getTime();
};

export const sessionCookie = (extra = {}) => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  ...extra,
});
