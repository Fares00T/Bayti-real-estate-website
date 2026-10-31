import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CalendarPlus, Clock, MessageCircle } from "lucide-react";
import apiRequest from "../lib/apiRequest";
import "./userTourRequests.scss";

// A person's inquiries: questions and visit requests they sent about
// listings, and — for individual owners — the ones they received.

const statusBadge = {
  open: { label: "Awaiting reply", cls: "badge-warning" },
  scheduled: { label: "Visit confirmed", cls: "badge-success" },
  declined: { label: "Declined", cls: "badge-danger" },
  closed: { label: "Closed", cls: "" },
  cancelled: { label: "Cancelled", cls: "" },
};
const ACTIVE = ["open", "scheduled"];

const formatTime = (time) => {
  if (!time) return "";
  const [hours, minutes = "00"] = time.split(":");
  const hour = parseInt(hours, 10);
  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? "PM" : "AM"}`;
};

// Dates are stored as "YYYY-MM-DD"; parse as local dates to avoid off-by-one days
const formatDate = (dateString) => {
  if (!dateString) return "";
  const [y, m, d] = dateString.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Google Calendar wants YYYYMMDDTHHMMSS; without a trailing Z it's local time
const calendarStamp = (date) =>
  `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate()
  ).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}${String(
    date.getMinutes()
  ).padStart(2, "0")}00`;

const calendarUrl = (inquiry, withWhom) => {
  const [y, m, d] = inquiry.confirmedDate.slice(0, 10).split("-").map(Number);
  const [hh, mm] = inquiry.confirmedTime.split(":").map(Number);
  const start = new Date(y, m - 1, d, hh, mm);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Property visit – ${inquiry.postTitle}`,
    dates: `${calendarStamp(start)}/${calendarStamp(end)}`,
    details: `Visit with ${withWhom}`,
    location: [inquiry.post?.district, inquiry.post?.city].filter(Boolean).join(", "),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
};

const VisitTime = ({ inquiry }) => {
  if (inquiry.type !== "visit") return null;
  const confirmed = inquiry.status === "scheduled" && inquiry.confirmedDate;
  return (
    <div className="when">
      <span>
        <CalendarDays size={16} /> {formatDate(confirmed ? inquiry.confirmedDate : inquiry.preferredDate)}
      </span>
      <span>
        <Clock size={16} /> {formatTime(confirmed ? inquiry.confirmedTime : inquiry.preferredTime)}
      </span>
      {inquiry.status === "open" && <span className="hint">Requested time</span>}
    </div>
  );
};

