import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Camera, ClipboardCheck, Flag, MapPin, MessageCircle, Ruler, Tag } from "lucide-react";
import HeroSearch from "../../components/heroSearch/HeroSearch";
import ListingsMap from "../../components/listingsMap/ListingsMap";
import Card from "../../components/card/Card";
import apiRequest from "../../components/lib/apiRequest";
import { POPULAR_CITIES } from "../../components/lib/cities";
import { AGENCY_URL } from "../../components/lib/agencyApp";
import { AuthContext } from "../../context/AuthContext";
import "./home.scss";

const SHELVES = [
  { id: "latest", label: "Latest", to: "/list" },
  { id: "buy", label: "For sale", to: "/list?type=buy" },
  { id: "rent", label: "For rent", to: "/list?type=rent" },
];

const Home = () => {
  const { currentUser } = useContext(AuthContext);
  const [posts, setPosts] = useState(null);
  const [shelf, setShelf] = useState("latest");
  const [banner, setBanner] = useState(null);
  const [maxImages, setMaxImages] = useState(null);

  useEffect(() => {
    apiRequest("/posts")
      .then((res) => setPosts(res.data))
      .catch(() => setPosts([]));
    // Banner text and listing limits are managed from the admin dashboard
    apiRequest("/settings/public")
      .then((res) => {
        const b = res.data.marketplace?.homeBanner;
        if (b?.enabled && b.title) setBanner(b);
        setMaxImages(res.data.listings?.maxImages || null);
      })
      .catch(() => {});
  }, []);

  const all = posts || [];
  // The API puts featured first; "Latest" should really be newest first
  const latest = useMemo(
    () => [...all].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [all]
  );
  const featured = all.filter((p) => p.featured);
  const shelfItems = (shelf === "latest" ? latest : latest.filter((p) => p.type === shelf)).slice(0, 8);
  const current = SHELVES.find((s) => s.id === shelf);
  // agency members publish from their workspace
  const isPro = Boolean(currentUser?.agencyId);
  const publishTo = currentUser ? "/add" : "/login";
  const publishState = currentUser ? undefined : { from: "/add" };

  return (
    <div className="homepage">
      <section className="hero wrap">
        <div className="heroText">
          <h1>Find a home in Algeria, or list your own.</h1>
          <p className="lead">
            Apartments, houses and commercial spaces for sale and rent, from owners and agencies. Search by wilaya and
            budget, then message the seller directly.
          </p>
          <HeroSearch />
          <p className="heroAlt">
            Have a property? <Link to="/sell">Sell or rent it out on Bayti</Link>
            {!isPro && (
              <>
                {" "}
                · Real estate agency? <a href={`${AGENCY_URL}/register`}>Register your agency</a>
              </>
            )}
          </p>
        </div>
        <div className="heroMap">
          {posts === null ? <div className="mapSkeleton" /> : <ListingsMap posts={all} />}
        </div>
      </section>

      {banner && (
        <aside className="homeBanner wrap">
          <div>
            <strong>{banner.title}</strong>
            {banner.text && <p>{banner.text}</p>}
          </div>
          {banner.linkUrl &&
            (/^https?:\/\//.test(banner.linkUrl) ? (
              <a href={banner.linkUrl} className="btn btn-dark btn-sm" target="_blank" rel="noreferrer">
                {banner.linkLabel || "Learn more"}
              </a>
            ) : (
              <Link to={banner.linkUrl} className="btn btn-dark btn-sm">
                {banner.linkLabel || "Learn more"}
              </Link>
            ))}
        </aside>
      )}

      {featured.length > 0 && (
        <section className="band">
          <div className="wrap">
            <div className="section-head">
              <div>
                <h2>Featured</h2>
                <p>Picked by the Bayti team.</p>
              </div>
            </div>
            <div className="grid">
              {featured.slice(0, 4).map((post) => (
                <Card key={post.id} item={post} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="band" aria-labelledby="shelf-title">
        <div className="wrap">
          <div className="section-head">
            <div>
              <h2 id="shelf-title">New on Bayti</h2>
              <div className="shelfTabs" role="tablist" aria-label="Show">
                {SHELVES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={shelf === s.id}
                    className={shelf === s.id ? "on" : ""}
                    onClick={() => setShelf(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <Link to={current.to}>See all {shelf === "latest" ? "listings" : current.label.toLowerCase()}</Link>
          </div>

          {posts === null ? (
            <div className="grid">
              {Array.from({ length: 4 }, (_, i) => (
                <div className="skeleton" key={i}>
                  <div className="img" />
                  <div className="l1" />
                  <div className="l2" />
                </div>
              ))}
            </div>
          ) : shelfItems.length === 0 ? (
            <div className="emptyShelf">
              <p>Nothing {shelf === "rent" ? "for rent" : shelf === "buy" ? "for sale" : "listed"} yet.</p>
              <Link to={publishTo} state={publishState} className="btn btn-outline btn-sm">
                Publish the first one
              </Link>
            </div>
          ) : (
            <div className="grid">
              {shelfItems.map((post) => (
                <Card key={post.id} item={post} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Cities posts={all} loading={posts === null} />

      <section className="band howItWorks" aria-labelledby="how-title">
        <div className="wrap">
          <div className="section-head">
            <h2 id="how-title">How Bayti works</h2>
          </div>
          <div className="howCols">
            <div>
              <h3>Looking for a place</h3>
              <ol>
                <li>
                  <strong>Search by wilaya and budget.</strong> Filter by type, district, price and bedrooms, or
                  browse on the map.
                </li>
                <li>
                  <strong>Save what you like.</strong> Tap the heart on any listing to compare it later from your
                  account.
                </li>
                <li>
                  <strong>Contact the owner or agency.</strong> Send a message or request a visit from the listing
                  page.
                </li>
              </ol>
              <Link to="/list" className="btn btn-dark">
                Start searching
              </Link>
            </div>
            <div>
              <h3>Selling or renting out</h3>
              <ol>
                <li>
                  <strong>Create a free account.</strong> An email address and a password are all it takes.
                </li>
                <li>
                  <strong>Describe your property.</strong> Add photos, the price in DZD and its location on the map.
                </li>
                <li>
                  <strong>We review it, then it goes live.</strong> Buyers and tenants reach you through Bayti
                  messages.
                </li>
              </ol>
              <Link to="/sell" className="btn btn-outline">
                See how listing works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {!isPro && (
        <section className="band band-ink ownersBand" aria-labelledby="owners-title">
          <div className="wrap ownersGrid">
            <div>
              <h2 id="owners-title">Selling or renting out a property?</h2>
              <p className="lead">
                Publish it on Bayti in a few minutes, from your phone or your computer. You don&rsquo;t need an agency
                to list with us.
              </p>
              <div className="ctaRow">
                <Link to={publishTo} state={publishState} className="btn btn-primary btn-lg">
                  Publish your property
                </Link>
                <Link to="/sell" className="btn btn-outline-light btn-lg">
                  How it works
                </Link>
              </div>
            </div>
            <ul className="formPreview" aria-label="What the listing form asks for">
              <li>
                <Camera size={20} />
                <div>
                  <strong>Photos</strong>
                  <span>{maxImages ? `Up to ${maxImages}, straight from your phone` : "Straight from your phone"}</span>
                </div>
              </li>
              <li>
                <Tag size={20} />
                <div>
                  <strong>Price</strong>
                  <span>In DZD, total or per month</span>
                </div>
              </li>
              <li>
                <MapPin size={20} />
                <div>
                  <strong>Location</strong>
                  <span>Wilaya, district and a pin on the map</span>
                </div>
              </li>
              <li>
                <Ruler size={20} />
                <div>
                  <strong>Details</strong>
                  <span>Size, rooms and what&rsquo;s nearby</span>
                </div>
              </li>
            </ul>
          </div>
        </section>
      )}

      <section className="band band-sand trust" aria-labelledby="trust-title">
        <div className="wrap">
          <div className="section-head">
            <div>
              <h2 id="trust-title">What we check, and what you should</h2>
              <p>
                Bayti puts you in touch with owners and agencies. The deal itself is between you and them, so here is
                what we do and what we recommend.
              </p>
            </div>
          </div>
          <div className="trustGrid">
            <div>
              <ClipboardCheck size={24} />
              <h3>Listings are reviewed</h3>
              <p>Our team reads every new or edited listing before it is published, and removes listings that break our rules.</p>
            </div>
            <div>
              <BadgeCheck size={24} />
              <h3>Agencies show their papers</h3>
              <p>
                An agency gets its badge after we check its agrément and its Registre de Commerce extract.
              </p>
            </div>
            <div>
              <MessageCircle size={24} />
              <h3>Talk before you commit</h3>
              <p>Visit the property and check the ownership documents before you pay anything, including a deposit.</p>
            </div>
            <div>
              <Flag size={24} />
              <h3>Tell us when something&rsquo;s off</h3>
              <p>
                A listing or a user that looks wrong? <Link to="/report">Report it</Link> and we&rsquo;ll look into it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {!isPro && (
        <section className="band agencyStrip">
          <div className="wrap stripInner">
            <div>
              <h2>Run a real estate agency?</h2>
              <p>Get a verified profile, publish your whole portfolio and manage your agents from one dashboard.</p>
            </div>
            <div className="stripActions">
              <a href={`${AGENCY_URL}/register`} className="btn btn-dark">
                Register your agency
              </a>
              <Link to="/agencies" className="btn btn-outline">
                Learn more
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

function Cities({ posts, loading }) {
  const byCity = useMemo(() => {
    const map = {};
    for (const p of posts) {
      const c = (map[p.city] ||= { n: 0, image: null });
      c.n += 1;
      if (!c.image && Array.isArray(p.images) && p.images[0]) c.image = p.images[0];
    }
    return map;
  }, [posts]);

  return (
    <section className="band" aria-labelledby="cities-title">
      <div className="wrap">
        <div className="section-head">
          <div>
            <h2 id="cities-title">Popular wilayas</h2>
            <p>Start with the country&rsquo;s largest cities, or pick any wilaya from the search.</p>
          </div>
          <Link to="/list">Browse all wilayas</Link>
        </div>
        <div className="cityGrid">
          {POPULAR_CITIES.slice(0, 6).map((c) => {
            const info = byCity[c.name];
            return (
              <Link key={c.name} to={`/list?city=${encodeURIComponent(c.name)}`} className="cityCard">
                {info?.image ? (
                  <img src={info.image} alt="" loading="lazy" />
                ) : (
                  <span className="code" aria-hidden="true">
                    {String(c.code).padStart(2, "0")}
                  </span>
                )}
                <div className="cityText">
                  <strong>{c.label}</strong>
                  <span>
                    {loading
                      ? " "
                      : info
                        ? `${info.n} ${info.n === 1 ? "listing" : "listings"}`
                        : "Be the first to list here"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Home;
