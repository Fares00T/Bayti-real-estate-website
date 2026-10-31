import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, CalendarDays, Clock } from "lucide-react";
import apiRequest from "../../components/lib/apiRequest";
import { AuthContext } from "../../context/AuthContext";
import AgencyTeam from "../../components/agencyTeam/AgencyTeam";
import "./agencyDashboard.scss";

const TABS = [
  ["all", "All"],
  ["pending", "Pending"],
  ["confirmed", "Upcoming"],
  ["completed", "Completed"],
  ["declined", "Declined"],
  ["cancelled", "Cancelled"],
];

const STATUS_LABEL = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
};

const formatTime = (time) => {
  if (!time || !time.includes(":")) return time || "—";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

const formatDate = (date) => {
  if (!date) return "—";
  // "YYYY-MM-DD" is parsed as UTC by Date; build it as a local date instead
  const [y, mo, d] = date.split("-").map(Number);
  const local = y && mo && d ? new Date(y, mo - 1, d) : new Date(date);
  return local.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const toLocalDate = (date) => {
  const [y, m, d] = (date || "").split("-").map(Number);
  return y ? new Date(y, m - 1, d) : null;
};

// Listings waiting for review or sent back by an admin, so nothing gets forgotten
function ListingsPanel({ listings }) {
  const by = (status) => listings.filter((p) => p.status === status);
  const pending = by("pending");
  const rejected = by("rejected");
  const attention = [...rejected, ...pending];

  return (
    <section className="listingsPanel">
      <div className="panelHead">
        <h2>Your listings</h2>
        <Link to="/profile" className="btn-link">
          Manage all
        </Link>
      </div>
      <p className="counts">
        <span>
          <strong>{by("approved").length}</strong> published
        </span>
        <span>
          <strong>{pending.length}</strong> waiting for review
        </span>
        <span>
          <strong>{rejected.length}</strong> need changes
        </span>
      </p>

      {listings.length === 0 ? (
        <p className="allGood">
          You haven&rsquo;t posted anything yet.{" "}
          <Link to="/add" className="btn-link">
            Create your first listing
          </Link>
        </p>
      ) : attention.length === 0 ? (
        <p className="allGood">All your listings are live.</p>
      ) : (
        attention.map((p) => (
          <div className="listingRow" key={p.id}>
            {p.images?.[0] ? (
              <img src={p.images[0]} alt="" />
            ) : (
              <span className="thumb" />
            )}
            <div className="info">
              <Link to={`/${p.id}`}>{p.title}</Link>
              {p.status === "rejected" && p.reviewNote ? (
                <span className="note">{p.reviewNote}</span>
              ) : (
                <span>
                  Submitted{" "}
                  {new Date(p.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                  {" · "}usually reviewed within a day
                </span>
              )}
            </div>
            <span className={`pill pill-${p.status}`}>
              {p.status === "rejected" ? "Needs changes" : "In review"}
            </span>
            {p.status === "rejected" ? (
              <Link to={`/edit-post/${p.id}`} className="btn btn-dark btn-sm">
                Edit
              </Link>
            ) : (
              <span />
            )}
          </div>
        ))
      )}
    </section>
  );
}

export default function AgencyDashboard() {
  const { currentUser } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [declining, setDeclining] = useState(null);
  const [declineReason, setDeclineReason] = useState("");
  const [completing, setCompleting] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [listings, setListings] = useState(null);

  // Agency owners and their agents both handle tour requests for their listings
  const isAgency = ["agency", "agent"].includes(currentUser?.role);

  useEffect(() => {
    if (!isAgency) {
      setLoading(false);
      return;
    }
    apiRequest
      .get("/tours/agency")
      .then((res) => setRequests(res.data))
      .catch(() => setError("We couldn't load your tour requests."))
      .finally(() => setLoading(false));
    apiRequest
      .get("/users/profilePosts")
      .then((res) => setListings(res.data.userPosts || []))
      .catch(() => setListings([]));
  }, [isAgency]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3500);
  };

  const update = async (id, data, message) => {
    setBusyId(id);
    try {
      const res = await apiRequest.put(`/tours/${id}`, data);
      setRequests((prev) => prev.map((r) => (r.id === id ? res.data : r)));
      showToast(message);
    } catch (err) {
      showToast(err?.response?.data?.message || "Couldn't update the request.");
    } finally {
      setBusyId(null);
    }
  };

  const accept = (r) =>
    update(
      r.id,
      {
        status: "confirmed",
        confirmedDate: r.preferredDate,
        confirmedTime: r.preferredTime,
      },
      "Tour confirmed."
    );

  const submitDecline = () => {
    if (!declineReason.trim()) return;
    update(
      declining,
      { status: "declined", declineReason: declineReason.trim() },
      "Request declined."
    );
    setDeclining(null);
    setDeclineReason("");
  };

  const confirmComplete = () => {
    update(completing, { status: "completed" }, "Marked as completed.");
    setCompleting(null);
  };

  if (!isAgency) {
    return (
      <div className="agency-dashboard">
        <div className="empty-state">
          <h3>This dashboard is for agencies</h3>
          <p>Apply as an agency to receive and manage tour requests.</p>
          <Link to="/agency" className="btn btn-dark">
            Apply as an agency
          </Link>
        </div>
      </div>
    );
  }

  const count = (status) => requests.filter((r) => r.status === status).length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAhead = new Date(today.getTime() + 7 * 864e5);
  const thisWeek = requests.filter((r) => {
    const d = toLocalDate(r.confirmedDate || r.preferredDate);
    return (
      ["pending", "confirmed"].includes(r.status) &&
      d &&
      d >= today &&
      d <= weekAhead
    );
  }).length;

  const filtered = requests.filter(
    (r) =>
      (tab === "all" || r.status === tab) &&
      (!dateFilter || r.preferredDate === dateFilter)
  );

  return (
    <div className="agency-dashboard">
      <header className="dash-head">
        <div>
          <h1>Welcome back, {currentUser.agency?.tradeName || currentUser.agencyName || currentUser.username}</h1>
          <p>Here&rsquo;s what&rsquo;s happening with your listings and tour requests.</p>
        </div>
        <Link to="/add" className="btn btn-outline btn-sm">
          Create a listing
        </Link>
      </header>

      <section className="stats">
        <div>
          <strong>{count("pending")}</strong>
          <span>Awaiting your reply</span>
        </div>
        <div>
          <strong>{thisWeek}</strong>
          <span>Visits in the next 7 days</span>
        </div>
        <div>
          <strong>{count("confirmed")}</strong>
          <span>Confirmed</span>
        </div>
        <div>
          <strong>{count("completed")}</strong>
          <span>Completed</span>
        </div>
      </section>

      {currentUser.agencyId && <AgencyTeam onLeft={() => window.location.assign("/profile")} />}

      {listings && <ListingsPanel listings={listings} />}

      <section className="requests">
        <h2 className="sectionTitle">Tour requests</h2>
        <div className="toolbar">
          <nav className="tabs" role="tablist">
            {TABS.map(([value, label]) => {
              const n = value === "all" ? requests.length : count(value);
              return (
                <button
                  key={value}
                  role="tab"
                  aria-selected={tab === value}
                  className={tab === value ? "active" : ""}
                  onClick={() => setTab(value)}
                >
                  {label}
                  {n > 0 && <span className="n">{n}</span>}
                </button>
              );
            })}
          </nav>
          <div className="dateFilter">
            <input
              type="date"
              aria-label="Filter by date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            {dateFilter && (
              <button className="btn-link" onClick={() => setDateFilter("")}>
                Clear
              </button>
            )}
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        {loading ? (
          <div className="rows">
            {[0, 1, 2].map((i) => (
              <div key={i} className="row skeleton" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="none">
            <h3>
              {requests.length === 0
                ? "You don't have any tour requests yet"
                : "Nothing here"}
            </h3>
            <p>
              {requests.length === 0
                ? "When someone books a visit on one of your listings, it will show up here."
                : "No requests match this filter."}
            </p>
          </div>
        ) : (
          <ul className="rows">
            {filtered.map((r) => (
              <li key={r.id} className="row">
                <div className="who">
                  <span className="avatar">
                    {r.client?.username?.charAt(0).toUpperCase() || "?"}
                  </span>
                  <div>
                    <strong>{r.client?.username || "Unknown client"}</strong>
                    {r.property ? (
                      <Link to={`/${r.property.id}`} className="prop">
                        {r.property.title}
                      </Link>
                    ) : (
                      <span className="prop">Listing removed</span>
                    )}
                  </div>
                </div>

                <div className="when">
                  <span>
                    <CalendarDays size={15} />
                    {formatDate(r.confirmedDate || r.preferredDate)}
                  </span>
                  <span>
                    <Clock size={15} />
                    {formatTime(r.confirmedTime || r.preferredTime)}
                  </span>
                </div>

                <div className="contact">
                  {r.contactPhone && (
                    <a href={`tel:${r.contactPhone}`}>
                      <Phone size={15} />
                      {r.contactPhone}
                    </a>
                  )}
                  {r.client?.email && (
                    <a href={`mailto:${r.client.email}`}>
                      <Mail size={15} />
                      {r.client.email}
                    </a>
                  )}
                </div>

                <span className={`pill pill-${r.status}`}>
                  {STATUS_LABEL[r.status] || r.status}
                </span>

                <div className="actions">
                  {r.status === "pending" && (
                    <>
                      <button
                        className="btn btn-outline btn-sm"
                        disabled={busyId === r.id}
                        onClick={() => setDeclining(r.id)}
                      >
                        Decline
                      </button>
                      <button
                        className="btn btn-dark btn-sm"
                        disabled={busyId === r.id}
                        onClick={() => accept(r)}
                      >
                        Accept
                      </button>
                    </>
                  )}
                  {r.status === "confirmed" && (
                    <button
                      className="btn btn-outline btn-sm"
                      disabled={busyId === r.id}
                      onClick={() => setCompleting(r.id)}
                    >
                      Mark completed
                    </button>
                  )}
                </div>

                {(r.message || (r.status === "declined" && r.declineReason)) && (
                  <div className="notes">
                    {r.message && <p>&ldquo;{r.message}&rdquo;</p>}
                    {r.status === "declined" && r.declineReason && (
                      <p className="reason">
                        Declined: {r.declineReason}
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {declining && (
        <div className="modal" role="dialog" aria-modal="true" onClick={() => setDeclining(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Decline this request?</h3>
            <p>Let the guest know why. They&rsquo;ll see this message.</p>
            <textarea
              autoFocus
              placeholder="e.g. The property is no longer available on that day."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn-link" onClick={() => setDeclining(null)}>
                Cancel
              </button>
              <button
                className="btn btn-dark"
                disabled={!declineReason.trim()}
                onClick={submitDecline}
              >
                Decline request
              </button>
            </div>
          </div>
        </div>
      )}

      {completing && (
        <div className="modal" role="dialog" aria-modal="true" onClick={() => setCompleting(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Mark this visit as completed?</h3>
            <p>Do this once the tour has taken place.</p>
            <div className="modal-actions">
              <button className="btn-link" onClick={() => setCompleting(null)}>
                Cancel
              </button>
              <button className="btn btn-dark" onClick={confirmComplete}>
                Mark completed
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
