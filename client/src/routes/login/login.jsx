import "./login.scss";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useContext, useState } from "react";
import { AlertCircle, Building2 } from "lucide-react";
import { AGENCY_URL } from "../../components/lib/agencyApp";
import apiRequest from "../../components/lib/apiRequest.js";
import { AuthContext } from "../../context/AuthContext.jsx";
import WrongPlatform from "../../components/wrongPlatform/WrongPlatform";

function Login() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Set when the account belongs to the agency workspace or the admin dashboard
  const [elsewhere, setElsewhere] = useState(null);
  // ?email= prefills the form when another platform sent the person here
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, updateUser } = useContext(AuthContext);

  if (currentUser) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    const formData = new FormData(e.target);

    try {
      const res = await apiRequest.post("/auth/login", {
        email: formData.get("email"),
        password: formData.get("password"),
      });
      updateUser(res.data);
      navigate(location.state?.from || "/");
    } catch (err) {
      const data = err.response?.data;
      if (data?.platform && data.platform !== "marketplace") setElsewhere(data);
      else setError(data?.message || "We couldn't reach the server. Please try again.");
    }
    setIsLoading(false);
  };

  if (elsewhere) {
    return (
      <div className="authPage">
        <div className="authCard">
          <WrongPlatform {...elsewhere} onBack={() => setElsewhere(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="authPage">
      <div className="authCard">
        <div className="authHeader">Log in or sign up</div>
        <form className="authBody" onSubmit={handleSubmit} noValidate={false}>
          <h1>Welcome back to Bayti</h1>

          {error && (
            <div className="alert" role="alert">
              <span className="alertIcon">
                <AlertCircle size={16} />
              </span>
              <div>
                <strong>Let&rsquo;s try that again</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="stack">
            <label className={`cell ${error ? "invalid" : ""}`}>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder=" "
                defaultValue={params.get("email") || ""}
              />
              <span className="label">Email</span>
            </label>
            <label className={`cell ${error ? "invalid" : ""}`}>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder=" "
              />
              <span className="label">Password</span>
              <button
                type="button"
                className="toggle"
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </label>
          </div>

          <p className="switch forgot">
            <Link to="/forgot-password">Forgot your password?</Link>
          </p>

          <button className="btn btn-primary submit" disabled={isLoading}>
            {isLoading ? "Logging in…" : "Continue"}
          </button>

          <div className="divider">or</div>

          <p className="switch">
            New to Bayti? <Link to="/register" state={location.state}>Create a personal account</Link>
          </p>

          <div className="agencyDoor">
            <Building2 size={18} />
            <span>
              <strong>Real estate agency?</strong> <a href={`${AGENCY_URL}/login`}>Sign in</a> or{" "}
              <a href={`${AGENCY_URL}/register`}>register your agency</a>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
