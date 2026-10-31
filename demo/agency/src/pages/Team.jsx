import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Loader2, UserPlus } from "lucide-react";
import api, { errorMessage, notifyDataChanged } from "../lib/api";
import { useMember } from "../lib/auth";
import { AGENCY_ROLE_LABEL, timeAgo } from "../lib/format";
import { Field, Modal, PageHead, Spinner, StatusPill, Tabs, useToast } from "../components/ui";
import NotFound from "./NotFound";
import "./dashboard.scss";

export default function Team() {
  const { member, can } = useMember();
  const [team, setTeam] = useState(null);
  const [invites, setInvites] = useState([]);
  const [adding, setAdding] = useState(false);
  const [toast, notify] = useToast();
  const writable = member.agency.status === "active";

  const load = useCallback(
    () =>
      Promise.all([api.get("/team"), api.get("/team/invitations")])
        .then(([members, pending]) => {
          setTeam(members.data);
          setInvites(pending.data);
        })
        .catch((err) => notify(errorMessage(err, "Couldn't load the team."), true)),
    [notify]
  );

  const revoke = async (invite) => {
    try {
      await api.delete(`/team/invitations/${invite.id}`);
      notify("Invitation withdrawn.");
      load();
    } catch (err) {
      notify(errorMessage(err), true);
    }
  };
  useEffect(() => {
    if (can("team.view")) load();
  }, [load, can]);

  if (!can("team.view")) return <NotFound />;

  return (
    <div className="workspace backoffice">
      <PageHead title="Team" subtitle="Everyone who publishes and answers buyers for your agency.">
        {writable && can("team.manage") && (
          <button className="btn btn-dark btn-sm" onClick={() => setAdding(true)}>
            <UserPlus size={15} /> Add a member
          </button>
        )}
      </PageHead>

      <div className="panel">
        {!team ? (
          <Spinner />
        ) : (
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Access</th>
                  <th className="right">Listings</th>
                  <th className="right">Published</th>
                  <th className="right">New inquiries</th>
                  <th>Last sign-in</th>
                </tr>
              </thead>
              <tbody>
                {team.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="listing person">
                        <img src={m.avatar || "/noavatar.jpg"} alt="" />
                        <div>
                          <Link to={`/team/${m.id}`}>
                            {m.username}
                            {m.id === member.id && <span className="muted"> (you)</span>}
                          </Link>
                          <span>{m.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{AGENCY_ROLE_LABEL[m.agencyRole]}</td>
                    <td>
                      <StatusPill status={m.status !== "active" ? "suspended" : m.agencyActive ? "active" : "inactive"} />
                    </td>
                    <td className="right">{m.listings}</td>
                    <td className="right">{m.published}</td>
                    <td className="right">{m.openInquiries}</td>
                    <td className="muted nowrap">{m.lastLoginAt ? timeAgo(m.lastLoginAt) : "Never"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {invites.length > 0 && (
          <div className="pendingInvites">
            <h2>Waiting for an answer</h2>
            <ul>
              {invites.map((i) => (
                <li key={i.id}>
                  <span>
                    <strong>{i.user.username}</strong> · {i.user.email} · {AGENCY_ROLE_LABEL[i.agencyRole]} · invited{" "}
                    {timeAgo(i.createdAt)}
                  </span>
                  {writable && can("team.manage") && (
                    <button className="btn-link small" onClick={() => revoke(i)}>
                      Withdraw
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="muted small">
          Owners manage everything. Managers handle listings, inquiries and agents. Agents manage the listings assigned to
          them. Deactivated members can&rsquo;t sign in or publish for the agency; their listings stay online.
        </p>
      </div>

      {adding && (
        <AddMember
          canAddManagers={can("team.roles")}
          onClose={() => setAdding(false)}
          onAdded={(text) => {
            notify(text);
            notifyDataChanged();
            load();
          }}
        />
      )}
      {toast}
    </div>
  );
}

function AddMember({ canAddManagers, onClose, onAdded }) {
  const [mode, setMode] = useState("existing");
  const [form, setForm] = useState({ email: "", username: "", phone: "", agencyRole: "agent" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post("/team", { ...form, create: mode === "create" });
      if (data.invitation) {
        // an existing account joins only once its owner accepts
        onAdded(`Invitation sent to ${data.invitation.user.username}. They join once they accept.`);
        onClose();
        return;
      }
      onAdded(`${data.member.username} joined the team.`);
      if (data.setupLink) setResult(data);
      else onClose();
    } catch (err) {
      setError(errorMessage(err, "Couldn't add them."));
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <Modal title="Account created" onClose={onClose} footer={<button className="btn btn-dark btn-sm" onClick={onClose}>Done</button>}>
        <p>
          {result.emailed
            ? `We emailed ${result.member.email} a link to choose a password.`
            : "Email isn't set up on this server, so send them this link yourself. It works once, for one hour."}
        </p>
        <div className="setupLink">{result.setupLink}</div>
        <button className="btn-link small" onClick={() => navigator.clipboard?.writeText(result.setupLink)}>
          <Copy size={13} /> Copy link
        </button>
      </Modal>
    );
  }

  return (
    <Modal title={mode === "existing" ? "Invite a team member" : "Add a team member"} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <Tabs
          value={mode}
          onChange={setMode}
          tabs={[
            { value: "existing", label: "They have a Bayti account" },
            { value: "create", label: "Create an account" },
          ]}
        />
        <Field label="Email" htmlFor="m-email" required>
          <input id="m-email" type="email" value={form.email} onChange={set("email")} required autoFocus />
        </Field>
        {mode === "create" && (
          <>
            <Field label="Name shown to buyers" htmlFor="m-username" required>
              <input id="m-username" value={form.username} onChange={set("username")} minLength={3} required />
            </Field>
            <Field label="Phone" htmlFor="m-phone">
              <input id="m-phone" type="tel" value={form.phone} onChange={set("phone")} />
            </Field>
          </>
        )}
        <Field label="Role" htmlFor="m-role" hint={canAddManagers ? null : "Only the owner can add managers."}>
          <select id="m-role" value={form.agencyRole} onChange={set("agencyRole")} disabled={!canAddManagers}>
            <option value="agent">Agent</option>
            <option value="manager">Manager</option>
          </select>
        </Field>
        <p className="muted small">
          {mode === "existing"
            ? "They get an invitation on their Bayti account and join once they accept. They need to archive any personal listings first: what they publish as a member belongs to the agency."
            : "They get a one-time link to choose a password, then sign in here."}
        </p>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="btn-link" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-dark btn-sm" disabled={busy}>
            {busy && <Loader2 size={15} className="spin" />}
            {mode === "create" ? "Create account" : "Send invitation"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
