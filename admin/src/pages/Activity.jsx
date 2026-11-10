import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bell, CheckCheck, Search } from "lucide-react";
import api, { errorMessage, notifyDataChanged } from "../lib/api";
import { dateTime, timeAgo } from "../lib/format";
import { PageHead, Spinner, useToast } from "../components/ui";

const ENTITY_LINK = {
  user: (id) => `/users/${id}`,
  agency: (id) => `/agencies/${id}`,
  post: (id) => `/listings/${id}`,
  application: (id) => `/applications/${id}`,
  report: (id) => `/reports/${id}`,
};

// Audit log of sensitive actions
export function ActivityLog() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState(null);
  const [next, setNext] = useState(null);
  const [query, setQuery] = useState(params.get("q") || "");
  const entityType = params.get("entityType") || "";
  const [error, setError] = useState("");

  const load = (before) => {
    api
      .get("/audit", { params: { entityType: entityType || undefined, q: params.get("q") || undefined, before, limit: 100 } })
      .then((res) => {
        setItems((prev) => (before ? [...prev, ...res.data.items] : res.data.items));
        setNext(res.data.next);
      })
      .catch((err) => setError(errorMessage(err, "Couldn't load the log.")));
  };
  useEffect(() => {
    setItems(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return (
    <div className="admin-dashboard backoffice">
      <PageHead title="Activity log" subtitle="Every sensitive action taken by the team, and agency owners' changes to their legal record." />
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setParams({ ...(entityType ? { entityType } : {}), ...(query ? { q: query } : {}) });
        }}
      >
        <label className="searchBox">
          <Search size={16} />
          <input placeholder="Search the log (press Enter)" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <select
          className="select"
          value={entityType}
          aria-label="Filter by record"
          onChange={(e) => setParams({ ...(e.target.value ? { entityType: e.target.value } : {}), ...(query ? { q: query } : {}) })}
        >
          <option value="">Everything</option>
          <option value="user">Accounts</option>
          <option value="agency">Agencies</option>
          <option value="application">Applications</option>
          <option value="post">Listings</option>
          <option value="report">Reports</option>
          <option value="document">Documents</option>
          <option value="settings">Settings</option>
        </select>
      </form>
      {error && <p className="error-text">{error}</p>}
      {!items ? (
        <Spinner />
      ) : (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>What</th>
                <th>Record</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="muted nowrap">{dateTime(i.createdAt)}</td>
                  <td className="muted">{i.actor ? <Link to={`/users/${i.actor.id}`}>{i.actor.username}</Link> : "—"}</td>
                  <td>
                    {i.summary}
                    <span className="sub">
                      {i.action}
                      {i.ip ? ` · ${i.ip}` : ""}
                    </span>
                  </td>
                  <td className="muted">
                    {i.entityId && ENTITY_LINK[i.entityType] ? (
                      <Link to={ENTITY_LINK[i.entityType](i.entityId)}>
                        {i.entityType} #{i.entityId}
                      </Link>
                    ) : (
                      i.entityType
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="tableEmpty">Nothing recorded.</p>}
          {next && (
            <button className="btn btn-outline btn-sm loadMore" onClick={() => load(next)}>
              Load older
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Notifications() {
  const [data, setData] = useState(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [toast, notify] = useToast();

  const load = () =>
    api
      .get("/notifications", { params: { unread: unreadOnly ? 1 : undefined, limit: 200 } })
      .then((res) => setData(res.data))
      .catch((err) => notify(errorMessage(err), true));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadOnly]);

  const mark = async (ids, read = true) => {
    await api.put("/notifications/read", { ids, read });
    notifyDataChanged();
    load();
  };

  return (
    <div className="admin-dashboard backoffice">
      <PageHead title="Notifications" subtitle="The team's shared inbox. Marking something read marks it for everyone.">
        <label className="checkRow">
          <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} /> Unread only
        </label>
        <button className="btn btn-outline btn-sm" onClick={() => mark(undefined)} disabled={!data?.unread}>
          <CheckCheck size={15} /> Mark all read
        </button>
      </PageHead>
      {!data ? (
        <Spinner />
      ) : data.items.length === 0 ? (
        <div className="reviewEmpty">
          <Bell size={28} />
          <h3>No notifications</h3>
        </div>
      ) : (
        <ul className="notifList">
          {data.items.map((n) => (
            <NotificationRow key={n.id} n={n} onOpen={() => !n.readAt && mark([n.id])} onToggle={() => mark([n.id], !n.readAt)} />
          ))}
        </ul>
      )}
      {toast}
    </div>
  );
}

export function NotificationRow({ n, onOpen, onToggle, compact }) {
  return (
    <li className={n.readAt ? "" : "unread"}>
      <Link to={n.link || "#"} onClick={onOpen}>
        <strong>{n.title}</strong>
        {n.body && !compact && <span>{n.body}</span>}
        <small>{timeAgo(n.createdAt)}</small>
      </Link>
      {onToggle && (
        <button className="btn-link small" onClick={onToggle}>
          {n.readAt ? "Mark unread" : "Mark read"}
        </button>
      )}
    </li>
  );
}
