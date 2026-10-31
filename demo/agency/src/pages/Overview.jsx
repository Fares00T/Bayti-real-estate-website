import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity as ActivityIcon, Plus } from "lucide-react";
import api, { errorMessage } from "../lib/api";
import { useMember } from "../lib/auth";
import { numberFmt } from "../lib/format";
import { Empty, PageHead, Spinner, Stat } from "../components/ui";
import Feed from "../components/Feed";
import "./dashboard.scss";

export default function Overview() {
  const { member, can } = useMember();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/overview")
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err, "Couldn't load the overview.")));
  }, []);

  const mine = data?.scope === "mine";
  const writable = member.agency.status === "active";

  return (
    <div className="workspace backoffice">
      <PageHead
        title="Overview"
        subtitle={mine ? "Your listings and inquiries at a glance." : `How ${member.agency.tradeName} is doing today.`}
      >
        {writable && (
          <Link to="/listings/new" className="btn btn-dark btn-sm">
            <Plus size={15} /> New listing
          </Link>
        )}
      </PageHead>

      {error && <p className="error-text loadError">{error}</p>}
      {!data && !error && <Spinner />}

      {data && (
        <div className="panel">
          {(data.listings.rejected > 0 || data.inquiries.open > 0) && (
            <div className="reviewNotice">
              <p>
                {[
                  data.inquiries.open > 0 &&
                    `${data.inquiries.open} ${data.inquiries.open === 1 ? "inquiry is" : "inquiries are"} waiting for an answer`,
                  data.listings.rejected > 0 &&
                    `${data.listings.rejected} ${data.listings.rejected === 1 ? "listing was rejected and needs" : "listings were rejected and need"} changes`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                .
              </p>
              <Link
                to={data.inquiries.open > 0 ? "/inquiries" : "/listings?state=rejected"}
                className="btn btn-dark btn-sm"
              >
                {data.inquiries.open > 0 ? "Answer now" : "Review them"}
              </Link>
            </div>
          )}

          <section aria-label="Listings">
            <div className="stats six">
              <Stat value={data.listings.total} label={mine ? "My listings" : "Total listings"} to="/listings" />
              <Stat value={data.listings.published} label="Published" to="/listings?state=published" />
              <Stat value={data.listings.pending} label="In review" to="/listings?state=pending" />
              <Stat value={data.listings.rejected} label="Rejected" to="/listings?state=rejected" />
              <Stat value={data.listings.forSale} label="For sale" to="/listings?type=buy" />
              <Stat value={data.listings.forRent} label="For rent" to="/listings?type=rent" />
            </div>
          </section>

          <section aria-label="Team and demand">
            <div className="stats">
              {can("team.view") ? (
                <Stat
                  value={data.team.total}
                  label={`Team members${data.team.inactive ? ` · ${data.team.inactive} deactivated` : ""}`}
                  to="/team"
                />
              ) : (
                <Stat value={data.listings.offline} label="Offline" to="/listings?state=offline" />
              )}
              <Stat value={data.inquiries.total} label="Inquiries" to="/inquiries" />
              <Stat value={data.inquiries.open} label="Awaiting an answer" to="/inquiries?status=open" />
              <Stat value={numberFmt.format(data.views)} label="Listing views" to="/analytics" />
            </div>
          </section>

          <section>
            <div className="sectionHead">
              <h2>Recent activity</h2>
              <Link to="/activity" className="btn-link">
                See all
              </Link>
            </div>
            {data.activity.length === 0 ? (
              <Empty icon={ActivityIcon} title="Nothing yet">
                Listings you create, team changes and Bayti&rsquo;s review decisions will show up here.
              </Empty>
            ) : (
              <Feed items={data.activity} />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
