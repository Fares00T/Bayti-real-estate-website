import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BarChart, PieChart } from "@mui/x-charts";
import { Check, Download, Plus, RefreshCw, Search, Star, Trash2, X } from "lucide-react";
import api, { errorMessage, notifyDataChanged } from "../lib/api";
import { formatPropertyType } from "../../../shared/format.js";
import NotFound from "./NotFound";
import { StatusPill } from "../components/ui";
import { ROLE_LABEL } from "../lib/format";
import "./dashboard.scss";

// Neutral grays with a single coral accent
const CHART_COLORS = ["#e51d53", "#222222", "#b0b0b0", "#6a6a6a", "#dddddd"];

const SECTIONS = {
  overview: ["Overview", "How the marketplace is doing today."],
  review: ["Review queue", "New and edited listings wait here until you publish them."],
  listings: ["Listings", "Every listing on Bayti, whatever its status."],
  analytics: ["Analytics", "Where listings are and what they cost."],
};

const numberFmt = new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 0 });
const dateFmt = (d) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const capitalize = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);

const countBy = (items, key) =>
  items.reduce((acc, item) => {
    const k = typeof key === "function" ? key(item) : item[key];
    if (k) acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

const downloadCsv = (rows, filename) => {
  if (!rows.length) return;
  const escape = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    Object.keys(rows[0]).join(","),
    ...rows.map((r) => Object.values(r).map(escape).join(",")),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

function Stat({ value, label }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ChartCard({ title, children, empty }) {
  return (
    <section className="chartCard">
      <h3>{title}</h3>
      {empty ? <p className="muted">Not enough data yet.</p> : children}
    </section>
  );
}

export function Confirm({ title, body, confirmLabel, danger, onCancel, onConfirm }) {
  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {body && <p>{body}</p>}
        <div className="modal-actions">
          <button className="btn-link" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`btn ${danger ? "btn-danger-solid" : "btn-dark"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Rejecting always needs a reason: it is shown to the owner on their listing
export function RejectDialog({ post, onCancel, onConfirm }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const reasons = [
    "Photos are missing or don't show the property",
    "Price or details look incorrect",
    "Listing is a duplicate",
    "Contact details belong in messages, not the description",
  ];

  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={onCancel}>
      <form
        className="modal-content rejectDialog"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!note.trim()) return;
          setBusy(true);
          await onConfirm(note.trim());
          setBusy(false);
        }}
      >
        <h3>Reject “{post.title}”?</h3>
        <p>The owner sees this reason and can edit the listing to send it back for review.</p>
        <div className="quickReasons">
          {reasons.map((r) => (
            <button type="button" key={r} onClick={() => setNote(r)}>
              {r}
            </button>
          ))}
        </div>
        <textarea
          autoFocus
          rows={4}
          maxLength={1000}
          placeholder="Explain what needs to change"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="modal-actions">
          <button type="button" className="btn-link" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-danger-solid" disabled={!note.trim() || busy}>
            {busy ? "Rejecting…" : "Reject listing"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AdminPage() {
  const { section: tab } = useParams();
  const navigate = useNavigate();
  const setTab = (next) => navigate(`/${next}`);
  const [statusFilter, setStatusFilter] = useState("");
  const [rejecting, setRejecting] = useState(null);
  const [reviewing, setReviewing] = useState([]);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [postQuery, setPostQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [selectedPosts, setSelectedPosts] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, error = false) => {
    setToast({ message, error });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAll = async () => {
    setLoading(true);
    setLoadError("");
    const [u, p, s] = await Promise.allSettled([
      api.get("/users"),
      // every listing, whatever its review status
      api.get("/posts", { params: { status: "all" } }),
      api.get("/overview"),
    ]);
    if (u.status === "fulfilled") setUsers(u.value.data);
    if (p.status === "fulfilled") setPosts(p.value.data.posts);
    if (s.status === "fulfilled") setStats(s.value.data);
    if (u.status === "rejected" || p.status === "rejected") {
      setLoadError("Some data couldn't be loaded. Try refreshing.");
    }
    setSelectedPosts([]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // ----- derived data -----
  const filteredPosts = useMemo(() => {
    const q = postQuery.toLowerCase();
    return posts.filter(
      (p) =>
        (!statusFilter || (statusFilter === "featured" ? p.featured : p.status === statusFilter)) &&
        (!typeFilter || p.type === typeFilter) &&
        (!categoryFilter || p.property === categoryFilter) &&
        (!q ||
          p.title?.toLowerCase().includes(q) ||
          p.city?.toLowerCase().includes(q) ||
          p.user?.username?.toLowerCase().includes(q))
    );
  }, [posts, postQuery, statusFilter, typeFilter, categoryFilter]);

  // Oldest submissions first, so nobody waits longest
  const pendingPosts = useMemo(
    () =>
      posts
        .filter((p) => p.status === "pending")
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [posts]
  );

  const agencies = users.filter((u) => u.agencyRole === "owner").length;
  const forRent = posts.filter((p) => p.type === "rent").length;
  const totalViews = posts.reduce((s, p) => s + (p.postDetail?.views || 0), 0);
  const avgSale = (() => {
    const sales = posts.filter((p) => p.type === "buy");
    return sales.length
      ? sales.reduce((s, p) => s + p.price, 0) / sales.length
      : 0;
  })();
  const pct = (part, whole) =>
    whole ? `${Math.round((part / whole) * 100)}%` : "—";

  const roleData = Object.entries(countBy(users, "role")).map(
    ([role, value], i) => ({
      id: role,
      label: ROLE_LABEL[role] || capitalize(role),
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    })
  );
  const categoryData = Object.entries(countBy(posts, "property")).map(
    ([k, value], i) => ({
      id: k,
      label: capitalize(k),
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    })
  );
  const saleRentData = [
    { id: "buy", label: "For sale", value: posts.length - forRent, color: CHART_COLORS[1] },
    { id: "rent", label: "For rent", value: forRent, color: CHART_COLORS[0] },
  ].filter((d) => d.value > 0);
  const typeData = Object.entries(
    countBy(posts, (p) => formatPropertyType(p.propertyType))
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const cityData = Object.entries(countBy(posts, "city"))
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const activity = (() => {
    if (!stats) return [];
    const dates = [
      ...new Set([
        ...(stats.usersByDay || []).map((d) => d.date),
        ...(stats.postsByDay || []).map((d) => d.date),
      ]),
    ].sort();
    return dates.map((date) => ({
      date: new Date(date),
      users: stats.usersByDay?.find((d) => d.date === date)?.count || 0,
      posts: stats.postsByDay?.find((d) => d.date === date)?.count || 0,
    }));
  })();
  const recentPosts = posts.slice(0, 5);

  // ----- actions -----
  const review = async (post, decision, note) => {
    setReviewing((prev) => [...prev, post.id]);
    try {
      const { data } = await api.put(`/posts/${post.id}/review`, {
        decision,
        note,
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, ...data } : p))
      );
      notifyDataChanged();
      showToast(
        decision === "approve"
          ? `“${post.title}” is now live.`
          : `“${post.title}” was rejected. The owner can see why.`
      );
      return true;
    } catch (err) {
      showToast(errorMessage(err, "Couldn't update the listing."), true);
      return false;
    } finally {
      setReviewing((prev) => prev.filter((id) => id !== post.id));
    }
  };

  const removePosts = async (ids) => {
    const results = await Promise.allSettled(
      ids.map((id) => api.delete(`/posts/${id}`))
    );
    const ok = ids.filter((_, i) => results[i].status === "fulfilled");
    if (ok.length) notifyDataChanged();
    setPosts((prev) => prev.filter((p) => !ok.includes(p.id)));
    setSelectedPosts((prev) => prev.filter((id) => !ok.includes(id)));
    const failed = ids.length - ok.length;
    showToast(
      failed
        ? `${ok.length} deleted, ${failed} failed.`
        : `${ok.length} ${ok.length === 1 ? "listing" : "listings"} deleted.`,
      failed > 0
    );
  };

  const askDeletePosts = (ids) =>
    setConfirm({
      title:
        ids.length === 1 ? "Delete this listing?" : `Delete ${ids.length} listings?`,
      body: "This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
      run: () => removePosts(ids),
    });

  const exportPosts = () =>
    downloadCsv(
      posts.map((p) => ({
        ID: p.id,
        Title: p.title,
        Price: p.price,
        Type: p.type,
        Category: p.property,
        PropertyType: p.propertyType,
        City: p.city,
        District: p.district,
        Owner: p.user?.username || "",
        Views: p.postDetail?.views || 0,
        Created: new Date(p.createdAt).toISOString().slice(0, 10),
      })),
      "bayti-listings.csv"
    );

  const toggle = (setter, id) =>
    setter((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  if (!SECTIONS[tab]) return <NotFound />;

  return (
    <div className="admin-dashboard">
      <header className="admin-head">
        <div>
          <h1>{SECTIONS[tab][0]}</h1>
          <p>{SECTIONS[tab][1]}</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={loadAll} disabled={loading}>
          <RefreshCw size={15} className={loading ? "spin" : ""} />
          Refresh
        </button>
      </header>

      {loadError && <p className="error-text loadError">{loadError}</p>}

      {tab === "overview" && (
        <div className="panel">
          {stats?.applicationsWaiting > 0 && (
            <div className="reviewNotice">
              <div>
                <strong>
                  {stats.applicationsWaiting} agency{" "}
                  {stats.applicationsWaiting === 1 ? "application is" : "applications are"} waiting
                </strong>
                <span>Check their legal documents before granting verified status.</span>
              </div>
              <Link className="btn btn-dark btn-sm" to="/applications">
                Review applications
              </Link>
            </div>
          )}
          {stats?.openReports > 0 && (
            <div className="reviewNotice">
              <div>
                <strong>
                  {stats.openReports} open {stats.openReports === 1 ? "report" : "reports"}
                </strong>
                <span>Users flagged listings or accounts.</span>
              </div>
              <Link className="btn btn-outline btn-sm" to="/reports">
                Open moderation
              </Link>
            </div>
          )}
          {pendingPosts.length > 0 && (
            <div className="reviewNotice">
              <div>
                <strong>
                  {pendingPosts.length}{" "}
                  {pendingPosts.length === 1 ? "listing is" : "listings are"} waiting for
                  review
                </strong>
                <span>
                  They stay hidden from visitors until you publish them. Oldest
                  submitted {dateFmt(pendingPosts[0].createdAt)}.
                </span>
              </div>
              <button className="btn btn-dark btn-sm" onClick={() => setTab("review")}>
                Review now
              </button>
            </div>
          )}
          <div className="stats">
            <Stat value={users.length} label="Users" />
            <Stat value={agencies} label="Agencies" />
            <Stat
              value={posts.filter((p) => p.status === "approved").length}
              label="Published listings"
            />
            <Stat value={numberFmt.format(totalViews)} label="Listing views" />
          </div>

          <div className="grid2">
            <ChartCard title="Users by role" empty={!roleData.length}>
              <PieChart
                height={240}
                series={[
                  {
                    data: roleData,
                    arcLabel: (item) => String(item.value),
                    arcLabelMinAngle: 20,
                    innerRadius: 62,
                    outerRadius: 96,
                    paddingAngle: 2,
                    cornerRadius: 3,
                  },
                ]}
              />
            </ChartCard>

            <ChartCard title="Sign-ups and new listings" empty={activity.length === 0}>
              <BarChart
                height={240}
                dataset={activity}
                xAxis={[
                  {
                    scaleType: "band",
                    dataKey: "date",
                    valueFormatter: (d) =>
                      d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
                  },
                ]}
                yAxis={[{ min: 0, tickMinStep: 1 }]}
                series={[
                  { dataKey: "posts", label: "New listings", color: CHART_COLORS[0] },
                  { dataKey: "users", label: "Sign-ups", color: CHART_COLORS[1] },
                ]}
                grid={{ horizontal: true }}
                borderRadius={4}
              />
            </ChartCard>
          </div>

          <section className="recent">
            <div className="sectionHead">
              <h2>Newest listings</h2>
              <button className="btn-link" onClick={() => setTab("listings")}>
                See all
              </button>
            </div>
            {recentPosts.length === 0 ? (
              <p className="muted">No listings yet.</p>
            ) : (
              <ul className="recentList">
                {recentPosts.map((p) => (
                  <li key={p.id}>
                    <img src={p.images?.[0] || "/noavatar.jpg"} alt="" />
                    <div>
                      <Link to={`/listings/${p.id}`}>{p.title}</Link>
                      <span>
                        {[p.district, p.city].filter(Boolean).join(", ")} ·{" "}
                        {p.user?.username || "Unknown"}
                      </span>
                    </div>
                    {p.status !== "approved" && <StatusPill status={p.status} />}
                    <span className="price">
                      {numberFmt.format(p.price)} DZD
                      {p.type === "rent" && <small> / month</small>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "review" && (
        <div className="panel">
          <div className="reviewHead">
            <h2>Waiting for review</h2>
            <p className="muted">
              New and edited listings stay hidden until you publish them. Check
              that the photos show the property, the price is plausible and the
              location matches the description.
            </p>
          </div>

          {loading ? (
            <p className="muted">Loading…</p>
          ) : pendingPosts.length === 0 ? (
            <div className="reviewEmpty">
              <Check size={28} />
              <h3>You're all caught up</h3>
              <p className="muted">New listings will appear here as soon as they're submitted.</p>
            </div>
          ) : (
            <ul className="reviewList">
              {pendingPosts.map((p) => {
                const busy = reviewing.includes(p.id);
                const desc = (p.postDetail?.desc || "").replace(/<[^>]+>/g, " ").trim();
                return (
                  <li key={p.id} className="reviewItem">
                    <Link to={`/listings/${p.id}`} className="reviewPhotos">
                      {(p.images || []).slice(0, 3).map((src, i) => (
                        <img key={i} src={src} alt="" />
                      ))}
                      {!p.images?.length && <span className="noPhoto">No photos</span>}
                    </Link>
                    <div className="reviewBody">
                      <div className="reviewTitle">
                        <Link to={`/listings/${p.id}`}>{p.title}</Link>
                        <span className="price">
                          {numberFmt.format(p.price)} DZD
                          {p.type === "rent" && <small> / month</small>}
                        </span>
                      </div>
                      <p className="meta">
                        {[p.address, p.district, p.city].filter(Boolean).join(", ")} ·{" "}
                        {p.type === "rent" ? "For rent" : "For sale"} ·{" "}
                        {formatPropertyType(p.propertyType)}
                        {p.bedroom > 0 && ` · ${p.bedroom} bed`}
                        {p.postDetail?.size ? ` · ${p.postDetail.size} m²` : ""}
                      </p>
                      {desc && <p className="desc">{desc}</p>}
                      <p className="meta">
                        By{" "}
                        <strong>
                          {p.agency?.tradeName || p.user?.username || "Unknown"}
                        </strong>
                        {p.agency && " (agency)"} · submitted{" "}
                        {dateFmt(p.createdAt)}
                      </p>
                      <div className="reviewActions">
                        <button
                          className="btn btn-outline btn-sm"
                          disabled={busy}
                          onClick={() => setRejecting(p)}
                        >
                          <X size={15} /> Reject
                        </button>
                        <button
                          className="btn btn-dark btn-sm"
                          disabled={busy}
                          onClick={() => review(p, "approve")}
                        >
                          <Check size={15} /> {busy ? "Publishing…" : "Publish"}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === "listings" && (
        <div className="panel">
          <div className="toolbar">
            <label className="searchBox">
              <Search size={16} />
              <input
                placeholder="Search title, city or owner"
                value={postQuery}
                onChange={(e) => setPostQuery(e.target.value)}
              />
            </label>
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">Any status</option>
              <option value="pending">Pending review</option>
              <option value="approved">Published</option>
              <option value="rejected">Rejected</option>
              <option value="unpublished">Unpublished</option>
              <option value="archived">Archived</option>
              <option value="featured">Featured</option>
            </select>
            <select
              className="select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by type"
            >
              <option value="">Sale and rent</option>
              <option value="buy">For sale</option>
              <option value="rent">For rent</option>
            </select>
            <select
              className="select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
            </select>
            <div className="spacer" />
            {selectedPosts.length > 0 && (
              <button
                className="btn btn-sm btn-danger-solid"
                onClick={() => askDeletePosts(selectedPosts)}
              >
                <Trash2 size={15} /> Delete {selectedPosts.length}
              </button>
            )}
            <button className="btn btn-outline btn-sm" onClick={exportPosts}>
              <Download size={15} /> Export CSV
            </button>
            <Link to="/listings/new" className="btn btn-dark btn-sm">
              <Plus size={15} /> New listing
            </Link>
          </div>

          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="check">
                    <input
                      type="checkbox"
                      aria-label="Select all listings"
                      checked={
                        filteredPosts.length > 0 &&
                        selectedPosts.length === filteredPosts.length
                      }
                      onChange={(e) =>
                        setSelectedPosts(
                          e.target.checked ? filteredPosts.map((p) => p.id) : []
                        )
                      }
                    />
                  </th>
                  <th>Listing</th>
                  <th>Price</th>
                  <th>Type</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th className="right">Views</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((p) => (
                  <tr key={p.id} className={selectedPosts.includes(p.id) ? "selected" : ""}>
                    <td className="check">
                      <input
                        type="checkbox"
                        aria-label={`Select ${p.title}`}
                        checked={selectedPosts.includes(p.id)}
                        onChange={() => toggle(setSelectedPosts, p.id)}
                      />
                    </td>
                    <td>
                      <div className="listing">
                        <img src={p.images?.[0] || "/noavatar.jpg"} alt="" />
                        <div>
                          <Link to={`/listings/${p.id}`}>
                            {p.featured && <Star size={13} className="featuredIcon" aria-label="Featured" />}
                            {p.title}
                          </Link>
                          <span>{[p.district, p.city].filter(Boolean).join(", ")}</span>
                        </div>
                      </div>
                    </td>
                    <td className="nowrap">
                      {numberFmt.format(p.price)} DZD
                      {p.type === "rent" && <span className="sub">per month</span>}
                    </td>
                    <td>
                      <span className="pill">{p.type === "rent" ? "Rent" : "Sale"}</span>
                      <span className="sub">{formatPropertyType(p.propertyType)}</span>
                    </td>
                    <td className="muted">
                      {p.user ? <Link to={`/users/${p.user.id}`}>{p.user.username}</Link> : "Unknown"}
                      {p.agency && <span className="sub">{p.agency.tradeName}</span>}
                    </td>
                    <td>
                      <StatusPill status={p.status} />
                      {["rejected", "unpublished"].includes(p.status) && p.reviewNote && (
                        <span className="sub" title={p.reviewNote}>
                          {p.reviewNote.length > 40
                            ? `${p.reviewNote.slice(0, 40)}…`
                            : p.reviewNote}
                        </span>
                      )}
                    </td>
                    <td className="right muted">{p.postDetail?.views || 0}</td>
                    <td className="right nowrap">
                      {p.status !== "approved" && (
                        <button
                          className="iconBtn approve"
                          aria-label={`Publish ${p.title}`}
                          title="Publish"
                          disabled={reviewing.includes(p.id)}
                          onClick={() => review(p, "approve")}
                        >
                          <Check size={16} />
                        </button>
                      )}
                      {p.status !== "rejected" && (
                        <button
                          className="iconBtn"
                          aria-label={`Reject ${p.title}`}
                          title="Reject"
                          disabled={reviewing.includes(p.id)}
                          onClick={() => setRejecting(p)}
                        >
                          <X size={16} />
                        </button>
                      )}
                      <button
                        className="iconBtn"
                        aria-label={`Delete ${p.title}`}
                        title="Delete listing"
                        onClick={() => askDeletePosts([p.id])}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filteredPosts.length === 0 && (
              <p className="tableEmpty">No listings match your filters.</p>
            )}
          </div>
        </div>
      )}

      {tab === "analytics" && (
        <div className="panel">
          <div className="stats">
            <Stat value={pct(forRent, posts.length)} label="Listings for rent" />
            <Stat value={pct(agencies, users.length)} label="Users who are agencies" />
            <Stat
              value={avgSale ? `${numberFmt.format(avgSale)} DZD` : "—"}
              label="Average sale price"
            />
            <Stat
              value={posts.length ? numberFmt.format(totalViews / posts.length) : "—"}
              label="Average views per listing"
            />
          </div>

          <div className="grid2">
            <ChartCard title="Top cities" empty={!cityData.length}>
              <BarChart
                height={280}
                dataset={cityData}
                layout="horizontal"
                yAxis={[{ scaleType: "band", dataKey: "label", width: 90 }]}
                xAxis={[{ tickMinStep: 1 }]}
                series={[{ dataKey: "value", label: "Listings", color: CHART_COLORS[0] }]}
                grid={{ vertical: true }}
                hideLegend
                borderRadius={4}
              />
            </ChartCard>

            <ChartCard title="Listings by property type" empty={!typeData.length}>
              <BarChart
                height={280}
                dataset={typeData}
                layout="horizontal"
                yAxis={[{ scaleType: "band", dataKey: "label", width: 120 }]}
                xAxis={[{ tickMinStep: 1 }]}
                series={[{ dataKey: "value", label: "Listings", color: CHART_COLORS[1] }]}
                grid={{ vertical: true }}
                hideLegend
                borderRadius={4}
              />
            </ChartCard>

            <ChartCard title="For sale vs for rent" empty={!saleRentData.length}>
              <PieChart
                height={240}
                series={[
                  {
                    data: saleRentData,
                    innerRadius: 62,
                    outerRadius: 96,
                    paddingAngle: 2,
                    cornerRadius: 3,
                  },
                ]}
              />
            </ChartCard>

            <ChartCard title="Residential vs commercial" empty={!categoryData.length}>
              <PieChart
                height={240}
                series={[
                  {
                    data: categoryData,
                    innerRadius: 62,
                    outerRadius: 96,
                    paddingAngle: 2,
                    cornerRadius: 3,
                  },
                ]}
              />
            </ChartCard>
          </div>
        </div>
      )}

      {confirm && (
        <Confirm
          {...confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            confirm.run();
            setConfirm(null);
          }}
        />
      )}

      {rejecting && (
        <RejectDialog
          post={rejecting}
          onCancel={() => setRejecting(null)}
          onConfirm={async (note) => {
            if (await review(rejecting, "reject", note)) setRejecting(null);
          }}
        />
      )}

      {toast && (
        <div className={`toast ${toast.error ? "error" : ""}`} role="status">
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default AdminPage;
