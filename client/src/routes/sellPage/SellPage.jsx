import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiRequest from "../../components/lib/apiRequest";
import { AuthContext } from "../../context/AuthContext";
import Faq from "../../components/faq/Faq";
import "./sellPage.scss";

// The same eight steps as PostForm, in the same order
const FORM_STEPS = [
  ["Type", "Apartment, house, office, shop… and whether it's for sale or rent."],
  ["Location", "Wilaya, district and a pin you drop on the map."],
  ["Basics", "Size, rooms, bathrooms and whether it's furnished."],
  ["Nearby", "Schools, transport, a mosque, a pharmacy within walking distance."],
  ["Photos", "Upload them from your phone or computer."],
  ["Description", "A clear title and a few honest lines about the place."],
  ["Price", "In DZD. Rentals are priced per month."],
  ["Review", "Check everything, then submit it for review."],
];

const FAQ = [
  {
    q: "Why does my listing need to be reviewed?",
    a: "Our team reads every new listing before it is published, to keep out duplicates, wrong prices and misleading photos. You can follow its status in your account, under My listings.",
  },
  {
    q: "Can I change my listing after it's published?",
    a: "Yes. Open it from My listings and choose Edit. Edited listings can go back through review before they reappear in search.",
  },
  {
    q: "How do buyers and tenants contact me?",
    a: "They send you a message from the listing page. Your conversations are in your account, under Messages.",
  },
  {
    q: "I stopped halfway through the form. Is my work lost?",
    a: "No. Your progress is saved on the device you were using, and the form opens where you left off.",
  },
  {
    q: "I work for an agency. Should I use this form?",
    a: "You can, but registering your agency gives every listing a verified badge and lets your team share one portfolio.",
    link: { to: "/agencies", label: "See Bayti for agencies" },
  },
];

function SellPage() {
  const { currentUser } = useContext(AuthContext);
  const [maxImages, setMaxImages] = useState(null);

  useEffect(() => {
    apiRequest("/settings/public")
      .then((res) => setMaxImages(res.data.listings?.maxImages || null))
      .catch(() => {});
  }, []);

  const publishTo = currentUser ? "/add" : "/register";
  const publishState = currentUser ? undefined : { from: "/add" };
  const steps = FORM_STEPS.map(([label, text]) =>
    label === "Photos" && maxImages ? [label, `Up to ${maxImages}, from your phone or computer.`] : [label, text]
  );

  return (
    <div className="sellPage">
      <section className="sellHero wrap">
        <h1>Sell or rent out your property, without the back-and-forth.</h1>
        <p className="lead">
          Describe your place once, with photos, a price and its location. Buyers and tenants who are interested message
          you on Bayti, and you answer when it suits you.
        </p>
        <div className="ctaRow">
          <Link to={publishTo} state={publishState} className="btn btn-primary btn-lg">
            Publish your property
          </Link>
          {!currentUser && (
            <p className="haveAccount">
              Already have an account?{" "}
              <Link to="/login" state={{ from: "/add" }}>
                Log in
              </Link>
            </p>
          )}
        </div>
      </section>

      <section className="band" aria-labelledby="steps-title">
        <div className="wrap">
          <div className="section-head">
            <div>
              <h2 id="steps-title">What the form asks for</h2>
              <p>Eight short steps. Your progress is saved on your device as you go.</p>
            </div>
          </div>
          <ol className="formSteps">
            {steps.map(([label, text]) => (
              <li key={label}>
                <strong>{label}</strong>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="band band-sand" aria-labelledby="after-title">
        <div className="wrap afterGrid">
          <div>
            <h2 id="after-title">After you submit</h2>
            <p className="lead">Your listing goes to our team for review. Once approved, it appears in search, on the map and on your public listing page.</p>
          </div>
          <dl className="afterList">
            <div>
              <dt>Follow its status</dt>
              <dd>Pending, published or sent back with a note, under My listings in your account.</dd>
            </div>
            <div>
              <dt>Answer messages</dt>
              <dd>Every conversation with a buyer or tenant is in one inbox.</dd>
            </div>
            <div>
              <dt>Edit or remove it</dt>
              <dd>Update the price or photos, or delete the listing once it&rsquo;s sold or rented.</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="band" aria-labelledby="tips-title">
        <div className="wrap tipsGrid">
          <div>
            <h2 id="tips-title">Listings that get answers</h2>
            <p className="muted">What buyers and tenants look for first.</p>
          </div>
          <ul className="tips">
            <li>
              <strong>Photograph every room in daylight.</strong> Open the curtains, turn on the lights, shoot from a
              corner. Start with the living room.
            </li>
            <li>
              <strong>Ask a realistic price.</strong> Compare with similar listings in your district first. A
              believable price brings messages from people who are actually in your range.
            </li>
            <li>
              <strong>Put the pin where the building is.</strong> People search on the map, and the neighbourhood often
              matters as much as the flat.
            </li>
            <li>
              <strong>Mention the papers.</strong> Say whether there&rsquo;s an acte de propriété, a livret foncier or
              another title. It&rsquo;s the first question serious buyers ask.
            </li>
          </ul>
        </div>
      </section>

      <section className="band band-sand" aria-labelledby="faq-title">
        <div className="wrap faqWrap">
          <h2 id="faq-title">Questions owners ask</h2>
          <Faq items={FAQ} />
        </div>
      </section>

      <section className="band closing">
        <div className="wrap closingInner">
          <h2>Ready when you are.</h2>
          <Link to={publishTo} state={publishState} className="btn btn-primary btn-lg">
            Publish your property
          </Link>
        </div>
      </section>
    </div>
  );
}

export default SellPage;
