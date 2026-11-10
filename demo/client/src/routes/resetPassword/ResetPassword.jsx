import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import apiRequest from "../../components/lib/apiRequest";
import "../login/login.scss";

// /forgot-password asks for a link; /reset-password/:token sets the new password
export default function ResetPassword() {
  const { token } = useParams();
  const [value, setValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (token && value !== confirm) return setError("The passwords don't match.");
    setBusy(true);
    try {
      const res = token
        ? await apiRequest.post("/auth/reset-password", { token, password: value })
        : await apiRequest.post("/auth/forgot-password", { email: value });
      setDone(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "We couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="authPage">
      <div className="authCard">
        <div className="authHeader">{token ? "Choose a new password" : "Reset your password"}</div>
        {done ? (
          <div className="authBody">
            <p className="doneLine">
              <CheckCircle2 size={18} /> {done}
            </p>
            <Link to="/login" className="btn btn-dark">
              Go to log in
            </Link>
          </div>
        ) : (
          <form className="authBody" onSubmit={submit}>
            {error && (
              <div className="alert" role="alert">
                <span className="alertIcon">
                  <AlertCircle size={16} />
                </span>
                <div>
                  <span>{error}</span>
                </div>
              </div>
            )}
            {token ? (
              <div className="stack">
                <div className="field">
                  <label htmlFor="password">New password</label>
                  <input id="password" type="password" minLength={6} required value={value} onChange={(e) => setValue(e.target.value)} autoComplete="new-password" />
                </div>
                <div className="field">
                  <label htmlFor="confirm">Repeat it</label>
                  <input id="confirm" type="password" minLength={6} required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
                </div>
              </div>
            ) : (
              <div className="stack">
                <p>Enter your account email and we&rsquo;ll send you a link to choose a new password.</p>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input id="email" type="email" required value={value} onChange={(e) => setValue(e.target.value)} autoComplete="email" />
                </div>
              </div>
            )}
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Please wait…" : token ? "Save password" : "Send reset link"}
            </button>
            <p className="switch">
              <Link to="/login">Back to log in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
