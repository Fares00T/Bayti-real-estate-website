import { useContext, useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import apiRequest from "../lib/apiRequest";
import { AuthContext } from "../../context/AuthContext";
import "./agencyInvitations.scss";

// Invitations to join an agency's team. Nobody joins an agency without
// accepting here; the account stays the same, with access to the agency
// workspace added.
export default function AgencyInvitations() {
  const { updateUser } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);
  const [leaving, setLeaving] = useState(null);

  useEffect(() => {
    apiRequest
      .get("/invitations")
      .then((res) => setItems(res.data))
      .catch(() => {});
  }, []);

  const respond = async (invitation, accept) => {
    setBusy(invitation.id);
    setMessage(null);
    try {
      const res = await apiRequest.post(`/invitations/${invitation.id}/${accept ? "accept" : "decline"}`);
      if (accept) {
        // The account now belongs to the agency platform: the marketplace
        // session is closed and the person continues there
        setItems([]);
        setLeaving({ name: invitation.agency.tradeName, to: res.data.redirect });
        setTimeout(() => {
          updateUser(null);
          window.location.assign(res.data.redirect);
        }, 3000);
      } else {
        setItems((prev) => prev.filter((i) => i.id !== invitation.id));
      }
    } catch (err) {
      setMessage({ error: err.response?.data?.message || "Couldn't answer the invitation." });
    } finally {
      setBusy(null);
    }
  };

  if (!items.length && !message && !leaving) return null;

  return (
    <section className="agencyInvitations" aria-label="Agency invitations">
      {leaving && (
        <p className="joined">
          You joined {leaving.name}. Your account now works on the agency platform only, so you&rsquo;re being signed out
          here. <a href={leaving.to}>Continue to the agency sign-in</a>
        </p>
      )}
      {message?.error && <p className="error-text">{message.error}</p>}
      {items.map((invitation) => (
        <article key={invitation.id} className="invitation">
          <span className="logo" aria-hidden="true">
            {invitation.agency.logo ? <img src={invitation.agency.logo} alt="" /> : <Building2 size={20} />}
          </span>
          <div className="text">
            <strong>{invitation.agency.tradeName} invited you to join its team</strong>
            <span>
              As {invitation.agencyRole === "manager" ? "a manager" : "an agent"}
              {invitation.invitedBy ? `, invited by ${invitation.invitedBy.username}` : ""}. Once you accept, this account
              signs in on the agency platform only, and no longer on the marketplace.
            </span>
          </div>
          <div className="buttons">
            <button className="btn btn-dark btn-sm" disabled={busy === invitation.id} onClick={() => respond(invitation, true)}>
              Accept
            </button>
            <button className="btn-link" disabled={busy === invitation.id} onClick={() => respond(invitation, false)}>
              Decline
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
