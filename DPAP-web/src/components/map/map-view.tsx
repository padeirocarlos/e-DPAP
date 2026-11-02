"use client";

/**
 * SSR-safe entry point for the actor map.
 *
 * Leaflet cannot render on the server, so the real map is dynamically imported
 * with `ssr: false` (only allowed inside a Client Component). A localized
 * placeholder shows while the map chunk loads.
 */

import dynamic from "next/dynamic";
import { useDictionary } from "@/i18n/provider";
import type { ActorMarker } from "@/components/map/actor-map";

const ActorMap = dynamic(() => import("@/components/map/actor-map"), {
  ssr: false,
});

export function MapView({ markers }: { markers: ActorMarker[] }) {
  const dict = useDictionary();

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-black/10 dark:border-white/15">
      <ActorMap markers={markers} />
      <noscript>
        <p className="p-4 text-sm">{dict.map.loading}</p>
      </noscript>
    </div>
  );
}
