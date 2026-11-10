import { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "./pin.scss";
import { Link } from "react-router-dom";
import { formatPrice } from "../lib/format";

// "18.5M" / "35K" — short label shown on the map marker
const shortPrice = (price) => {
  const n = Number(price) || 0;
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
};

function Pin({ item, position, popup = true }) {
  const rent = item.type === "rent";
  const label = shortPrice(item.price);

  // A new icon object makes Leaflet rebuild the marker, so only on real changes
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "pricePin",
        html: `<span class="${rent ? "rent" : ""}">${label}</span>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        popupAnchor: [0, -34],
      }),
    [rent, label]
  );

  const image = Array.isArray(item.images) ? item.images[0] : null;

  return (
    <Marker
      position={position || [parseFloat(item.latitude), parseFloat(item.longitude)]}
      icon={icon}
      title={item.title}
      keyboard={popup}
      interactive={popup}
      riseOnHover
    >
      {popup && (
        // top-left padding keeps the popup clear of the zoom buttons
        <Popup
          autoPanPaddingTopLeft={[60, 16]}
          autoPanPaddingBottomRight={[16, 24]}
          closeButton={false}
        >
          <Link to={`/${item.id}`} className="popupCont">
            {image && <img src={image} alt="" />}
            <div className="textCont">
              <span className="popupTitle">{item.title}</span>
              <span className="popupMeta">
                {item.bedroom > 0 && `${item.bedroom} bed · `}
                {item.bathroom} bath
              </span>
              <b>{formatPrice(item.price, item.type)}</b>
            </div>
          </Link>
        </Popup>
      )}
    </Marker>
  );
}

export default Pin;
