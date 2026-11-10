import { useContext, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import apiRequest from "../../components/lib/apiRequest";
import { AuthContext } from "../../context/AuthContext";
import "./report.scss";

const reasons = [
  "Fake or misleading listing",
  "Scam or fraud",
  "Wrong price or details",
  "Inappropriate content",
  "Harassment or abusive messages",
  "Other",
];

export default function ReportPage() {
  const { currentUser } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const [reportType, setReportType] = useState(
    searchParams.get("user") ? "user" : "post"
  );
  const [screenshot, setScreenshot] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | sending | sent
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const data = new FormData(e.target);
    data.set("reportType", reportType);
    if (!screenshot) data.delete("screenshot");

    setStatus("sending");
    try {
      await apiRequest.post("/report", data);
      setStatus("sent");
    } catch (err) {
      setStatus("idle");
      setError(
        err.response?.data?.message || "We couldn't send your report. Please try again."
      );
    }
  };

  if (status === "sent") {
    return (
      <div className="reportPage">
        <div className="reportDone">
          <CheckCircle2 size={40} strokeWidth={1.5} />
          <h1>Thanks for letting us know</h1>
          <p>
            Our team reviews every report, usually within 24 hours. We may contact
            you by email if we need more details.
          </p>
          <Link to="/" className="btn btn-dark">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="reportPage">
      <header>
        <h1 className="page-title">Report a problem</h1>
        <p className="page-subtitle">
          Tell us about a listing or user that breaks our rules. Reports are confidential.
        </p>
      </header>

      <form className="reportForm" onSubmit={handleSubmit}>
        <fieldset className="typeChoice">
          <legend>What are you reporting?</legend>
          {[
            { value: "post", label: "A listing" },
            { value: "user", label: "A user" },
          ].map((opt) => (
            <label key={opt.value} className={reportType === opt.value ? "active" : ""}>
              <input
                type="radio"
                name="reportTypeChoice"
                value={opt.value}
                checked={reportType === opt.value}
                onChange={() => setReportType(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </fieldset>

        {reportType === "post" ? (
          <div className="field">
            <label htmlFor="reportedPostId">Listing ID or link</label>
            <input
              id="reportedPostId"
              name="reportedPostId"
              type="text"
              required
              defaultValue={searchParams.get("post") || ""}
              placeholder="e.g. 12 or http://localhost:5173/12"
            />
          </div>
        ) : (
          <div className="field">
            <label htmlFor="reportedUser">Username</label>
            <input
              id="reportedUser"
              name="reportedUser"
              type="text"
              required
              defaultValue={searchParams.get("user") || ""}
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="reason">Reason</label>
          <select id="reason" name="reason" required defaultValue="">
            <option value="" disabled>
              Choose a reason
            </option>
            {reasons.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="details">Details (optional)</label>
          <textarea
            id="details"
            name="details"
            rows={4}
            placeholder="What happened? Include anything that helps us investigate."
          />
        </div>

        <div className="fieldRow">
          <div className="field">
            <label htmlFor="submittedBy">Your name</label>
            <input
              id="submittedBy"
              name="submittedBy"
              type="text"
              required
              defaultValue={currentUser?.username || ""}
            />
          </div>
          <div className="field">
            <label htmlFor="submittedEmail">Your email</label>
            <input
              id="submittedEmail"
              name="submittedEmail"
              type="email"
              required
              defaultValue={currentUser?.email || ""}
            />
          </div>
        </div>

        <div className="field">
          <span className="fileLabel">Screenshot (optional)</span>
          <label className="fileDrop">
            <input
              type="file"
              name="screenshot"
              accept="image/*"
              onChange={(e) => setScreenshot(e.target.files[0] || null)}
            />
            <span>{screenshot ? screenshot.name : "Choose an image"}</span>
            <span className="btn-link">{screenshot ? "Change" : "Browse"}</span>
          </label>
        </div>

        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}

        <button className="btn btn-primary submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Submit report"}
        </button>
      </form>
    </div>
  );
}
