import { useEffect } from "react";
import { MapContainer, useMap } from "react-leaflet";
import L from "leaflet";
import "./map.scss";
import "leaflet/dist/leaflet.css";
import Pin from "../pin/Pin";
import AlgeriaMask, { ALGERIA_BOUNDS, ALGERIA_CENTER } from "../lib/AlgeriaMask";
import { BaseTiles, ClusterGroup, MapBehaviour } from "../lib/mapKit";

const SINGLE_ZOOM = 15;

// Keep every pin in view whenever the set of listings changes, and again when
// the map is resized, until the visitor moves the map themselves.
function FitBounds({ points }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");

  useEffect(() => {
    let touched = false;

    const fit = () => {
      if (touched) return;
      const size = map.getSize();
      if (!size.x || !size.y) return;
      if (points.length === 1) {
        map.setView(points[0], SINGLE_ZOOM, { animate: false });
      } else if (points.length > 1) {
        map.fitBounds(points, { padding: [48, 48], maxZoom: 13, animate: false });
      } else {
        map.fitBounds(ALGERIA_BOUNDS, { animate: false });
      }
    };
    // Only real input counts, not the map adjusting itself
    const container = map.getContainer();
    const USER_INPUT = ["pointerdown", "wheel", "keydown"];
    const markTouched = () => {
      touched = true;
    };

    fit();
    map.on("resize", fit);
    USER_INPUT.forEach((e) => container.addEventListener(e, markTouched, { passive: true }));
    return () => {
      map.off("resize", fit);
      USER_INPUT.forEach((e) => container.removeEventListener(e, markTouched));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);

  return null;
}

/**
 * Listings on a map. `detail` is the single-listing view on a listing page:
 * no popup (you're already there), and the map doesn't grab the page's
 * scroll: wheel zoom after a click, one-finger panning off on phones.
 */
function Map({ items = [], detail = false }) {
  // Coordinates are stored as strings; skip listings without a valid position
  const located = items
    .map((item) => ({
      item,
      position: [parseFloat(item.latitude), parseFloat(item.longitude)],
    }))
    .filter(({ position }) => position.every(Number.isFinite));

  const points = located.map((l) => l.position);
  const pins = located.map(({ item, position }) => (
    <Pin item={item} position={position} key={item.id} popup={!detail} />
  ));

  return (
    <MapContainer
      center={points[0] || ALGERIA_CENTER}
      zoom={points.length === 1 ? SINGLE_ZOOM : 5}
      zoomSnap={0.5}
      scrollWheelZoom={!detail}
      dragging={!(detail && L.Browser.mobile)}
      className={`map ${detail ? "detail" : ""}`}
    >
      <BaseTiles />
      <AlgeriaMask />
      <MapBehaviour wheelOnFocus={detail} />
      <FitBounds points={points} />

      {pins.length > 1 ? <ClusterGroup>{pins}</ClusterGroup> : pins}
    </MapContainer>
  );
}

export default Map;
