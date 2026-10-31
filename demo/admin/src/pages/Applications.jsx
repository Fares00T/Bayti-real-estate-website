import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileCheck2, RefreshCw } from "lucide-react";
import api, { errorMessage } from "../lib/api";
import { dateFmt, timeAgo } from "../lib/format";
import { PageHead, Spinner, StatusPill, Tabs } from "../components/ui";

const FILTERS = [
  { value: "open", label: "Waiting" },
  { value: "info_required", label: "Info requested" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "draft", label: "Drafts" },
  { value: "all", label: "All submitted" },
];

export default function Applications() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "open";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    setError("");
    api
      .get("/applications", { params: { status } })
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err, "Couldn't load applications.")));
  };
  useEffect(load, [status]);

  const counts = data?.counts || {};
  const waiting = (counts.submitted || 0) + (counts.resubmitted || 0) + (counts.under_review || 0) + (counts.info_required || 0);

  return (
    <div className="admin-dashboard backoffice">
      <PageHead
        title="Agency applications"
        subtitle="Agencies apply from the marketplace. Check their legal documents before granting verified status. Bayti verifies an agrément issued by the wilaya; it never issues one."
      >
        <button className="btn btn-outline btn-sm" onClick={load}>
          <RefreshCw size={15} /> Refresh
        </button>
      </PageHead>

      <Tabs
        value={status}
        onChange={(v) => setParams(v === "open" ? {} : { status: v })}
        tabs={FILTERS.map((f) => ({
          ...f,
          count: f.value === "open" ? waiting : f.value === "all" ? 0 : counts[f.value],
        }))}
      />

      {error && <p className="error-text">{error}</p>}
      {!data && !error ? (
        <Spinner />
      ) : data?.applications.length === 0 ? (
        <div className="reviewEmpty">
          <FileCheck2 size={28} />
          <h3>{status === "open" ? "No applications waiting" : "Nothing here"}</h3>
          <p className="muted">New applications appear here, and in your notifications, as soon as they're submitted.</p>
        </div>
      ) : (
        data && (
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Agency</th>
                  <th>Applicant</th>
                  <th>Agrément</th>
                  <th>Documents</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {data.applications.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link className="rowLink" to={`/applications/${a.id}`}>
                        {a.tradeName || a.legalName || `Application #${a.id}`}
                      </Link>
                      <span className="sub">
                        {a.entityType === "natural_person" ? "Natural person" : "Company"}
                        {a.wilaya && ` · ${a.wilaya}`}
                      </span>
                    </td>
                    <td className="muted">
                      {a.applicant.username}
                      <span className="sub">{a.applicant.email}</span>
                    </td>
                    <td className="muted">{a.approvalNumber || "—"}</td>
                    <td className="muted">{a._count.documents}</td>
                    <td>
                      <StatusPill status={a.status} kind="application" />
                    </td>
                    <td className="muted nowrap">
                      {a.submittedAt ? dateFmt(a.submittedAt) : "Not yet"}
                      <span className="sub">updated {timeAgo(a.updatedAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
