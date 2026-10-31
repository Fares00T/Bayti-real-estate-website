import { useEffect, useState } from "react";
import { Building2, ShieldCheck } from "lucide-react";
import "./wrongPlatform.scss";

const SECONDS = 5;

// Shown when someone signs in here with an account that belongs to another
// Bayti platform. Explains it, then sends them to the right sign-in page.
export default function WrongPlatform({ platform, message, redirect, onBack }) {
  const [left, setLeft] = useState(SECONDS);
  const target = platform === "agency" ? "agency sign-in" : "admin dashboard";

  useEffect(() => {
    if (!redirect) return;
    if (left === 0) {
      window.location.assign(redirect);
      return;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left, redirect]);

  const Icon = platform === "agency" ? Building2 : ShieldCheck;

  return (
    <div className="wrongPlatform" role="alert">
      <Icon size={30} strokeWidth={1.6} />
      <h1>{platform === "agency" ? "This isn't the agency platform" : "This isn't the staff platform"}</h1>
      <p>{message}</p>
      {redirect && (
        <>
          <a href={redirect} className="btn btn-dark">
            Go to the {target}
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
