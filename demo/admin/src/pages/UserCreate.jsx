import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Building2, Briefcase, Copy, Loader2, ShieldCheck, User } from "lucide-react";
import api, { errorMessage } from "../lib/api";
import { BackLink, Field, PageHead, useToast } from "../components/ui";
import { uploadImage, UPLOADS_ENABLED } from "../components/ImageManager";
import { invalidateUsers } from "../components/UserPicker";
import AgencyFields, { EMPTY_AGENCY } from "../components/AgencyFields";

const TYPES = [
  { value: "client", label: "Individual", icon: User, hint: "A person who browses, saves and posts their own listings." },
  { value: "agent", label: "Agent", icon: Briefcase, hint: "Works for an agency; their listings appear under it." },
  { value: "agency", label: "Agency", icon: Building2, hint: "The main account of a real estate agency, with its legal record." },
  { value: "admin", label: "Administrator", icon: ShieldCheck, hint: "Bayti staff with full access to this dashboard." },
];

export default function UserCreate() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [type, setType] = useState(params.get("type") || "client");
  const [form, setForm] = useState({ username: "", email: "", password: "", phone: "", avatar: "", verified: false });
  const [agency, setAgency] = useState(EMPTY_AGENCY);
  const [agencyId, setAgencyId] = useState(params.get("agency") || "");
  const [agencyRole, setAgencyRole] = useState("agent");
  const [agencies, setAgencies] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [toast, notify] = useToast();

  useEffect(() => {
    api.get("/agencies").then((res) => setAgencies(res.data)).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post("/users", {
        accountType: type,
        ...form,
        agencyId: type === "agent" ? agencyId : undefined,
        agencyRole: type === "agent" ? agencyRole : undefined,
        agency: type === "agency" ? agency : undefined,
      });
      invalidateUsers();
      if (data.resetLink) setCreated(data);
      else navigate(`/users/${data.user.id}`);
    } catch (err) {
      setError(errorMessage(err, "Couldn't create the account."));
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <div className="admin-dashboard backoffice narrow">
        <PageHead title="Account created" subtitle={`${created.user.username} can now sign in once they set a password.`} />
        <section className="card">
          <p>
            {created.emailed
              ? "We emailed them a link to choose their password. You can also send this link another way:"
              : "Email isn't configured, so send them this one-time link yourself. It works for one hour:"}
          </p>
          <div className="copyRow">
            <input readOnly value={created.resetLink} onFocus={(e) => e.target.select()} aria-label="Password link" />
            <button
              className="btn btn-outline btn-sm"
              onClick={() => navigator.clipboard.writeText(created.resetLink).then(() => notify("Link copied."))}
            >
              <Copy size={15} /> Copy
            </button>
          </div>
          <div className="formActions">
            <Link className="btn btn-dark btn-sm" to={`/users/${created.user.id}`}>
              Open the account
            </Link>
          </div>
        </section>
        {toast}
      </div>
    );
  }

  return (
    <div className="admin-dashboard listingPage backoffice narrow">
      <BackLink to="/users">All users</BackLink>
      <PageHead title="New account" subtitle="Create an account on someone's behalf. The fields change with the account type." />

      <form onSubmit={submit} className="stack">
        <fieldset className="typeCards">
          <legend>Account type</legend>
          {TYPES.map(({ value, label, icon: Icon, hint }) => (
            <label key={value} className={type === value ? "active" : ""}>
              <input type="radio" name="type" value={value} checked={type === value} onChange={() => setType(value)} />
              <Icon size={20} />
              <strong>{label}</strong>
              <span>{hint}</span>
            </label>
          ))}
        </fieldset>

        <section className="card">
          <h2>Sign-in details</h2>
          <div className="formGrid">
            <Field label="Username" htmlFor="username" required>
              <input id="username" value={form.username} onChange={set("username")} minLength={3} required autoComplete="off" />
            </Field>
            <Field label="Email" htmlFor="email" required>
              <input id="email" type="email" value={form.email} onChange={set("email")} required autoComplete="off" />
            </Field>
            <Field
              label="Password"
              htmlFor="password"
              span={2}
              hint="Leave empty to send them a link to choose their own (recommended)."
            >
              <input id="password" type="password" value={form.password} onChange={set("password")} minLength={8} autoComplete="new-password" />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <input id="phone" type="tel" value={form.phone} onChange={set("phone")} />
            </Field>
            <Field label="Profile picture" htmlFor="avatar" span={2}>
              <div className="avatarRow">
                <img src={form.avatar || "/noavatar.jpg"} alt="" />
                <label className={`btn btn-outline btn-sm ${!UPLOADS_ENABLED || uploading ? "disabled" : ""}`}>
                  {uploading && <Loader2 size={15} className="spin" />}
                  {uploading ? "Uploading…" : "Upload"}
                  <input
                    id="avatar"
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
            {type !== "admin" && (
              <label className="checkRow span2">
                <input type="checkbox" checked={form.verified} onChange={set("verified")} />
                Mark as verified{type === "agency" ? " (documents already checked)" : ""}
              </label>
            )}
          </div>
        </section>

        {type === "agent" && (
          <section className="card">
            <h2>Agency</h2>
            <div className="formGrid">
              <Field label="Works for" htmlFor="agencyId" required>
                <select id="agencyId" value={agencyId} onChange={(e) => setAgencyId(e.target.value)} required>
                  <option value="">Choose an agency</option>
                  {agencies.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.tradeName}
                      {a.status === "suspended" ? " (suspended)" : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Role in the agency" htmlFor="agencyRole">
                <select id="agencyRole" value={agencyRole} onChange={(e) => setAgencyRole(e.target.value)}>
                  <option value="agent">Agent</option>
                  <option value="manager">Manager (can manage agents)</option>
                </select>
              </Field>
            </div>
            <p className="muted small">
              To add someone who already has an account, open their profile instead and change their type. That avoids duplicate accounts.
            </p>
          </section>
        )}

        {type === "agency" && (
          <section className="card">
            <h2>Agency record</h2>
            <p className="muted small">
              Only the names are required here; you can complete the legal details later from the agency page.
            </p>
            <AgencyFields value={agency} onChange={setAgency} />
          </section>
        )}

        {type === "admin" && (
          <p className="callout warn">
            Administrators can see private documents, change any account and delete data. Only create staff accounts for people on the Bayti team.
          </p>
        )}

        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="formActions">
          <Link to="/users" className="btn-link">
            Cancel
          </Link>
          <button className="btn btn-dark btn-sm" disabled={busy}>
            {busy && <Loader2 size={15} className="spin" />}
            Create account
          </button>
        </div>
      </form>
      {toast}
    </div>
  );
}
