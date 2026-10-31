import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { useAdmin } from "../lib/auth";
import { errorMessage } from "../lib/api";
import "./login.scss";

export default function Login() {
  const { admin, checking, login } = useAdmin();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!checking && admin) return <Navigate to="/overview" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate("/overview", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Sign-in failed. Please try again."));
      setBusy(false);
    }
  };

  return (
    <div className="loginPage">
      <form className="loginCard" onSubmit={submit}>
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
          <span className="scope">Admin</span>
        </div>

        <h1>Sign in to the admin dashboard</h1>
        <p className="lead">For the Bayti team only. Use your staff account.</p>

        {error && (
          <p className="loginError" role="alert">
            {error}
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
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button className="btn btn-dark submit" disabled={busy}>
          {busy && <Loader2 size={16} className="spin" />}
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="note">
          <ShieldCheck size={15} />
          Sessions end after 8 hours. Marketplace accounts can&rsquo;t sign in here.
        </p>
      </form>
    </div>
  );
}
