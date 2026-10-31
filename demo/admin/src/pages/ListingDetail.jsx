import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  CalendarCheck,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Flag,
  Heart,
  MapPin,
  Pencil,
  Star,
  Trash2,
  X,
} from "lucide-react";
import api, { errorMessage, MARKETPLACE_URL, notifyDataChanged } from "../lib/api";
import { AVAILABILITY_LABEL, ROLE_LABEL, accountType, dateTime, numberFmt } from "../lib/format";
import { formatPropertyType } from "../../../shared/format.js";
import { BackLink, Confirm, PromptDialog, StatusPill, useToast } from "../components/ui";
import NotFound from "./NotFound";
import "./dashboard.scss";
import "./listingDetail.scss";

const NEARBY = [
  ["mosque", "Mosque"],
  ["kindergarten", "Kindergarten"],
  ["primarySchool", "Primary school"],
  ["middleSchool", "Middle school"],
  ["highSchool", "High school"],
  ["university", "University"],
  ["pharmacy", "Pharmacy"],
  ["transportation", "Public transport"],
  ["commercialArea", "Shops"],
  ["carPark", "Car park"],
];

const REJECT_REASONS = [
  "Photos are missing or don't show the property",
  "Price or details look incorrect",
  "Listing is a duplicate",
  "Contact details belong in messages, not the description",
];

