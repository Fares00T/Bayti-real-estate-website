import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Check, Copy as CopyIcon, Flag, RefreshCw } from "lucide-react";
import api, { errorMessage, notifyDataChanged } from "../lib/api";
import { dateFmt, dateTime, numberFmt } from "../lib/format";
import { BackLink, PageHead, PromptDialog, Spinner, StatusPill, Tabs, useToast } from "../components/ui";
import DocumentList from "../components/DocumentList";
import NotFound from "./NotFound";

export default function Reports() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "open";
  return (
    <div className="admin-dashboard backoffice">
      <PageHead title="Moderation" subtitle="Reports from users and listings that look like copies of each other." />
      <Tabs
        value={tab}
        onChange={(v) => setParams(v === "open" ? {} : { tab: v })}
        tabs={[
          { value: "open", label: "Open reports" },
          { value: "resolved", label: "Resolved" },
          { value: "dismissed", label: "Dismissed" },
          { value: "duplicates", label: "Possible duplicates" },
        ]}
      />
      {tab === "duplicates" ? <Duplicates /> : <ReportList status={tab} />}
    </div>
  );
}

function ReportList({ status }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const load = () => {
    setData(null);
    api
      .get("/reports", { params: { status } })
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err, "Couldn't load reports.")));
  };
  useEffect(load, [status]);

  if (error) return <p className="error-text">{error}</p>;
  if (!data) return <Spinner />;
  if (!data.reports.length) {
    return (
      <div className="reviewEmpty">
        <Flag size={28} />
        <h3>{status === "open" ? "No open reports" : "Nothing here"}</h3>
        <p className="muted">Reports sent from the marketplace's "Report a problem" page land here.</p>
      </div>
    );
  }
  return (
    <div className="tableWrap">
      <table className="table">
        <thead>
          <tr>
            <th>Reason</th>
            <th>About</th>
            <th>Reported by</th>
            <th>Status</th>
            <th>Received</th>
          </tr>
        </thead>
        <tbody>
          {data.reports.map((r) => (
            <tr key={r.id}>
              <td>
                <Link to={`/reports/${r.id}`} className="rowLink">
                  {r.reason}
                </Link>
                {r.details && <span className="sub clamp">{r.details}</span>}
              </td>
              <td className="muted">
                {r.kind === "post"
                  ? r.post
                    ? <Link to={`/listings/${r.post.id}`}>{r.post.title}</Link>
                    : `Listing ${r.reportedUserText || "?"} (not found)`
                  : r.reportedUser
                  ? <Link to={`/users/${r.reportedUser.id}`}>{r.reportedUser.username}</Link>
                  : `${r.reportedUserText || "Unknown user"} (not found)`}
                <span className="sub">{r.kind === "post" ? "Listing" : "User"}</span>
              </td>
              <td className="muted">
                {r.reporter ? <Link to={`/users/${r.reporter.id}`}>{r.reporter.username}</Link> : r.reporterName || "Guest"}
                <span className="sub">{r.reporterEmail}</span>
              </td>
              <td>
                <StatusPill status={r.status} />
              </td>
              <td className="muted nowrap">{dateFmt(r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Duplicates() {
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .get("/posts/duplicates")
      .then((res) => setGroups(res.data))
      .catch((err) => setError(errorMessage(err, "Couldn't check for duplicates.")));
  }, []);
  if (error) return <p className="error-text">{error}</p>;
  if (!groups) return <Spinner label="Comparing listings…" />;
  if (!groups.length) {
    return (
      <div className="reviewEmpty">
        <CopyIcon size={28} />
        <h3>No likely duplicates</h3>
        <p className="muted">Listings with the same map pin, or the same title and price, show up here.</p>
      </div>
    );
  }
  return (
    <div className="stack">
      <p className="muted small">
        Same pin can be legitimate (several flats in one building). Open each listing to compare photos and owners before acting.
      </p>
      {groups.map((g, i) => (
        <section className="card" key={i}>
          <h2>
            {g.reason} · {g.posts.length} listings
          </h2>
          <ul className="miniList">
            {g.posts.map((p) => (
              <li key={p.id}>
                <img src={p.images?.[0] || "/noavatar.jpg"} alt="" />
                <div>
                  <Link to={`/listings/${p.id}`}>{p.title}</Link>
                  <span>
                    {numberFmt.format(p.price)} DZD · {p.city} {p.user && (
                      <>
                        {" "}
                        · by <Link to={`/users/${p.user.id}`}>{p.user.username}</Link>
                      </>
                    )} · {dateFmt(p.createdAt)}
                  </span>
                </div>
                <StatusPill status={p.status} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [missing, setMissing] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [toast, notify] = useToast();

  const load = useCallback(() => {
    api
      .get(`/reports/${id}`)
      .then((res) => setReport(res.data))
      .catch((err) => (err.response?.status === 404 ? setMissing(true) : notify(errorMessage(err), true)));
  }, [id, notify]);
  useEffect(load, [load]);

  if (missing) return <NotFound />;
  if (!report) return <Spinner />;

  const update = async (status, resolution) => {
    try {
      await api.put(`/reports/${report.id}`, { status, resolution });
      notifyDataChanged();
      notify(status === "open" ? "Report reopened." : `Report ${status}.`);
      setDialog(null);
      load();
    } catch (err) {
      notify(errorMessage(err), true);
    }
  };

  return (
    <div className="admin-dashboard listingPage backoffice">
      <BackLink to="/reports">All reports</BackLink>
      <PageHead
        title={
          <span className="titleLine">
            {report.reason} <StatusPill status={report.status} />
          </span>
        }
        subtitle={`Report #${report.id} about a ${report.kind === "post" ? "listing" : "user"} · received ${dateTime(report.createdAt)}`}
      >
        {report.status === "open" ? (
          <>
            <button className="btn btn-outline btn-sm" onClick={() => setDialog("dismissed")}>
              Dismiss
            </button>
            <button className="btn btn-dark btn-sm" onClick={() => setDialog("resolved")}>
              <Check size={15} /> Resolve
            </button>
          </>
        ) : (
          <button className="btn btn-outline btn-sm" onClick={() => update("open")}>
            <RefreshCw size={15} /> Reopen
          </button>
        )}
      </PageHead>

      {report.status !== "open" && (
        <div className={`callout ${report.status === "resolved" ? "ok" : ""}`}>
          <strong>
            {report.status === "resolved" ? "Resolved" : "Dismissed"} {dateTime(report.resolvedAt)}
          </strong>
          <p>{report.resolution}</p>
        </div>
      )}

      <div className="detailGrid">
        <div className="detailMain">
          <section className="card">
            <h2>What they said</h2>
            <p className="description">{report.details || "No details given."}</p>
            <h3>Screenshot</h3>
            <DocumentList documents={report.documents} notify={notify} empty="No screenshot attached." />
          </section>
        </div>
        <aside className="detailSide">
          <section className="card">
            <h2>Reported {report.kind === "post" ? "listing" : "account"}</h2>
            {report.post ? (
              <>
                <p>
                  <Link to={`/listings/${report.post.id}`}>{report.post.title}</Link> <StatusPill status={report.post.status} />
                </p>
                <p className="muted small">Unpublish or reject it from the listing page.</p>
              </>
            ) : null}
            {report.reportedUser ? (
              <>
                <div className="person">
                  <img src={report.reportedUser.avatar || "/noavatar.jpg"} alt="" />
                  <div>
                    <Link to={`/users/${report.reportedUser.id}`}>
                      <strong>{report.reportedUser.username}</strong>
                    </Link>
                    <span>{report.reportedUser.email}</span>
                  </div>
                </div>
                <p className="muted small">Suspend the account from its page if needed.</p>
              </>
            ) : (
              !report.post && <p className="muted small">"{report.reportedUserText}" didn't match any listing or account.</p>
            )}
          </section>
          <section className="card">
            <h2>Reported by</h2>
            <p>
              {report.reporter ? <Link to={`/users/${report.reporter.id}`}>{report.reporter.username}</Link> : report.reporterName || "Guest"}
            </p>
            {report.reporterEmail && (
              <a className="small" href={`mailto:${report.reporterEmail}`}>
                {report.reporterEmail}
              </a>
            )}
          </section>
          {report.related.length > 0 && (
            <section className="card">
              <h2>Earlier reports about the same {report.kind === "post" ? "listing or owner" : "account"}</h2>
              <ul className="miniList plain">
                {report.related.map((r) => (
                  <li key={r.id}>
                    <div>
                      <button className="btn-link" onClick={() => navigate(`/reports/${r.id}`)}>
                        {r.reason}
                      </button>
                      <span>{dateFmt(r.createdAt)}</span>
                    </div>
                    <StatusPill status={r.status} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      {dialog && (
        <PromptDialog
          title={dialog === "resolved" ? "Resolve this report" : "Dismiss this report"}
          body="Note what was done. It's kept with the report for the team."
          suggestions={dialog === "resolved" ? ["Listing unpublished", "Account suspended", "Owner contacted and fixed the listing"] : ["Not a violation", "Duplicate report"]}
          placeholder="What was done"
          confirmLabel={dialog === "resolved" ? "Resolve" : "Dismiss"}
          onCancel={() => setDialog(null)}
          onConfirm={(text) => update(dialog, text)}
        />
      )}
      {toast}
    </div>
  );
}
