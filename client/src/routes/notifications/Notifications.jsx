import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import apiRequest from "../../components/lib/apiRequest";
import "./notifications.scss";

const when = (d) =>
  new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function Notifications() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest
      .get("/notifications")
      .then((res) => {
        setData(res.data);
        // Opening the page counts as reading them
        if (res.data.unread) {
          apiRequest.put("/notifications/read", {}).then(() => window.dispatchEvent(new Event("bayti:notifications"))).catch(() => {});
        }
      })
      .catch(() => setError("We couldn't load your notifications."));
  }, []);

  return (
    <div className="notificationsPage">
      <h1 className="page-title">Notifications</h1>
      {error && <p className="error-text">{error}</p>}
      {!data && !error && <p className="muted">Loading…</p>}
      {data?.items.length === 0 && (
        <div className="empty-state">
          <Bell size={28} />
          <p>Nothing yet. Updates about your listings and applications appear here.</p>
        </div>
      )}
      {data?.items.length > 0 && (
        <ul>
          {data.items.map((n) => (
            <li key={n.id} className={n.readAt ? "" : "unread"}>
              {/^https?:\/\//.test(n.link || "") ? (
                // links into the agency platform
                <a href={n.link}>
                  <strong>{n.title}</strong>
                  {n.body && <span>{n.body}</span>}
                  <small>{when(n.createdAt)}</small>
                </a>
              ) : (
                <Link to={n.link || "#"}>
                  <strong>{n.title}</strong>
                  {n.body && <span>{n.body}</span>}
                  <small>{when(n.createdAt)}</small>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
