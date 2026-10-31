import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Building2, Loader2, UserRound } from "lucide-react";
import { useMember } from "../lib/auth";
import { MARKETPLACE_URL, errorMessage } from "../lib/api";
import "./login.scss";

export function Brand() {
  return (
    <div className="loginBrand">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <path
          d="M16 3.5 3.5 14.2V28h9.2v-7.6a3.3 3.3 0 0 1 6.6 0V28h9.2V14.2L16 3.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
      </svg>
      <span>bayti</span>
      <span className="scope">Agency</span>
    </div>
  );
}

export default function Login() {
  const { member, checking, login, endedReason } = useMember();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  // Set when the account belongs to the marketplace or the admin dashboard
  const [elsewhere, setElsewhere] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!checking && member) return <Navigate to={member.applicant ? "/application" : "/overview"} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const session = await login(email.trim(), password);
      // an agency still in review only has its application
      navigate(session.applicant ? "/application" : "/overview", { replace: true });
    } catch (err) {
      const data = err.response?.data;
      if (data?.platform && data.platform !== "agency") setElsewhere(data);
      else setError(errorMessage(err, "Sign-in failed. Please try again."));
      setBusy(false);
    }
  };

  if (elsewhere) {
    return (
      <div className="loginPage">
        <div className="loginCard">
          <Brand />
          <WrongPlatform {...elsewhere} onBack={() => setElsewhere(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="loginPage">
      <form className="loginCard" onSubmit={submit}>
        <Brand />

        <h1>Sign in to your agency workspace</h1>
        <p className="lead">For agency owners, managers and agents, and agencies following their application.</p>

        {(error || endedReason) && (
          <p className="loginError" role="alert">
            {error || endedReason}
          </p>
        )}

        <div className="field">
          <label htmlFor="email">Work email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus={!email}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            autoFocus={Boolean(email)}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button className="btn btn-dark submit" disabled={busy}>
          {busy && <Loader2 size={16} className="spin" />}
          {busy ? "Signing in…" : "Sign in"}
        </button>

        {MARKETPLACE_URL && (
          <p className="switchLine">
            <a href={`${MARKETPLACE_URL}/forgot-password`}>Forgot your password?</a>
          </p>
        )}

        <div className="newAgency">
          <span className="orLine">New to Bayti?</span>
          <Link to="/register" className="btn btn-outline submit">
            <Building2 size={16} /> Register your agency
          </Link>
          <p>Create your agency account and send your application in a few minutes.</p>
        </div>

        {MARKETPLACE_URL && (
          <a className="otherDoor" href={`${MARKETPLACE_URL}/login`}>
            <UserRound size={17} />
            <span>
              <strong>Buying, renting or selling your own home?</strong> Log in on the Bayti marketplace
            </span>
          </a>
        )}
      </form>
    </div>
  );
}

const SECONDS = 5;

// Shown when a personal or staff account signs in here: explains it, then
// sends them to their own sign-in page
function WrongPlatform({ platform, message, redirect, onBack }) {
  const [left, setLeft] = useState(SECONDS);
  useEffect(() => {
    if (!redirect) return;
    if (left === 0) {
      window.location.assign(redirect);
      return;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left, redirect]);

  return (
    <div className="wrongPlatform" role="alert">
      <h1>{platform === "marketplace" ? "This is the agency platform" : "This isn't the staff platform"}</h1>
      <p>{message}</p>
      {redirect && (
        <>
          <a href={redirect} className="btn btn-dark submit">
            {platform === "marketplace" ? "Go to the marketplace sign-in" : "Go to the admin dashboard"}
          </a>
          <p className="countdown" aria-live="polite">
            Taking you there in {left}s…
          </p>
        </>
      )}
      <button type="button" className="btn-link" onClick={onBack}>
        Use a different account
      </button>
    </div>
  );
}
