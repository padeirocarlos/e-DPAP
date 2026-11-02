/** Mock GeoJSON/KML actor export (DEV-ONLY). */
import { NextResponse, type NextRequest } from "next/server";
import { MOCK_ENABLED, notFound, unauthorized, hasBearer } from "@/lib/mock/http";
import { exportActors } from "@/lib/mock/store";

export async function GET(request: NextRequest) {
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();
  const sp = request.nextUrl.searchParams;
  const format = sp.get("format") ?? "geojson";
  const anon = sp.get("anonymised") === "true";
  const actors = exportActors({});
  const name = (a: { actorType: string; name: string }) =>
    anon && a.actorType === "PRODUCER" ? "(produtor anonimizado)" : a.name;

  if (format === "kml") {
    const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const placemarks = actors.map((a) =>
      `<Placemark><name>${xml(name(a))}</name><Point><coordinates>${a.longitude},${a.latitude},0</coordinates></Point></Placemark>`,
    ).join("\n");
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Atores DPAP Maputo</name>\n${placemarks}\n</Document></kml>\n`;
    return new NextResponse(body, {
      headers: { "Content-Type": "application/vnd.google-earth.kml+xml", "Content-Disposition": 'attachment; filename="actores.kml"' },
    });
  }

  const fc = {
    type: "FeatureCollection",
    features: actors.map((a) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [a.longitude, a.latitude] },
      properties: {
        name: name(a),
        actorType: a.actorType,
        sector: a.sector,
        district: a.districtCode,
        ...(anon ? {} : { phone: a.phone ?? null }),
      },
    })),
  };
  return new NextResponse(JSON.stringify(fc), {
    headers: { "Content-Type": "application/geo+json", "Content-Disposition": 'attachment; filename="actores.geojson"' },
  });
}
