import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Ban, BadgeCheck, Pencil, Plus, RotateCcw, UserCheck, UserMinus, UserX } from "lucide-react";
import api, { errorMessage } from "../lib/api";
import { AGENCY_ROLE_LABEL, APPLICATION_STATUS, AVAILABILITY_LABEL, dateFmt, dateTime, numberFmt } from "../lib/format";
import { BackLink, Confirm, Field, Modal, PageHead, PromptDialog, Spinner, StatusPill, useToast } from "../components/ui";
import DocumentList from "../components/DocumentList";
import UserPicker, { invalidateUsers } from "../components/UserPicker";
import AgencyFields, { agencyToForm } from "../components/AgencyFields";
import NotFound from "./NotFound";

const FACTS = [
  ["legalName", "Legal name"],
  ["legalForm", "Structure"],
  ["entityType", "Type"],
  ["rcNumber", "RC"],
  ["nif", "NIF"],
  ["nis", "NIS"],
  ["articleImposition", "Article d'imposition"],
  ["address", "Address"],
  ["commune", "Commune"],
  ["wilaya", "Wilaya"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["website", "Website"],
  ["repFullName", "Representative"],
  ["repPosition", "Position"],
  ["approvalNumber", "Agrément"],
  ["approvalWilaya", "Issued in"],
  ["approvalIssueDate", "Issued"],
  ["approvalExpiryDate", "Expires"],
];

export default function AgencyDetail() {
  const { id } = useParams();
  const [agency, setAgency] = useState(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [toast, notify] = useToast();

  const load = useCallback(() => {
    api
      .get(`/agencies/${id}`)
      .then((res) => setAgency(res.data))
      .catch((err) => {
        if ([400, 404].includes(err.response?.status)) setMissing(true);
        else setError(errorMessage(err, "Couldn't load the agency."));
      });
  }, [id]);
  useEffect(load, [load]);

  if (missing) return <NotFound />;
  if (error) return <p className="error-text">{error}</p>;
  if (!agency) return <Spinner />;

  const run = async (fn, success) => {
    try {
      await fn();
      notify(success);
      invalidateUsers();
      load();
      return true;
    } catch (err) {
      notify(errorMessage(err), true);
      return false;
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (await run(() => api.put(`/agencies/${agency.id}`, form), "Agency saved.")) setForm(null);
    setSaving(false);
  };

  const fact = (k) => {
    const v = agency[k];
    if (!v) return <span className="muted">—</span>;
    if (k.endsWith("Date")) return dateFmt(v);
    if (k === "entityType") return v === "legal_entity" ? "Company" : "Natural person";
    if (k === "website") return <a href={v} target="_blank" rel="noreferrer">{v}</a>;
    return v;
  };
  const expired = agency.approvalExpiryDate && new Date(agency.approvalExpiryDate) < new Date();

  return (
    <div className="admin-dashboard listingPage backoffice">
      <BackLink to="/agencies">All agencies</BackLink>
      <PageHead
        title={
          <span className="titleLine">
            {agency.logo && <img className="headAvatar" src={agency.logo} alt="" />}
            {agency.tradeName}
            {agency.verification === "verified" && <BadgeCheck size={20} className="verifiedIcon" aria-label="Verified" />}
            {agency.verification === "revoked" && <StatusPill status="revoked" label="Verification revoked" />}
            <StatusPill status={agency.status} />
          </span>
        }
        subtitle={`Agency #${agency.id} · created ${dateFmt(agency.createdAt)} · updated ${dateTime(agency.updatedAt)}${
          agency.verifiedAt ? ` · verified ${dateFmt(agency.verifiedAt)}` : ""
        }`}
      >
        {agency.verification === "verified" ? (
          <button className="btn btn-outline btn-sm" onClick={() => setDialog("revoke")}>
            <BadgeCheck size={15} /> Revoke verification
          </button>
        ) : (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => run(() => api.put(`/agencies/${agency.id}/verify`, { verification: "verified" }), "Agency verified.")}
          >
            <BadgeCheck size={15} /> Verify agency
          </button>
        )}
        {agency.status === "active" ? (
          <button className="btn btn-outline btn-sm" onClick={() => setDialog("suspend")}>
            <Ban size={15} /> Suspend
          </button>
        ) : (
          <button className="btn btn-dark btn-sm" onClick={() => run(() => api.put(`/agencies/${agency.id}/status`, { status: "active" }), "Agency reactivated.")}>
            <RotateCcw size={15} /> Reactivate
          </button>
        )}
      </PageHead>

      {agency.status === "suspended" && (
        <div className="callout bad">
          <strong>Suspended: its listings are hidden from the marketplace</strong>
          <p>{agency.statusReason}</p>
        </div>
      )}
      {expired && (
        <div className="callout warn">
          <strong>The agrément expired on {dateFmt(agency.approvalExpiryDate)}</strong>
          <p>Ask the agency for its renewed agrément, or suspend it until it's renewed.</p>
        </div>
      )}

      <div className="detailGrid">
        <div className="detailMain">
          <section className="card">
            <div className="cardHead">
              <h2>Legal record</h2>
              {!form && (
                <button className="btn btn-outline btn-sm" onClick={() => setForm(agencyToForm(agency))}>
                  <Pencil size={14} /> Edit
                </button>
              )}
            </div>
            {form ? (
              <form onSubmit={save} className="stack">
                <AgencyFields value={form} onChange={setForm} />
                <div className="formActions">
                  <button type="button" className="btn-link" onClick={() => setForm(null)}>
                    Cancel
                  </button>
                  <button className="btn btn-dark btn-sm" disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            ) : (
              <dl className="facts wide">
                {FACTS.map(([k, label]) => (
                  <div key={k}>
                    <dt>{label}</dt>
                    <dd>{fact(k)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <section className="card">
            <div className="cardHead">
              <h2>Team ({agency.members.length})</h2>
              <div className="headActions">
                <Link className="btn btn-outline btn-sm" to={`/users/new?type=agent&agency=${agency.id}`}>
                  <Plus size={14} /> New agent account
                </Link>
                <button className="btn btn-dark btn-sm" onClick={() => setDialog("addMember")}>
                  <Plus size={14} /> Add existing account
                </button>
              </div>
            </div>
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th className="right">Listings</th>
                    <th>Last sign-in</th>
                    <th className="right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agency.members.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="person">
                          <img src={m.avatar || "/noavatar.jpg"} alt="" />
                          <div>
                            <Link to={`/users/${m.id}`} className="rowLink">
                              {m.username}
                            </Link>
                            <span>{m.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <select
                          className="roleSelect"
                          value={m.agencyRole}
                          aria-label={`Role of ${m.username}`}
                          disabled={m.agencyRole === "owner"}
                          onChange={(e) => {
                            const agencyRole = e.target.value;
                            if (agencyRole === "owner") setDialog({ transfer: m });
                            else run(() => api.put(`/agencies/${agency.id}/members/${m.id}`, { agencyRole }), `${m.username} is now ${agencyRole}.`);
                          }}
                        >
                          {Object.entries(AGENCY_ROLE_LABEL).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <StatusPill status={m.status} />
                        {!m.agencyActive && <span className="sub">Agency access off</span>}
                      </td>
                      <td className="right">{m._count.posts}</td>
                      <td className="muted nowrap">{m.lastLoginAt ? dateFmt(m.lastLoginAt) : "Never"}</td>
                      <td className="right">
                        {m.agencyRole !== "owner" && (
                          <button
                            className="iconBtn"
                            title={m.agencyActive ? "Switch off agency access" : "Restore agency access"}
                            aria-label={`${m.agencyActive ? "Switch off" : "Restore"} agency access for ${m.username}`}
                            onClick={() =>
                              run(
                                () => api.put(`/agencies/${agency.id}/members/${m.id}`, { active: !m.agencyActive }),
                                m.agencyActive ? `${m.username} can no longer use the agency platform.` : `${m.username}'s agency access is back.`
                              )
                            }
                          >
                            {m.agencyActive ? <UserX size={16} /> : <UserCheck size={16} />}
                          </button>
                        )}
                        {m.agencyRole !== "owner" && (
                          <button className="iconBtn" title="Remove from agency" aria-label={`Remove ${m.username}`} onClick={() => setDialog({ remove: m })}>
                            <UserMinus size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!agency.owner && <p className="error-text">This agency has no owner. Make a member the owner, or add one.</p>}
          </section>

          <section className="card">
            <div className="cardHead">
              <h2>Listings ({agency.posts.length})</h2>
              {agency.owner && (
                <Link to={`/listings/new?user=${agency.owner.id}`} className="btn btn-outline btn-sm">
                  <Plus size={14} /> New listing
                </Link>
              )}
            </div>
            {agency.posts.length === 0 ? (
              <p className="muted small">No listings yet.</p>
            ) : (
              <ul className="miniList">
                {agency.posts.map((p) => (
                  <li key={p.id}>
                    <img src={p.images?.[0] || "/noavatar.jpg"} alt="" />
                    <div>
                      <Link to={`/listings/${p.id}`}>{p.title}</Link>
                      <span>
                        {numberFmt.format(p.price)} DZD · {p.city} · {AVAILABILITY_LABEL[p.availability]} · {p.user ? `by ${p.user.username}` : "unassigned"}
                      </span>
                    </div>
                    <StatusPill status={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <h2>Documents</h2>
            <DocumentList
              documents={agency.documents}
              uploadUrl={`/agencies/${agency.id}/documents`}
              onChange={load}
              notify={notify}
              onDelete={(d) => (d.applicationId ? notify("Documents from an application are kept as a record.", true) : setDialog({ deleteDoc: d }))}
              empty="No documents on file."
            />
          </section>
        </div>

        <aside className="detailSide">
          <section className="card">
            <h2>Applications</h2>
            {agency.applications.length === 0 ? (
              <p className="muted small">Created directly by the team.</p>
            ) : (
              agency.applications.map((a) => (
                <div key={a.id} className="appHistory">
                  <p>
                    <Link to={`/applications/${a.id}`}>Application #{a.id}</Link> <StatusPill status={a.status} kind="application" />
                  </p>
                  <ol className="timeline">
                    {a.events
                      .filter((e) => e.type === "status")
                      .map((e) => (
                        <li key={e.id}>
                          <strong>{APPLICATION_STATUS[e.toStatus]}</strong>
                          {e.message && <p>{e.message}</p>}
                          <small>{dateTime(e.createdAt)}</small>
                        </li>
                      ))}
                  </ol>
                </div>
              ))
            )}
          </section>
          <section className="card">
            <h2>Change history</h2>
            {agency.history.length === 0 ? (
              <p className="muted small">No changes recorded.</p>
            ) : (
              <ol className="timeline">
                {agency.history.map((h) => (
                  <li key={h.id}>
                    <strong>{h.summary}</strong>
                    <small>
                      {h.actor?.username || "System"} · {dateTime(h.createdAt)}
                    </small>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>

      {dialog === "suspend" && (
        <PromptDialog
          title={`Suspend ${agency.tradeName}?`}
          body="All of its listings are hidden from the marketplace and the team can't manage the agency until you reactivate it. The owner is notified with the reason."
          suggestions={["The agrément has expired.", "Legal documents could not be verified.", "Repeated fraudulent listings."]}
          placeholder="Reason"
          confirmLabel="Suspend agency"
          danger
          onCancel={() => setDialog(null)}
          onConfirm={(reason) => run(() => api.put(`/agencies/${agency.id}/status`, { status: "suspended", reason }), "Agency suspended.").then(() => setDialog(null))}
        />
      )}
      {dialog === "revoke" && (
        <PromptDialog
          title={`Revoke ${agency.tradeName}'s verification?`}
          body="Its listings stay online, but the verified badge disappears everywhere at once. The reason is kept in the agency's history and sent to the owner."
          suggestions={["The agrément has expired.", "Legal documents could not be verified.", "Misleading listings."]}
          placeholder="Reason"
          confirmLabel="Revoke verification"
          danger
          onCancel={() => setDialog(null)}
          onConfirm={(reason) =>
            run(() => api.put(`/agencies/${agency.id}/verify`, { verification: "revoked", reason }), "Verification revoked.").then(() => setDialog(null))
          }
        />
      )}
      {dialog === "addMember" && <AddMemberDialog agency={agency} onClose={() => setDialog(null)} run={run} />}
      {dialog?.remove && (
        <Confirm
          title={`Remove ${dialog.remove.username} from ${agency.tradeName}?`}
          body={
            agency.owner
              ? `They keep their account. The agency's listings they manage move to ${agency.owner.username}, the owner.`
              : "They keep their account. With no owner to take them, the agency's listings they manage go back to review without the agency."
          }
          confirmLabel="Remove"
          danger
          onCancel={() => setDialog(null)}
          onConfirm={() => run(() => api.delete(`/agencies/${agency.id}/members/${dialog.remove.id}`), "Member removed.").then(() => setDialog(null))}
        />
      )}
      {dialog?.transfer && (
        <Confirm
          title={`Make ${dialog.transfer.username} the owner?`}
          body={`They become the agency's main account.${agency.owner ? ` ${agency.owner.username} stays on the team as a manager.` : ""}`}
          confirmLabel="Transfer ownership"
          onCancel={() => setDialog(null)}
          onConfirm={() => run(() => api.put(`/agencies/${agency.id}/members/${dialog.transfer.id}`, { agencyRole: "owner" }), "Ownership transferred.").then(() => setDialog(null))}
        />
      )}
      {dialog?.deleteDoc && (
        <Confirm
          title="Delete this document?"
          body={dialog.deleteDoc.originalName}
          confirmLabel="Delete"
          danger
          onCancel={() => setDialog(null)}
          onConfirm={() => run(() => api.delete(`/documents/${dialog.deleteDoc.id}`), "Document deleted.").then(() => setDialog(null))}
        />
      )}
      {toast}
    </div>
  );
}

function AddMemberDialog({ agency, onClose, run }) {
  const [userId, setUserId] = useState(null);
  const [agencyRole, setAgencyRole] = useState("agent");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={`Add to ${agency.tradeName}`} onClose={onClose}>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          if (await run(() => api.post(`/agencies/${agency.id}/members`, { userId, agencyRole }), "Member added.")) onClose();
          setBusy(false);
        }}
      >
        <p className="muted small">The existing account joins the agency; nothing is duplicated. If they're in another agency, they move.</p>
        <Field label="Account" htmlFor="member" required>
          <UserPicker id="member" value={userId} onChange={setUserId} filter={(u) => u.role !== "admin" && u.agencyId !== agency.id && u.agencyRole !== "owner"} />
        </Field>
        <Field label="Role" htmlFor="memberRole">
          <select id="memberRole" value={agencyRole} onChange={(e) => setAgencyRole(e.target.value)}>
            <option value="agent">Agent</option>
            <option value="manager">Manager</option>
          </select>
        </Field>
        <div className="modal-actions">
          <button type="button" className="btn-link" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-dark btn-sm" disabled={!userId || busy}>
            Add member
          </button>
        </div>
      </form>
    </Modal>
  );
}
