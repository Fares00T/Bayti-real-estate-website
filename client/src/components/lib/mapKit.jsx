import { useEffect } from "react";
import { TileLayer, useMap } from "react-leaflet";
import { createPathComponent } from "@react-leaflet/core";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";

// Pieces shared by every Bayti map (listings map, listing location, picker)

// Standard OpenStreetMap style: coloured roads, parks and water, place names
export function BaseTiles() {
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      maxZoom={19}
    />
  );
}

/**
 * Housekeeping every map needs:
 * - re-measure when its box changes size (Leaflet only watches the window, so
 *   a layout shift otherwise leaves grey gaps and an off-centre view);
 * - with `wheelOnFocus`, the mouse wheel scrolls the page until the map is
 *   clicked, so scrolling past a map doesn't get stuck zooming it.
 */
export function MapBehaviour({ wheelOnFocus = false }) {
  const map = useMap();

  useEffect(() => {
    map.attributionControl?.setPrefix(
      '<a href="https://leafletjs.com" target="_blank" rel="noreferrer">Leaflet</a>'
    );

    const container = map.getContainer();
    let frame;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => map.invalidateSize());
    });
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);

  useEffect(() => {
    if (!wheelOnFocus) return;
    const on = () => map.scrollWheelZoom.enable();
    const off = () => map.scrollWheelZoom.disable();
    off();
    map.on("click focus", on);
    map.on("mouseout blur", off);
    return () => {
      map.off("click focus", on);
      map.off("mouseout blur", off);
    };
  }, [map, wheelOnFocus]);

  return null;
}

// Groups nearby markers into one bubble showing how many listings it holds
const clusterIcon = (cluster) =>
  L.divIcon({
    className: "pinCluster",
    html: `<span>${cluster.getChildCount()}</span>`,
    iconSize: [40, 40],
  });

export const ClusterGroup = createPathComponent(
  // eslint-disable-next-line no-unused-vars
  ({ children, ...options }, ctx) => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 56,
      iconCreateFunction: clusterIcon,
      ...options,
    });
    return { instance: group, context: { ...ctx, layerContainer: group } };
  }
);
