import "./listDetails.scss";
import Slider from "../../components/slider/Slider.jsx";
import Map from "../../components/map/Map";
import { useContext, useEffect, useRef, useState } from "react";
import apiRequest from "../../components/lib/apiRequest";
import { useNavigate, useLoaderData, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { AuthContext } from "../../context/AuthContext";
import Chat from "../../components/chat/Chat.jsx";
import TourRequestModal from "../../components/tourRequestModal/TourRequestModal.jsx";
import {
  formatAddress,
  formatPrice,
  formatPropertyType,
} from "../../components/lib/format";
import {
  Landmark,
  Baby,
  School,
  BookOpen,
  GraduationCap,
  Building2,
  Pill,
  Bus,
  ShoppingBag,
  SquareParking,
  Eye,
  Heart,
  MessageCircle,
  CalendarCheck,
  Pencil,
  Trash2,
  MapPin,
  Plug,
  PawPrint,
  Sofa,
  BadgeCheck,
  Phone,
  X,
  CheckCircle2,
  Clock,
  CircleAlert,
} from "lucide-react";

// Nearby fields are stored as "yes"/"no"; older listings may hold a distance
const isPresent = (value) =>
  value !== null && value !== undefined && value !== "" && value !== "no";
const distanceLabel = (value) =>
  /^\d+$/.test(String(value)) ? `${value} m away` : null;

// Shown to the owner above a listing that isn't public yet
function ReviewBanner({ post }) {
  if (post.status === "approved") return null;
  const rejected = post.status === "rejected";

  return (
    <section className={`reviewBanner ${post.status}`} role="status">
      {rejected ? <CircleAlert size={22} /> : <Clock size={22} />}
      <div className="reviewText">
        <strong>
          {rejected
            ? "This listing wasn't approved"
            : "Your listing is waiting for review"}
        </strong>
        <p>
          {rejected
            ? "Update it to address the reason below. Saving sends it back for review."
            : "It's hidden from search and from visitors until our team approves it, usually within a day."}
        </p>
        {rejected && post.reviewNote && <blockquote>{post.reviewNote}</blockquote>}
      </div>
      {rejected && (
        <div className="reviewButtons">
          <Link to={`/edit-post/${post.id}`} className="btn btn-dark btn-sm">
            Edit listing
          </Link>
        </div>
      )}
    </section>
  );
}

export default function ListDetails() {
  const loaded = useLoaderData();
  const post = loaded;
  const detail = post.postDetail || {};
  const [views, setViews] = useState(detail.views ?? 0);

  // Report one view per page open. The server decides whether it counts
  // (once per visitor per day; never the owner, admins or unpublished listings).
  const reported = useRef(null);
  useEffect(() => {
    setViews(loaded.postDetail?.views ?? 0);
    if (reported.current === loaded.id) return;
    reported.current = loaded.id;
    apiRequest
      .post(`/posts/${loaded.id}/view`)
      .then((res) => setViews(res.data.views))
      .catch(() => {});
  }, [loaded.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [saved, setSaved] = useState(post.isSaved);
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showTourModal, setShowTourModal] = useState(false);
  const [notice, setNotice] = useState(null);

  // The API says whether this is the viewer's own personal listing
  const isOwner = Boolean(post.isOwner);
  // The agency and its badge come from the API, computed from the agency's live status
  const agency = post.agency;
  const isAgencyListing = Boolean(agency);
  const verifiedAgency = Boolean(agency?.verified);
  // Sold and rented listings stay readable but take no more inquiries
  const closed = ["sold", "rented"].includes(post.availability);
  const canContact = !isOwner && !closed;
  const canRequestTour = canContact;

  const nearbyPlaces = [
    { label: "Mosque", value: detail.mosque, icon: Landmark },
    { label: "Kindergarten", value: detail.kindergarten, icon: Baby },
    { label: "Primary school", value: detail.primarySchool, icon: School },
    { label: "Middle school", value: detail.middleSchool, icon: BookOpen },
    { label: "High school", value: detail.highSchool, icon: GraduationCap },
    { label: "University", value: detail.university, icon: Building2 },
    { label: "Pharmacy", value: detail.pharmacy, icon: Pill },
    { label: "Transportation", value: detail.transportation, icon: Bus },
    { label: "Commercial area", value: detail.commercialArea, icon: ShoppingBag },
    { label: "Car park", value: detail.carPark, icon: SquareParking },
  ].filter((p) => isPresent(p.value));

  const highlights = [
    {
      icon: Plug,
      label: "Utilities",
      value:
        detail.utilities === "owner"
          ? "Paid by the owner"
          : detail.utilities === "shared"
          ? "Shared"
          : "Paid by the tenant",
    },
    {
      icon: PawPrint,
      label: "Pets",
      value: detail.pet === "allowed" ? "Allowed" : "Not allowed",
    },
    {
      icon: Sofa,
      label: "Furnishing",
      value: detail.Furnished === "yes" ? "Furnished" : "Unfurnished",
    },
  ];

  const handleDelete = async () => {
    try {
      await apiRequest.delete(`/posts/${post.id}`);
      navigate("/profile");
    } catch (err) {
      console.log(err);
      setShowModal(false);
      setNotice({ type: "error", text: "Failed to delete this listing." });
    }
  };

  const handleSave = async () => {
    if (!currentUser) return navigate("/login");
    setSaved((prev) => !prev);
    try {
      await apiRequest.post("/users/save", { postId: post.id });
    } catch (err) {
      console.log(err);
      setSaved((prev) => !prev);
      setNotice({ type: "error", text: "Could not update saved listings." });
    }
  };

  const handleMessage = () => {
    if (!currentUser) return navigate("/login");
    setChatOpen(true);
  };

  const handleTour = () => {
    if (!currentUser) return navigate("/login");
    setShowTourModal(true);
  };

  return (
    <div className="singlePage">
      <header className="titleRow">
        <h1 className="page-title">{post.title}</h1>
        <div className="titleActions">
          {!isOwner && (
            <button
              className={`linkBtn ${saved ? "saved" : ""}`}
              onClick={handleSave}
              aria-pressed={!!saved}
            >
              <Heart size={16} fill={saved ? "currentColor" : "none"} />
              {saved ? "Saved" : "Save"}
            </button>
          )}
        </div>
      </header>

      {isOwner && <ReviewBanner post={post} />}

      <Slider images={Array.isArray(post.images) ? post.images : []} />

      <div className="layoutGrid">
        <div className="main">
          <section className="summary">
            <h2>
              {formatPropertyType(post.propertyType) || "Property"}{" "}
              {post.type === "rent" ? "for rent" : "for sale"} in{" "}
              {[post.district, post.city].filter(Boolean).join(", ")}
            </h2>
            <p className="facts">
              {[
                detail.size ? `${detail.size} m²` : null,
                post.bedroom > 0
                  ? `${post.bedroom} ${post.bedroom === 1 ? "bedroom" : "bedrooms"}`
                  : null,
                `${post.bathroom} ${post.bathroom === 1 ? "bathroom" : "bathrooms"}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="meta">
              <span>
                <MapPin size={14} /> {formatAddress(post)}
              </span>
              <span>
                <Eye size={14} /> {views} {views === 1 ? "view" : "views"}
              </span>
              {detail.Matricule && <span>Ref. {detail.Matricule}</span>}
            </p>
          </section>

          {agency ? (
            <section className="host agencyHost">
              <Link to={`/agencies/${agency.id}`} className="agencyLogo" aria-hidden="true" tabIndex={-1}>
                {agency.logo ? <img src={agency.logo} alt="" /> : <span>{agency.tradeName.charAt(0)}</span>}
              </Link>
              <div>
                <div className="hostName">
                  Listed by <Link to={`/agencies/${agency.id}`}>{agency.tradeName}</Link>
                </div>
                <div className="hostRole">
                  {verifiedAgency ? (
                    <span className="verifiedBadge" title="Bayti checked this agency's agrément and Registre de Commerce">
                      <BadgeCheck size={14} /> Verified agency
                    </span>
                  ) : (
                    "Real estate agency"
                  )}
                  {[agency.commune, agency.wilaya].filter(Boolean).length > 0 && (
                    <span>{[agency.commune, agency.wilaya].filter(Boolean).join(", ")}</span>
                  )}
                </div>
                {post.user && (
                  <div className="agentLine">
                    <img src={post.user.avatar || "/noavatar.jpg"} alt="" />
                    <span>
                      Your contact: <strong>{post.user.username}</strong>
                    </span>
                    {post.user.phone && (
                      <a href={`tel:${post.user.phone}`}>
                        <Phone size={13} /> {post.user.phone}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="host">
              <img src={post.user?.avatar || "/noavatar.jpg"} alt="" />
              <div>
                <div className="hostName">Listed by {post.user?.username}</div>
                <div className="hostRole">Private owner</div>
              </div>
            </section>
          )}

          <section className="highlights">
            {highlights.map(({ icon: Icon, label, value }) => (
              <div className="highlight" key={label}>
                <Icon size={22} strokeWidth={1.6} />
                <div>
                  <span className="label">{value}</span>
                  <span className="value">{label}</span>
                </div>
              </div>
            ))}
          </section>

          <section className="block">
            <h2>About this place</h2>
            <div
              className="description"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(detail.desc || ""),
              }}
            />
          </section>

          {nearbyPlaces.length > 0 && (
            <section className="block">
              <h2>What&rsquo;s nearby</h2>
              <div className="nearbyList">
                {nearbyPlaces.map(({ icon: Icon, label, value }) => (
                  <div className="nearbyItem" key={label}>
                    <Icon size={22} strokeWidth={1.6} />
                    <span>{label}</span>
                    {distanceLabel(value) && (
                      <small>{distanceLabel(value)}</small>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="sidebar">
          <div className="priceCard">
            <div className="price">
              {formatPrice(post.price)}
              <span>{post.type === "rent" ? " / month" : ""}</span>
            </div>
            <p className="priceNote">
              {post.type === "rent" ? "Monthly rent" : "Asking price"}
              {verifiedAgency ? " · listed by a verified agency" : isAgencyListing ? " · listed by an agency" : ""}
            </p>

            {closed && (
              <div className="notice">This property has been {post.availability === "sold" ? "sold" : "rented"}.</div>
            )}

            {notice && (
              <div className={`notice ${notice.type}`}>
                {notice.type === "success" && <CheckCircle2 size={16} />}
                {notice.text}
              </div>
            )}

            <div className="actions">
              {canRequestTour && (
                <button className="btn btn-brand ctaBtn" onClick={handleTour}>
                  <CalendarCheck size={17} /> Request a tour
                </button>
              )}
              {canContact && (
                <button
                  className={`btn ${canRequestTour ? "btn-outline" : "btn-brand ctaBtn"}`}
                  onClick={handleMessage}
                >
                  <MessageCircle size={17} /> {isAgencyListing ? "Message agency" : "Message owner"}
                </button>
              )}
              {isOwner && (
                <Link to={`/edit-post/${post.id}`} className="btn btn-outline">
                  <Pencil size={16} /> Edit listing
                </Link>
              )}
              {isOwner && (
                <button className="btn btn-danger" onClick={() => setShowModal(true)}>
                  <Trash2 size={16} /> Delete listing
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>

      <section className="block locationBlock">
        <h2>Where you&rsquo;ll be</h2>
        <p className="muted">{formatAddress(post)}</p>
        <div className="mapContainer">
          <Map items={[post]} detail />
        </div>
      </section>

      {showTourModal && (
        <TourRequestModal
          post={post}
          currentUser={currentUser}
          onClose={() => setShowTourModal(false)}
          onSuccess={() => {
            setShowTourModal(false);
            setNotice({
              type: "success",
              text: `Visit request sent. ${isAgencyListing ? "The agency" : "The owner"} will confirm soon — follow it under Profile → Inquiries.`,
            });
          }}
        />
      )}

      {chatOpen && (
        <div className="chatDrawer" role="dialog" aria-label="Messages">
          <button
            className="drawerClose"
            onClick={() => setChatOpen(false)}
            aria-label="Close messages"
          >
            <X size={18} />
          </button>
          <Chat post={post} />
        </div>
      )}

      {showModal && (
        <div className="confirmOverlay" onClick={() => setShowModal(false)}>
          <div className="confirmBox" onClick={(e) => e.stopPropagation()}>
            <h2>Delete this listing?</h2>
            <p>This permanently removes the listing and its photos. This cannot be undone.</p>
            <div className="confirmButtons">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
