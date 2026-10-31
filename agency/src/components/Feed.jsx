import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { timeAgo } from "../lib/format";

// Agency activity: team actions from the audit log plus the Bayti team's
// review decisions on the agency's listings
export default function Feed({ items }) {
  return (
    <ul className="feed">
      {items.map((e) => {
        const review = e.action.startsWith("review.");
        return (
          <li key={e.id}>
            <span className={`feedIcon ${review ? "review" : ""}`} aria-hidden="true">
              {review ? <ShieldCheck size={16} /> : <img src={e.actor?.avatar || "/noavatar.jpg"} alt="" />}
            </span>
            <div className="feedText">
              {!review && <strong>{e.actor?.username || "Bayti team"} </strong>}
              {e.postId ? <Link to={`/listings/${e.postId}`}>{lowerFirst(e.summary, review)}</Link> : lowerFirst(e.summary, review)}
            </div>
            <time dateTime={e.createdAt}>{timeAgo(e.createdAt)}</time>
          </li>
        );
      })}
    </ul>
  );
}

// "Created …" reads as "Sara created …" after the actor's name
const lowerFirst = (s, keep) => (keep ? s : s.charAt(0).toLowerCase() + s.slice(1));
