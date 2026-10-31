import "../login/login.scss";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useContext, useState } from "react";
import { AlertCircle, ArrowRight, Building2, UserRound } from "lucide-react";
import { AGENCY_URL } from "../../components/lib/agencyApp";
import apiRequest from "../../components/lib/apiRequest.js";
import { AuthContext } from "../../context/AuthContext.jsx";

function Register() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  // Where they were headed before signing up (e.g. /add from "Publish a property")
  const from = useLocation().state?.from;
  const { currentUser, updateUser } = useContext(AuthContext);

  if (currentUser) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      await apiRequest.post("/auth/register", {
        username: formData.get("username"),
        email,
        password,
      });
      // Sign the new user straight in
      const res = await apiRequest.post("/auth/login", { email, password });
      updateUser(res.data);
      navigate(from || "/");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "We couldn't reach the server. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="authPage">
      <div className="authCard">
        <div className="authHeader">Sign up</div>
        <form className="authBody" onSubmit={handleSubmit}>
          <div className="accountChoice" role="group" aria-label="Who is signing up?">
            <span className="choice active" aria-current="true">
              <UserRound size={20} />
              <strong>Personal</strong>
              <small>Buy, rent or sell your own property</small>
            </span>
            <a className="choice" href={`${AGENCY_URL}/register`}>
              <Building2 size={20} />
              <strong>
                Real estate agency <ArrowRight size={14} />
              </strong>
              <small>Register your agency on Bayti</small>
            </a>
          </div>

          <h1>Create your personal account</h1>
          <p className="authLead">To buy, rent, save favorites and publish up to 3 properties of your own.</p>

          {error && (
            <div className="alert" role="alert">
              <span className="alertIcon">
                <AlertCircle size={16} />
              </span>
              <div>
                <strong>Couldn&rsquo;t create your account</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="stack">
            <label className="cell">
              <input
                name="username"
                type="text"
                required
                minLength={3}
                maxLength={30}
                autoComplete="username"
                placeholder=" "
              />
              <span className="label">Username</span>
            </label>
            <label className="cell">
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder=" "
              />
              <span className="label">Email</span>
            </label>
            <label className="cell">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete="new-password"
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
          <p className="hint">Use at least 6 characters for your password.</p>

          <button className="btn btn-primary submit" disabled={isLoading}>
            {isLoading ? "Creating account…" : "Agree and continue"}
          </button>

          <div className="divider">or</div>

          <p className="switch">
            Already have an account? <Link to="/login" state={from ? { from } : undefined}>Log in</Link>
          </p>

        </form>
      </div>
    </div>
  );
}

export default Register;
