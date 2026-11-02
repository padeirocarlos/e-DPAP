import { listActors } from "@/lib/api/actors";
import { getServerAuthToken } from "@/lib/auth/session";
import { getDictionary } from "@/i18n/dictionary";
import { appConfig } from "@/config/app.config";
import { MapView } from "@/components/map/map-view";
import type { ActorMarker } from "@/components/map/actor-map";

/**
 * Server component: fetches actors and hands plain marker data to the (client)
 * map. Rendered inside a <Suspense> boundary; failures bubble to the segment
 * error boundary.
 */
export async function ActorMarkers() {
  const token = await getServerAuthToken();
  const [result, dict] = await Promise.all([
    listActors({ pageSize: appConfig.map.markerFetchLimit }, { token }),
    getDictionary(),
  ]);

  const markers: ActorMarker[] = result.items.map((a) => ({
    id: a.id,
    name: a.name,
    lat: a.latitude,
    lng: a.longitude,
    typeLabel: dict.domain.actorType[a.actorType],
    sector: a.sector,
  }));

  return <MapView markers={markers} />;
}
