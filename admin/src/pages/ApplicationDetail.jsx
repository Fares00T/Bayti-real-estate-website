import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, Check, CircleHelp, MessageSquarePlus, Pencil, Play, ShieldCheck, X } from "lucide-react";
import api, { errorMessage, notifyDataChanged } from "../lib/api";
import { APPLICATION_STATUS, DOCUMENT_LABEL, dateFmt, dateTime } from "../lib/format";
import { BackLink, Confirm, Field, PageHead, PromptDialog, Spinner, StatusPill, useToast } from "../components/ui";
import DocumentList from "../components/DocumentList";
import NotFound from "./NotFound";

const SECTIONS = [
  {
    title: "Agency",
    fields: ["tradeName", "legalName", "legalForm", "rcNumber", "nif", "nis", "articleImposition", "address", "commune", "wilaya", "phone", "email", "website"],
  },
  {
    title: "Legal representative",
    fields: ["repFullName", "repPosition", "repBirthDate", "repNationality", "repIdNumber", "repPhone", "repEmail"],
  },
  {
    title: "Professional authorization",
    fields: ["approvalNumber", "approvalWilaya", "approvalIssueDate", "approvalExpiryDate", "qualifiedPersonName", "qualification"],
  },
];
const EXTRA_LABELS = {
  qualifiedPersonName: "Qualified person (if not the representative)",
  qualification: "Qualification relied on",
};
const DATE_FIELDS = ["repBirthDate", "approvalIssueDate", "approvalExpiryDate"];

const value = (app, f) => {
  const v = app[f];
  if (!v) return null;
  if (DATE_FIELDS.includes(f)) return dateFmt(v);
  if (f === "website") return <a href={v} target="_blank" rel="noreferrer">{v}</a>;
  if (f === "email" || f === "repEmail") return <a href={`mailto:${v}`}>{v}</a>;
  return v;
};

// Facts the reviewer should notice without reading every field
const warningsFor = (app) => {
  const w = [];
  const issue = app.approvalIssueDate && new Date(app.approvalIssueDate);
  const expiry = app.approvalExpiryDate
    ? new Date(app.approvalExpiryDate)
    : issue && new Date(issue.getFullYear() + 5, issue.getMonth(), issue.getDate());
  if (expiry && expiry < new Date()) {
    w.push(`The agrément ${app.approvalExpiryDate ? "expired" : "would have expired (5-year validity)"} on ${dateFmt(expiry)}.`);
  }
  if (app.repBirthDate) {
    const age = (Date.now() - new Date(app.repBirthDate)) / (365.25 * 86400000);
    if (age < 25) w.push("The representative is under 25 (the minimum age for an agent under Décret 09-18, art. 8). Check who holds the agrément.");
  }
  if (app.repNationality && !/alg/i.test(app.repNationality)) {
    w.push("The representative's nationality isn't Algerian. Art. 5 bis requires Algerian nationals; check who holds the agrément and the capital.");
  }
  if (app.approvalWilaya && app.wilaya && app.approvalWilaya.trim().toLowerCase() !== app.wilaya.trim().toLowerCase()) {
    w.push(`The agrément was issued in ${app.approvalWilaya} but the office is in ${app.wilaya}. Agréments are valid nationwide, but confirm this is intended.`);
  }
  return w;
};

