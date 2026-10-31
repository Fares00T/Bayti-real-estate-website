import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Building2,
  ExternalLink,
  FileCheck2,
  Flag,
  History,
  Home,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings as SettingsIcon,
  Users,
  X,
} from "lucide-react";
import api, { MARKETPLACE_URL } from "../lib/api";
import { useAdmin } from "../lib/auth";
import { NotificationRow } from "../pages/Activity";
import "./shell.scss";

const NAV = [
  {
    group: null,
    items: [{ to: "/overview", label: "Overview", icon: LayoutDashboard }],
  },
  {
    group: "Marketplace",
    items: [
      { to: "/review", label: "Review queue", icon: Inbox, badge: "pendingListings" },
      { to: "/listings", label: "Listings", icon: Home },
      { to: "/reports", label: "Moderation", icon: Flag, badge: "openReports" },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    group: "People",
    items: [
      { to: "/applications", label: "Agency applications", icon: FileCheck2, badge: "openApplications" },
      { to: "/agencies", label: "Agencies", icon: Building2 },
      { to: "/users", label: "Users", icon: Users },
    ],
  },
  {
    group: "Platform",
    items: [
      { to: "/activity", label: "Activity log", icon: History },
      { to: "/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

const POLL_MS = 60 * 1000;

export default function Shell() {
  const { admin, logout } = useAdmin();
  const [counters, setCounters] = useState({});
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Sidebar counters: refreshed after any change, on focus and every minute
  const loadCounters = useCallback(
    () =>
      api
        .get("/counters")
        .then((res) => setCounters(res.data))
        .catch(() => {}),
    []
  );
  useEffect(() => {
    loadCounters();
    const timer = setInterval(loadCounters, POLL_MS);
    window.addEventListener("admin:data-changed", loadCounters);
    window.addEventListener("focus", loadCounters);
    return () => {
      clearInterval(timer);
      window.removeEventListener("admin:data-changed", loadCounters);
      window.removeEventListener("focus", loadCounters);
    };
  }, [loadCounters]);

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
            <path
              d="M16 3.5 3.5 14.2V28h9.2v-7.6a3.3 3.3 0 0 1 6.6 0V28h9.2V14.2L16 3.5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
          </svg>
          <span className="word">bayti</span>
          <span className="scope">Admin</span>
          <button className="closeNav" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav aria-label="Admin">
          {NAV.map(({ group, items }) => (
            <div className="navGroup" key={group || "top"}>
              {group && <span className="navGroupLabel">{group}</span>}
              {items.map(({ to, label, icon: Icon, badge }) => (
                <NavLink key={to} to={to} className="navItem">
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{label}</span>
                  {badge && counters[badge] > 0 && (
                    <span className="count" aria-label={`${counters[badge]} waiting`}>
                      {counters[badge]}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sideFoot">
          {MARKETPLACE_URL && (
            <a href={MARKETPLACE_URL} target="_blank" rel="noreferrer" className="navItem">
              <ExternalLink size={18} strokeWidth={1.8} />
              <span>Open marketplace</span>
            </a>
          )}
          <div className="me">
            <img src={admin?.avatar || "/noavatar.jpg"} alt="" />
            <div>
              <strong>{admin?.username}</strong>
              <span>{admin?.email}</span>
            </div>
            <button onClick={logout} title="Sign out" aria-label="Sign out">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <div className="main">
        <header className="topBar">
          <button className="menuBtn" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <span className="mobileTitle">Bayti Admin</span>
          <NotificationBell unread={counters.notifications || 0} onChange={loadCounters} />
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NotificationBell({ unread, onChange }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const ref = useRef(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    api
      .get("/notifications", { params: { limit: 8 } })
      .then((res) => setItems(res.data.items))
      .catch(() => setItems([]));
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, unread]);

  const markRead = async (ids) => {
    await api.put("/notifications/read", { ids }).catch(() => {});
    onChange();
  };

  return (
    <div className="bell" ref={ref}>
      <button
        className="bellBtn"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
      >
        <Bell size={19} />
        {unread > 0 && <span className="dotCount">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div className="bellPanel" role="dialog" aria-label="Notifications">
          <div className="bellHead">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button className="btn-link small" onClick={() => markRead(undefined)}>
                Mark all read
              </button>
            )}
          </div>
          {!items ? (
            <p className="muted small pad">Loading…</p>
          ) : items.length === 0 ? (
            <p className="muted small pad">Nothing yet.</p>
          ) : (
            <ul className="notifList compact">
              {items.map((n) => (
                <NotificationRow key={n.id} n={n} compact onOpen={() => !n.readAt && markRead([n.id])} />
              ))}
            </ul>
          )}
          <Link className="bellAll" to="/notifications">
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
