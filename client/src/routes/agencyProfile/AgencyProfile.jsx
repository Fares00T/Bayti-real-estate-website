import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BadgeCheck, Globe, Mail, MapPin, Phone } from "lucide-react";
import apiRequest from "../../components/lib/apiRequest";
import List from "../../components/list/List";
import "./agencyProfile.scss";

const ROLE = { owner: "Agency director", manager: "Manager", agent: "Agent" };

// Public page of one agency: who they are, whether Bayti verified them, their
// live listings and the people buyers deal with
export default function AgencyProfile() {
  const { id } = useParams();
  const [agency, setAgency] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setAgency(null);
    setError("");
    apiRequest
      .get(`/agencies/${id}`)
      .then((res) => setAgency(res.data))
      .catch((err) =>
        setError(err.response?.status === 404 ? "This agency isn't on Bayti, or isn't active right now." : "We couldn't load this agency. Please try again.")
      );
  }, [id]);

  if (error) {
    return (
      <div className="agencyProfile">
        <div className="empty-state">
          {error} <Link to="/agencies">See all agencies</Link>
        </div>
      </div>
    );
  }
  if (!agency) return <div className="agencyProfile skeletonHead" aria-label="Loading" />;

  const where = [agency.commune, agency.wilaya].filter(Boolean).join(", ");
  const site = agency.website && (/^https?:\/\//.test(agency.website) ? agency.website : `https://${agency.website}`);
  const since = new Date(agency.verifiedAt || agency.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="agencyProfile">
      <header className="agencyHead">
        <div className="logo">
          {agency.logo ? <img src={agency.logo} alt={`${agency.tradeName} logo`} /> : <span aria-hidden="true">{agency.tradeName.charAt(0)}</span>}
        </div>
        <div className="identity">
          <h1>{agency.tradeName}</h1>
          {agency.verified ? (
            <p className="verified">
              <BadgeCheck size={18} /> Verified agency
              <span>· Bayti checked its agrément and Registre de Commerce · verified since {since}</span>
            </p>
          ) : (
            <p className="unverified">Not yet verified by Bayti</p>
          )}
          {where && (
            <p className="where">
              <MapPin size={15} /> {where}
            </p>
          )}
        </div>
      </header>

      <div className="agencyBody">
        <div className="agencyMain">
          {agency.about && (
            <section>
              <h2>About the agency</h2>
              <p className="about">{agency.about}</p>
            </section>
          )}

          <section>
            <h2>
              {agency.listings.length} {agency.listings.length === 1 ? "property" : "properties"} listed
            </h2>
            <List posts={agency.listings} emptyText="No properties listed right now." />
          </section>
        </div>

        <aside className="agencySide">
          <section className="contactCard">
            <h2>Contact</h2>
            <ul>
              {agency.address && (
                <li>
                  <MapPin size={16} /> {agency.address}
                </li>
              )}
              {agency.phone && (
                <li>
                  <Phone size={16} /> <a href={`tel:${agency.phone.replace(/\s/g, "")}`}>{agency.phone}</a>
                </li>
              )}
              {agency.email && (
                <li>
                  <Mail size={16} /> <a href={`mailto:${agency.email}`}>{agency.email}</a>
                </li>
              )}
              {site && (
                <li>
                  <Globe size={16} />{" "}
                  <a href={site} target="_blank" rel="noreferrer">
                    {agency.website.replace(/^https?:\/\//, "")}
                  </a>
                </li>
              )}
            </ul>
          </section>

          {agency.agents.length > 0 && (
            <section className="contactCard">
              <h2>The team</h2>
              <ul className="team">
                {agency.agents.map((a) => (
                  <li key={a.id}>
                    <img src={a.avatar || "/noavatar.jpg"} alt="" />
                    <div>
                      <strong>{a.username}</strong>
                      <span>
                        {ROLE[a.agencyRole]}
                        {a.listings > 0 && ` · ${a.listings} ${a.listings === 1 ? "listing" : "listings"}`}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