export default function ApplicationDetail() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  // The section being corrected by the team, and its draft values
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, notify] = useToast();

  const load = useCallback(() => {
    api
      .get(`/applications/${id}`)
      .then((res) => setApp(res.data))
      .catch((err) => {
        if ([400, 404].includes(err.response?.status)) setMissing(true);
        else setError(errorMessage(err, "Couldn't load the application."));
      });
  }, [id]);
  useEffect(load, [load]);

  if (missing) return <NotFound />;
  if (error) return <p className="error-text">{error}</p>;
  if (!app) return <Spinner />;

  const decide = async (action, message) => {
    try {
      const { data } = await api.post(`/applications/${app.id}/decision`, { action, message });
      setApp(data);
      setDialog(null);
      notifyDataChanged();
      notify(
        {
          start_review: "Marked as under review. The applicant was told.",
          request_info: "Request sent. The applicant can update the same application.",
          approve: "Approved. The agency account is active.",
          reject: "Rejected. The applicant was told why.",
        }[action]
      );
    } catch (err) {
      notify(errorMessage(err, "Couldn't record the decision."), true);
    }
  };

  // Ticks show straight away and roll back if the save fails
  const tick = async (key, checked) => {
    const before = app.checklist;
    setApp((a) => {
      const next = { ...(a.checklist || {}) };
      if (checked) next[key] = { by: "you", at: new Date().toISOString() };
      else delete next[key];
      return { ...a, checklist: next };
    });
    try {
      const { data } = await api.put(`/applications/${app.id}/checklist`, { key, checked });
      setApp((a) => ({ ...a, checklist: data }));
    } catch (err) {
      setApp((a) => ({ ...a, checklist: before }));
      notify(errorMessage(err, "Couldn't update the checklist."), true);
    }
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      const { data } = await api.post(`/applications/${app.id}/notes`, { body: note });
      setApp((a) => ({ ...a, notes: [data, ...a.notes] }));
      setNote("");
    } catch (err) {
      notify(errorMessage(err, "Couldn't save the note."), true);
    } finally {
      setSavingNote(false);
    }
  };

  // The team fills in what the applicant sent by email or said on the phone
  const startEdit = (section) => {
    setEditing(section.title);
    setForm(Object.fromEntries(section.fields.map((f) => [f, DATE_FIELDS.includes(f) ? app[f]?.slice(0, 10) || "" : app[f] || ""])));
  };
  const saveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put(`/applications/${app.id}`, form);
      setApp(data);
      setEditing(null);
      notify("Saved. The change is in the application's history.");
    } catch (err) {
      notify(errorMessage(err, "Couldn't save the application."), true);
    } finally {
      setSaving(false);
    }
  };
  const editable = app.status !== "approved";

  const labels = { ...app.fieldLabels, ...EXTRA_LABELS };
  const checklist = app.checklist || {};
  const checkedCount = app.checklistItems.filter((c) => checklist[c.key]).length;
  const haveKinds = new Set(app.documents.map((d) => d.kind));
  const docLabels = { ...DOCUMENT_LABEL, ...Object.fromEntries(app.requirements.documents.map((d) => [d.key, d.label])) };
  const warnings = warningsFor(app);
  const can = (a) => app.actions.includes(a);
  const name = app.tradeName || app.legalName || `Application #${app.id}`;

  return (
    <div className="admin-dashboard listingPage backoffice">
      <BackLink to="/applications">All applications</BackLink>
      <PageHead
        title={
          <span className="titleLine">
            {name} <StatusPill status={app.status} kind="application" />
          </span>
        }
        subtitle={`#${app.id} · ${app.entityType === "natural_person" ? "Natural person (personne physique)" : "Legal entity (personne morale)"} · ${
          app.submittedAt ? `submitted ${dateTime(app.submittedAt)}` : "not submitted yet"
        }`}
      >
        {can("start_review") && (
          <button className="btn btn-outline btn-sm" onClick={() => decide("start_review")}>
            <Play size={15} /> Start review
          </button>
        )}
        {can("request_info") && (
          <button className="btn btn-outline btn-sm" onClick={() => setDialog("request_info")}>
            <CircleHelp size={15} /> Request information
          </button>
        )}
        {can("reject") && (
          <button className="btn btn-outline btn-sm" onClick={() => setDialog("reject")}>
            <X size={15} /> Reject
          </button>
        )}
        {can("approve") && (
          <button className="btn btn-dark btn-sm" onClick={() => setDialog("approve")}>
            <Check size={15} /> Approve
          </button>
        )}
      </PageHead>

      {app.status === "info_required" && app.requestMessage && (
        <div className="callout warn">
          <strong>Waiting for the applicant</strong>
          <p>{app.requestMessage}</p>
        </div>
      )}
      {app.status === "approved" && app.agency && (
        <div className="callout ok">
          <strong>Approved {dateTime(app.reviewedAt)}</strong>
          <p>
            Agency record: <Link to={`/agencies/${app.agency.id}`}>{app.agency.tradeName}</Link>
          </p>
        </div>
      )}
      {app.status === "rejected" && (
        <div className="callout bad">
          <strong>Rejected {dateTime(app.reviewedAt)}</strong>
          <p>{app.decisionNote}</p>
        </div>
      )}
      {(warnings.length > 0 || app.duplicates.length > 0 || app.missing.length > 0) && (
        <div className="callout warn">
          <strong>
            <AlertTriangle size={15} /> Check before deciding
          </strong>
          <ul>
            {app.missing.length > 0 && <li>Still missing: {app.missing.join(", ")}.</li>}
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
            {app.duplicates.map((d) => (
              <li key={`${d.kind}${d.id}`}>
                The same RC, NIF or agrément number is on{" "}
                <Link to={d.kind === "agency" ? `/agencies/${d.id}` : `/applications/${d.id}`}>
                  {d.kind === "agency" ? "agency" : "application"} {d.name}
                </Link>
                {d.status && ` (${APPLICATION_STATUS[d.status]})`}.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="detailGrid">
        <div className="detailMain">
          {SECTIONS.map((s) => (
            <section className="card" key={s.title}>
              <div className="cardHead">
                <h2>{s.title}</h2>
                {editable && editing !== s.title && (
                  <button className="btn btn-outline btn-sm" onClick={() => startEdit(s)}>
                    <Pencil size={14} /> Edit
                  </button>
                )}
              </div>
              {editing === s.title ? (
                <form className="formGrid" onSubmit={saveEdit}>
                  {s.fields.map((f) => (
                    <Field key={f} label={labels[f] || f} htmlFor={`edit-${f}`}>
                      <input
                        id={`edit-${f}`}
                        type={DATE_FIELDS.includes(f) ? "date" : f.toLowerCase().includes("email") ? "email" : "text"}
                        value={form[f]}
                        onChange={(e) => setForm((v) => ({ ...v, [f]: e.target.value }))}
                      />
                    </Field>
                  ))}
                  <div className="formActions span2">
                    <button type="button" className="btn-link" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                    <button className="btn btn-dark btn-sm" disabled={saving}>
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <dl className="facts wide">
                  {s.fields.map((f) => (
                    <div key={f}>
                      <dt>{labels[f] || f}</dt>
                      <dd>{value(app, f) || <span className="muted">—</span>}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {s.title === "Agency" && app.logo && (
                <div className="logoRow">
                  <img src={app.logo} alt="Agency logo" />
                </div>
              )}
            </section>
          ))}

          {app.message && (
            <section className="card">
              <h2>Message from the applicant</h2>
              <p className="description">{app.message}</p>
            </section>
          )}

          <section className="card">
            <div className="cardHead">
              <h2>Documents</h2>
              <span className="muted small">{app.documents.length} file(s)</span>
            </div>
            <ul className="requirementList">
              {app.requirements.documents.map((d) => (
                <li key={d.key} className={haveKinds.has(d.key) ? "have" : d.required ? "need" : ""}>
                  {haveKinds.has(d.key) ? <Check size={14} /> : d.required ? <X size={14} /> : <span className="dot" />}
                  <span>
                    {d.label}
                    <small>
                      {d.required ? "Required" : "Optional"} · {d.basis === "legal" ? "legal requirement" : "Bayti verification"}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
            <DocumentList
              documents={app.documents}
              labels={docLabels}
              notify={notify}
              empty="No documents uploaded."
              // documents the applicant sent another way (email, in person) are filed here
              uploadUrl={editable ? `/applications/${app.id}/documents` : undefined}
              kinds={app.requirements.documents.map((d) => ({ key: d.key, label: d.label }))}
              onChange={load}
            />
          </section>
        </div>

        <aside className="detailSide">
          <section className="card">
            <div className="cardHead">
              <h2>
                <ShieldCheck size={16} /> Verification
              </h2>
              <span className="muted small">
                {checkedCount}/{app.checklistItems.length}
              </span>
            </div>
            <ul className="checklist">
              {app.checklistItems.map((c) => (
                <li key={c.key}>
                  <label>
                    <input type="checkbox" checked={!!checklist[c.key]} onChange={(e) => tick(c.key, e.target.checked)} />
                    <span>
                      {c.label}
                      {c.flag && <em> · manual judgement</em>}
                      {checklist[c.key] && (
                        <small>
                          {checklist[c.key].by}, {dateTime(checklist[c.key].at)}
                        </small>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="muted small">Only the team sees this checklist. It never blocks a decision.</p>
          </section>

          <section className="card">
            <h2>Applicant account</h2>
            <div className="person">
              <img src={app.applicant.avatar || "/noavatar.jpg"} alt="" />
              <div>
                <Link to={`/users/${app.applicant.id}`}>
                  <strong>{app.applicant.username}</strong>
                </Link>
                <span>{app.applicant.email}</span>
              </div>
            </div>
            <p className="muted small">
              Agency account since {dateFmt(app.applicant.createdAt)}. It signs in on the agency platform to follow this application; approval turns it into the agency's owner account.
            </p>
          </section>

          <section className="card">
            <h2>Internal notes</h2>
            <form className="noteForm" onSubmit={addNote}>
              <label className="visually-hidden" htmlFor="note">
                New internal note
              </label>
              <textarea id="note" rows={3} placeholder="Only visible to the team" value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="btn btn-outline btn-sm" disabled={!note.trim() || savingNote}>
                <MessageSquarePlus size={15} /> Add note
              </button>
            </form>
            <ul className="notes">
              {app.notes.map((n) => (
                <li key={n.id}>
                  <p>{n.body}</p>
                  <small>
                    {n.author?.username || "Former staff"} · {dateTime(n.createdAt)}
                  </small>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h2>History</h2>
            <ol className="timeline">
              {[...app.events].reverse().map((e) => (
                <li key={e.id}>
                  <strong>
                    {e.type === "status"
                      ? `${e.fromStatus ? `${APPLICATION_STATUS[e.fromStatus]} → ` : ""}${APPLICATION_STATUS[e.toStatus]}`
                      : e.type === "created"
                      ? "Draft started"
                      : e.type === "edited"
                      ? "Details edited"
                      : "Documents uploaded"}
                  </strong>
                  {e.message && <p>{e.message}</p>}
                  <small>
                    {e.actor ? (e.actor.role === "admin" ? `${e.actor.username} (team)` : e.actor.username) : "—"} · {dateTime(e.createdAt)}
                  </small>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      {dialog === "request_info" && (
        <PromptDialog
          title="Request more information"
          body="The applicant sees this message, gets a notification, and can update the same application and upload documents."
          placeholder="e.g. Please upload the BOAL publication and a clearer copy of the agrément."
          suggestions={[
            "Please upload a clearer copy of the agrément.",
            "Please upload the BOAL publication of the company's incorporation.",
            "The RC number doesn't match the extract. Please check it.",
            "Please upload proof of the manager's qualification, or name the qualified permanent collaborator.",
          ]}
          confirmLabel="Send request"
          onCancel={() => setDialog(null)}
          onConfirm={(m) => decide("request_info", m)}
        />
      )}
      {dialog === "reject" && (
        <PromptDialog
          title={`Reject ${name}?`}
          body="The applicant sees this reason. They can submit a new application later."
          placeholder="Explain why"
          suggestions={[
            "The agrément has expired.",
            "We couldn't verify the agrément with the issuing wilaya.",
            "The documents don't match the agency details.",
          ]}
          confirmLabel="Reject application"
          danger
          onCancel={() => setDialog(null)}
          onConfirm={(m) => decide("reject", m)}
        />
      )}
      {dialog === "approve" && (
        checkedCount < app.checklistItems.length || app.missing.length ? (
          <PromptDialog
            title={`Approve ${name}?`}
            body={`${app.checklistItems.length - checkedCount} checklist item(s) are unticked${app.missing.length ? ` and ${app.missing.length} required item(s) are missing` : ""}. Approving makes this account a verified agency. Add an optional message for the applicant.`}
            placeholder="Optional welcome message"
            required={false}
            confirmLabel="Approve anyway"
            onCancel={() => setDialog(null)}
            onConfirm={(m) => decide("approve", m || undefined)}
          />
        ) : (
          <Confirm
            title={`Approve ${name}?`}
            body="The applicant's account becomes the agency's main account with the verified badge. They're notified straight away."
            confirmLabel="Approve"
            onCancel={() => setDialog(null)}
            onConfirm={() => decide("approve")}
          />
        )
      )}
      {toast}
    </div>
  );
}
