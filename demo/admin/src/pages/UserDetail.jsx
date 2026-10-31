import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BadgeCheck, Ban, Copy, KeyRound, Loader2, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import api, { errorMessage } from "../lib/api";
import { useAdmin } from "../lib/auth";
import { AGENCY_ROLE_LABEL, AVAILABILITY_LABEL, ROLE_LABEL, accountType, dateFmt, dateTime, numberFmt } from "../lib/format";
import { BackLink, Confirm, Field, Modal, PageHead, PromptDialog, Spinner, StatusPill, useToast } from "../components/ui";
import DocumentList from "../components/DocumentList";
import { uploadImage, UPLOADS_ENABLED } from "../components/ImageManager";
import { invalidateUsers } from "../components/UserPicker";
import NotFound from "./NotFound";

const PROFILE = ["username", "email", "phone", "avatar"];

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { admin } = useAdmin();
  const [user, setUser] = useState(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [roleForm, setRoleForm] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [resetLink, setResetLink] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [toast, notify] = useToast();

  const load = useCallback(() => {
    api
      .get(`/users/${id}`)
      .then((res) => setUser(res.data))
      .catch((err) => {
        if ([400, 404].includes(err.response?.status)) setMissing(true);
        else setError(errorMessage(err, "Couldn't load the account."));
      });
  }, [id]);
  useEffect(load, [load]);
  useEffect(() => {
    api.get("/agencies").then((res) => setAgencies(res.data)).catch(() => {});
  }, []);

  if (missing) return <NotFound />;
  if (error) return <p className="error-text">{error}</p>;
  if (!user) return <Spinner />;

  const isSelf = user.id === admin?.id;
  const run = async (fn, success) => {
    try {
      await fn();
      if (success) notify(success);
      invalidateUsers();
      load();
      return true;
    } catch (err) {
      notify(errorMessage(err), true);
      return false;
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    const ok = await run(() => api.put(`/users/${user.id}`, form), "Account saved.");
    setSaving(false);
    if (ok) setForm(null);
  };

  const saveRole = async (e) => {
    e.preventDefault();
    const ok = await run(() => api.put(`/users/${user.id}/role`, roleForm), "Account type changed.");
    if (ok) setRoleForm(null);
  };

  const setStatus = (status, reason) =>
    run(() => api.put(`/users/${user.id}/status`, { status, reason }), status === "active" ? "Account reactivated." : `Account ${status}.`).then(() => setDialog(null));

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="admin-dashboard listingPage backoffice">
      <BackLink to="/users">All users</BackLink>
      <PageHead
        title={
          <span className="titleLine">
            <img className="headAvatar" src={user.avatar || "/noavatar.jpg"} alt="" />
            {user.username}
            {user.verified && <BadgeCheck size={20} className="verifiedIcon" aria-label="Verified" />}
            <StatusPill status={user.status} />
          </span>
        }
        subtitle={`${ROLE_LABEL[accountType(user)]}${user.agency ? ` at ${user.agency.tradeName}` : ""} · joined ${dateFmt(user.createdAt)} · last sign-in ${
          user.lastLoginAt ? dateTime(user.lastLoginAt) : "never"
        }`}
      >
        {!isSelf && (
          <>
            <button className="btn btn-outline btn-sm" onClick={() => setDialog("password")}>
              <KeyRound size={15} /> Password
            </button>
            {user.status === "active" ? (
              <button className="btn btn-outline btn-sm" onClick={() => setDialog("suspend")}>
                <Ban size={15} /> Suspend
              </button>
            ) : (
              <button className="btn btn-dark btn-sm" onClick={() => setStatus("active")}>
                <RotateCcw size={15} /> Reactivate
              </button>
            )}
          </>
        )}
      </PageHead>

      {user.status !== "active" && user.statusReason && (
        <div className="callout bad">
          <strong>{user.status === "suspended" ? "Suspended" : "Deactivated"}</strong>
          <p>{user.statusReason}</p>
        </div>
      )}

      <div className="detailGrid">
        <div className="detailMain">
          <section className="card">
            <div className="cardHead">
              <h2>Profile</h2>
              {!form && (
                <button className="btn btn-outline btn-sm" onClick={() => setForm(Object.fromEntries(PROFILE.map((k) => [k, user[k] || ""])))}>
                  <Pencil size={14} /> Edit
                </button>
              )}
            </div>
            {form ? (
              <form className="formGrid" onSubmit={saveProfile}>
                <Field label="Username" htmlFor="username" required>
                  <input id="username" value={form.username} onChange={set("username")} required minLength={3} />
                </Field>
                <Field label="Email" htmlFor="email" required>
                  <input id="email" type="email" value={form.email} onChange={set("email")} required />
                </Field>
                <Field label="Phone" htmlFor="phone">
                  <input id="phone" value={form.phone} onChange={set("phone")} />
                </Field>
                <Field label="Profile picture" htmlFor="avatarFile" span={2}>
                  <div className="avatarRow">
                    <img src={form.avatar || "/noavatar.jpg"} alt="" />
                    <label className={`btn btn-outline btn-sm ${!UPLOADS_ENABLED || uploading ? "disabled" : ""}`}>
                      {uploading && <Loader2 size={15} className="spin" />}
                      {form.avatar ? "Replace" : "Upload"}
                      <input
                        id="avatarFile"
                        type="file"
                        hidden
                        accept="image/jpeg,image/png,image/webp"
                        disabled={!UPLOADS_ENABLED || uploading}
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          setUploading(true);
                          try {
                            const url = await uploadImage(file, "avatars");
                            setForm((f) => ({ ...f, avatar: url }));
                          } catch (err) {
                            notify(err.message, true);
                          } finally {
                            setUploading(false);
                          }
                        }}
                      />
                    </label>
                    {form.avatar && (
                      <button type="button" className="btn-link" onClick={() => setForm((f) => ({ ...f, avatar: "" }))}>
                        Remove
                      </button>
                    )}
                  </div>
                </Field>
                <div className="formActions span2">
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
                <div>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${user.email}`}>{user.email}</a>
                  </dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{user.phone || "—"}</dd>
                </div>
                <div>
                  <dt>Verified</dt>
                  <dd>
                    {user.verified ? "Yes" : "No"}{" "}
                    <button className="btn-link small" onClick={() => run(() => api.put(`/users/${user.id}`, { verified: !user.verified }), user.verified ? "Verification removed." : "Marked verified.")}>
                      {user.verified ? "Remove" : "Verify"}
                    </button>
                  </dd>
                </div>
                <div>
                  <dt>Last updated</dt>
                  <dd>{dateTime(user.updatedAt)}</dd>
                </div>
              </dl>
            )}
          </section>

          <section className="card">
            <div className="cardHead">
              <h2>Listings ({user.posts.length})</h2>
              <Link to={`/listings/new?user=${user.id}`} className="btn btn-outline btn-sm">
                <Plus size={14} /> New listing for this account
              </Link>
            </div>
            {user.posts.length === 0 ? (
              <p className="muted small">No listings.</p>
            ) : (
              <ul className="miniList">
                {user.posts.map((p) => (
                  <li key={p.id}>
                    <img src={p.images?.[0] || "/noavatar.jpg"} alt="" />
                    <div>
                      <Link to={`/listings/${p.id}`}>{p.title}</Link>
                      <span>
                        {numberFmt.format(p.price)} DZD · {p.city} · {AVAILABILITY_LABEL[p.availability]} · updated {dateFmt(p.updatedAt)}
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
              documents={user.documents}
              uploadUrl={`/users/${user.id}/documents`}
              onChange={load}
              notify={notify}
              onDelete={(d) => setDialog({ deleteDoc: d })}
              empty="No documents on this account."
            />
          </section>

          <section className="card">
            <h2>Account activity</h2>
            <ul className="activity">
              <li>Saved {user._count.savedPosts} listing(s)</li>
              <li>{user._count.chats} conversation(s)</li>
              <li>
                {user._count.inquiries} inquiry(ies) sent · {user._count.inquiriesAssigned} assigned to them
              </li>
              <li>
                Reported others {user._count.reportsFiled} time(s) · reported {user._count.reportsAgainst} time(s)
              </li>
            </ul>
            <h3>History</h3>
            {user.activity.length === 0 ? (
              <p className="muted small">Nothing recorded yet.</p>
            ) : (
              <ol className="timeline">
                {user.activity.map((a) => (
                  <li key={a.id}>
                    <strong>{a.summary}</strong>
                    <small>
                      {a.actor?.username || "System"} · {dateTime(a.createdAt)}
                    </small>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="detailSide">
          <section className="card">
            <div className="cardHead">
              <h2>Account type</h2>
              {!roleForm && !isSelf && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setRoleForm({ role: user.role })}
                >
                  <Pencil size={14} /> Change
                </button>
              )}
            </div>
            {roleForm ? (
              <form className="stack" onSubmit={saveRole}>
                <Field label="Staff access" htmlFor="role">
                  <select id="role" value={roleForm.role} onChange={(e) => setRoleForm((f) => ({ ...f, role: e.target.value }))}>
                    <option value="client">No — a regular Bayti account</option>
                    <option value="admin">Yes — Bayti administrator</option>
                  </select>
                </Field>
                <p className="muted small">
                  Agency membership isn&rsquo;t a role: add or remove people from an agency&rsquo;s page. Staff accounts
                  can&rsquo;t belong to an agency.
                </p>
                {roleForm.role === "admin" && <p className="error-text">Administrators get full access to this dashboard.</p>}
                <div className="formActions">
                  <button type="button" className="btn-link" onClick={() => setRoleForm(null)}>
                    Cancel
                  </button>
                  <button className="btn btn-dark btn-sm">Save</button>
                </div>
              </form>
            ) : (
              <>
                <p>
                  <strong>{ROLE_LABEL[accountType(user)]}</strong>
                </p>
                {user.agency && (
                  <p className="muted small">
                    {AGENCY_ROLE_LABEL[user.agencyRole]} at <Link to={`/agencies/${user.agency.id}`}>{user.agency.tradeName}</Link>
                  </p>
                )}
                {isSelf && <p className="muted small">You can't change your own type.</p>}
              </>
            )}
          </section>

          {user.applications.length > 0 && (
            <section className="card">
              <h2>Agency applications</h2>
              <ul className="miniList plain">
                {user.applications.map((a) => (
                  <li key={a.id}>
                    <div>
                      <Link to={`/applications/${a.id}`}>{a.tradeName || `Application #${a.id}`}</Link>
                      <span>{a.submittedAt ? `submitted ${dateFmt(a.submittedAt)}` : "draft"}</span>
                    </div>
                    <StatusPill status={a.status} kind="application" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!isSelf && user.role !== "admin" && (
            <section className="card danger">
              <h2>Delete account</h2>
              <p className="muted small">
                Deletes the account with its listings, saved homes, chats and documents.
                {user.ownedAgency && " The agency it owns is suspended and its agents become individual accounts."}
              </p>
              <button className="btn btn-sm btn-danger-solid" onClick={() => setDialog("delete")}>
                <Trash2 size={15} /> Delete account
              </button>
            </section>
          )}
          {!isSelf && user.status === "active" && (
            <button className="btn-link small" onClick={() => setDialog("deactivate")}>
              Deactivate instead (keeps all data)
            </button>
          )}
        </aside>
      </div>

      {dialog === "suspend" && (
        <PromptDialog
          title={`Suspend ${user.username}?`}
          body="They're signed out straight away and can't sign in. Their listings disappear from the marketplace until you reactivate them. They get an email with the reason."
          placeholder="Reason (kept in the account history)"
          suggestions={["Fraudulent listings", "Repeated reports from other users", "Abusive messages"]}
          confirmLabel="Suspend"
          danger
          onCancel={() => setDialog(null)}
          onConfirm={(r) => setStatus("suspended", r)}
        />
      )}
      {dialog === "deactivate" && (
        <PromptDialog
          title={`Deactivate ${user.username}?`}
          body="Like a suspension, but for closed accounts (e.g. at the person's request). Nothing is deleted."
          placeholder="Reason"
          confirmLabel="Deactivate"
          onCancel={() => setDialog(null)}
          onConfirm={(r) => setStatus("deactivated", r)}
        />
      )}
      {dialog === "password" && (
        <PasswordDialog
          user={user}
          onClose={() => setDialog(null)}
          onLink={(l) => {
            setDialog(null);
            setResetLink(l);
          }}
          notify={notify}
        />
      )}
      {resetLink && (
        <Modal title="Password reset link" onClose={() => setResetLink(null)}>
          <p>{resetLink.emailed ? "We emailed this link to them." : "Email isn't configured. Send them this link yourself."} It works once, for one hour.</p>
          <div className="copyRow">
            <input readOnly value={resetLink.link} onFocus={(e) => e.target.select()} aria-label="Reset link" />
            <button className="btn btn-outline btn-sm" onClick={() => navigator.clipboard.writeText(resetLink.link).then(() => notify("Link copied."))}>
              <Copy size={15} /> Copy
            </button>
          </div>
        </Modal>
      )}
      {dialog === "delete" && (
        <DeleteDialog
          user={user}
          onCancel={() => setDialog(null)}
          onDeleted={() => {
            invalidateUsers();
            navigate("/users", { replace: true });
          }}
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

function PasswordDialog({ user, onClose, onLink, notify }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={`Password for ${user.username}`} onClose={onClose}>
      <p>Send a reset link so they choose their own password (recommended), or set one yourself and tell them.</p>
      <button
        className="btn btn-dark btn-sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const { data } = await api.post(`/users/${user.id}/reset-link`);
            onLink(data);
          } catch (err) {
            notify(errorMessage(err), true);
          } finally {
            setBusy(false);
          }
        }}
      >
        Send reset link
      </button>
      <form
        className="inlineForm"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api.put(`/users/${user.id}/password`, { password });
            notify("Password changed.");
            onClose();
          } catch (err) {
            notify(errorMessage(err), true);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="newPassword">Or set a new password</label>
        <div className="copyRow">
          <input id="newPassword" type="text" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="off" />
          <button className="btn btn-outline btn-sm" disabled={busy || password.length < 8}>
            Set
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteDialog({ user, onCancel, onDeleted }) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal title={`Delete ${user.username}?`} onClose={onCancel}>
      <p>
        This permanently deletes the account, its {user.posts.length} listing(s), saved homes, chats and documents. It can't be undone. Consider suspending instead.
      </p>
      <label htmlFor="confirmName" className="small">
        Type <strong>{user.username}</strong> to confirm
      </label>
      <input id="confirmName" className="confirmInput" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      {error && <p className="error-text">{error}</p>}
      <div className="modal-actions">
        <button className="btn-link" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn btn-sm btn-danger-solid"
          disabled={typed !== user.username || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api.delete(`/users/${user.id}`, { data: { confirm: typed } });
              onDeleted();
            } catch (err) {
              setError(errorMessage(err));
              setBusy(false);
            }
          }}
        >
          Delete permanently
        </button>
      </div>
    </Modal>
  );
}
