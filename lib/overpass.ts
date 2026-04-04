export type PoiTheme = "historique" | "architecture" | "secrets" | "artistique";

export interface OsmPoi {
  id: number;
  type: "node" | "way" | "relation";
  lat: number;
  lng: number;
  name: string;
  tags: Record<string, string>;
  score: number;
}

const THEME_TAGS: Record<PoiTheme, string> = {
  historique: `
  node["historic"](around:{r},{lat},{lng});
  node["tourism"~"^(attraction|museum|viewpoint)$"](around:{r},{lat},{lng});
  node["amenity"~"^(place_of_worship|theatre|library|fountain)$"](around:{r},{lat},{lng});
  way["historic"](around:{r},{lat},{lng});
  way["tourism"~"^(attraction|museum)$"](around:{r},{lat},{lng});
  way["building"~"^(cathedral|church|chapel|mosque|synagogue|monastery|castle|palace|manor)$"](around:{r},{lat},{lng});
  way["amenity"~"^(place_of_worship|theatre|library)$"](around:{r},{lat},{lng});
  relation["historic"](around:{r},{lat},{lng});`,

  architecture: `
  node["historic"~"^(building|monument|memorial|ruins|castle)$"](around:{r},{lat},{lng});
  node["tourism"~"^(attraction|viewpoint)$"](around:{r},{lat},{lng});
  way["building"](around:{r},{lat},{lng});
  way["historic"](around:{r},{lat},{lng});
  way["architecture"](around:{r},{lat},{lng});
  way["tourism"~"^(attraction)$"](around:{r},{lat},{lng});
  relation["building"](around:{r},{lat},{lng});
  relation["historic"](around:{r},{lat},{lng});`,

  secrets: `
  node["historic"](around:{r},{lat},{lng});
  node["tourism"~"^(artwork|attraction|viewpoint)$"](around:{r},{lat},{lng});
  node["amenity"~"^(fountain|clock|bench)$"](around:{r},{lat},{lng});
  node["leisure"~"^(park|garden|square)$"](around:{r},{lat},{lng});
  node["man_made"~"^(tower|lighthouse|windmill|water_tower)$"](around:{r},{lat},{lng});
  way["historic"](around:{r},{lat},{lng});
  way["leisure"~"^(park|garden)$"](around:{r},{lat},{lng});
  way["landuse"~"^(cemetery|allotments)$"](around:{r},{lat},{lng});
  relation["historic"](around:{r},{lat},{lng});`,

  artistique: `
  node["tourism"~"^(artwork|gallery|museum)$"](around:{r},{lat},{lng});
  node["amenity"~"^(theatre|cinema|arts_centre|fountain)$"](around:{r},{lat},{lng});
  node["historic"~"^(memorial|monument)$"](around:{r},{lat},{lng});
  node["leisure"~"^(park|garden)$"](around:{r},{lat},{lng});
  way["tourism"~"^(artwork|gallery|museum)$"](around:{r},{lat},{lng});
  way["amenity"~"^(theatre|cinema|arts_centre)$"](around:{r},{lat},{lng});
  way["historic"~"^(memorial|monument)$"](around:{r},{lat},{lng});
  way["leisure"~"^(park|garden)$"](around:{r},{lat},{lng});
  relation["tourism"~"^(artwork|museum)$"](around:{r},{lat},{lng});`,
};

function scoreTag(tags: Record<string, string>): number {
  let s = 0;
  if (tags.historic) s += 10;
  if (tags.tourism === "attraction") s += 8;
  if (tags.tourism === "museum") s += 7;
  if (tags.tourism === "artwork") s += 6;
  if (tags.tourism === "viewpoint") s += 5;
  if (tags.amenity === "place_of_worship") s += 6;
  if (tags.amenity === "theatre") s += 5;
  if (tags.amenity === "fountain") s += 4;
  if (tags.amenity === "library") s += 4;
  if (tags.leisure === "park" || tags.leisure === "garden") s += 3;
  if (tags.name) s += 5;
  if (tags["name:fr"] || tags["name:en"]) s += 2;
  if (tags.wikipedia) s += 4;
  if (tags.wikidata) s += 3;
  if (tags.description) s += 2;
  return s;
}

export async function fetchNearbyPois(
  lat: number,
  lng: number,
  rayon: number,
  theme: PoiTheme
): Promise<OsmPoi[]> {
  const tagBlock = THEME_TAGS[theme]
    .replace(/{r}/g, String(rayon))
    .replace(/{lat}/g, String(lat))
    .replace(/{lng}/g, String(lng));

  const query = `[out:json][timeout:15];(${tagBlock});out center 60;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal: AbortSignal.timeout(18000),
  });

  if (!res.ok) throw new Error(`Overpass error ${res.status}`);

  const data = await res.json();
  const elements: OsmPoi[] = [];

  for (const el of data.elements ?? []) {
    const name =
      el.tags?.name ||
      el.tags?.["name:fr"] ||
      el.tags?.["name:en"] ||
      el.tags?.["official_name"];
    if (!name) continue;

    const lat2 = el.type === "node" ? el.lat : el.center?.lat;
    const lng2 = el.type === "node" ? el.lon : el.center?.lon;
    if (!lat2 || !lng2) continue;

    elements.push({
      id: el.id,
      type: el.type,
      lat: lat2,
      lng: lng2,
      name,
      tags: el.tags ?? {},
      score: scoreTag(el.tags ?? {}),
    });
  }

  // Sort by score desc, deduplicate by proximity (keep 1 per 80m cluster)
  elements.sort((a, b) => b.score - a.score);
  const picked: OsmPoi[] = [];
  for (const poi of elements) {
    const tooClose = picked.some(
      (p) => haversine(p.lat, p.lng, poi.lat, poi.lng) < 80
    );
    if (!tooClose) picked.push(poi);
    if (picked.length >= 8) break;
  }

  return picked;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
      { headers: { "User-Agent": "Strata-App/1.0" }, signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    const addr = data.address ?? {};
    return [
      addr.quarter || addr.neighbourhood || addr.suburb,
      addr.city || addr.town || addr.village,
      addr.country,
    ]
      .filter(Boolean)
      .join(", ");
  } catch {
    return "";
  }
}
