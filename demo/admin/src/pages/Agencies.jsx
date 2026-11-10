import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BadgeCheck, Plus, RefreshCw, Search } from "lucide-react";
import api, { errorMessage } from "../lib/api";
import { dateFmt } from "../lib/format";
import { Field, Modal, PageHead, Spinner, StatusPill } from "../components/ui";
import UserPicker, { invalidateUsers } from "../components/UserPicker";
import AgencyFields, { EMPTY_AGENCY } from "../components/AgencyFields";

export default function Agencies() {
  const [params, setParams] = useSearchParams();
  const [agencies, setAgencies] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const creatingFor = params.get("owner");
  const [creating, setCreating] = useState(Boolean(creatingFor));

  const load = () => {
    setError("");
    api
      .get("/agencies")
      .then((res) => setAgencies(res.data))
      .catch((err) => setError(errorMessage(err, "Couldn't load agencies.")));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (agencies || []).filter(
      (a) =>
        (!status || (status === "unverified" ? a.verification !== "verified" : a.status === status)) &&
        (!q ||
          a.tradeName.toLowerCase().includes(q) ||
          a.legalName.toLowerCase().includes(q) ||
          a.rcNumber?.toLowerCase().includes(q) ||
          a.approvalNumber?.toLowerCase().includes(q) ||
          a.wilaya?.toLowerCase().includes(q))
    );
  }, [agencies, query, status]);

  return (
    <div className="admin-dashboard backoffice">
      <PageHead title="Agencies" subtitle="Registered agencies, their verification and their teams.">
        <button className="btn btn-outline btn-sm" onClick={load}>
          <RefreshCw size={15} /> Refresh
        </button>
        <Link to="/users/new?type=agency" className="btn btn-outline btn-sm">
          <Plus size={15} /> New agency account
        </Link>
        <button className="btn btn-dark btn-sm" onClick={() => setCreating(true)}>
          <Plus size={15} /> Agency for existing account
        </button>
      </PageHead>

      <div className="toolbar">
        <label className="searchBox">
          <Search size={16} />
          <input placeholder="Search name, RC, agrément or wilaya" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter">
          <option value="">All agencies</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="unverified">Not verified</option>
        </select>
      </div>

      {error && <p className="error-text">{error}</p>}
      {!agencies && !error ? (
        <Spinner />
      ) : (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Agency</th>
                <th>Owner</th>
                <th>Agrément</th>
                <th>Location</th>
                <th className="right">Team</th>
                <th className="right">Live / total</th>
                <th>Status</th>
                <th>Since</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="person">
                      <img src={a.logo || a.owner?.avatar || "/noavatar.jpg"} alt="" />
                      <div>
                        <Link to={`/agencies/${a.id}`} className="rowLink">
                          {a.tradeName}
                          {a.verification === "verified" && <BadgeCheck size={14} className="verifiedIcon" aria-label="Verified" />}
                        </Link>
                        <span>{a.legalName}</span>
                      </div>
                    </div>
                  </td>
                  <td className="muted">
                    {a.owner ? <Link to={`/users/${a.owner.id}`}>{a.owner.username}</Link> : <span className="error-text">No owner</span>}
                  </td>
                  <td className="muted">
                    {a.approvalNumber || "—"}
                    {a.approvalExpiryDate && <span className="sub">until {dateFmt(a.approvalExpiryDate)}</span>}
                  </td>
                  <td className="muted">{[a.commune, a.wilaya].filter(Boolean).join(", ") || "—"}</td>
                  <td className="right">{a._count.members}</td>
                  <td className="right">
                    {a.liveListings} / {a._count.posts}
                  </td>
                  <td>
                    <StatusPill status={a.status} />
                  </td>
                  <td className="muted nowrap">{dateFmt(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="tableEmpty">No agencies match.</p>}
        </div>
      )}

      {creating && (
        <CreateAgencyDialog
          ownerId={creatingFor ? Number(creatingFor) : null}
          onClose={() => {
            setCreating(false);
            if (creatingFor) setParams({});
          }}
        />
      )}
    </div>
  );
}

function CreateAgencyDialog({ ownerId: initialOwner, onClose }) {
  const navigate = useNavigate();
  const [ownerId, setOwnerId] = useState(initialOwner);
  const [agency, setAgency] = useState(EMPTY_AGENCY);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/agencies", { ...agency, ownerId, verified });
      invalidateUsers();
      navigate(`/agencies/${data.id}`);
    } catch (err) {
      setError(errorMessage(err, "Couldn't create the agency."));
      setBusy(false);
    }
  };

  return (
    <Modal title="Create an agency for an existing account" onClose={onClose} wide>
      <form onSubmit={submit} className="stack">
        <p className="muted small">The account becomes the agency's main account. Its listings move under the agency. No new account is created.</p>
        <Field label="Owner account" htmlFor="owner" required>
          <UserPicker id="owner" value={ownerId} onChange={setOwnerId} filter={(u) => !u.agencyId && u.role !== "admin"} />
        </Field>
        <AgencyFields value={agency} onChange={setAgency} />
        <label className="checkRow">
          <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} /> Mark as verified (documents already checked)
        </label>
        {error && <p className="error-text">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn-link" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-dark btn-sm" disabled={busy || !ownerId}>
            {busy ? "Creating…" : "Create agency"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
