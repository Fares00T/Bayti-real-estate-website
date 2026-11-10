// Mirrors the API's listingState for rows that come without `state`
export const listingState = (p) =>
  p.state ||
  (p.status === "approved" ? (p.hiddenByOwner ? "offline" : "published") : p.status === "unpublished" ? "taken_down" : p.status);
