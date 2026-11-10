import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CalendarCheck, Check, Clock, Loader2, Mail, MessageCircle, Phone, User, X } from "lucide-react";
import api, { errorMessage, notifyDataChanged } from "../lib/api";
import { useMember } from "../lib/auth";
import { place, timeAgo } from "../lib/format";
import { Empty, Field, Modal, PageHead, PromptDialog, Spinner, StatusPill, Tabs, useToast } from "../components/ui";
import "./dashboard.scss";

const TABS = [
  { value: "open", label: "Open" },
  { value: "scheduled", label: "Visits confirmed" },
  { value: "", label: "All" },
];

export default function Inquiries() {
  const { member, can } = useMember();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [declining, setDeclining] = useState(null);
  const [team, setTeam] = useState([]);
  const [toast, notify] = useToast();
  const status = params.get("status") ?? "open";
  const listing = Number(params.get("listing")) || null;
  const writable = member.agency.status === "active";

  const load = useCallback(
    () =>
      api
        .get("/inquiries")
        .then((res) => setItems(res.data))
        .catch((err) => notify(errorMessage(err, "Couldn't load inquiries."), true)),
    [notify]
  );
  useEffect(() => {
    load();
  }, [load]);
  // Owners and managers hand inquiries to agents
  useEffect(() => {
    if (!can("inquiries.all") || !can("team.view")) return;
    api
      .get("/team")
      .then((res) => setTeam(res.data.filter((m) => m.agencyActive && m.status === "active")))
      .catch(() => {});
  }, [can]);

  const assign = async (inq, userId) => {
    try {
      await api.put(`/inquiries/${inq.id}/assign`, { userId: userId || null });
      notify(userId ? "Inquiry assigned." : "Inquiry unassigned.");
      load();
    } catch (err) {
      notify(errorMessage(err), true);
    }
  };

  const update = async (inq, body, ok) => {
    try {
      await api.put(`/inquiries/${inq.id}`, body);
      notify(ok);
      notifyDataChanged();
      load();
    } catch (err) {
      notify(errorMessage(err), true);
    }
  };

  const messageClient = async (inq) => {
    try {
      const { data } = await api.post("/chats", { inquiryId: inq.id });
      navigate(`/messages?chat=${data.id}`);
    } catch (err) {
      notify(errorMessage(err, "Couldn't open the conversation."), true);
    }
  };

  const shown = (items || []).filter((i) => (!status || i.status === status) && (!listing || i.postId === listing));
  const count = (s) => (items || []).filter((i) => i.status === s).length;

  return (
    <div className="workspace backoffice">
      <PageHead
        title="Inquiries"
        subtitle={
          can("inquiries.all")
            ? "Questions and visit requests from buyers and tenants. They belong to the agency, whoever answers them."
            : "Questions and visit requests assigned to you."
        }
      />
      <div className="panel">
        <div className="toolbar">
          <Tabs
            value={status}
            onChange={(v) => {
              const next = new URLSearchParams(params);
              next.set("status", v);
              setParams(next, { replace: true });
            }}
            tabs={TABS.map((t) => ({ ...t, count: t.value ? count(t.value) : 0 }))}
          />
          {listing && (
            <button className="btn-link small" onClick={() => setParams({ status }, { replace: true })}>
              Showing one listing · show all
            </button>
          )}
        </div>

        {!items ? (
          <Spinner />
        ) : shown.length === 0 ? (
          <Empty icon={CalendarCheck} title={status === "open" ? "No open inquiries" : "Nothing here"}>
            Buyers and tenants ask questions and request visits from your listing pages on Bayti. New inquiries appear here and in your notifications.
          </Empty>
        ) : (
          <ul className="inquiryList">
            {shown.map((i) => (
              <li key={i.id} className="inquiry">
                {i.post?.images?.[0] ? <img src={i.post.images[0]} alt="" /> : <span className="noPhoto" />}
                <div>
                  <h3>
                    {i.post ? <Link to={`/listings/${i.post.id}`}>{i.postTitle}</Link> : `${i.postTitle} (deleted)`}
                  </h3>
                  <p className="meta">
                    <span>
                      <User size={14} /> {i.client.username}
                    </span>
                    {i.contactPhone && (
                      <span>
                        <Phone size={14} /> <a href={`tel:${i.contactPhone}`}>{i.contactPhone}</a>
                      </span>
                    )}
                    <span>
                      <Mail size={14} /> <a href={`mailto:${i.client.email}`}>{i.client.email}</a>
                    </span>
                  </p>
                  <p className="meta">
                    <span>
                      <Clock size={14} />
                      {i.type !== "visit"
                        ? "Question"
                        : i.status === "scheduled"
                        ? `Visit on ${i.confirmedDate} at ${i.confirmedTime}`
                        : `Visit asked for ${i.preferredDate} at ${i.preferredTime}`}
                    </span>
                    {i.post && <span>{place(i.post)}</span>}
                    {can("inquiries.all") &&
                      (team.length > 0 && writable ? (
                        <label className="assignTo">
                          Agent{" "}
                          <select value={i.assignedTo?.id || ""} onChange={(e) => assign(i, Number(e.target.value))}>
                            <option value="">Unassigned</option>
                            {team.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.username}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <span>Agent: {i.assignedTo?.username || "unassigned"}</span>
                      ))}
                    <span>{timeAgo(i.updatedAt)}</span>
                  </p>
                  {i.message && <blockquote>{i.message}</blockquote>}
                  {i.status === "declined" && i.declineReason && <blockquote>Declined: {i.declineReason}</blockquote>}
                </div>
                <div className="inquiryActions">
                  <StatusPill status={i.status} kind="inquiry" />
                  <button className="btn-link small" onClick={() => messageClient(i)}>
                    <MessageCircle size={14} /> Message client
                  </button>
                  {writable && i.status === "open" && (
                    <>
                      {i.type === "visit" && (
                        <button className="btn btn-dark btn-sm" onClick={() => setConfirming(i)}>
                          <Check size={15} /> Confirm visit
                        </button>
                      )}
                      <button className="btn btn-outline btn-sm" onClick={() => update(i, { status: "closed" }, "Inquiry closed.")}>
                        Close
                      </button>
                      <button className="btn-link small" onClick={() => setDeclining(i)}>
                        <X size={14} /> Decline
                      </button>
                    </>
                  )}
                  {writable && i.status === "scheduled" && (
                    <>
                      <button className="btn btn-outline btn-sm" onClick={() => update(i, { status: "closed" }, "Marked as visited.")}>
                        Mark visited
                      </button>
                      <button className="btn-link small" onClick={() => setDeclining(i)}>
                        Cancel visit
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirming && (
        <ConfirmVisit
          inquiry={confirming}
          onClose={() => setConfirming(null)}
          onConfirm={async (when) => {
            await update(confirming, { status: "scheduled", ...when }, "Visit confirmed. The client was notified.");
            setConfirming(null);
          }}
        />
      )}
      {declining && (
        <PromptDialog
          title="Decline this inquiry?"
          body="The client is notified, with your reason if you give one."
          placeholder="For example: the property is no longer available"
          suggestions={["The property is no longer available", "We can't make that date. Please request another one."]}
          required={false}
          confirmLabel="Decline"
          danger
          onCancel={() => setDeclining(null)}
          onConfirm={async (reason) => {
            await update(declining, { status: "declined", declineReason: reason }, "Request declined.");
            setDeclining(null);
          }}
        />
      )}
      {toast}
    </div>
  );
}

function ConfirmVisit({ inquiry, onClose, onConfirm }) {
  const [date, setDate] = useState(inquiry.preferredDate);
  const [time, setTime] = useState(inquiry.preferredTime);
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Confirm the visit" onClose={onClose}>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await onConfirm({ confirmedDate: date, confirmedTime: time });
          setBusy(false);
        }}
      >
        <p className="muted">
          {inquiry.client.username} asked for {inquiry.preferredDate} at {inquiry.preferredTime}. Keep it or propose another time.
        </p>
        <Field label="Date" htmlFor="v-date">
          <input id="v-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Time" htmlFor="v-time">
          <input id="v-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </Field>
        <div className="modal-actions">
          <button type="button" className="btn-link" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-dark btn-sm" disabled={busy}>
            {busy && <Loader2 size={15} className="spin" />}
            Confirm visit
          </button>
        </div>
      </form>
    </Modal>
  );
}
