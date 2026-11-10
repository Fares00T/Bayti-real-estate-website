import { useEffect, useMemo, useState } from "react";
import { Polygon, useMap } from "react-leaflet";
import L from "leaflet";

// Algeria's bounding box (SW, NE)
export const ALGERIA_BOUNDS = L.latLngBounds([18.9, -8.7], [37.2, 12.0]);
export const ALGERIA_CENTER = [28.2, 2.6];

// How far the map may be panned: Algeria plus a margin of sea and desert, so a
// popup on a coastal or border pin can open without being pushed off-screen.
const PAN_BOUNDS = ALGERIA_BOUNDS.pad(0.15);

// Same blue as the sea on OpenStreetMap tiles, so the masked area and the
// real sea off the coast read as one surface.
export const SEA_COLOR = "#aad3df";

// Whole-world ring; Algeria is cut out of it as a hole
const WORLD = [
  [90, -360],
  [90, 360],
  [-90, 360],
  [-90, -360],
];

// Where the land borders meet the coast, and an offshore line between them
// that only crosses open sea (south of Spain, the Balearics and Sardinia).
const MOROCCO_COAST = [-2.21, 35.09];
const TUNISIA_COAST = [8.62, 36.94];
const OFFSHORE = [
  [-2.2, 36.1],
  [0, 37.1],
  [3, 37.6],
  [8.6, 37.6],
];

const nearest = (ring, [lng, lat]) =>
  ring.reduce(
    (best, p, i) =>
      Math.hypot(p[0] - lng, p[1] - lat) < Math.hypot(ring[best][0] - lng, ring[best][1] - lat)
        ? i
        : best,
    0
  );

// The hole keeps Algeria's land borders but swaps its coastline for the
// offshore line. City names on the coast are drawn partly over the sea, so
// masking the sea would cut them off.
const withOpenSea = (ring) => {
  const west = nearest(ring, MOROCCO_COAST);
  const east = nearest(ring, TUNISIA_COAST);
  // walk the land borders from Tunisia round the south to Morocco
  const land =
    east <= west
      ? ring.slice(east, west + 1)
      : [...ring.slice(east), ...ring.slice(0, west + 1)];
  return [...land, ...OFFSHORE];
};

let outlinePromise;
const loadOutline = () => {
  outlinePromise ??= fetch("/algeria.geo.json")
    .then((res) => res.json())
    // GeoJSON is [lng, lat]; Leaflet wants [lat, lng]
    .then((geo) => withOpenSea(geo.geometry.coordinates[0]).map(([lng, lat]) => [lat, lng]))
    .catch(() => null);
  return outlinePromise;
};

/**
 * Drop inside any <MapContainer>: keeps the map on Algeria and covers every
 * other country, so only Algeria (and the sea off its coast) is visible.
 */
export default function AlgeriaMask() {
  const map = useMap();
  const [outline, setOutline] = useState(null);

  // Draw the mask well past the screen edges. With the default margin, the
  // edges of the screen briefly show the other countries during a zoom-out
  // animation, before the mask is redrawn.
  const renderer = useMemo(() => L.svg({ padding: 2 }), []);

  useEffect(() => {
    let alive = true;
    loadOutline().then((ring) => alive && setOutline(ring));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    map.setMaxBounds(PAN_BOUNDS);
    map.options.maxBoundsViscosity = 1;

    // Never allow zooming out further than "the whole country fits".
    // A hidden or not-yet-laid-out container has no size; skip until it does.
    const fitMinZoom = () => {
      const size = map.getSize();
      if (!size.x || !size.y) return;
      const z = map.getBoundsZoom(ALGERIA_BOUNDS, false);
      map.setMinZoom(Math.max(z, 4));
    };
    fitMinZoom();
    map.on("resize", fitMinZoom);
    return () => map.off("resize", fitMinZoom);
  }, [map]);

  if (!outline) return null;

  return (
    <Polygon
      positions={[WORLD, outline]}
      interactive={false}
      renderer={renderer}
      // no outline: the tiles already draw the border, and a stroke would
      // also trace the offshore line across the sea
      pathOptions={{ stroke: false, fillColor: SEA_COLOR, fillOpacity: 1 }}
    />
  );
}
