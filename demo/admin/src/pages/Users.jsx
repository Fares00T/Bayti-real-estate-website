import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Download, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import api, { errorMessage } from "../lib/api";
import { useAdmin } from "../lib/auth";
import { ROLE_LABEL, accountType, dateFmt, downloadCsv } from "../lib/format";
import { Confirm, PageHead, Spinner, StatusPill, useToast } from "../components/ui";

export default function Users() {
  const { admin } = useAdmin();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState([]);
  const [confirm, setConfirm] = useState(false);
  const [toast, notify] = useToast();

  const load = () => {
    setError("");
    api
      .get("/users")
      .then((res) => setUsers(res.data))
      .catch((err) => setError(errorMessage(err, "Couldn't load users.")));
    setSelected([]);
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users || []).filter(
      (u) =>
        (!role || accountType(u) === role) &&
        (!status || u.status === status) &&
        (!q ||
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.agency?.tradeName?.toLowerCase().includes(q) ||
          u.phone?.includes(q))
    );
  }, [users, query, role, status]);

  // Admin accounts and your own can't be bulk-deleted
  const selectable = filtered.filter((u) => u.id !== admin?.id && u.role !== "admin");

  const removeSelected = async () => {
    const results = await Promise.allSettled(selected.map((id) => api.delete(`/users/${id}`, { data: { confirm: true } })));
    const failed = results.filter((r) => r.status === "rejected");
    setConfirm(false);
    notify(
      failed.length ? `${results.length - failed.length} deleted, ${failed.length} failed: ${errorMessage(failed[0].reason)}` : `${results.length} account(s) deleted.`,
      failed.length > 0
    );
    load();
  };

  const exportCsv = () =>
    downloadCsv(
      filtered.map((u) => ({
        ID: u.id,
        Username: u.username,
        Email: u.email,
        Type: ROLE_LABEL[accountType(u)],
        Status: u.status,
        Verified: u.verified ? "yes" : "no",
        Agency: u.agency?.tradeName || "",
        Phone: u.phone || "",
        Listings: u._count?.posts || 0,
        Joined: new Date(u.createdAt).toISOString().slice(0, 10),
        LastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString().slice(0, 10) : "",
      })),
      "bayti-users.csv"
    );

  return (
    <div className="admin-dashboard backoffice">
      <PageHead title="Users" subtitle="Every account on Bayti: individuals, agents, agency owners and staff.">
        <button className="btn btn-outline btn-sm" onClick={load}>
          <RefreshCw size={15} /> Refresh
        </button>
        <Link to="/users/new" className="btn btn-dark btn-sm">
          <Plus size={15} /> New account
        </Link>
      </PageHead>

      <div className="toolbar">
        <label className="searchBox">
          <Search size={16} />
          <input placeholder="Search name, email, agency or phone" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <select className="select" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by account type">
          <option value="">All types</option>
          {Object.entries(ROLE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deactivated">Deactivated</option>
        </select>
        <div className="spacer" />
        {selected.length > 0 && (
          <button className="btn btn-sm btn-danger-solid" onClick={() => setConfirm(true)}>
            <Trash2 size={15} /> Delete {selected.length}
          </button>
        )}
        <button className="btn btn-outline btn-sm" onClick={exportCsv} disabled={!filtered.length}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {!users && !error ? (
        <Spinner />
      ) : (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th className="check">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={selectable.length > 0 && selected.length === selectable.length}
                    onChange={(e) => setSelected(e.target.checked ? selectable.map((u) => u.id) : [])}
                  />
                </th>
                <th>Account</th>
                <th>Type</th>
                <th>Agency</th>
                <th>Status</th>
                <th className="right">Listings</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const canSelect = selectable.some((s) => s.id === u.id);
                return (
                  <tr key={u.id} className={selected.includes(u.id) ? "selected" : ""}>
                    <td className="check">
                      <input
                        type="checkbox"
                        aria-label={`Select ${u.username}`}
                        disabled={!canSelect}
                        checked={selected.includes(u.id)}
                        onChange={() => setSelected((s) => (s.includes(u.id) ? s.filter((x) => x !== u.id) : [...s, u.id]))}
                      />
                    </td>
                    <td>
                      <div className="person">
                        <img src={u.avatar || "/noavatar.jpg"} alt="" />
                        <div>
                          <Link to={`/users/${u.id}`} className="rowLink">
                            {u.username}
                            {u.verified && <BadgeCheck size={14} className="verifiedIcon" aria-label="Verified" />}
                            {u.id === admin?.id && <span className="you"> (you)</span>}
                          </Link>
                          <span>{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="muted">
                      {ROLE_LABEL[accountType(u)]}
                      {accountType(u) === "agent" && <span className="sub">{u.agencyRole}</span>}
                    </td>
                    <td className="muted">{u.agency ? <Link to={`/agencies/${u.agency.id}`}>{u.agency.tradeName}</Link> : "—"}</td>
                    <td>
                      <StatusPill status={u.status} />
                    </td>
                    <td className="right muted">{u._count?.posts || 0}</td>
                    <td className="muted nowrap">{dateFmt(u.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="tableEmpty">No accounts match.</p>}
        </div>
      )}

      {confirm && (
        <Confirm
          title={`Delete ${selected.length} account(s)?`}
          body="Their listings, saved homes, chats and uploaded documents are deleted too. Agencies they own are suspended. This can't be undone."
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirm(false)}
          onConfirm={removeSelected}
        />
      )}
      {toast}
    </div>
  );
}
