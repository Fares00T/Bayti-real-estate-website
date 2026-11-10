import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import api, { errorMessage, notifyDataChanged } from "../lib/api";
import { useMember } from "../lib/auth";
import { AGENCY_ROLE_LABEL, dateFmt, numberFmt, place, timeAgo } from "../lib/format";
import { listingState } from "../lib/listing";
import { BackLink, Field, Modal, PageHead, Spinner, StatusPill, useToast } from "../components/ui";
import Feed from "../components/Feed";
import NotFound from "./NotFound";
import "./dashboard.scss";
import "./listingDetail.scss";

export default function TeamMember() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { member: me, can, logout } = useMember();
  const [person, setPerson] = useState(null);
  const [team, setTeam] = useState([]);
  const [missing, setMissing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [toast, notify] = useToast();
  const writable = me.agency.status === "active";
  const self = Number(id) === me.id;

  const load = useCallback(
    () =>
      api
        .get(`/team/${id}`)
        .then((res) => {
          setPerson(res.data);
          setProfile({ username: res.data.username, phone: res.data.phone || "" });
        })
        .catch((err) => (err.response?.status === 404 ? setMissing(true) : notify(errorMessage(err), true))),
    [id, notify]
  );
  useEffect(() => {
    if (!can("team.view")) return;
    load();
    api.get("/team").then((res) => setTeam(res.data)).catch(() => {});
  }, [load, can]);

  if (!can("team.view") || missing) return <NotFound />;
  if (!person) return <Spinner />;

  const update = async (data, ok) => {
    try {
      await api.put(`/team/${person.id}`, data);
      notify(ok);
      notifyDataChanged();
      load();
    } catch (err) {
      notify(errorMessage(err), true);
    }
  };
  const manage = writable && person.canManage;
  const access = person.status !== "active" ? "suspended" : person.agencyActive ? "active" : "inactive";

  return (
    <div className="workspace listingPage backoffice">
      <BackLink to="/team">Team</BackLink>
      <PageHead
        title={
          <span className="titleLine">
            <img className="headAvatar" src={person.avatar || "/noavatar.jpg"} alt="" />
            {person.username} <StatusPill status={access} />
          </span>
        }
        subtitle={`${AGENCY_ROLE_LABEL[person.agencyRole]} · joined Bayti ${dateFmt(person.createdAt)} · last sign-in ${person.lastLoginAt ? timeAgo(person.lastLoginAt) : "never"}`}
      />

      <div className="detailGrid">
        <div className="detailMain">
          <section className="card">
            <div className="cardHead">
              <h2>Assigned listings ({person.listings.length})</h2>
              <Link className="btn-link small" to={`/listings?agent=${person.id}`}>
                Manage in Listings
              </Link>
            </div>
            {person.listings.length === 0 ? (
              <p className="muted">No listings assigned.</p>
            ) : (
              <ul className="recentList">
                {person.listings.map((p) => (
                  <li key={p.id}>
                    <img src={p.images?.[0] || "/noavatar.jpg"} alt="" />
                    <div>
                      <Link to={`/listings/${p.id}`}>{p.title}</Link>
                      <span>
                        {place(p)} · {numberFmt.format(p.postDetail?.views || 0)} views
                      </span>
                    </div>
                    <StatusPill status={listingState(p)} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <h2>Recent activity</h2>
            {person.activity.length === 0 ? <p className="muted">Nothing recorded yet.</p> : <Feed items={person.activity.map((a) => ({ ...a, actor: person }))} />}
          </section>
        </div>

        <aside className="detailSide">
          <section className="card">
            <h2>Profile</h2>
            {manage ? (
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  update(profile, "Profile saved.");
                }}
              >
                <Field label="Name shown to buyers" htmlFor="p-name">
                  <input id="p-name" value={profile.username} minLength={3} onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))} />
                </Field>
                <Field label="Phone" htmlFor="p-phone">
                  <input id="p-phone" type="tel" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
                </Field>
                <button className="btn btn-outline btn-sm">Save profile</button>
              </form>
            ) : (
              <dl className="facts">
                <div>
                  <dt>Email</dt>
                  <dd>{person.email}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{person.phone || "—"}</dd>
                </div>
              </dl>
            )}
            {manage && <p className="muted small">Email: {person.email}</p>}
          </section>

          {manage && (
            <section className="card">
              <h2>Role and access</h2>
              <div className="stack">
                {can("team.roles") && (
                  <Field label="Role" htmlFor="p-role">
                    <select id="p-role" value={person.agencyRole} onChange={(e) => update({ agencyRole: e.target.value }, "Role changed.")}>
                      <option value="agent">Agent</option>
                      <option value="manager">Manager</option>
                    </select>
                  </Field>
                )}
                {person.agencyActive ? (
                  <button className="btn btn-outline btn-sm" onClick={() => update({ active: false }, `${person.username} can no longer sign in or publish for the agency.`)}>
                    Deactivate
                  </button>
                ) : (
                  <button className="btn btn-outline btn-sm" onClick={() => update({ active: true }, `${person.username} is active again.`)}>
                    Reactivate
                  </button>
                )}
                <button className="btn btn-outline btn-sm dangerText" onClick={() => setRemoving(true)}>
                  Remove from the agency
                </button>
              </div>
            </section>
          )}

          {self && writable && me.agencyRole !== "owner" && (
            <section className="card">
              <h2>Leave the agency</h2>
              <p className="muted small">Your account becomes an individual account. The agency keeps the listings assigned to you.</p>
              <button className="btn btn-outline btn-sm dangerText" style={{ marginTop: 12 }} onClick={() => setRemoving(true)}>
                Leave {me.agency.tradeName}
              </button>
            </section>
          )}
        </aside>
      </div>

      {removing && (
        <RemoveDialog
          person={person}
          self={self}
          team={team.filter((m) => m.id !== person.id && m.agencyActive && m.status === "active")}
          onClose={() => setRemoving(false)}
          onDone={async (res) => {
            notifyDataChanged();
            if (self) return logout();
            navigate("/team", { replace: true });
            notify(res.reassigned ? `Removed. ${res.reassigned} listing(s) moved to ${res.toUser?.username}.` : "Removed from the agency.");
          }}
        />
      )}
      {toast}
    </div>
  );
}

// Listings never leave with the person: they go to someone who stays
function RemoveDialog({ person, self, team, onClose, onDone }) {
  const owner = team.find((m) => m.agencyRole === "owner");
  const [to, setTo] = useState(owner?.id || team[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const count = person.listings.length;

  const go = async () => {
    setBusy(true);
    try {
      const { data } = await api.delete(`/team/${person.id}`, { data: { reassignTo: to || undefined } });
      await onDone(data);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={self ? "Leave the agency?" : `Remove ${person.username}?`}
      onClose={onClose}
      footer={
        <>
          <button className="btn-link" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-sm btn-danger-solid" disabled={busy} onClick={go}>
            {busy && <Loader2 size={15} className="spin" />}
            {self ? "Leave" : "Remove"}
          </button>
        </>
      }
    >
      <p>
        {self ? "You" : person.username} will lose access to the agency workspace, and future listings won&rsquo;t be
        published under the agency.
      </p>
      {count > 0 && (
        <Field label={`Move the ${count} assigned listing${count === 1 ? "" : "s"} to`} htmlFor="reassign">
          <select id="reassign" value={to} onChange={(e) => setTo(Number(e.target.value))}>
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.username} ({AGENCY_ROLE_LABEL[m.agencyRole]})
              </option>
            ))}
          </select>
        </Field>
      )}
      {error && <p className="error-text">{error}</p>}
    </Modal>
  );
}
