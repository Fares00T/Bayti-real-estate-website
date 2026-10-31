import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, CalendarCheck, FileText, Globe, Layers, MapPin, MessageCircle, Phone, Users } from "lucide-react";
import apiRequest from "../../components/lib/apiRequest";
import Faq from "../../components/faq/Faq";
import { AuthContext } from "../../context/AuthContext";
import "./agencies.scss";
import { AGENCY_URL } from "../../components/lib/agencyApp";

// Everything listed here exists in the agency dashboard today
const BENEFITS = [
  {
    icon: BadgeCheck,
    title: "A verified agency profile",
    text: "Once approved, your agency appears in the Bayti directory with its address, phone and website, and every listing you publish carries the verified agency badge.",
  },
  {
    icon: Layers,
    title: "One portfolio for the whole team",
    text: "Every listing published by your agents is grouped under your agency, so you can follow the whole portfolio and its review status from one dashboard.",
  },
  {
    icon: Users,
    title: "Your agents, with the right access",
    text: "Add colleagues by the email of their Bayti account and give them a role: managers can add agents, agents publish and manage listings.",
  },
  {
    icon: CalendarCheck,
    title: "Visit requests in one place",
    text: "Buyers and tenants request a visit from your listings. Confirm a date, decline with a reason, and see the visits coming up this week.",
  },
  {
    icon: MessageCircle,
    title: "Messages from serious buyers",
    text: "People contact you from your listing pages, and you reply from your Bayti inbox, on your phone or your computer.",
  },
];

const STEPS = [
  ["Create your application", "Start with your agency's name and contact details. You can stop and come back at any time."],
  ["Add your legal information", "Your agrément number and issue date, your RC number, and a photo or PDF of each document."],
  ["Bayti reviews it", "Our team checks your documents. If something is missing, we ask for it in your notifications."],
  ["Your account is upgraded", "When approved, your account becomes an agency account with its own dashboard."],
  ["Publish and manage", "Add your team, publish listings and answer visit requests."],
];

const FAQ = [
  {
    q: "Which agencies can register?",
    a: "Real estate agencies practising in Algeria that hold an agrément d'agent immobilier issued by the wali and are registered in the Registre de Commerce. Both individual agents (personne physique) and companies (EURL, SARL, SPA…) can apply.",
  },
  {
    q: "Which documents do I need?",
    a: "Two are required to submit: your agrément and an extract of your Registre de Commerce. A photo or a PDF is enough. During the review we may ask for others, such as your NIF or the representative's ID.",
  },
  {
    q: "How does the review work?",
    a: "Our team compares your documents with the information in your application. You'll get a notification when it's approved, or when we need something else from you. You can follow the status on the registration page at any time.",
  },
  {
    q: "Does Bayti issue the agrément?",
    a: "No. Only the wilaya can issue an agrément. Bayti checks the authorization you already hold before showing your agency as verified.",
  },
  {
    q: "Can I add my employees?",
    a: "Yes. From the agency dashboard, add a colleague using the email of their Bayti account. They need to create a free account first.",
  },
  {
    q: "I already have a Bayti account. Do I need a new one?",
    a: "No. Apply while logged in and your existing account becomes the agency's owner account once approved.",
  },
  {
    q: "How do we publish properties?",
    a: "With the same listing form as everyone else, from your dashboard. Listings are reviewed before they go live and show your verified badge.",
  },
];

