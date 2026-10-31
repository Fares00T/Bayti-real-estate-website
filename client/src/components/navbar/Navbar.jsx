import { useContext, useEffect, useRef, useState } from "react";
import "./navbar.scss";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Building2, Heart, Menu, Plus, X } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import apiRequest from "../lib/apiRequest";
import { AGENCY_URL } from "../lib/agencyApp";
import { atLimit, useListingUsage } from "../lib/listingUsage";
import usePoll from "../lib/usePoll";

export function Logo({ size = 32 }) {
  return (
    // a roof over the two dots of ي, from بيتي
    <svg viewBox="5 4 54 54" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="bayti-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e61e4d" />
          <stop offset="1" stopColor="#d70466" />
        </linearGradient>
      </defs>
      <path
        d="M10 40V28L32 9l22 19v12"
        fill="none"
        stroke="url(#bayti-logo-g)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M25 41 30.5 46.5 25 52 19.5 46.5ZM39 41 44.5 46.5 39 52 33.5 46.5Z"
        fill="url(#bayti-logo-g)"
        stroke="url(#bayti-logo-g)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// One list drives the desktop bar and the mobile drawer. Visitors browse and
// learn how to sell; signed-in individuals also get their own properties.
const PUBLIC_LINKS = [
  { to: "/list?type=buy", label: "Buy", match: "buy" },
  { to: "/list?type=rent", label: "Rent", match: "rent" },
  { to: "/sell", label: "Sell / Rent out" },
  { to: "/agencies", label: "Agencies" },
];
const MEMBER_LINKS = [
  { to: "/list?type=buy", label: "Buy", match: "buy" },
  { to: "/list?type=rent", label: "Rent", match: "rent" },
  { to: "/sell", label: "Sell / Rent out" },
  { to: "/profile?tab=listings", label: "My properties", match: "profile" },
];

const API_URL = import.meta.env.VITE_BACK_END_URL;

// Agency members sign in on the agency workspace, never here. If this browser
// holds an agency session, the marketplace only offers a discreet way back to
// it. (Plain fetch: a 401 here must not touch the marketplace session.)
function useAgencySession(enabled) {
  const [agency, setAgency] = useState(null);
  useEffect(() => {
    if (!enabled) return setAgency(null);
    let live = true;
    fetch(`${API_URL}/agency/auth/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => live && setAgency(m?.agency || null))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [enabled]);
  return agency;
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const { currentUser, updateUser } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const usage = useListingUsage();
  const agencySession = useAgencySession(!currentUser);

  useEffect(() => {
    setOpen(false);
    setDrawer(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!menuRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawer]);

  const handleLogout = async () => {
    try {
      await apiRequest.post("/auth/logout");
    } catch {
      // the cookie may already be gone; log out locally regardless
    }
    updateUser(null);
    navigate("/");
  };

  const [unread, setUnread] = useState(0);

  // Unread notification count, refreshed on navigation and when they're read
  useEffect(() => {
    if (!currentUser) return setUnread(0);
    const load = () =>
      apiRequest
        .get("/notifications")
        .then((res) => setUnread(res.data.unread))
        .catch(() => {});
    load();
    window.addEventListener("bayti:notifications", load);
    return () => window.removeEventListener("bayti:notifications", load);
  }, [currentUser, location.pathname]);

  // Unread messages: checked on navigation, after reading or sending, and
  // every 30 seconds while the tab is open
  const [unreadMessages, setUnreadMessages] = useState(0);
  const loadMessages = () =>
    currentUser &&
    apiRequest
      .get("/chats/unread")
      .then((res) => setUnreadMessages(res.data.unread))
      .catch(() => {});
  useEffect(() => {
    if (!currentUser) return setUnreadMessages(0);
    loadMessages();
    window.addEventListener("bayti:messages", loadMessages);
    return () => window.removeEventListener("bayti:messages", loadMessages);
  }, [currentUser, location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  usePoll(loadMessages, 30000, Boolean(currentUser));
  const attention = unread + unreadMessages;

  const links = currentUser ? MEMBER_LINKS : PUBLIC_LINKS;
  // Visitors come back to the page they were on after logging in
  const returnTo = ["/login", "/register"].includes(location.pathname)
    ? location.state
    : { from: location.pathname + location.search };
  const full = atLimit(usage);
  // "2/3" next to Publish, once the account has a limit
  const usageLabel = usage?.limit > 0 ? `${usage.active}/${usage.limit}` : null;

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link to="/" className="logo" aria-label="Bayti home">
          <Logo />
          <span>bayti</span>
        </Link>

        <nav className="nav-links" aria-label="Main">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => linkClass(location, l, isActive)}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="right">
          {currentUser ? (
            <>
              <Link to="/profile?tab=saved" className="icon-link" aria-label="Favorites" title="Favorites">
                <Heart size={20} strokeWidth={2} />
              </Link>

              <Link
                to="/add"
                className={`btn btn-primary publish ${full ? "full" : ""}`}
                title={usageLabel ? `${usage.active} of ${usage.limit} active properties` : undefined}
              >
                <Plus size={18} strokeWidth={2.5} />
                <span>Publish property</span>
                {usageLabel && (
                  <span className="usageChip" aria-label={`${usage.active} of ${usage.limit} active properties`}>
                    {usageLabel}
                  </span>
                )}
              </Link>

              <div className="user-menu" ref={menuRef}>
                <button
                  type="button"
                  className={`menu-pill ${open ? "open" : ""}`}
                  onClick={() => setOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={open}
                  aria-label="Account menu"
                >
                  <Menu size={16} strokeWidth={2.5} />
                  {attention > 0 && <span className="unreadDot" aria-label={`${attention} unread`} />}
                  <img src={currentUser.avatar || "/noavatar.jpg"} alt="" />
                </button>

                {open && (
                  <div className="dropdown" role="menu">
                    <div className="who">
                      <strong>{currentUser.username}</strong>
                      <span>{currentUser.email}</span>
                    </div>
                    <Link to="/profile?tab=listings" role="menuitem" className="bold">
                      My properties
                      {usageLabel && <span className="menuHint">{usageLabel} active</span>}
                    </Link>
                    <Link to="/profile?tab=saved" role="menuitem">
                      Favorites
                    </Link>
                    <Link to="/profile?tab=messages" role="menuitem">
                      Messages
                      {unreadMessages > 0 && <span className="menuCount">{unreadMessages}</span>}
                    </Link>
                    <Link to="/notifications" role="menuitem">
                      Notifications
                      {unread > 0 && <span className="menuCount">{unread}</span>}
                    </Link>
                    <hr />
                    <Link to="/profile/update" role="menuitem">
                      Profile
                    </Link>
                    <Link to="/agencies" role="menuitem">
                      Register an agency
                    </Link>
                    <Link to="/help" role="menuitem">
                      Help
                    </Link>
                    <button type="button" role="menuitem" onClick={handleLogout}>
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : agencySession ? (
            <a href={`${AGENCY_URL}/overview`} className="agencyReturn">
              <Building2 size={16} />
              <span>{agencySession.tradeName} dashboard</span>
            </a>
          ) : (
            <div className="guestActions">
              <a href={`${AGENCY_URL}/register`} className="listAgency">
                <Building2 size={16} />
                <span>List your agency</span>
              </a>
              <Link to="/login" state={returnTo} className="textLink">
                Log in
              </Link>
              <Link to="/register" state={returnTo} className="btn btn-dark register">
                Register
              </Link>
            </div>
          )}

          <button
            type="button"
            className="burger"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
            aria-expanded={drawer}
          >
            <Menu size={22} />
            {attention > 0 && <span className="unreadDot" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {drawer && (
        <div className="drawerOverlay" onClick={() => setDrawer(false)}>
          <nav className="drawer" aria-label="Menu" onClick={(e) => e.stopPropagation()}>
            <div className="drawerHead">
              <Link to="/" className="logo" aria-label="Bayti home">
                <Logo size={28} />
                <span>bayti</span>
              </Link>
              <button type="button" className="iconBtn" onClick={() => setDrawer(false)} aria-label="Close menu">
                <X size={22} />
              </button>
            </div>

            <div className="drawerLinks">
              <Link to="/">Home</Link>
              {links.map((l) => (
                <Link key={l.to} to={l.to}>
                  {l.label}
                  {l.match === "profile" && usageLabel && <span className="menuHint">{usageLabel} active</span>}
                </Link>
              ))}
              {currentUser && <Link to="/profile?tab=saved">Favorites</Link>}
              {currentUser && <Link to="/agencies">Agencies</Link>}
            </div>

            <div className="drawerAccount">
              {currentUser ? (
                <>
                  <div className="who">
                    <img src={currentUser.avatar || "/noavatar.jpg"} alt="" />
                    <div>
                      <strong>{currentUser.username}</strong>
                      <span>{currentUser.email}</span>
                    </div>
                  </div>
                  <Link to="/profile?tab=messages">
                    Messages {unreadMessages > 0 && <span className="menuCount">{unreadMessages}</span>}
                  </Link>
                  <Link to="/notifications">
                    Notifications {unread > 0 && <span className="menuCount">{unread}</span>}
                  </Link>
                  <Link to="/profile/update">Profile</Link>
                  <Link to="/agencies">Register an agency</Link>
                  <Link to="/help">Help</Link>
                  <button type="button" onClick={handleLogout}>
                    Log out
                  </button>
                </>
              ) : agencySession ? (
                <a href={`${AGENCY_URL}/overview`} className="btn btn-dark">
                  Open {agencySession.tradeName} dashboard
                </a>
              ) : (
                <div className="authRow">
                  <Link to="/login" state={returnTo} className="btn btn-outline">
                    Log in
                  </Link>
                  <Link to="/register" state={returnTo} className="btn btn-dark">
                    Register
                  </Link>
                  <a href={`${AGENCY_URL}/register`} className="btn btn-outline drawerAgency">
                    <Building2 size={17} /> Real estate agency? Register here
                  </a>
                </div>
              )}
            </div>

            {currentUser && (
              <Link to="/add" className="btn btn-primary btn-lg drawerCta">
                <Plus size={18} strokeWidth={2.5} /> Publish property
                {usageLabel && <span className="usageChip">{usageLabel}</span>}
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

// "Buy"/"Rent" both point at /list, so match on the ?type= query; "My
// properties" is the profile's default tab
function linkClass(location, link, isActive) {
  const tab = new URLSearchParams(location.search).get("tab");
  const active =
    link.match === "profile"
      ? location.pathname === "/profile" && (!tab || tab === "listings")
      : link.match
      ? location.pathname === "/list" && new URLSearchParams(location.search).get("type") === link.match
      : isActive;
  return `nav-link${active ? " active" : ""}`;
}

export default Navbar;