// Listing descriptions are user-written HTML: show them as text only, never
// injected as markup inside the admin session.
const plainText = (html = "") =>
  html
    .replace(/<\/(p|div|li|h\d)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [missing, setMissing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [photo, setPhoto] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [toast, notify] = useToast();

  const load = useCallback(() => {
    api
      .get(`/posts/${id}`)
      .then((res) => setPost(res.data))
      .catch((err) => {
        if (err.response?.status === 404 || err.response?.status === 400) setMissing(true);
        else setLoadError(errorMessage(err, "Couldn't load this listing."));
      });
  }, [id]);

  useEffect(() => {
    setPost(null);
    setMissing(false);
    setLoadError("");
    setPhoto(0);
    load();
  }, [load]);

  if (missing) return <NotFound />;
  if (loadError) return <p className="error-text">{loadError}</p>;
  if (!post) return <div className="detailSkeleton" aria-label="Loading" />;

  const images = Array.isArray(post.images) ? post.images : [];
  const detail = post.postDetail || {};
  const owner = post.user || {};
  const nearby = NEARBY.filter(([k]) => detail[k] && detail[k] !== "no").map(([, l]) => l);

  const setStatus = async (status, note) => {
    setBusy(true);
    try {
      await api.put(`/posts/${post.id}/status`, { status, note });
      notifyDataChanged();
      notify(
        {
          approved: "Published. It's live on the marketplace.",
          rejected: "Rejected. The owner can see why.",
          unpublished: "Unpublished. It's hidden from the marketplace.",
          archived: "Archived.",
          pending: "Moved back to the review queue.",
        }[status]
      );
      setDialog(null);
      load();
    } catch (err) {
      notify(errorMessage(err, "Couldn't update the listing."), true);
    } finally {
      setBusy(false);
    }
  };

  // Quick toggles update straight away and roll back if the save fails
  const patch = async (postData, message) => {
    const before = post;
    setPost((p) => ({ ...p, ...postData }));
    try {
      await api.put(`/posts/${post.id}`, { postData });
      notify(message);
      load();
    } catch (err) {
      setPost(before);
      notify(errorMessage(err, "Couldn't save."), true);
    }
  };

  const preview = async () => {
    // Opened before the request so popup blockers allow it
    const win = window.open("", "_blank");
    try {
      const { data } = await api.get(`/posts/${post.id}/preview`);
      win.location = `${MARKETPLACE_URL}/${post.id}?preview=${encodeURIComponent(data.token)}`;
    } catch (err) {
      win.close();
      notify(errorMessage(err, "Couldn't create a preview link."), true);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/posts/${post.id}`);
      notifyDataChanged();
      navigate("/listings", { replace: true });
    } catch (err) {
      notify(errorMessage(err, "Couldn't delete the listing."), true);
    }
  };

  const lat = parseFloat(post.latitude);
  const lng = parseFloat(post.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const openReports = post.reports?.filter((r) => r.status === "open").length || 0;

  return (
    <div className="admin-dashboard listingPage backoffice">
      <BackLink to="/listings">All listings</BackLink>

      <header className="admin-head">
        <div>
          <div className="titleLine">
            <h1>{post.title}</h1>
            <StatusPill status={post.status} />
            {post.featured && (
              <span className="statusPill tone-info">
                <Star size={11} /> Featured
              </span>
            )}
            {post.availability !== "available" && <span className="statusPill tone-muted">{AVAILABILITY_LABEL[post.availability]}</span>}
          </div>
          <p>
            #{post.id} · {detail.Matricule || "no reference"} · {formatPropertyType(post.propertyType)} ·{" "}
            {post.type === "rent" ? "For rent" : "For sale"} · created {dateTime(post.createdAt)} · updated {dateTime(post.updatedAt)}
          </p>
        </div>
        <div className="headActions">
          {MARKETPLACE_URL &&
            (post.status === "approved" ? (
              <a className="btn btn-outline btn-sm" href={`${MARKETPLACE_URL}/${post.id}`} target="_blank" rel="noreferrer">
                <ExternalLink size={15} /> View on site
              </a>
            ) : (
              <button className="btn btn-outline btn-sm" onClick={preview} title="Opens a 30-minute preview link">
                <Eye size={15} /> Preview on site
              </button>
            ))}
          <Link className="btn btn-outline btn-sm" to={`/listings/${post.id}/edit`}>
            <Pencil size={15} /> Edit
          </Link>
          {post.status !== "rejected" && post.status !== "archived" && (
            <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => setDialog("reject")}>
              <X size={15} /> Reject
            </button>
          )}
          {post.status === "approved" ? (
            <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => setDialog("unpublish")}>
              <EyeOff size={15} /> Unpublish
            </button>
          ) : (
            <button className="btn btn-dark btn-sm" disabled={busy} onClick={() => setStatus("approved")}>
              <Check size={15} /> Publish
            </button>
          )}
        </div>
      </header>

      {["rejected", "unpublished"].includes(post.status) && post.reviewNote && (
        <div className="rejectedNote">
          <strong>
            {post.status === "rejected" ? "Rejected" : "Unpublished"} {dateTime(post.reviewedAt)}
          </strong>
          <p>{post.reviewNote}</p>
        </div>
      )}
      {(owner.status && owner.status !== "active") || post.agency?.status === "suspended" ? (
        <div className="callout warn">
          <strong>Hidden from the marketplace whatever its status</strong>
          <p>{owner.status !== "active" ? "The owner's account is suspended." : "The agency is suspended."}</p>
        </div>
      ) : null}

      <div className="detailGrid">
        <div className="detailMain">
          <section className="gallery">
            {images.length ? (
              <>
                <img className="hero" src={images[photo]} alt={`Photo ${photo + 1}`} />
                {images.length > 1 && (
                  <div className="thumbs">
                    {images.map((src, i) => (
                      <button key={src + i} className={i === photo ? "active" : ""} onClick={() => setPhoto(i)} aria-label={`Show photo ${i + 1}`}>
                        <img src={src} alt="" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="noPhotos">
                This listing has no photos. <Link to={`/listings/${post.id}/edit`}>Add some</Link>
              </div>
            )}
          </section>

          <section className="card">
            <div className="cardHead">
              <h2>Details</h2>
              <Link className="btn btn-outline btn-sm" to={`/listings/${post.id}/edit`}>
                <Pencil size={14} /> Edit all fields
              </Link>
            </div>
            <dl className="facts">
              <div>
                <dt>Price</dt>
                <dd>
                  {numberFmt.format(post.price)} DZD{post.type === "rent" && " / month"}
                </dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>{detail.size ? `${detail.size} m²` : "—"}</dd>
              </div>
              <div>
                <dt>Bedrooms</dt>
                <dd>{post.bedroom}</dd>
              </div>
              <div>
                <dt>Bathrooms</dt>
                <dd>{post.bathroom}</dd>
              </div>
              <div>
                <dt>Furnished</dt>
                <dd>{detail.Furnished === "yes" ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt>Pets</dt>
                <dd>{detail.pet === "allowed" || detail.pet === "yes" ? "Allowed" : "Not allowed"}</dd>
              </div>
              <div>
                <dt>Utilities</dt>
                <dd>{detail.utilities === "owner" || detail.utilities === "yes" ? "Owner" : "Tenant"}</dd>
              </div>
              <div>
                <dt>Availability</dt>
                <dd>
                  <select
                    className="roleSelect"
                    value={post.availability}
                    aria-label="Availability"
                    onChange={(e) => patch({ availability: e.target.value }, `Marked ${AVAILABILITY_LABEL[e.target.value].toLowerCase()}.`)}
                  >
                    {Object.entries(AVAILABILITY_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </dd>
              </div>
            </dl>
          </section>

          <section className="card">
            <h2>Description</h2>
            <p className="description">{plainText(detail.desc) || "No description."}</p>
            {nearby.length > 0 && (
              <>
                <h3>Nearby</h3>
                <p className="muted">{nearby.join(" · ")}</p>
              </>
            )}
          </section>

          {post.history?.length > 0 && (
            <section className="card">
              <h2>Changes by the team</h2>
              <ol className="timeline">
                {post.history.map((h) => (
                  <li key={h.id}>
                    <strong>{h.summary}</strong>
                    <small>
                      {h.actor?.username || "System"} · {dateTime(h.createdAt)}
                    </small>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="detailSide">
          <section className="card">
            <h2>Owner</h2>
            <div className="person">
              <img src={owner.avatar || "/noavatar.jpg"} alt="" />
              <div>
                <Link to={`/users/${owner.id}`}>
                  <strong>{owner.username || "Unknown"}</strong>
                </Link>
                <span>{ROLE_LABEL[accountType(owner)] || "Member"}</span>
              </div>
            </div>
            {post.agency && (
              <p className="small">
                Agency: <Link to={`/agencies/${post.agency.id}`}>{post.agency.tradeName}</Link>
              </p>
            )}
            <ul className="contact">
              {owner.email && (
                <li>
                  <a href={`mailto:${owner.email}`}>{owner.email}</a>
                </li>
              )}
              {owner.phone && (
                <li>
                  <a href={`tel:${owner.phone}`}>{owner.phone}</a>
                </li>
              )}
            </ul>
            <Link className="btn-link small" to={`/listings/${post.id}/edit`}>
              Assign to another account or agency
            </Link>
          </section>

          <section className="card">
            <h2>Promotion</h2>
            <label className="checkRow">
              <input type="checkbox" checked={post.featured} onChange={(e) => patch({ featured: e.target.checked }, e.target.checked ? "Featured on the marketplace." : "No longer featured.")} />
              Featured: shown first in search results and on the home page
            </label>
          </section>

          <section className="card">
            <h2>Activity</h2>
            <ul className="activity">
              <li>
                <Eye size={16} /> {detail.views || 0} views
              </li>
              <li>
                <Heart size={16} /> Saved {post._count?.savedPosts || 0} times
              </li>
              <li>
                <CalendarCheck size={16} /> {post._count?.inquiries || 0} inquiries
              </li>
              <li>
                <Flag size={16} /> {post.reports?.length || 0} report(s){openReports ? `, ${openReports} open` : ""}
              </li>
            </ul>
            {post.reports?.length > 0 && (
              <ul className="miniList plain">
                {post.reports.map((r) => (
                  <li key={r.id}>
                    <div>
                      <Link to={`/reports/${r.id}`}>{r.reason}</Link>
                      <span>{dateTime(r.createdAt)}</span>
                    </div>
                    <StatusPill status={r.status} />
                  </li>
                ))}
              </ul>
            )}
            <p className="muted small">Last review: {post.reviewedAt ? dateTime(post.reviewedAt) : "not reviewed yet"}</p>
          </section>

          <section className="card">
            <h2>Location</h2>
            <p>{[post.address, post.district, post.city].filter(Boolean).join(", ")}</p>
            {hasCoords ? (
              <a className="btn-link mapLink" href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`} target="_blank" rel="noreferrer">
                <MapPin size={15} /> Check the pin on the map
              </a>
            ) : (
              <p className="error-text">No pin on the map.</p>
            )}
          </section>

          <section className="card danger">
            <h2>Remove listing</h2>
            <p className="muted small">Archive it to keep the record, or delete it for good with its saved copies and tour requests.</p>
            <div className="headActions">
              {post.status !== "archived" && (
                <button className="btn btn-sm btn-outline" onClick={() => setStatus("archived")}>
                  <Archive size={15} /> Archive
                </button>
              )}
              <button className="btn btn-sm btn-danger-solid" onClick={() => setDialog("delete")}>
                <Trash2 size={15} /> Delete
              </button>
            </div>
          </section>
        </aside>
      </div>

      {dialog === "reject" && (
        <PromptDialog
          title={`Reject "${post.title}"?`}
          body="The owner sees this reason and can edit the listing to send it back for review."
          placeholder="Explain what needs to change"
          suggestions={REJECT_REASONS}
          confirmLabel="Reject listing"
          danger
          onCancel={() => setDialog(null)}
          onConfirm={(note) => setStatus("rejected", note)}
        />
      )}
      {dialog === "unpublish" && (
        <PromptDialog
          title={`Unpublish "${post.title}"?`}
          body="It disappears from the marketplace until you publish it again. Owner edits don't bring it back on their own."
          placeholder="Optional reason, shown to the owner"
          required={false}
          confirmLabel="Unpublish"
          onCancel={() => setDialog(null)}
          onConfirm={(note) => setStatus("unpublished", note)}
        />
      )}
      {dialog === "delete" && (
        <Confirm
          title="Delete this listing?"
          body="It disappears from the marketplace and from everyone's saved homes. This can't be undone."
          confirmLabel="Delete"
          danger
          onCancel={() => setDialog(null)}
          onConfirm={remove}
        />
      )}
      {toast}
    </div>
  );
}
