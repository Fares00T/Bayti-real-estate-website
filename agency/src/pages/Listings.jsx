import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Archive, Eye, EyeOff, Home, Pencil, Plus, Search, Trash2 } from "lucide-react";
import api, { errorMessage, notifyDataChanged } from "../lib/api";
import { useMember } from "../lib/auth";
import { formatPropertyType, numberFmt, place } from "../lib/format";
import { Confirm, Empty, PageHead, Spinner, StatusPill, useToast } from "../components/ui";
import "./dashboard.scss";

const STATES = [
  ["", "Any state"],
  ["published", "Published"],
  ["pending", "In review"],
  ["rejected", "Rejected"],
  ["offline", "Offline"],
  ["taken_down", "Taken down by Bayti"],
  ["archived", "Archived"],
];

export default function Listings() {
  const { member, can } = useMember();
  const [params, setParams] = useSearchParams();
  const [posts, setPosts] = useState(null);
  const [team, setTeam] = useState([]);
  const [query, setQuery] = useState(params.get("q") || "");
  const [confirm, setConfirm] = useState(null);
  const [toast, notify] = useToast();
  const leads = can("listings.all");
  const writable = member.agency.status === "active";

  const filters = { state: params.get("state") || "", type: params.get("type") || "", agent: params.get("agent") || "", q: params.get("q") || "" };
  const setFilter = (k, v) => {
    const next = new URLSearchParams(params);
    v ? next.set(k, v) : next.delete(k);
    setParams(next, { replace: true });
  };

  const load = useCallback(
    () =>
      api
        .get("/listings", { params: Object.fromEntries(params) })
        .then((res) => setPosts(res.data))
        .catch((err) => {
          setPosts([]);
          notify(errorMessage(err, "Couldn't load the listings."), true);
        }),
    [params, notify]
  );
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (can("team.view")) api.get("/team").then((res) => setTeam(res.data)).catch(() => {});
  }, [can]);

  // Search waits for a pause in typing
  useEffect(() => {
    const t = setTimeout(() => query !== filters.q && setFilter("q", query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (fn, ok) => {
    try {
      await fn();
      notify(ok);
      notifyDataChanged();
      load();
    } catch (err) {
      notify(errorMessage(err), true);
    }
  };
  const setOnline = (p, online) =>
    act(() => api.put(`/listings/${p.id}/visibility`, { online }), online ? "Back on the market." : "Taken off the market.");
  const archive = (p) =>
    setConfirm({
      title: `Archive “${p.title}”?`,
      body: "It leaves the marketplace and stays in your records. Restoring it later sends it back to review.",
      confirmLabel: "Archive",
      run: () => act(() => api.put(`/listings/${p.id}/archive`, { archived: true }), "Listing archived."),
    });
  const remove = (p) =>
    setConfirm({
      title: `Delete “${p.title}”?`,
      body: "This permanently removes the listing and its photos; inquiries about it stay in your records. Archive it instead to keep the listing.",
      confirmLabel: "Delete",
      danger: true,
      run: () => act(() => api.delete(`/listings/${p.id}`), "Listing deleted."),
    });

  const filtered = Object.values(filters).some(Boolean);

  return (
    <div className="workspace backoffice">
      <PageHead
        title="Listings"
        subtitle={leads ? "Every property your agency lists on Bayti." : "The properties assigned to you."}
      >
        {writable && (
          <Link to="/listings/new" className="btn btn-dark btn-sm">
            <Plus size={15} /> New listing
          </Link>
        )}
      </PageHead>

      <div className="panel">
        <div className="toolbar">
          <label className="searchBox">
            <Search size={16} />
            <input placeholder="Search title, wilaya or district" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search listings" />
          </label>
          <select className="select" value={filters.state} onChange={(e) => setFilter("state", e.target.value)} aria-label="Filter by state">
            {STATES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select className="select" value={filters.type} onChange={(e) => setFilter("type", e.target.value)} aria-label="Filter by offer">
            <option value="">Sale and rent</option>
            <option value="buy">For sale</option>
            <option value="rent">For rent</option>
          </select>
          {leads && team.length > 1 && (
            <select className="select" value={filters.agent} onChange={(e) => setFilter("agent", e.target.value)} aria-label="Filter by agent">
              <option value="">Every agent</option>
              <option value="none">Unassigned</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.username}
                </option>
              ))}
            </select>
          )}
        </div>

        {!posts ? (
          <Spinner />
        ) : posts.length === 0 ? (
          <Empty icon={Home} title={filtered ? "No listings match these filters" : "No listings yet"}>
            {filtered ? "Try another state or clear the search." : "Create your first listing. The Bayti team reviews it before it goes live."}
          </Empty>
        ) : (
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Listing</th>
                  <th>Price</th>
                  {leads && <th>Agent</th>}
                  <th>State</th>
                  <th className="right">Views</th>
                  <th className="right">Inquiries</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="listing">
                        <img src={p.images?.[0] || "/noavatar.jpg"} alt="" />
                        <div>
                          <Link to={`/listings/${p.id}`}>{p.title}</Link>
                          <span>
                            {place(p)} · {p.type === "rent" ? "Rent" : "Sale"} · {formatPropertyType(p.propertyType)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="nowrap">
                      {numberFmt.format(p.price)} DZD
                      {p.type === "rent" && <span className="sub">per month</span>}
                    </td>
                    {leads && (
                      <td className="muted">
                        {p.user ? (can("team.view") ? <Link to={`/team/${p.user.id}`}>{p.user.username}</Link> : p.user.username) : <em className="muted">Unassigned</em>}
                      </td>
                    )}
                    <td>
                      <StatusPill status={p.state} />
                      {p.state === "rejected" && p.reviewNote && (
                        <span className="sub" title={p.reviewNote}>
                          {p.reviewNote.length > 40 ? `${p.reviewNote.slice(0, 40)}…` : p.reviewNote}
                        </span>
                      )}
                    </td>
                    <td className="right muted">{p.postDetail?.views || 0}</td>
                    <td className="right muted">{p._count.tourRequests}</td>
                    <td className="right nowrap">
                      {writable && (
                        <span className="rowActions">
                          <Link className="iconBtn" to={`/listings/${p.id}/edit`} aria-label={`Edit ${p.title}`} title="Edit">
                            <Pencil size={16} />
                          </Link>
                          {p.state === "published" && (
                            <button className="iconBtn" onClick={() => setOnline(p, false)} aria-label={`Take ${p.title} offline`} title="Take offline">
                              <EyeOff size={16} />
                            </button>
                          )}
                          {p.state === "offline" && (
                            <button className="iconBtn" onClick={() => setOnline(p, true)} aria-label={`Put ${p.title} back online`} title="Put back online">
                              <Eye size={16} />
                            </button>
                          )}
                          {p.state !== "archived" && (
                            <button className="iconBtn" onClick={() => archive(p)} aria-label={`Archive ${p.title}`} title="Archive">
                              <Archive size={16} />
                            </button>
                          )}
                          <button className="iconBtn" onClick={() => remove(p)} aria-label={`Delete ${p.title}`} title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirm && (
        <Confirm
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            await confirm.run();
            setConfirm(null);
          }}
        />
      )}
      {toast}
    </div>
  );
}
