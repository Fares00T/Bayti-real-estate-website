import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./listingsMap.scss";

// Equirectangular projection fitted to Algeria's bounding box, with longitude
// squeezed by cos(28°) so the country keeps its real proportions.
const W_LNG = -8.7;
const N_LAT = 37.2;
const K = Math.cos((28 * Math.PI) / 180);
const S = 30; // svg units per degree
const project = (lng, lat) => [(lng - W_LNG) * K * S, (N_LAT - lat) * S];
const VIEW_W = Math.round(20.7 * K * S);
const VIEW_H = Math.round(18.3 * S);

let outlinePromise;
const loadOutline = () => {
  outlinePromise ??= fetch("/algeria.geo.json")
    .then((res) => res.json())
    .then((geo) =>
      geo.geometry.coordinates[0]
        .map(([lng, lat], i) => `${i ? "L" : "M"}${project(lng, lat).map((n) => n.toFixed(1)).join(" ")}`)
        .join("") + "Z"
    )
    .catch(() => null);
  return outlinePromise;
};

/**
 * Algeria with one dot per wilaya that has live listings, sized by how many.
 * Every dot opens the search for that wilaya. Drawn from real coordinates, so
 * an empty marketplace shows an empty map rather than invented pins.
 */
function ListingsMap({ posts = [] }) {
  const navigate = useNavigate();
  const [outline, setOutline] = useState(null);
  const [active, setActive] = useState(null);

  useEffect(() => {
    let alive = true;
    loadOutline().then((d) => alive && setOutline(d));
    return () => {
      alive = false;
    };
  }, []);

  // Average the listings of each wilaya into one point
  const cities = useMemo(() => {
    const groups = {};
    for (const p of posts) {
      const lat = Number(p.latitude);
      const lng = Number(p.longitude);
      if (!p.city || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (lat < 18 || lat > 38 || lng < -9 || lng > 12.5) continue;
      const g = (groups[p.city] ||= { city: p.city, n: 0, lat: 0, lng: 0 });
      g.n += 1;
      g.lat += lat;
      g.lng += lng;
    }
    return Object.values(groups)
      .map((g) => ({ ...g, xy: project(g.lng / g.n, g.lat / g.n) }))
      .sort((a, b) => b.n - a.n);
  }, [posts]);

  const max = cities[0]?.n || 1;
  const total = cities.reduce((sum, c) => sum + c.n, 0);

  return (
    <figure className="listingsMap">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="group"
        aria-label="Wilayas with listings on Bayti"
        onMouseLeave={() => setActive(null)}
      >
        {outline && <path d={outline} className="land" />}
        {cities.map((c) => {
          // Kept small: Algiers, Blida and Tipaza sit a few pixels apart
          const r = 4.5 + 4.5 * Math.sqrt(c.n / max);
          const href = `/list?city=${encodeURIComponent(c.city)}`;
          return (
            <a
              key={c.city}
              href={href}
              className={`dot ${active?.city === c.city ? "on" : ""}`}
              aria-label={`${c.city}: ${c.n} ${c.n === 1 ? "listing" : "listings"}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(href);
              }}
              onMouseEnter={() => setActive(c)}
              onFocus={() => setActive(c)}
            >
              <circle cx={c.xy[0]} cy={c.xy[1]} r={r + 6} className="halo" />
              <circle cx={c.xy[0]} cy={c.xy[1]} r={r} className="core" />
            </a>
          );
        })}
      </svg>

      <figcaption>
        {active ? (
          <>
            <strong>{active.city}</strong>
            <span>
              {active.n} {active.n === 1 ? "listing" : "listings"}, tap to see them
            </span>
          </>
        ) : total > 0 ? (
          <>
            <strong>
              {total} {total === 1 ? "listing" : "listings"} live
            </strong>
            <span>
              in {cities.length} {cities.length === 1 ? "wilaya" : "wilayas"}. Pick one on the map.
            </span>
          </>
        ) : (
          <span>Listings appear here as soon as they're published.</span>
        )}
      </figcaption>
    </figure>
  );
}

export default ListingsMap;
