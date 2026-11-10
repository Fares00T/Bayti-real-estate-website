import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { BarChart } from "@mui/x-charts";
import { Archive, ArchiveRestore, ExternalLink, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import api, { MARKETPLACE_URL, errorMessage, notifyDataChanged } from "../lib/api";
import { useMember } from "../lib/auth";
import {
  AVAILABILITY_LABEL,
  INQUIRY_STATUS,
  STATE_HELP,
  dateFmt,
  formatPropertyType,
  place,
  price,
} from "../lib/format";
import { BackLink, Confirm, PageHead, Spinner, StatusPill, useToast } from "../components/ui";
import NotFound from "./NotFound";
import "./dashboard.scss";
import "./listingDetail.scss";

const DAYS = 30;

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { member, can } = useMember();
  const [post, setPost] = useState(null);
  const [missing, setMissing] = useState(false);
  const [photo, setPhoto] = useState(0);
  const [team, setTeam] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [toast, notify] = useToast();
  const writable = member.agency.status === "active";

  const load = () =>
    api
      .get(`/listings/${id}`)
      .then((res) => setPost(res.data))
      .catch((err) => (err.response?.status === 404 ? setMissing(true) : notify(errorMessage(err), true)));

  useEffect(() => {
    load();
    if (can("listings.assign")) {
      api.get("/team").then((res) => setTeam(res.data.filter((m) => m.agencyActive && m.status === "active"))).catch(() => {});
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const saved = location.state?.saved;
    if (!saved) return;
    notify(
      saved === "created"
        ? "Listing submitted. The Bayti team will review it shortly."
        : location.state.state === "pending"
        ? "Saved and sent back to review."
        : "Changes saved."
    );
    navigate(location.pathname, { replace: true, state: null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (missing) return <NotFound />;
  if (!post) return <Spinner />;

  const run = async (fn, ok) => {
    try {
      await fn();
      notify(ok);
      notifyDataChanged();
      await load();
    } catch (err) {
      notify(errorMessage(err), true);
    }
  };

  const images = Array.isArray(post.images) ? post.images : [];
  const d = post.postDetail || {};
  const today = Math.floor(Date.now() / 86400000);
  const byDay = new Map(post.stats.viewsByDay.map((v) => [v.day, v.count]));
  const series = Array.from({ length: DAYS }, (_, k) => {
    const day = today - (DAYS - 1) + k;
    return { date: new Date(day * 86400000), views: byDay.get(day) || 0 };
  });
  const recentViews = series.reduce((n, s) => n + s.views, 0);
  const inquiryTotal = Object.values(post.stats.inquiries).reduce((n, c) => n + c, 0);

  return (
    <div className="workspace listingPage backoffice">
      <BackLink to="/listings">All listings</BackLink>
      <PageHead
        title={
          <span className="titleLine">
            {post.title} <StatusPill status={post.state} />
          </span>
        }
        subtitle={`${place(post)} · ${post.type === "rent" ? "For rent" : "For sale"} · ${formatPropertyType(post.propertyType)}`}
      >
        <div className="headActions">
          {post.state === "published" && MARKETPLACE_URL && (
            <a className="btn btn-outline btn-sm" href={`${MARKETPLACE_URL}/${post.id}`} target="_blank" rel="noreferrer">
              <ExternalLink size={15} /> View on Bayti
            </a>
          )}
          {writable && (
            <Link to={`/listings/${post.id}/edit`} className="btn btn-dark btn-sm">
              <Pencil size={15} /> Edit
            </Link>
          )}
        </div>
      </PageHead>

      <div className={`callout ${post.state === "rejected" || post.state === "taken_down" ? "danger" : ""}`}>
        <p>{STATE_HELP[post.state]}</p>
        {post.reviewNote && ["rejected", "taken_down", "pending"].includes(post.state) && (
          <p>
            <strong>Note from Bayti:</strong> {post.reviewNote}
          </p>
        )}
      </div>

      <div className="detailGrid">
        <div className="detailMain">
          <section className="gallery">
            {images.length ? (
              <>
                <img className="hero" src={images[photo]} alt={`Photo ${photo + 1} of ${post.title}`} />
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
              <p className="muted">No photos yet. Listings with photos get far more visits.</p>
            )}
          </section>

          <section className="card">
            <h2>Performance</h2>
            <div className="stats">
              <div className="stat">
                <strong>{d.views || 0}</strong>
                <span>Views, all time</span>
              </div>
              <div className="stat">
                <strong>{recentViews}</strong>
                <span>Views, last {DAYS} days</span>
              </div>
              <div className="stat">
                <strong>{inquiryTotal}</strong>
                <span>Inquiries</span>
              </div>
              <div className="stat">
                <strong>{post._count.savedPosts}</strong>
                <span>Saved by buyers</span>
              </div>
            </div>
            {recentViews > 0 ? (
              <BarChart
                height={200}
                dataset={series}
                xAxis={[{ scaleType: "band", dataKey: "date", valueFormatter: (v) => v.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) }]}
                yAxis={[{ min: 0, tickMinStep: 1 }]}
                series={[{ dataKey: "views", label: "Views", color: "#e51d53" }]}
                grid={{ horizontal: true }}
                borderRadius={3}
              />
            ) : (
              <p className="muted small">No views in the last {DAYS} days{post.state !== "published" ? " — the listing isn't public." : "."}</p>
            )}
            {inquiryTotal > 0 && (
              <p className="small">
                {Object.entries(post.stats.inquiries)
                  .map(([s, n]) => `${n} ${INQUIRY_STATUS[s]?.[0].toLowerCase() || s}`)
                  .join(" · ")}{" "}
                · <Link to={`/inquiries?listing=${post.id}`}>See the inquiries</Link>
              </p>
            )}
          </section>

          <section className="card">
            <h2>Details</h2>
            <dl className="facts">
              <div>
                <dt>Price</dt>
                <dd>{price(post)}</dd>
              </div>
              <div>
                <dt>Availability</dt>
                <dd>{AVAILABILITY_LABEL[post.availability]}</dd>
              </div>
              {post.bedroom > 0 && (
                <div>
                  <dt>Bedrooms</dt>
                  <dd>{post.bedroom}</dd>
                </div>
              )}
              <div>
                <dt>Bathrooms</dt>
                <dd>{post.bathroom}</dd>
              </div>
              {d.size && (
                <div>
                  <dt>Size</dt>
                  <dd>{d.size} m²</dd>
                </div>
              )}
              <div>
                <dt>Address</dt>
                <dd>{[post.address, post.district, post.city].filter(Boolean).join(", ")}</dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className="detailSide">
          <section className="card">
            <h2>Agent in charge</h2>
            {post.user ? (
              <div className="person">
                <img src={post.user.avatar || "/noavatar.jpg"} alt="" />
                {can("team.view") ? <Link to={`/team/${post.user.id}`}>{post.user.username}</Link> : <strong>{post.user.username}</strong>}
              </div>
            ) : (
              <p className="muted">Unassigned. The listing stays with the agency; choose who handles it.</p>
            )}
            {writable && can("listings.assign") && team.length > 0 && (
              <div className="field" style={{ marginTop: 14 }}>
                <label htmlFor="assign">{post.user ? "Reassign to" : "Assign to"}</label>
                <select
                  id="assign"
                  value={post.userId ?? ""}
                  onChange={(e) =>
                    run(
                      () => api.put(`/listings/${post.id}/assign`, { userId: e.target.value ? Number(e.target.value) : null }),
                      "Listing reassigned. Its open inquiries moved with it."
                    )
                  }
                >
                  <option value="">Unassigned</option>
                  {team.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.username}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          <section className="card">
            <h2>Record</h2>
            <dl className="facts">
              <div>
                <dt>Reference</dt>
                <dd>{d.Matricule || "—"}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>
                  {dateFmt(post.createdAt)}
                  {post.createdBy ? ` by ${post.createdBy.username}` : ""}
                </dd>
              </div>
              <div>
                <dt>Last change</dt>
                <dd>{dateFmt(post.updatedAt)}</dd>
              </div>
            </dl>
          </section>

          {writable && (
            <section className="card">
              <h2>Market status</h2>
              <div className="stack">
                {post.state === "published" && (
                  <button className="btn btn-outline btn-sm" onClick={() => run(() => api.put(`/listings/${post.id}/visibility`, { online: false }), "Taken off the market.")}>
                    <EyeOff size={15} /> Take offline
                  </button>
                )}
                {post.state === "offline" && (
                  <button className="btn btn-outline btn-sm" onClick={() => run(() => api.put(`/listings/${post.id}/visibility`, { online: true }), "Back on the market.")}>
                    <Eye size={15} /> Put back online
                  </button>
                )}
                {post.state === "archived" ? (
                  <button className="btn btn-outline btn-sm" onClick={() => run(() => api.put(`/listings/${post.id}/archive`, { archived: false }), "Restored and sent to review.")}>
                    <ArchiveRestore size={15} /> Restore
                  </button>
                ) : (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() =>
                      setConfirm({
                        title: "Archive this listing?",
                        body: "It leaves the marketplace and stays in your records. Restoring it later sends it back to review.",
                        label: "Archive",
                        go: () => run(() => api.put(`/listings/${post.id}/archive`, { archived: true }), "Listing archived."),
                      })
                    }
                  >
                    <Archive size={15} /> Archive
                  </button>
                )}
                <button
                  className="btn btn-outline btn-sm dangerText"
                  onClick={() =>
                    setConfirm({
                      title: "Delete this listing?",
                      body: "This permanently removes the listing and its photos. Inquiries about it stay in your records.",
                      label: "Delete",
                      danger: true,
                      go: async () => {
                        try {
                          await api.delete(`/listings/${post.id}`);
                          notifyDataChanged();
                          navigate("/listings", { replace: true });
                        } catch (err) {
                          notify(errorMessage(err), true);
                        }
                      },
                    })
                  }
                >
                  <Trash2 size={15} /> Delete
                </button>
              </div>
            </section>
          )}
        </aside>
      </div>

      {confirm && (
        <Confirm
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.label}
          danger={confirm.danger}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            await confirm.go();
            setConfirm(null);
          }}
        />
      )}
      {toast}
    </div>
  );
}