function AgenciesPage() {
  const { currentUser } = useContext(AuthContext);
  const [agencies, setAgencies] = useState(null);
  const [error, setError] = useState("");
  const [reqs, setReqs] = useState(null);

  useEffect(() => {
    apiRequest
      .get("/agencies")
      .then((res) => setAgencies(res.data))
      .catch(() => {
        setAgencies([]);
        setError("We couldn't load agencies. Please refresh to try again.");
      });
    apiRequest
      .get("/applications/requirements")
      .then((res) => setReqs(res.data))
      .catch(() => {});
  }, []);

  const role = currentUser?.role;
  const isAgency = Boolean(currentUser?.agencyId);
  const closed = reqs && reqs.acceptApplications === false;
  const requiredDocs = reqs?.documents.filter((d) => d.required) || [];
  const optionalDocs = reqs?.documents.filter((d) => !d.required) || [];

  const primaryCta = isAgency ? (
    <a href={AGENCY_URL} className="btn btn-primary btn-lg">
      Open your agency workspace
    </a>
  ) : role === "admin" ? null : (
    <a href={`${AGENCY_URL}/register`} className="btn btn-primary btn-lg">
      Register your agency
    </a>
  );

  return (
    <div className="agencyLanding">
      <section className="band band-ink agencyHero">
        <div className="wrap heroGrid">
          <div className="heroText">
            <h1>Give your agency the digital presence it deserves.</h1>
            <p className="lead">
              Show your portfolio to people searching across Algeria, manage your listings and your agents in one place,
              and answer buyers and tenants without losing track.
            </p>
            <div className="ctaRow">
              {primaryCta}
              <a href="#benefits" className="btn btn-outline-light btn-lg">
                Explore the benefits
              </a>
            </div>
            <p className="heroAlt">
              Already on Bayti? <a href={`${AGENCY_URL}/login`}>Sign in to your agency workspace</a> · Looking
              for an agency? <a href="#directory">Browse the directory</a>
            </p>
          </div>

          <DashboardSketch />
        </div>
      </section>

      <section className="band" id="benefits" aria-labelledby="benefits-title">
        <div className="wrap benefitsGrid">
          <div className="benefitsHead">
            <h2 id="benefits-title">Built for the way agencies work</h2>
            <p>One account for the agency, a seat for each agent, and every listing and visit request in the same dashboard.</p>
          </div>
          <ul className="benefits">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <Icon size={22} />
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="band band-sand" aria-labelledby="steps-title">
        <div className="wrap">
          <div className="section-head">
            <div>
              <h2 id="steps-title">From application to first listing</h2>
              <p>The application takes a few minutes if you have your documents at hand.</p>
            </div>
          </div>
          <ol className="timeline">
            {STEPS.map(([title, text]) => (
              <li key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="band" aria-labelledby="needs-title">
        <div className="wrap needsGrid">
          <div>
            <h2 id="needs-title">What you&rsquo;ll need</h2>
            <p className="muted">
              Bayti checks the authorization you already hold; it does not grant one. Only the wilaya can issue an
              agrément (Décret exécutif 09-18, as amended by Décret 19-242).
            </p>
          </div>
          <div className="needsList">
            <h3>Required to submit</h3>
            <ul>
              {(requiredDocs.length
                ? requiredDocs
                : [{ key: "agrement", label: "Agrément d'agent immobilier" }, { key: "rc", label: "Extrait du Registre de Commerce" }]
              ).map((d) => (
                <li key={d.key}>
                  <FileText size={18} />
                  <div>
                    <strong>{d.label}</strong>
                    {d.hint && <span>{d.hint}</span>}
                  </div>
                </li>
              ))}
              <li>
                <FileText size={18} />
                <div>
                  <strong>Your agrément number, issue date and issuing wilaya</strong>
                  <span>Plus your agency&rsquo;s name, RC number, phone and email.</span>
                </div>
              </li>
            </ul>
            {optionalDocs.length > 0 && (
              <details className="optional">
                <summary>Documents we may ask for during the review ({optionalDocs.length})</summary>
                <ul>
                  {optionalDocs.map((d) => (
                    <li key={d.key}>{d.label}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      </section>

      <section className="band band-sand" id="directory" aria-labelledby="directory-title">
        <div className="wrap">
          <div className="section-head">
            <div>
              <h2 id="directory-title">Agencies on Bayti</h2>
              <p>Agencies with the verified badge have had their agrément and Registre de Commerce checked by our team.</p>
            </div>
          </div>

          {error && <div className="empty-state">{error}</div>}

          {agencies === null ? (
            <div className="agencyGrid">
              {[0, 1, 2].map((i) => (
                <div className="agencyCard skeleton" key={i} />
              ))}
            </div>
          ) : (
            !error &&
            (agencies.length === 0 ? (
              <div className="empty-state">No agencies yet. Yours could be the first.</div>
            ) : (
              <div className="agencyGrid">
                {agencies.map((agency) => (
                  <AgencyCard key={agency.id} agency={agency} />
                ))}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="band" aria-labelledby="faq-title">
        <div className="wrap faqGrid">
          <h2 id="faq-title">Questions agencies ask</h2>
          <Faq items={FAQ} />
        </div>
      </section>

      {!isAgency && role !== "admin" && (
        <section className="band band-ink closing">
          <div className="wrap closingInner">
            <div>
              <h2>Ready to register your agency?</h2>
              <p>
                {closed
                  ? "We're not accepting new applications right now. Please check back soon."
                  : "Have your agrément and RC extract at hand. You can save your application and finish it later."}
              </p>
            </div>
            {!closed && (
              <a href={`${AGENCY_URL}/register`} className="btn btn-primary btn-lg">
                Register your agency
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

// A schematic of the agency dashboard: the real section names, no invented numbers
function DashboardSketch() {
  return (
    <div className="sketch" aria-hidden="true">
      <div className="sketchBar">
        <span />
        <span />
        <span />
        <em>Agency dashboard</em>
      </div>
      <div className="sketchBody">
        <div className="sketchStats">
          {["Awaiting your reply", "Visits this week", "Confirmed", "Completed"].map((l) => (
            <div key={l}>
              <i />
              <small>{l}</small>
            </div>
          ))}
        </div>
        <div className="sketchPanel">
          <strong>Team</strong>
          {["Owner", "Manager", "Agent"].map((r) => (
            <div className="row" key={r}>
              <b />
              <i />
              <small>{r}</small>
            </div>
          ))}
        </div>
        <div className="sketchPanel">
          <strong>Team listings</strong>
          <div className="thumbs">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}

function AgencyCard({ agency }) {
  const site = agency.website
    ? /^https?:\/\//.test(agency.website)
      ? agency.website
      : `https://${agency.website}`
    : null;
  const listings = agency.listings ?? 0;
  const location = [agency.commune, agency.wilaya].filter(Boolean).join(", ");

  return (
    <article className="agencyCard">
      <div className="hostHead">
        <div className="avatarWrap">
          <img src={agency.logo || "/noavatar.jpg"} alt="" />
          {agency.verified && (
            <span className="verified" title="Verified agency">
              <BadgeCheck size={16} />
            </span>
          )}
        </div>
        <div className="hostName">
          <h3>
            <Link to={`/agencies/${agency.id}`}>{agency.tradeName}</Link>
          </h3>
          <span>
            {listings} {listings === 1 ? "listing" : "listings"}
          </span>
        </div>
      </div>

      {agency.about && <p className="about">{agency.about}</p>}

      <ul className="contact">
        {location && (
          <li>
            <MapPin size={16} /> {location}
          </li>
        )}
        {agency.phone && (
          <li>
            <Phone size={16} />
            <a href={`tel:${agency.phone.replace(/\s/g, "")}`}>{agency.phone}</a>
          </li>
        )}
        {site && (
          <li>
            <Globe size={16} />
            <a href={site} target="_blank" rel="noreferrer">
              {agency.website.replace(/^https?:\/\//, "")}
            </a>
          </li>
        )}
      </ul>
    </article>
  );
}

export default AgenciesPage;
