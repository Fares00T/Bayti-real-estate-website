import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { INQUIRY_STATUS, STATUS } from "../lib/format";

// kind="inquiry" uses inquiry wording ("Visit confirmed", not a listing state)
export function StatusPill({ status, label, kind }) {
  const [text, tone] = (kind === "inquiry" ? INQUIRY_STATUS[status] : STATUS[status]) || [status, "muted"];
  return <span className={`statusPill tone-${tone} ${status}`}>{label || text}</span>;
}

export function Stat({ value, label, to }) {
  const body = (
    <>
      <strong>{value}</strong>
      <span>{label}</span>
    </>
  );
  return to ? (
    <Link to={to} className="stat statLink">
      {body}
    </Link>
  ) : (
    <div className="stat">{body}</div>
  );
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="emptyState">
      {Icon && <Icon size={26} strokeWidth={1.6} />}
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}

export function BackLink({ to, children }) {
  return (
    <Link to={to} className="backLink">
      <ArrowLeft size={16} /> {children}
    </Link>
  );
}

export function PageHead({ title, subtitle, children }) {
  return (
    <header className="pageHead">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="headActions">{children}</div>}
    </header>
  );
}

export function Spinner({ label = "Loading…" }) {
  return (
    <p className="muted loadingLine">
      <Loader2 size={16} className="spin" /> {label}
    </p>
  );
}

// Closes on Escape and on a click outside the dialog
export function Modal({ title, onClose, children, wide, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className={`modal-content ${wide ? "wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        {title && <h3>{title}</h3>}
        {children}
        {footer && <div className="modal-actions">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ title, body, confirmLabel, danger, onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn-link" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`btn btn-sm ${danger ? "btn-danger-solid" : "btn-dark"}`}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 size={15} className="spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      {body && <p>{body}</p>}
    </Modal>
  );
}

// Asks for a required (or optional) piece of text before running an action
export function PromptDialog({ title, body, label, placeholder, confirmLabel, danger, required = true, suggestions = [], onCancel, onConfirm }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (required && !text.trim()) return;
    setBusy(true);
    try {
      await onConfirm(text.trim());
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={title} onClose={onCancel}>
      <form className="promptForm" onSubmit={submit}>
        {body && <p>{body}</p>}
        {suggestions.length > 0 && (
          <div className="quickReasons">
            {suggestions.map((s) => (
              <button type="button" key={s} onClick={() => setText(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        <label className="visually-hidden" htmlFor="promptText">
          {label || title}
        </label>
        <textarea
          id="promptText"
          autoFocus
          rows={4}
          maxLength={3000}
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="modal-actions">
          <button type="button" className="btn-link" onClick={onCancel}>
            Cancel
          </button>
          <button className={`btn btn-sm ${danger ? "btn-danger-solid" : "btn-dark"}`} disabled={busy || (required && !text.trim())}>
            {busy && <Loader2 size={15} className="spin" />}
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// const [toast, notify] = useToast(); notify("Saved"); notify("Failed", true)
export function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const notify = useCallback((message, error = false) => {
    clearTimeout(timer.current);
    setToast({ message, error });
    timer.current = setTimeout(() => setToast(null), error ? 6000 : 3500);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const node = toast && (
    <div className={`toast ${toast.error ? "error" : ""}`} role={toast.error ? "alert" : "status"}>
      {toast.message}
    </div>
  );
  return [node, notify];
}

// Label + control in the shared .field style
export function Field({ label, htmlFor, hint, span, children, required }) {
  return (
    <div className={`field ${span ? `span${span}` : ""}`}>
      <label htmlFor={htmlFor}>
        {label}
        {required && <span className="req" aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && <small className="hint">{hint}</small>}
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="segTabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          className={value === t.value ? "active" : ""}
          onClick={() => onChange(t.value)}
        >
          {t.label}
          {t.count > 0 && <span className="tabCount">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
