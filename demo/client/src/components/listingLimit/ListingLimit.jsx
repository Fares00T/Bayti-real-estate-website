import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import "./listingLimit.scss";

// "My properties: 2 of 3 active listings" with a small meter
export function UsageMeter({ usage }) {
  if (!usage || !(usage.limit > 0)) return null;
  const full = usage.active >= usage.limit;
  return (
    <div className={`usageMeter ${full ? "full" : ""}`}>
      <p>
        <strong>
          {usage.active} of {usage.limit}
        </strong>{" "}
        active listings
        {!full && <span> · you can publish {usage.remaining} more</span>}
      </p>
      <div
        className="bar"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={usage.limit}
        aria-valuenow={usage.active}
        aria-label="Active listings"
      >
        {Array.from({ length: usage.limit }, (_, i) => (
          <span key={i} className={i < usage.active ? "on" : ""} />
        ))}
      </div>
    </div>
  );
}

// Shown instead of the publishing form when every slot is taken
export function LimitReached({ usage, compact }) {
  const limit = usage?.limit ?? 3;
  return (
    <section className={`limitReached ${compact ? "compact" : ""}`} role="status">
      <Building2 size={compact ? 20 : 28} strokeWidth={1.6} />
      <div>
        <h2>You&rsquo;ve reached your limit of {limit} active properties.</h2>
        <p>
          To publish more properties, register your real estate agency with Bayti. You can also archive one of your
          listings to free a place.
        </p>
        <div className="limitActions">
          <Link to="/agencies" className="btn btn-dark btn-sm">
            Become an agency
          </Link>
          {!compact && (
            <Link to="/profile?tab=listings" className="btn btn-outline btn-sm">
              Manage my properties
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
