import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import apiRequest from "./apiRequest";

const EVENT = "bayti:listings";

// Call after publishing, archiving, restoring or deleting a listing
export const listingsChanged = () => window.dispatchEvent(new Event(EVENT));

// { active, limit, remaining } for the signed-in account, from the server.
// The server enforces the limit; this only lets the UI explain it up front.
export function useListingUsage() {
  const { currentUser } = useContext(AuthContext);
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    if (!currentUser) return setUsage(null);
    const load = () =>
      apiRequest
        .get("/posts/usage")
        .then((res) => setUsage(res.data))
        .catch(() => {});
    load();
    window.addEventListener(EVENT, load);
    return () => window.removeEventListener(EVENT, load);
  }, [currentUser]);

  return usage;
}

export const atLimit = (usage) => Boolean(usage && usage.limit > 0 && usage.active >= usage.limit);
