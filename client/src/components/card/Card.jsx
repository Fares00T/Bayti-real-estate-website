import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BadgeCheck, Heart, Trash2 } from "lucide-react";
import "./card.scss";
import { AuthContext } from "../../context/AuthContext";
import apiRequest from "../lib/apiRequest";
import { formatPropertyType } from "../lib/format";

const priceNumber = new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 0 });

// `actions` adds owner controls under the card (My properties)
function Card({ item, onDelete, actions, variant = "grid" }) {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [saved, setSaved] = useState(Boolean(item.isSaved));
  // Computed by the API from the agency's live status; never from the account type
  const verifiedAgency = Boolean(item.agency?.verified);
  const STATUS_TAG = { pending: "Pending review", rejected: "Rejected", unpublished: "Offline", archived: "Archived" };
  const SOLD_TAG = { sold: "Sold", rented: "Rented", under_offer: "Under offer" };
  const image = Array.isArray(item.images) ? item.images[0] : null;
  const place = [item.district, item.city].filter(Boolean).join(", ");

  const specs = [
    item.propertyType && formatPropertyType(item.propertyType),
    item.bedroom > 0 && `${item.bedroom} ${item.bedroom === 1 ? "bedroom" : "bedrooms"}`,
    item.bathroom > 0 && `${item.bathroom} ${item.bathroom === 1 ? "bath" : "baths"}`,
  ].filter(Boolean);

  const toggleSave = async (e) => {
    e.preventDefault();
    if (!currentUser) return navigate("/login");
    setSaved((s) => !s);
    try {
      await apiRequest.post("/users/save", { postId: item.id });
    } catch {
      setSaved((s) => !s);
    }
  };

  return (
    <article className={`card card--${variant}`}>
      <Link to={`/${item.id}`} className="imageContainer">
        {image ? (
          <img src={image} alt={item.title} loading="lazy" />
        ) : (
          <div className="noImage">No photo yet</div>
        )}
        {item.status && item.status !== "approved" ? (
          <span className={`tag status-${item.status}`}>
            {STATUS_TAG[item.status] || item.status}
          </span>
        ) : SOLD_TAG[item.availability] ? (
          <span className="tag">{SOLD_TAG[item.availability]}</span>
        ) : (
          verifiedAgency && (
            <span className="tag verifiedTag">
              <BadgeCheck size={14} /> Verified agency
            </span>
          )
        )}
        <button
          type="button"
          className={`heart ${saved ? "saved" : ""}`}
          onClick={toggleSave}
          aria-label={saved ? "Remove from saved" : "Save listing"}
          aria-pressed={saved}
        >
          <Heart size={24} strokeWidth={2} />
        </button>
      </Link>

      <Link to={`/${item.id}`} className="textContainer">
        <div className="row">
          <h3 className="place">{place || item.address}</h3>
          <span className="kind">{item.type === "rent" ? "For rent" : "For sale"}</span>
        </div>
        <p className="line">{item.title}</p>
        {specs.length > 0 && <p className="line">{specs.join(" · ")}</p>}
        <p className="price">
          <strong>{priceNumber.format(item.price)} DZD</strong>
          {item.type === "rent" && <span> month</span>}
        </p>
        {item.agency && (
          <p className="byline">
            {item.agency.logo ? <img src={item.agency.logo} alt="" /> : null}
            <span>{item.agency.tradeName}</span>
            {verifiedAgency && <BadgeCheck size={14} className="check" aria-label="Verified agency" />}
          </p>
        )}
      </Link>

      {actions && <div className="cardActions">{actions}</div>}

      {onDelete && (
        <button
          type="button"
          className="deleteBtn"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 size={14} /> Delete
        </button>
      )}
    </article>
  );
}

export default Card;
