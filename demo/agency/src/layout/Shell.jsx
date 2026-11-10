import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Activity as ActivityIcon,
  BadgeCheck,
  BarChart3,
  Bell,
  CalendarCheck,
  ExternalLink,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Settings as SettingsIcon,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import api, { MARKETPLACE_URL } from "../lib/api";
import { useMember } from "../lib/auth";
import { AGENCY_ROLE_LABEL } from "../lib/format";
import "./shell.scss";

const POLL_MS = 30 * 1000;

// `perm` hides an entry the member's role can't use (the API refuses it anyway)
const NAV = [
  { group: null, items: [{ to: "/overview", label: "Overview", icon: LayoutDashboard }] },
  {
    group: "Portfolio",
    items: [
      { to: "/listings", label: "Listings", icon: Home, badge: "rejected", badgeLabel: "rejected" },
      { to: "/inquiries", label: "Inquiries", icon: CalendarCheck, badge: "inquiries", badgeLabel: "new" },
      { to: "/messages", label: "Messages", icon: MessageCircle, badge: "messages", badgeLabel: "unread" },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    group: "Agency",
    items: [
      { to: "/team", label: "Team", icon: Users, perm: "team.view" },
      { to: "/activity", label: "Activity", icon: ActivityIcon },
      { to: "/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

export default function Shell() {
  const { member, logout, can } = useMember();
  const [counters, setCounters] = useState({});
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const agency = member.agency;

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
    window.addEventListener("agency:data-changed", loadCounters);
    window.addEventListener("focus", loadCounters);
    return () => {
      clearInterval(timer);
      window.removeEventListener("agency:data-changed", loadCounters);
      window.removeEventListener("focus", loadCounters);
    };
  }, [loadCounters]);

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="shell agencyShell">
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
          <span className="scope">Agency</span>
          <button className="closeNav" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <div className="agencyCard">
          {agency.logo ? (
            <img src={agency.logo} alt="" />
          ) : (
            <span className="agencyInitial" aria-hidden="true">
              {agency.tradeName.charAt(0)}
            </span>
          )}
          <div>
            <strong title={agency.tradeName}>{agency.tradeName}</strong>
            {agency.status !== "active" ? (
              <span className="agencyState bad">Suspended</span>
            ) : agency.verified ? (
              <span className="agencyState ok">
                <BadgeCheck size={13} /> Verified agency
              </span>
            ) : (
              <span className="agencyState">Not verified</span>
            )}
          </div>
        </div>

        <nav aria-label="Agency">
          {NAV.map(({ group, items }) => {
            const visible = items.filter((i) => !i.perm || can(i.perm));
            if (!visible.length) return null;
            return (
              <div className="navGroup" key={group || "top"}>
                {group && <span className="navGroupLabel">{group}</span>}
                {visible.map(({ to, label, icon: Icon, badge, badgeLabel }) => (
                  <NavLink key={to} to={to} className="navItem">
                    <Icon size={18} strokeWidth={1.8} />
                    <span>{label}</span>
                    {badge && counters[badge] > 0 && (
                      <span className="count" aria-label={`${counters[badge]} ${badgeLabel}`}>
                        {counters[badge]}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sideFoot">
          {MARKETPLACE_URL && (
            <a href={`${MARKETPLACE_URL}/agencies/${agency.id}`} target="_blank" rel="noreferrer" className="navItem">
              <ExternalLink size={18} strokeWidth={1.8} />
              <span>Public agency page</span>
            </a>
          )}
          <div className="me">
            <img src={member.avatar || "/noavatar.jpg"} alt="" />
            <div>
              <strong>{member.username}</strong>
              <span>{AGENCY_ROLE_LABEL[member.agencyRole]}</span>
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
          <span className="mobileTitle">{agency.tradeName}</span>
          <div className="bell">
            <NavLink
              to="/notifications"
              className="bellBtn"
              aria-label={counters.notifications ? `Notifications, ${counters.notifications} unread` : "Notifications"}
            >
              <Bell size={19} />
              {counters.notifications > 0 && (
                <span className="dotCount">{counters.notifications > 99 ? "99+" : counters.notifications}</span>
              )}
            </NavLink>
          </div>
        </header>
        <AgencyBanner agency={agency} />
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// Says plainly when the agency's state limits what the team can do
function AgencyBanner({ agency }) {
  if (agency.status !== "active") {
    return (
      <div className="agencyBanner bad" role="status">
        <ShieldAlert size={18} />
        <p>
          <strong>Your agency is suspended.</strong> Its listings are hidden from the marketplace and changes are
          disabled.{agency.statusReason ? ` Reason: ${agency.statusReason}` : ""} Contact Bayti support to resolve it.
        </p>
      </div>
    );
  }
  if (!agency.verified) {
    return (
      <div className="agencyBanner" role="status">
        <ShieldAlert size={18} />
        <p>
          <strong>
            {agency.verification === "revoked"
              ? "Bayti revoked your agency's verification."
              : agency.verificationLapsed
              ? "Your verification has lapsed."
              : "Your agency isn't verified yet."}
          </strong>{" "}
          Listings stay online without the verified agency badge until the Bayti team{" "}
          {agency.verification === "revoked"
            ? "verifies your agency again. Contact Bayti support to resolve it."
            : agency.verificationLapsed
            ? "renews it (check your agrément's expiry date)."
            : "verifies your agency."}
        </p>
      </div>
    );
  }
  return null;
}
