import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Loader2, UserMinus, UserPlus } from "lucide-react";
import apiRequest from "../lib/apiRequest";
import "./agencyTeam.scss";

const ROLE = { owner: "Owner", manager: "Manager", agent: "Agent" };
const STATUS = { pending: "In review", approved: "Live", rejected: "Needs changes", unpublished: "Offline", archived: "Archived" };
const priceFmt = new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 0 });

// The agency's team and listings, as the signed-in member is allowed to see them.
// Every permission is enforced by the API; this only hides what won't work.
export default function AgencyTeam({ onLeft }) {
  const [data, setData] = useState(null);
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("agent");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(() => {
    apiRequest
      .get("/agency/me")
      .then((res) => {
        setData(res.data);
        if (res.data.permissions.viewTeamListings) {
          apiRequest.get("/agency/me/posts").then((r) => setPosts(r.data)).catch(() => setPosts([]));
        }
      })
      .catch((err) => setError(err.response?.data?.message || "We couldn't load your agency."));
  }, []);
  useEffect(load, [load]);

  if (error) return <p className="error-text">{error}</p>;
  if (!data) return null;

  const { agency, members, permissions, me } = data;
  const say = (text, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 4000);
  };

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiRequest.post("/agency/me/members", { email, agencyRole: role });
      setEmail("");
      say("Added to your team. They've been notified.");
      load();
    } catch (err) {
      say(err.response?.data?.message || "Couldn't add them.", true);
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (m, agencyRole) => {
    try {
      await apiRequest.put(`/agency/me/members/${m.id}`, { agencyRole });
      load();
    } catch (err) {
      say(err.response?.data?.message || "Couldn't change the role.", true);
    }
  };

  const remove = async (m) => {
    const self = m.id === me.id;
    if (!window.confirm(self ? `Leave ${agency.tradeName}?` : `Remove ${m.username} from the team? They keep their account and listings.`)) return;
    try {
      await apiRequest.delete(`/agency/me/members/${m.id}`);
      if (self) return onLeft?.();
      say(`${m.username} was removed.`);
      load();
    } catch (err) {
      say(err.response?.data?.message || "Couldn't remove them.", true);
    }
  };

  return (
    <section className="agencyTeam">
      <div className="teamHead">
        {agency.logo && <img src={agency.logo} alt="" />}
        <div>
          <h2 className="sectionTitle">
            {agency.tradeName}
            {agency.verified && <BadgeCheck size={18} aria-label="Verified agency" />}
          </h2>
          <p className="muted">
            {[agency.commune, agency.wilaya].filter(Boolean).join(", ")}
            {agency.approvalNumber && ` · Agrément ${agency.approvalNumber}`}
          </p>
        </div>
      </div>

      {agency.status === "suspended" && (
        <p className="teamNotice">This agency is suspended, so its listings are hidden. Contact Bayti support.</p>
      )}

      <h3>Team</h3>
      <ul className="members">
        {members.map((m) => (
          <li key={m.id}>
            <img src={m.avatar || "/noavatar.jpg"} alt="" />
            <div>
              <strong>
                {m.username}
                {m.id === me.id && <span className="muted"> (you)</span>}
              </strong>
              <span className="muted">
                {m.email || ROLE[m.agencyRole]}
                {m._count && ` · ${m._count.posts} listing${m._count.posts === 1 ? "" : "s"}`}
              </span>
            </div>
            {permissions.changeRoles && m.agencyRole !== "owner" ? (
              <select value={m.agencyRole} onChange={(e) => changeRole(m, e.target.value)} aria-label={`Role of ${m.username}`}>
                <option value="agent">Agent</option>
                <option value="manager">Manager</option>
              </select>
            ) : (
              <span className="rolePill">{ROLE[m.agencyRole]}</span>
            )}
            {m.agencyRole !== "owner" &&
              (m.id === me.id || (permissions.manageMembers && (me.agencyRole === "owner" || m.agencyRole === "agent"))) && (
                <button className="iconBtn" onClick={() => remove(m)} aria-label={m.id === me.id ? "Leave the agency" : `Remove ${m.username}`} title={m.id === me.id ? "Leave" : "Remove"}>
                  <UserMinus size={17} />
                </button>
              )}
          </li>
        ))}
      </ul>

      {permissions.manageMembers && agency.status === "active" && (
        <form className="addMember" onSubmit={add}>
          <label htmlFor="memberEmail">Add an agent</label>
          <p className="muted">They need a Bayti account first. Their existing listings move under the agency.</p>
          <div className="addRow">
            <input id="memberEmail" type="email" placeholder="Their account email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            {me.agencyRole === "owner" && (
              <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
                <option value="agent">Agent</option>
                <option value="manager">Manager</option>
              </select>
            )}
            <button className="btn btn-dark btn-sm" disabled={busy}>
              {busy ? <Loader2 size={15} className="spin" /> : <UserPlus size={15} />} Add
            </button>
          </div>
        </form>
      )}
      {message && <p className={message.isError ? "error-text" : "okText"}>{message.text}</p>}

      {posts && (
        <>
          <h3>Team listings ({posts.length})</h3>
          {posts.length === 0 ? (
            <p className="muted">No listings yet.</p>
          ) : (
            <ul className="teamPosts">
              {posts.map((p) => (
                <li key={p.id}>
                  <img src={p.images?.[0] || "/noavatar.jpg"} alt="" />
                  <div>
                    <Link to={`/${p.id}`}>{p.title}</Link>
                    <span className="muted">
                      {priceFmt.format(p.price)} DZD · {p.city} · by {p.user.username}
                    </span>
                  </div>
                  <span className={`rolePill st-${p.status}`}>{STATUS[p.status] || p.status}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
