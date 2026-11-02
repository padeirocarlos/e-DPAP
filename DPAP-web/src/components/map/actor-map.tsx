"use client";

/**
 * Leaflet map rendering registered actors over OpenStreetMap tiles.
 *
 * Client-only (Leaflet touches `window`); it is loaded through `MapView`, which
 * disables SSR. Map defaults (center, zoom, bounds, tiles) come from
 * `appConfig.map`; all visible text comes from the i18n dictionary.
 */

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L, { type LatLngTuple, type LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { appConfig } from "@/config/app.config";
import { useDictionary } from "@/i18n/provider";

export type ActorMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Localized type label, prepared by the caller. */
  typeLabel?: string;
  /** Sector code (AGRICULTURE/LIVESTOCK/FISHERIES/AQUACULTURE) for symbology. */
  sector?: string;
};

// Okabe–Ito — a published colourblind-safe qualitative palette (FR-GIS-1 symbology).
const SECTOR_COLOR: Record<string, string> = {
  AGRICULTURE: "#009E73",
  LIVESTOCK: "#E69F00",
  FISHERIES: "#0072B2",
  AQUACULTURE: "#56B4E9",
};
const DEFAULT_COLOR = "#6b7280";

// Fix Leaflet's default icon paths under a bundler (icons otherwise 404).
const defaultIcon = L.icon({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerIcon2x.src,
  shadowUrl: markerShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function dotIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,.25)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
}

export default function ActorMap({ markers }: { markers: ActorMarker[] }) {
  const dict = useDictionary();
  const { map } = appConfig;

  const content = useMemo(
    () =>
      markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={m.sector ? dotIcon(SECTOR_COLOR[m.sector] ?? DEFAULT_COLOR) : defaultIcon}
        >
          <Popup>
            <strong>{m.name}</strong>
            {m.typeLabel ? (
              <>
                <br />
                {m.typeLabel}
              </>
            ) : null}
          </Popup>
        </Marker>
      )),
    [markers],
  );

  const sectorLegend = Object.keys(SECTOR_COLOR);
  const hasSectors = markers.some((m) => m.sector);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={map.defaultCenter as LatLngTuple}
        zoom={map.defaultZoom}
        minZoom={map.minZoom}
        maxZoom={map.maxZoom}
        maxBounds={map.maxBounds as LatLngBoundsExpression}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer url={map.tileUrl} attribution={dict.map.attribution} />
        {content}
      </MapContainer>
      {hasSectors ? (
        <div className="pointer-events-none absolute bottom-3 right-3 z-[500] rounded-lg border border-black/10 bg-white/95 p-2 text-xs shadow dark:border-white/15 dark:bg-zinc-900/95">
          {sectorLegend.map((code) => (
            <div key={code} className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: SECTOR_COLOR[code] }} />
              <span>{dict.domain.sector[code as keyof typeof dict.domain.sector]}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
