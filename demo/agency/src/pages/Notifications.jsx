import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import api, { errorMessage, linkTarget, notifyDataChanged } from "../lib/api";
import { timeAgo } from "../lib/format";
import { Empty, PageHead, Spinner } from "../components/ui";
import "./dashboard.scss";

export default function Notifications() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    api
      .get("/notifications")
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err, "Couldn't load notifications.")));
  useEffect(() => {
    load();
  }, []);

  const markRead = async (ids) => {
    await api.put("/notifications/read", { ids }).catch(() => {});
    notifyDataChanged();
    load();
  };

  return (
    <div className="workspace backoffice">
      <PageHead title="Notifications" subtitle="Decisions, team changes and messages for your account.">
        {data?.unread > 0 && (
          <button className="btn btn-outline btn-sm" onClick={() => markRead(undefined)}>
            Mark all read
          </button>
        )}
      </PageHead>
      <div className="panel">
        {error && <p className="error-text">{error}</p>}
        {!data && !error && <Spinner />}
        {data?.items.length === 0 && <Empty icon={Bell} title="No notifications yet" />}
        {data?.items.length > 0 && (
          <ul className="feed">
            {data.items.map((n) => {
              const target = linkTarget(n.link);
              const title = <strong>{n.title}</strong>;
              return (
                <li key={n.id} className={n.readAt ? "" : "unread"} onClick={() => !n.readAt && markRead([n.id])}>
                  <span className="feedIcon" aria-hidden="true">
                    <Bell size={15} />
                  </span>
                  <div className="feedText">
                    {target?.to ? <Link to={target.to}>{title}</Link> : target?.href ? <a href={target.href}>{title}</a> : title}
                    {n.body && <p className="muted">{n.body}</p>}
                  </div>
                  <time dateTime={n.createdAt}>{timeAgo(n.createdAt)}</time>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
