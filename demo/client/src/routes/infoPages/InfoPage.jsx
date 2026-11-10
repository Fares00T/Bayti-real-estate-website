import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiRequest from "../../components/lib/apiRequest";
import Faq from "../../components/faq/Faq";
import { PAGES } from "./content";
import "./infoPage.scss";

// About, Help, Terms and Privacy share one quiet reading layout.
// The copy lives in ./content.js so it can be translated in one place.
function InfoPage({ page }) {
  const content = PAGES[page];
  const [supportEmail, setSupportEmail] = useState("");

  useEffect(() => {
    document.title = `${content.title} | Bayti`;
    return () => {
      document.title = "Bayti — Homes to buy and rent in Algeria";
    };
  }, [content.title]);

  useEffect(() => {
    if (page !== "help") return;
    apiRequest("/settings/public")
      .then((res) => setSupportEmail(res.data.marketplace?.supportEmail || ""))
      .catch(() => {});
  }, [page]);

  return (
    <article className="infoPage">
      <header>
        <h1>{content.title}</h1>
        {content.intro && <p className="intro">{content.intro}</p>}
        {content.updated && <p className="updated">Last updated {content.updated}</p>}
      </header>

      {content.sections?.map((s) => (
        <section key={s.heading}>
          <h2>{s.heading}</h2>
          {s.body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
          {s.list && (
            <ul>
              {s.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {content.faq?.map((group) => (
        <section key={group.heading}>
          <h2>{group.heading}</h2>
          <Faq items={group.items} />
        </section>
      ))}

      {page === "help" && (
        <section id="contact" className="contactBox">
          <h2>Contact us</h2>
          <p>
            A listing looks wrong, or someone is behaving badly? Report it and our moderation team will review it.
            {supportEmail && " For anything else, email us."}
          </p>
          <div className="contactActions">
            <Link to="/report" className="btn btn-dark">
              Report a listing or a user
            </Link>
            {supportEmail && (
              <a href={`mailto:${supportEmail}`} className="btn btn-outline">
                {supportEmail}
              </a>
            )}
          </div>
        </section>
      )}

      {content.links && (
        <nav className="related" aria-label="Related pages">
          {content.links.map((l) => (
            <Link key={l.to} to={l.to}>
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </article>
  );
}

export default InfoPage;
