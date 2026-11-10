import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FileText,
  Image as ImageIcon,
  Info,
  Loader2,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import api from "../lib/api";
import { useMember } from "../lib/auth";
import { uploadImage } from "../components/ImageManager";
import { Brand } from "./Login";
import "./application.scss";

const STATUS_TEXT = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  info_required: "Information required",
  resubmitted: "Resubmitted",
  approved: "Approved",
  rejected: "Not approved",
};

// Three short steps. Anything optional sits in a folded "more details" section.
const STEPS = [
  { id: "agency", label: "Your agency" },
  { id: "agrement", label: "Agrément & documents" },
  { id: "send", label: "Send" },
];

const ALL_FIELDS = [
  "entityType", "tradeName", "legalName", "legalForm", "rcNumber", "nif", "nis", "articleImposition",
  "address", "wilaya", "commune", "phone", "email", "website", "logo",
  "repFullName", "repPosition", "repBirthDate", "repNationality", "repIdNumber", "repPhone", "repEmail",
  "approvalNumber", "approvalWilaya", "approvalIssueDate", "approvalExpiryDate",
  "qualifiedPersonName", "qualification", "message",
];
const DATE_FIELDS = ["repBirthDate", "approvalIssueDate", "approvalExpiryDate"];
const AGENCY_STEP_FIELDS = ["tradeName", "legalName", "rcNumber", "wilaya", "phone", "email"];
const AGREMENT_STEP_FIELDS = ["repFullName", "approvalNumber", "approvalWilaya", "approvalIssueDate"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// What still stops a step from being complete: { field: message } for the
// step's required fields (and their format), and the required documents not
// uploaded yet. The API checks the same before the application can be sent.
const stepProblems = (stepId, form, required, requiredKinds, documents) => {
  const fields = stepId === "agency" ? AGENCY_STEP_FIELDS : stepId === "agrement" ? AGREMENT_STEP_FIELDS : [];
  const problems = {};
  for (const k of fields) {
    const v = String(form[k] ?? "").trim();
    if (required.has(k) && !v) problems[k] = "Required";
    else if (v && (k === "email" || k === "repEmail") && !EMAIL_RE.test(v)) problems[k] = "Enter a valid email";
    else if (v && k === "phone" && v.replace(/\D/g, "").length < 9) problems[k] = "Enter a full phone number";
    else if (v && k === "approvalIssueDate" && new Date(v) > new Date()) problems[k] = "This date is in the future";
  }
  const docs = stepId === "agrement" ? requiredKinds.filter((k) => !documents.some((d) => d.kind === k.key)) : [];
  return { fields: problems, docs, count: Object.keys(problems).length + docs.length };
};
const LOCAL_LABELS = { qualifiedPersonName: "Qualified person", qualification: "Diploma or title", message: "Anything we should know?" };

const toForm = (app) =>
  Object.fromEntries(
    ALL_FIELDS.map((k) => [k, DATE_FIELDS.includes(k) ? (app?.[k] ? app[k].slice(0, 10) : "") : app?.[k] ?? (k === "entityType" ? "legal_entity" : "")])
  );

const dateTime = (d) =>
  new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fileSize = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const errorText = (err, fallback) => err?.response?.data?.message || fallback;

function useWilayas() {
  const [list, setList] = useState([]);
  useEffect(() => {
    fetch("/wilaya.json")
      .then((r) => r.json())
      .then(setList)
      .catch(() => {});
  }, []);
  return list;
}

// The only screen an agency account sees until its agency is approved:
// follow the application, edit it when asked, upload documents, send it.
export default function ApplicationPage() {
  const { member, logout, refresh } = useMember();
  const navigate = useNavigate();
  const [reqs, setReqs] = useState(null);
  const [app, setApp] = useState(undefined); // undefined = loading, null = none
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  const load = useCallback(() => {
    setError("");
    Promise.all([api.get("/application/requirements"), api.get("/application")])
      .then(([r, mine]) => {
        setReqs(r.data);
        setApp(mine.data[0] || null);
      })
      .catch((err) => {
        // approved since the page opened: the workspace takes over
        if (err.response?.data?.approved) return refresh().then(() => navigate("/overview", { replace: true }));
        setError(errorText(err, "We couldn't load your application. Please refresh."));
      });
  }, [refresh, navigate]);
  useEffect(load, [load]);

  const start = async () => {
    setStarting(true);
    setError("");
    try {
      const res = await api.post("/application", { email: member?.email });
      setApp(res.data);
    } catch (err) {
      setError(errorText(err, "We couldn't start your application."));
    } finally {
      setStarting(false);
    }
  };

  const openWorkspace = async () => {
    await refresh();
    navigate("/overview", { replace: true });
  };

  const editable = app && ["draft", "info_required"].includes(app.status);

  let body;
  if (error && app === undefined) {
    body = (
      <p className="error-text" role="alert">
        {error}
      </p>
    );
  } else if (app === undefined || !reqs) {
    body = (
      <p className="loading">
        <Loader2 size={18} className="spin" /> Loading…
      </p>
    );
  } else if (!app || app.status === "rejected") {
    body = (
      <>
        {app?.status === "rejected" && <StatusPanel app={app} />}
        <Intro reqs={reqs} />
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        {!reqs.acceptApplications ? (
          <p className="notice">We're not accepting new agency applications right now. Please check back soon.</p>
        ) : (
          <button className="btn btn-primary" onClick={start} disabled={starting}>
            {starting && <Loader2 size={16} className="spin" />}
            {app ? "Start a new application" : "Start my application"}
          </button>
        )}
      </>
    );
  } else if (editable) {
    body = (
      <>
        {app.status === "info_required" && <StatusPanel app={app} />}
        <ApplicationForm app={app} setApp={setApp} reqs={reqs} />
      </>
    );
  } else {
    body = <StatusPanel app={app} showDocuments onOpenWorkspace={openWorkspace} />;
  }

  return (
    <div className="applicantPage">
      <header className="applicantTop">
        <Brand />
        <div className="who">
          <span>{member?.email}</span>
          <button className="btn-link" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <div className="agencyApply">
        <header className="applyHead">
          <h1 className="page-title">Your agency application</h1>
          <p className="page-subtitle">
            Bayti verifies every agency before it can publish. Your workspace opens here as soon as your application is
            approved.
          </p>
        </header>
        {body}
      </div>
    </div>
  );
}

function Intro({ reqs }) {
  const required = reqs.documents.filter((d) => d.required);
  return (
    <section className="introCard">
      <h2>What you&rsquo;ll need</h2>
      <ul className="needList">
        {required.map((d) => (
          <li key={d.key}>
            <Check size={15} /> {d.label}
          </li>
        ))}
        <li>
          <Check size={15} /> Your agrément number, its issue date and the issuing wilaya
        </li>
      </ul>
      <p className="muted">A photo or a PDF of each document is enough. Everything else is optional: we&rsquo;ll ask if we need more.</p>
      <p className="legalNote">
        <Info size={15} />
        <span>
          Bayti checks your existing authorization; it does not grant one. Only the wilaya can issue an agrément (Décret exécutif 09-18, as amended by
          Décret 19-242).
        </span>
      </p>
    </section>
  );
}

function StatusPanel({ app, showDocuments, onOpenWorkspace }) {
  const icon = {
    approved: <CheckCircle2 size={22} />,
    rejected: <XCircle size={22} />,
    info_required: <AlertCircle size={22} />,
  }[app.status] || <Clock size={22} />;
  const headline = {
    submitted: "We've received your application",
    resubmitted: "We've received your update",
    under_review: "Our team is reviewing your application",
    info_required: "We need a bit more from you",
    approved: "Your agency is verified",
    rejected: "Your application was not approved",
  }[app.status];
  const body = {
    submitted: "We'll check your documents and let you know here and by email. This usually takes a few business days.",
    resubmitted: "Thanks. We'll pick it up again and let you know.",
    under_review: "We may contact the issuing wilaya to confirm your agrément. You'll be notified of the decision here.",
    info_required: "Update your answers or add documents below, then send the application back. You don't need to start over.",
    approved: "Your account is now the agency's main account. Open your workspace to add agents and publish.",
    rejected: "You can start a new application once the issue is resolved.",
  }[app.status];

  return (
    <section className={`statusPanel s-${app.status}`}>
      <div className="statusTop">
        {icon}
        <div>
          <h2>{headline}</h2>
          <p>{body}</p>
        </div>
      </div>
      {app.status === "info_required" && app.requestMessage && (
        <blockquote>
          <strong>Message from the Bayti team</strong>
          {app.requestMessage}
        </blockquote>
      )}
      {["approved", "rejected"].includes(app.status) && app.decisionNote && (
        <blockquote>
          <strong>{app.status === "rejected" ? "Reason" : "Message from the Bayti team"}</strong>
          {app.decisionNote}
        </blockquote>
      )}
      {app.status === "approved" && onOpenWorkspace && (
        <button className="btn btn-dark btn-sm" onClick={onOpenWorkspace}>
          Open the agency workspace
        </button>
      )}

      {showDocuments && (
        <div className="submittedDocs">
          <h3>Documents on file</h3>
          <DocumentRows app={app} docs={app.documents} />
        </div>
      )}

      <h3>History</h3>
      <ol className="history">
        {[...app.events].reverse().map((e) => (
          <li key={e.id}>
            <strong>
              {e.type === "status"
                ? STATUS_TEXT[e.toStatus]
                : e.type === "created"
                ? "Application started"
                : e.type === "edited"
                ? "Details updated"
                : "Documents uploaded"}
              {e.by === "team" && <span className="by"> · Bayti team</span>}
            </strong>
            {e.message && <p>{e.message}</p>}
            <small>{dateTime(e.createdAt)}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Private files are fetched with the session cookie and opened from a blob URL
const openDoc = async (app, doc, download) => {
  const res = await api.get(`/application/${app.id}/documents/${doc.id}`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  if (download) {
    const a = Object.assign(document.createElement("a"), { href: url, download: doc.originalName });
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else {
    window.open(url, "_blank", "noopener");
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

function DocumentRows({ app, docs, onRemove, removable }) {
  if (!docs.length) return <p className="muted">No files yet.</p>;
  return (
    <ul className="docRows">
      {docs.map((d) => (
        <li key={d.id}>
          {d.mimeType === "application/pdf" ? <FileText size={18} /> : <ImageIcon size={18} />}
          <button type="button" className="docName" onClick={() => openDoc(app, d)}>
            {d.originalName}
          </button>
          <span className="muted">{fileSize(d.size)}</span>
          <button type="button" className="iconBtn" aria-label={`Download ${d.originalName}`} onClick={() => openDoc(app, d, true)}>
            <Download size={16} />
          </button>
          {onRemove && removable(d) && (
            <button type="button" className="iconBtn" aria-label={`Remove ${d.originalName}`} onClick={() => onRemove(d)}>
              <Trash2 size={16} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

// Folded section for optional extras
function More({ title, children, open }) {
  return (
    <details className="more" open={open}>
      <summary>
        {title} <span className="opt">(optional)</span>
        <ChevronDown size={16} />
      </summary>
      <div className="moreBody">{children}</div>
    </details>
  );
}

function ApplicationForm({ app, setApp, reqs }) {
  const [form, setForm] = useState(() => toForm(app));
  // Steps where the person tried to continue: their problems are shown
  const [shown, setShown] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [missing, setMissing] = useState([]);
  const wilayas = useWilayas();
  const top = useRef(null);

  const labels = { ...reqs.fieldLabels, ...LOCAL_LABELS };
  const required = useMemo(
    () => new Set([...reqs.requiredFields.common, ...(reqs.requiredFields[form.entityType] || [])]),
    [reqs, form.entityType]
  );
  const kinds = reqs.documents.filter((d) => d.appliesTo.includes(form.entityType));
  const requiredKinds = kinds.filter((k) => k.required);
  const optionalKinds = kinds.filter((k) => !k.required);
  const dirty = ALL_FIELDS.some((k) => form[k] !== toForm(app)[k]);
  const filled = (keys) => keys.some((k) => form[k]);
  const problemsAt = (i) => stepProblems(STEPS[i].id, form, required, requiredKinds, app.documents);
  // A step can be opened once every step before it is complete
  const reachable = (i) => STEPS.slice(0, i).every((_, j) => problemsAt(j).count === 0);
  // Pick up where they left off: the first step that isn't complete
  const [step, setStep] = useState(() => {
    const first = STEPS.findIndex((_, i) => stepProblems(STEPS[i].id, toForm(app), required, requiredKinds, app.documents).count > 0);
    return first === -1 ? STEPS.length - 1 : first;
  });
  const current = problemsAt(step);
  const showing = shown[step] ? current : { fields: {}, docs: [], count: 0 };

  const save = async () => {
    if (!dirty) return true;
    setSaving(true);
    setError("");
    try {
      const res = await api.put(`/application/${app.id}`, form);
      setApp(res.data);
      setSavedAt(new Date());
      return true;
    } catch (err) {
      setError(errorText(err, "We couldn't save your answers."));
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Moving forward needs the steps in between to be complete; going back is
  // always allowed. Answers are saved either way, so nothing is lost.
  const go = async (next) => {
    if (next > step) {
      const blocked = STEPS.slice(step, next).findIndex((_, j) => problemsAt(step + j).count > 0);
      if (blocked !== -1) {
        const at = step + blocked;
        await save();
        setShown((s) => ({ ...s, [at]: true }));
        setStep(at);
        setError("");
        // bring the first thing to fix into view
        requestAnimationFrame(() => {
          const el = document.querySelector(".applyForm .invalid input, .applyForm .invalid select, .applyForm .docKind.invalid");
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          if (el?.focus && el.tagName !== "LI") el.focus({ preventScroll: true });
        });
        return;
      }
    }
    if (await save()) {
      setStep(next);
      setMissing([]);
      top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const submit = async () => {
    if (!(await save())) return;
    setSubmitting(true);
    setError("");
    setMissing([]);
    try {
      const res = await api.post(`/application/${app.id}/submit`, { message: message || undefined });
      setApp(res.data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(errorText(err, "We couldn't send your application."));
      setMissing(err.response?.data?.missing || []);
    } finally {
      setSubmitting(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const field = (k, props = {}) => {
    const problem = showing.fields[k];
    return (
      <div className={`field ${props.wide ? "wide" : ""} ${problem ? "invalid" : ""}`}>
        <label htmlFor={k}>
          {props.label || labels[k]}
          {required.has(k) ? <span className="req"> *</span> : !props.inMore && <span className="opt"> (optional)</span>}
        </label>
        {props.children || (
          <input
            id={k}
            value={form[k]}
            onChange={set(k)}
            type={props.type || "text"}
            autoComplete="off"
            placeholder={props.placeholder}
            maxLength={190}
            aria-invalid={problem ? true : undefined}
            aria-describedby={problem ? `${k}-error` : undefined}
          />
        )}
        {problem ? (
          <small className="fieldError" id={`${k}-error`}>
            <AlertCircle size={13} /> {problem}
          </small>
        ) : (
          props.hint && <small className="hint">{props.hint}</small>
        )}
      </div>
    );
  };
  const wilayaSelect = (k) => (
    <select id={k} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value, ...(k === "wilaya" ? { commune: "" } : {}) }))}>
      <option value="">Choose a wilaya</option>
      {wilayas.map((w) => (
        <option key={w.name}>{w.name}</option>
      ))}
    </select>
  );
  const communes = wilayas.find((w) => w.name === form.wilaya)?.dairats || [];
  const isCompany = form.entityType === "legal_entity";
  const removable = (lastRequest) => (d) =>
    app.status === "draft" || (lastRequest && new Date(d.createdAt) > new Date(lastRequest.createdAt));

  return (
    <div className="applyForm" ref={top}>
      <ol className="stepper" aria-label="Application steps">
        {STEPS.map((s, i) => {
          const complete = i < STEPS.length - 1 && problemsAt(i).count === 0;
          const locked = i > step && !reachable(i);
          return (
            <li key={s.id} className={`${i === step ? "current" : complete ? "done" : ""} ${locked ? "locked" : ""}`}>
              <button
                type="button"
                onClick={() => go(i)}
                disabled={locked}
                aria-current={i === step ? "step" : undefined}
                title={locked ? "Complete the previous steps first" : undefined}
              >
                <span className="num">{complete && i !== step ? <Check size={13} /> : i + 1}</span>
                {s.label}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="stepCount muted">
        Step {step + 1} of {STEPS.length}
        {step < STEPS.length - 1 &&
          (current.count === 0 ? " · complete" : ` · ${current.count} required item${current.count > 1 ? "s" : ""} left`)}
      </p>

      {STEPS[step].id === "agency" && (
        <section className="stepCard">
          <h2>Your agency</h2>
          <div className="segChoice" role="radiogroup" aria-label="The agrément is held by">
            {[
              ["legal_entity", "A company"],
              ["natural_person", "An individual"],
            ].map(([v, title]) => (
              <label key={v} className={form.entityType === v ? "active" : ""}>
                <input type="radio" name="entityType" value={v} checked={form.entityType === v} onChange={set("entityType")} />
                {title}
              </label>
            ))}
          </div>
          <div className="grid2">
            {field("tradeName", { label: "Agency name", hint: "The name shown on Bayti." })}
            {field("legalName", { label: isCompany ? "Legal name" : "Your full legal name", hint: "As on the Registre de Commerce extract." })}
            {field("rcNumber", { label: "RC number", placeholder: "e.g. 16/00-1234567B21" })}
            {field("wilaya", { children: wilayaSelect("wilaya") })}
            {field("phone", { type: "tel" })}
            {field("email", { label: "Business email", type: "email" })}
          </div>
          <More title="More details" open={filled(["commune", "address", "legalForm", "nif", "nis", "articleImposition", "website", "logo"])}>
            <div className="grid2">
              {field("commune", {
                inMore: true,
                children: (
                  <>
                    <input id="commune" list="communes" value={form.commune} onChange={set("commune")} autoComplete="off" disabled={!form.wilaya} />
                    <datalist id="communes">
                      {communes.map((c) => (
                        <option key={c.code} value={c.name} />
                      ))}
                    </datalist>
                  </>
                ),
              })}
              {field("address", { inMore: true })}
              {isCompany &&
                field("legalForm", {
                  inMore: true,
                  children: (
                    <select id="legalForm" value={form.legalForm} onChange={set("legalForm")}>
                      <option value="">Choose</option>
                      {reqs.legalForms.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  ),
                })}
              {field("nif", { inMore: true })}
              {field("nis", { inMore: true })}
              {field("articleImposition", { inMore: true })}
              {field("website", { inMore: true, placeholder: "https://", wide: true })}
              <div className="field wide">
                <label>Agency logo</label>
                <div className="logoRow">
                  {form.logo && <img src={form.logo} alt="Agency logo" />}
                  <label className="btn btn-outline btn-sm">
                    {form.logo ? "Replace logo" : "Upload logo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        try {
                          const url = await uploadImage(file, "agency-logos");
                          setForm((f) => ({ ...f, logo: url }));
                        } catch (err) {
                          setError(err.message);
                        }
                      }}
                    />
                  </label>
                  {form.logo && (
                    <button type="button" className="btn-link" onClick={() => setForm((f) => ({ ...f, logo: "" }))}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </More>
        </section>
      )}

      {STEPS[step].id === "agrement" && (
        <section className="stepCard">
          <h2>Agrément &amp; documents</h2>
          <div className="grid2">
            {field("repFullName", { label: isCompany ? "Manager's full name" : "Your full name", hint: "The person the agrément or company is registered to." })}
            {field("approvalNumber")}
            {field("approvalWilaya", { children: wilayaSelect("approvalWilaya") })}
            {field("approvalIssueDate", { label: "Issue date", type: "date" })}
          </div>

          <ul className="docKinds">
            {requiredKinds.map((k) => (
              <DocumentKind
                key={k.key}
                kind={k}
                app={app}
                setApp={setApp}
                removable={removable}
                invalid={showing.docs.some((d) => d.key === k.key)}
              />
            ))}
          </ul>
          <p className="muted small">PDF, JPG or PNG up to 10 MB. Files are private: only the Bayti verification team can open them.</p>

          <More title="More about the agrément and the manager" open={filled(["approvalExpiryDate", "repPosition", "repBirthDate", "repNationality", "repIdNumber", "repPhone", "repEmail", "qualifiedPersonName", "qualification"])}>
            <div className="grid2">
              {field("approvalExpiryDate", { inMore: true, type: "date", hint: "If shown on the certificate." })}
              {field("repPosition", { inMore: true, placeholder: isCompany ? "e.g. Gérant" : "e.g. Owner" })}
              {field("repBirthDate", { inMore: true, type: "date" })}
              {field("repNationality", { inMore: true })}
              {field("repIdNumber", { inMore: true })}
              {field("repPhone", { inMore: true, type: "tel" })}
              {field("repEmail", { inMore: true, type: "email" })}
              {isCompany && field("qualifiedPersonName", { inMore: true, hint: "If the manager doesn't hold the diploma, who does (art. 10)." })}
              {field("qualification", { inMore: true })}
            </div>
          </More>

          <More title="Other documents" open={app.documents.some((d) => optionalKinds.some((k) => k.key === d.kind))}>
            <ul className="docKinds">
              {optionalKinds.map((k) => (
                <DocumentKind key={k.key} kind={k} app={app} setApp={setApp} removable={removable} />
              ))}
            </ul>
          </More>
        </section>
      )}

      {STEPS[step].id === "send" && (
        <section className="stepCard">
          <h2>{app.status === "info_required" ? "Send your update" : "Send your application"}</h2>
          {app.missing.length > 0 ? (
            <div className="missingBox" role="status">
              <strong>Still needed:</strong>
              <ul>
                {app.missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              <button
                type="button"
                className="btn-link"
                // first step if anything from it is missing, otherwise the agrément step
                onClick={() => go(AGENCY_STEP_FIELDS.some((k) => app.missing.includes(reqs.fieldLabels[k])) ? 0 : 1)}
              >
                Go back and add them
              </button>
            </div>
          ) : (
            <p className="readyBox">
              <CheckCircle2 size={18} /> Everything required is there.
            </p>
          )}
          <dl className="summary">
            {["tradeName", "legalName", "rcNumber", "wilaya", "phone", "email", "repFullName", "approvalNumber", "approvalWilaya", "approvalIssueDate"]
              .filter((k) => form[k])
              .map((k) => (
                <div key={k}>
                  <dt>{labels[k]}</dt>
                  <dd>{form[k]}</dd>
                </div>
              ))}
            <div>
              <dt>Documents</dt>
              <dd>{app.documents.length} file(s)</dd>
            </div>
          </dl>
          {app.status === "info_required" ? (
            <div className="field">
              <label htmlFor="resubmitNote">
                Note for the team <span className="opt">(optional)</span>
              </label>
              <textarea id="resubmitNote" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. I've added the BOAL publication." />
            </div>
          ) : (
            field("message", {
              wide: true,
              children: <textarea id="message" rows={3} value={form.message} onChange={set("message")} maxLength={3000} />,
            })
          )}
          <p className="legalNote">
            <Info size={15} />
            <span>By sending this you confirm the information is accurate. Bayti verifies your authorization; it does not issue an agrément.</span>
          </p>
        </section>
      )}

      {showing.count > 0 && (
        <div className="alert" role="alert">
          <AlertCircle size={16} />
          <div>
            Complete this step to continue:
            <ul>
              {Object.keys(showing.fields).map((k) => (
                <li key={k}>
                  {labels[k]}: {showing.fields[k].toLowerCase()}
                </li>
              ))}
              {showing.docs.map((d) => (
                <li key={d.key}>{d.label}: upload a file</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {(error || missing.length > 0) && (
        <div className="alert" role="alert">
          <AlertCircle size={16} />
          <div>
            {error}
            {missing.length > 0 && (
              <ul>
                {missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="stepActions">
        {step > 0 ? (
          <button type="button" className="btn btn-outline" onClick={() => go(step - 1)} disabled={saving}>
            Back
          </button>
        ) : (
          <span />
        )}
        <span className="saveState muted">{saving ? "Saving…" : savedAt ? "Saved" : ""}</span>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            className={`btn btn-dark ${current.count > 0 ? "incomplete" : ""}`}
            onClick={() => go(step + 1)}
            disabled={saving}
            aria-describedby={current.count > 0 ? "stepHint" : undefined}
          >
            {saving && <Loader2 size={16} className="spin" />} Continue
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={submit} disabled={submitting || saving || app.missing.length > 0}>
            {submitting && <Loader2 size={16} className="spin" />}
            {app.status === "info_required" ? "Send the update" : "Send application"}
          </button>
        )}
      </div>
    </div>
  );
}

function DocumentKind({ kind, app, setApp, removable, invalid }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef(null);
  const docs = app.documents.filter((d) => d.kind === kind.key);
  const lastRequest = [...app.events].reverse().find((e) => e.toStatus === "info_required");
  const canRemove = removable(lastRequest);

  const upload = async (files) => {
    if (!files?.length) return;
    const tooBig = [...files].find((f) => f.size > 10 * 1024 * 1024);
    if (tooBig) return setError(`${tooBig.name} is larger than 10 MB.`);
    const form = new FormData();
    form.append("kind", kind.key);
    [...files].forEach((f) => form.append("files", f));
    setBusy(true);
    setError("");
    try {
      const res = await api.post(`/application/${app.id}/documents`, form);
      setApp(res.data);
    } catch (err) {
      setError(errorText(err, "The upload failed. Please try again."));
    } finally {
      setBusy(false);
      input.current.value = "";
    }
  };

  const remove = async (d) => {
    try {
      const res = await api.delete(`/application/${app.id}/documents/${d.id}`);
      setApp(res.data);
    } catch (err) {
      setError(errorText(err, "Couldn't remove the file."));
    }
  };

  return (
    <li className={`docKind ${docs.length ? "has" : ""} ${invalid && !docs.length ? "invalid" : ""}`}>
      <div className="docKindHead">
        <span className="docState">{docs.length ? <Check size={14} /> : null}</span>
        <div>
          <strong>
            {kind.label}
            {kind.required && <span className="req"> *</span>}
          </strong>
          <small>{kind.hint}</small>
        </div>
        <label className={`btn btn-outline btn-sm ${busy ? "busy" : ""}`}>
          {busy ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
          {busy ? "Uploading…" : docs.length ? "Add file" : "Upload"}
          <input
            ref={input}
            type="file"
            hidden
            multiple
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            disabled={busy}
            onChange={(e) => upload(e.target.files)}
          />
        </label>
      </div>
      {docs.length > 0 && <DocumentRows app={app} docs={docs} onRemove={remove} removable={canRemove} />}
      {error && <p className="error-text">{error}</p>}
    </li>
  );
}
