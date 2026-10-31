// The agency platform is a separate app (agency.baytiy.com) with its own sign-in
export const AGENCY_URL = import.meta.env.VITE_AGENCY_URL || "http://localhost:5175";
export const agencyLink = (path = "/") => `${AGENCY_URL}${path}`;
