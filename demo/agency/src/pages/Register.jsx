import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Loader2, UserRound } from "lucide-react";
import api, { MARKETPLACE_URL, errorMessage } from "../lib/api";
import { useMember } from "../lib/auth";
import { Brand } from "./Login";
import "./login.scss";

const STEPS = [
  ["Create your agency account", "It signs in here, on the agency platform, never on the marketplace."],
  ["Complete your application", "Your agency's details, your agrément and your Registre de Commerce extract."],
  ["Bayti reviews it", "We may ask for more. Once approved, this same account opens your workspace."],
];

// Registering an agency opens an agency account with a draft application.
// Until Bayti approves it, the account can only follow and edit that
// application.
export default function Register() {
  const { member, checking, setMember } = useMember();
  const navigate = useNavigate();
  const [form, setForm] = useState({ tradeName: "", username: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [signIn, setSignIn] = useState(false);
  // The email belongs to a personal (marketplace) account: offer to turn it
  // into the agency's account instead of a dead end
  const [convert, setConvert] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (!checking && member) return <Navigate to={member.applicant ? "/application" : "/overview"} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSignIn(false);
    try {
      const res = await api.post("/auth/register", form);
      setMember(res.data.user);
      navigate("/application", { replace: true });
    } catch (err) {
      if (err.response?.data?.code === "PERSONAL_ACCOUNT") {
        setConvert(true);
        setBusy(false);
        return;
      }
      setError(errorMessage(err, "We couldn't create your account. Please try again."));
      setSignIn(Boolean(err.response?.data?.login));
      setBusy(false);
    }
  };

  // One screen, no scrolling: how it works on the left, the form on the right
  return (
    <div className="loginPage">
      <div className="registerCard">
        <aside className="registerIntro">
          <Brand />
          <div>
            <h1>Register your agency</h1>
            <p className="lead">Agencies publish on Bayti once we&rsquo;ve verified their agrément.</p>
          </div>
          <ol className="registerSteps">
            {STEPS.map(([title, text], i) => (
              <li key={title}>
                <span aria-hidden="true">{i + 1}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="stepsShort">Create your account · complete your application · Bayti reviews it</p>
        </aside>

      {convert ? (
        <ConvertAccount
          email={form.email}
          tradeName={form.tradeName}
          onDone={(user) => {
            setMember(user);
            navigate("/application", { replace: true });
          }}
          onBack={() => setConvert(false)}
        />
      ) : (
      <form className="registerForm" onSubmit={submit}>
        <h2>Create your agency account</h2>
        {error && (
          <p className="loginError" role="alert">
            {error} {signIn && <Link to={`/login?email=${encodeURIComponent(form.email)}`}>Sign in</Link>}
          </p>
        )}

        <div className="registerFields">
          <div className="field">
            <label htmlFor="tradeName">Agency name</label>
            <input id="tradeName" value={form.tradeName} onChange={set("tradeName")} required maxLength={190} autoComplete="organization" />
          </div>
          <div className="field">
            <label htmlFor="username">Your name</label>
            <input id="username" value={form.username} onChange={set("username")} required minLength={3} maxLength={60} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="email">Agency email</label>
            <input id="email" type="email" value={form.email} onChange={set("email")} required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={set("password")}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="6 characters or more"
            />
          </div>
        </div>

        <button className="btn btn-dark submit" disabled={busy}>
          {busy && <Loader2 size={16} className="spin" />}
          {busy ? "Creating your account…" : "Create agency account"}
        </button>

        <p className="switchLine">
          Already registered? <Link to="/login">Sign in</Link>
        </p>

        <a className="otherDoor" href={`${MARKETPLACE_URL}/register`}>
          <UserRound size={17} />
          <span>
            <strong>Not an agency?</strong> Create a personal account on the marketplace
          </span>
        </a>
      </form>
      )}
      </div>
    </div>
  );
}

// Someone who signed up on the marketplace by mistake: their personal account
// becomes the agency's account once they confirm its password
function ConvertAccount({ email, tradeName, onDone, onBack }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api.post("/auth/convert", { email, password, tradeName });
      onDone(res.data.user);
    } catch (err) {
      setError(errorMessage(err, "We couldn't change your account. Please try again."));
      setBusy(false);
    }
  };

  return (
    <form className="registerForm convertForm" onSubmit={submit}>
      <h2>This email already has a personal Bayti account</h2>
      <p className="convertLead">
        <strong>{email}</strong> was registered on the marketplace. If it&rsquo;s yours, you can turn it into your
        agency&rsquo;s account instead of creating another one.
      </p>
      <ul className="convertFacts">
        <li>It will sign in here, on the agency platform, and no longer on the marketplace.</li>
        <li>Your name, email and password stay the same.</li>
        <li>Listings still on the market must be archived from your profile first.</li>
      </ul>
      {error && (
        <p className="loginError" role="alert">
          {error}
        </p>
      )}
      <div className="field">
        <label htmlFor="convertPassword">Password of that account</label>
        <input
          id="convertPassword"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          autoFocus
        />
      </div>
      <button className="btn btn-dark submit" disabled={busy || !password}>
        {busy && <Loader2 size={16} className="spin" />}
        {busy ? "Changing your account…" : "Turn it into an agency account"}
      </button>
      <p className="switchLine">
        <button type="button" className="btn-link" onClick={onBack}>
          Use a different email instead
        </button>
        {MARKETPLACE_URL && (
          <>
            {" · "}
            <a href={`${MARKETPLACE_URL}/forgot-password`}>Forgot the password?</a>
          </>
        )}
      </p>
    </form>
  );
}
