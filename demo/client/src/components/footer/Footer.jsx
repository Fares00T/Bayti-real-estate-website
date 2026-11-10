import { Link } from "react-router-dom";
import { Logo } from "../navbar/Navbar";
import { POPULAR_CITIES } from "../lib/cities";
import { AGENCY_URL } from "../lib/agencyApp";
import "./footer.scss";

const COLUMNS = [
  {
    title: "Find a property",
    links: [
      { to: "/list?type=buy", label: "Homes for sale" },
      { to: "/list?type=rent", label: "Homes for rent" },
      { to: "/list?property=commercial", label: "Commercial property" },
      { to: "/agencies#directory", label: "Find an agency" },
    ],
  },
  {
    title: "List a property",
    links: [
      { to: "/sell", label: "Sell or rent out" },
      { href: `${AGENCY_URL}/register`, label: "Register your agency" },
      { to: "/agencies", label: "Bayti for agencies" },
      // the agency workspace is a separate app
      { href: `${AGENCY_URL}/login`, label: "Agency sign-in" },
    ],
  },
  {
    title: "Bayti",
    links: [
      { to: "/about", label: "About us" },
      { to: "/help", label: "Help center" },
      { to: "/help#contact", label: "Contact" },
      { to: "/report", label: "Report a problem" },
    ],
  },
];

function Footer() {
  return (
    <footer className="siteFooter">
      <div className="wrap">
        <div className="footTop">
          <div className="footBrand">
            <Link to="/" className="footLogo" aria-label="Bayti home">
              <Logo size={30} />
              <span>bayti</span>
            </Link>
            <p>Homes and commercial property to buy and rent across Algeria, from owners and agencies.</p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2>{col.title}</h2>
              <ul>
                {col.links.map((l) => (
                  <li key={l.to || l.href}>
                    {l.href ? <a href={l.href}>{l.label}</a> : <Link to={l.to}>{l.label}</Link>}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <nav className="footCities" aria-label="Popular wilayas">
          {POPULAR_CITIES.map((c) => (
            <Link key={c.name} to={`/list?city=${encodeURIComponent(c.name)}`}>
              {c.label}
            </Link>
          ))}
        </nav>

        <div className="footBottom">
          <span>© {new Date().getFullYear()} Bayti</span>
          <Link to="/terms">Terms of use</Link>
          <Link to="/privacy">Privacy</Link>
          <span className="currency">Prices in DZD</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