export default function UserInquiries() {
  const [sent, setSent] = useState([]);
  const [received, setReceived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([apiRequest.get("/inquiries/mine"), apiRequest.get("/inquiries/received")])
      .then(([mine, theirs]) => {
        setSent(mine.data);
        setReceived(theirs.data);
      })
      .catch(() => setError("We couldn't load your inquiries."))
      .finally(() => setLoading(false));
  }, []);

  const update = async (inquiry, body, setList) => {
    setError("");
    try {
      const res = await apiRequest.put(`/inquiries/${inquiry.id}`, body);
      setList((prev) => prev.map((i) => (i.id === inquiry.id ? { ...i, ...res.data } : i)));
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't update the inquiry.");
    }
  };

  if (loading) {
    return <div className="tourSkeleton" aria-label="Loading inquiries" />;
  }

  const sentCard = (inquiry) => {
    const badge = statusBadge[inquiry.status] || { label: inquiry.status, cls: "" };
    const image = inquiry.post?.images?.[0];
    const withWhom = inquiry.agency?.tradeName || inquiry.owner?.username || "the owner";
    return (
      <article key={inquiry.id} className={`tourCard ${ACTIVE.includes(inquiry.status) ? "" : "muted"}`}>
        <Link to={inquiry.postId ? `/${inquiry.postId}` : "#"} className="tourImage">
          {image ? <img src={image} alt="" /> : <span>No photo</span>}
        </Link>
        <div className="tourBody">
          <div className="tourTop">
            <span className={`badge ${badge.cls}`}>{badge.label}</span>
            <span className="agency">
              {inquiry.type === "visit" ? "Visit" : "Question"} · with {withWhom}
              {inquiry.assignedTo && inquiry.agency ? ` (${inquiry.assignedTo.username})` : ""}
            </span>
          </div>
          <h3>{inquiry.postId ? <Link to={`/${inquiry.postId}`}>{inquiry.postTitle}</Link> : inquiry.postTitle}</h3>
          {!inquiry.postId && <p className="where">This listing has been removed.</p>}
          <VisitTime inquiry={inquiry} />
          {inquiry.status === "declined" && inquiry.declineReason && <p className="note">Reason: {inquiry.declineReason}</p>}

          <div className="tourActions">
            {inquiry.chatId && (
              <Link className="btn btn-outline btn-sm" to="/profile?tab=messages">
                <MessageCircle size={16} /> Conversation
              </Link>
            )}
            {inquiry.status === "scheduled" && inquiry.confirmedTime && (
              <a className="btn btn-outline btn-sm" href={calendarUrl(inquiry, withWhom)} target="_blank" rel="noreferrer">
                <CalendarPlus size={16} /> Add to calendar
              </a>
            )}
            {ACTIVE.includes(inquiry.status) && (
              <button className="btn-link" onClick={() => update(inquiry, { status: "cancelled" }, setSent)}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  const receivedCard = (inquiry) => {
    const badge = statusBadge[inquiry.status] || { label: inquiry.status, cls: "" };
    const decline = () => {
      const declineReason = window.prompt("Tell them why (optional)") ?? null;
      if (declineReason !== null) update(inquiry, { status: "declined", declineReason }, setReceived);
    };
    return (
      <article key={inquiry.id} className={`tourCard ${ACTIVE.includes(inquiry.status) ? "" : "muted"}`}>
        <div className="tourBody">
          <div className="tourTop">
            <span className={`badge ${badge.cls}`}>{badge.label}</span>
            <span className="agency">
              {inquiry.type === "visit" ? "Visit request" : "Question"} from {inquiry.client?.username || "a former member"}
            </span>
          </div>
          <h3>{inquiry.postId ? <Link to={`/${inquiry.postId}`}>{inquiry.postTitle}</Link> : inquiry.postTitle}</h3>
          <VisitTime inquiry={inquiry} />
          {inquiry.contactPhone && <p className="note">Phone: {inquiry.contactPhone}</p>}
          <div className="tourActions">
            {inquiry.status === "open" && inquiry.type === "visit" && (
              <button className="btn btn-dark btn-sm" onClick={() => update(inquiry, { status: "scheduled" }, setReceived)}>
                Confirm visit
              </button>
            )}
            {ACTIVE.includes(inquiry.status) && (
              <>
                <button className="btn btn-outline btn-sm" onClick={() => update(inquiry, { status: "closed" }, setReceived)}>
                  Mark done
                </button>
                <button className="btn-link" onClick={decline}>
                  Decline
                </button>
              </>
            )}
            {inquiry.chatId && (
              <Link className="btn-link" to="/profile?tab=messages">
                Reply
              </Link>
            )}
          </div>
        </div>
      </article>
    );
  };

  const group = (title, items, card) =>
    items.length > 0 && (
      <section>
        <h3 className="groupTitle">{title}</h3>
        <div className="tourList">{items.map(card)}</div>
      </section>
    );

  return (
    <div className="userTours">
      <div className="toursHead">
        <h2>Inquiries</h2>
      </div>

      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}

      {group("About your properties", received.filter((i) => ACTIVE.includes(i.status)), receivedCard)}

      {sent.length === 0 && received.length === 0 ? (
        <div className="empty-state">
          <strong>No inquiries yet</strong>
          <p>Message an owner or request a visit from any listing page, and follow it here.</p>
          <Link to="/list" className="btn btn-outline btn-sm">
            Start searching
          </Link>
        </div>
      ) : (
        <>
          {group("In progress", sent.filter((i) => ACTIVE.includes(i.status)), sentCard)}
          {group("Closed and cancelled", sent.filter((i) => !ACTIVE.includes(i.status)), sentCard)}
          {group("Earlier, about your properties", received.filter((i) => !ACTIVE.includes(i.status)), receivedCard)}
        </>
      )}
    </div>
  );
}
