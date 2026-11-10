import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import { useEffect, useMemo, useRef } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import AlgeriaMask, {
  ALGERIA_BOUNDS,
  ALGERIA_CENTER,
} from "../lib/AlgeriaMask";
import { BaseTiles, MapBehaviour } from "../lib/mapKit";

export const isInAlgeria = (latlng) => ALGERIA_BOUNDS.contains(latlng);

const PIN_ZOOM = 16;

// Coral drop-pin drawn in SVG, so nothing is loaded from a CDN
const pinIcon = L.divIcon({
  className: "pickerPin",
  html: `<svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true">
      <path d="M17 1C8.2 1 1 8 1 16.8 1 28.5 17 43 17 43s16-14.5 16-26.2C33 8 25.8 1 17 1Z"
        fill="#e51d53" stroke="#fff" stroke-width="2"/>
      <circle cx="17" cy="16.5" r="5.5" fill="#fff"/>
    </svg>`,
  iconSize: [34, 44],
  iconAnchor: [17, 43],
});

function ClickHandler({ onSelect, onOutside }) {
  useMapEvents({
    click(e) {
      if (isInAlgeria(e.latlng)) onSelect(e.latlng);
      else onOutside?.(e.latlng);
    },
  });
  return null;
}

// Move to the pin when it is set from outside the map ("use my location").
// A pin placed by clicking or dragging stays where the visitor is looking.
function FollowPosition({ position, fromMap }) {
  const map = useMap();
  useEffect(() => {
    if (!position) return;
    if (fromMap.current) {
      fromMap.current = false;
      return;
    }
    map.setView([position.lat, position.lng], Math.max(map.getZoom(), PIN_ZOOM));
  }, [map, position?.lat, position?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// Fly to an area (e.g. the chosen wilaya) without dropping a pin. When the
// picker reopens with a pin already placed, stay on the pin instead.
function FocusArea({ focus, hasPin }) {
  const map = useMap();
  const shown = useRef(hasPin ? focus : null);
  useEffect(() => {
    if (!focus || focus === shown.current) return;
    shown.current = focus;
    if (focus.bounds) {
      map.flyToBounds(focus.bounds, { maxZoom: focus.maxZoom || 13, duration: 0.8 });
    } else if (focus.center) {
      map.flyTo(focus.center, focus.zoom || 12, { duration: 0.8 });
    }
  }, [map, focus]);
  return null;
}

// Controlled map picker limited to Algeria: `value` is {lat, lng} or null.
function LocationPicker({ value, onLocationChange, onOutside, focus, height = 360 }) {
  const valid =
    value && Number.isFinite(value.lat) && Number.isFinite(value.lng);
  const position = valid ? value : null;
  const fromMap = useRef(false);

  const select = (latlng) => {
    fromMap.current = true;
    onLocationChange(latlng);
  };

  const markerEvents = useMemo(
    () => ({
      dragend(e) {
        const latlng = e.target.getLatLng();
        if (isInAlgeria(latlng)) {
          fromMap.current = true;
          onLocationChange(latlng);
        } else {
          onOutside?.(latlng);
          // snap back to the last valid spot
          if (position) e.target.setLatLng([position.lat, position.lng]);
        }
      },
    }),
    [onLocationChange, onOutside, position]
  );

  return (
    <MapContainer
      center={position ? [position.lat, position.lng] : ALGERIA_CENTER}
      zoom={position ? PIN_ZOOM : 5}
      zoomSnap={0.5}
      scrollWheelZoom={false}
      style={{
        height,
        width: "100%",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        cursor: "crosshair",
        zIndex: 0,
        background: "#f2efe9",
      }}
    >
      <BaseTiles />
      <AlgeriaMask />
      <MapBehaviour wheelOnFocus />
      <ClickHandler onSelect={select} onOutside={onOutside} />
      <FollowPosition position={position} fromMap={fromMap} />
      <FocusArea focus={focus} hasPin={!!position} />
      {position && (
        <Marker
          position={[position.lat, position.lng]}
          icon={pinIcon}
          draggable
          autoPan
          eventHandlers={markerEvents}
          title="Drag to adjust"
        />
      )}
    </MapContainer>
  );
}

export default LocationPicker;
