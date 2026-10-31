import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LineChart } from "@mui/x-charts";
import api, { errorMessage } from "../lib/api";
import { useMember } from "../lib/auth";
import { AGENCY_ROLE_LABEL, numberFmt } from "../lib/format";
import { PageHead, Spinner, Stat, Tabs } from "../components/ui";
import "./dashboard.scss";

const PERIODS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

export default function Analytics() {
  const { can } = useMember();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    api
      .get("/analytics", { params: { days } })
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err, "Couldn't load analytics.")));
  }, [days]);

  return (
    <div className="workspace backoffice">
      <PageHead
        title="Analytics"
        subtitle={can("analytics.agency") ? "How buyers respond to your agency's listings." : "How buyers respond to your listings."}
      >
        <Tabs value={days} onChange={setDays} tabs={PERIODS} />
      </PageHead>

      {error && <p className="error-text loadError">{error}</p>}
      {!data && !error && <Spinner />}
      {data && (
        <div className="panel">
          <div className="stats">
            <Stat value={numberFmt.format(data.totals.views)} label={`Listing views, last ${data.days} days`} />
            <Stat value={data.totals.inquiries} label={`Inquiries, last ${data.days} days`} />
            <Stat
              value={data.totals.views ? `${((data.totals.inquiries / data.totals.views) * 100).toFixed(1)}%` : "—"}
              label="Requests per view"
            />
            <Stat value={data.totals.saves} label="Saved by buyers, all time" />
          </div>

          <section className="chartCard">
            <h3>Views and inquiries per day</h3>
            {data.totals.views + data.totals.inquiries === 0 ? (
              <p className="muted">No views or requests in this period yet.</p>
            ) : (
              <LineChart
                height={260}
                dataset={data.series.map((s) => ({ ...s, date: new Date(s.date) }))}
                xAxis={[{ scaleType: "time", dataKey: "date", valueFormatter: (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) }]}
                yAxis={[{ min: 0, tickMinStep: 1 }]}
                series={[
                  { dataKey: "views", label: "Views", color: "#e51d53", showMark: false },
                  { dataKey: "inquiries", label: "Inquiries", color: "#222222", showMark: false },
                ]}
                grid={{ horizontal: true }}
              />
            )}
          </section>

          <section>
            <div className="sectionHead">
              <h2>Top listings</h2>
            </div>
            {data.top.length === 0 ? (
              <p className="muted">No listings yet.</p>
            ) : (
              <div className="tableWrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Listing</th>
                      <th className="right">Views</th>
                      <th className="right">Inquiries</th>
                      <th className="right">Saves</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link to={`/listings/${p.id}`}>{p.title}</Link>
                          <span className="sub">
                            {p.city}
                            {!p.published && " · not public"}
                          </span>
                        </td>
                        <td className="right">{numberFmt.format(p.views)}</td>
                        <td className="right">{p.inquiries}</td>
                        <td className="right">{p.saves}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {data.agents && (
            <section>
              <div className="sectionHead">
                <h2>By agent</h2>
              </div>
              <div className="tableWrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th className="right">Listings</th>
                      <th className="right">Published</th>
                      <th className="right">Views</th>
                      <th className="right">Inquiries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.agents.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <Link to={`/team/${a.id}`}>{a.username}</Link>
                          <span className="sub">{AGENCY_ROLE_LABEL[a.agencyRole]}</span>
                        </td>
                        <td className="right">{a.listings}</td>
                        <td className="right">{a.published}</td>
                        <td className="right">{numberFmt.format(a.views)}</td>
                        <td className="right">{a.inquiries}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
