import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { fetchNearbyPois, reverseGeocode, type PoiTheme } from "@/lib/overpass";

export async function POST(req: NextRequest) {
  try {
    const { apiKey: clientKey, location, rayon = 700, theme = "historique" } =
      await req.json();

    const apiKey = (process.env.GROQ_API_KEY || clientKey || "").trim();
    if (!apiKey) {
      return NextResponse.json({ error: "Clé API manquante" }, { status: 400 });
    }
    if (!location) {
      return NextResponse.json({ error: "Localisation manquante" }, { status: 400 });
    }

    // 1. Get real POIs from OpenStreetMap via Overpass
    let pois = await fetchNearbyPois(location.lat, location.lng, rayon, theme as PoiTheme);

    // Fallback: widen radius if not enough POIs
    if (pois.length < 3) {
      pois = await fetchNearbyPois(location.lat, location.lng, rayon * 2, theme as PoiTheme);
    }

    // 2. Get neighborhood context via Nominatim
    const lieu = await reverseGeocode(location.lat, location.lng);

    // 3. Build Groq prompt with real POI data
    const themeLabels: Record<PoiTheme, string> = {
      historique: "historique et mémorielle",
      architecture: "architecturale et urbaine",
      secrets: "secrets locaux et lieux insolites",
      artistique: "artistique et culturelle",
    };

    const poisList = pois
      .slice(0, 5)
      .map(
        (p, i) =>
          `${i + 1}. "${p.name}" — type: ${Object.entries(p.tags)
            .filter(([k]) =>
              ["historic", "tourism", "amenity", "leisure", "building", "man_made"].includes(k)
            )
            .map(([k, v]) => `${k}=${v}`)
            .join(", ")} — coordonnées: ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`
      )
      .join("\n");

    const hasPois = pois.length >= 3;
    const prompt = hasPois
      ? `Tu es un guide local passionné qui crée des balades narratives. 
Lieu : ${lieu || `lat ${location.lat}, lng ${location.lng}`}
Thème de la balade : ${themeLabels[theme as PoiTheme]}

Voici ${pois.slice(0, 5).length} lieux RÉELS extraits d'OpenStreetMap autour de la position de l'utilisateur :
${poisList}

Crée une balade narrative en utilisant EXACTEMENT ces lieux dans l'ordre qui fait le plus de sens géographiquement. Tu DOIS utiliser les coordonnées exactes fournies.

Réponds UNIQUEMENT avec ce JSON valide (aucun texte autour) :
{
  "titre": "Titre poétique de la balade (max 8 mots)",
  "intro": "Phrase d'introduction qui donne l'ambiance du quartier",
  "duree": "durée estimée en minutes (nombre entier)",
  "distance": "distance totale estimée en mètres (nombre entier)",
  "etapes": [
    {
      "numero": 1,
      "titre": "Titre court de l'étape",
      "description": "Histoire et anecdotes du lieu, ton d'un local passionné. 3-4 phrases.",
      "detail": "Un détail précis, visible, à chercher sur place",
      "direction": "Instruction claire pour rejoindre l'étape suivante depuis ce point",
      "lat": 0.000000,
      "lng": 0.000000
    }
  ],
  "anecdote_finale": "Pensée finale sur ce quartier."
}

Les valeurs lat/lng de chaque étape doivent être EXACTEMENT celles fournies ci-dessus. Ne les invente pas.`
      : `Tu es un guide local passionné. L'utilisateur est à ${lieu || `lat ${location.lat}, lng ${location.lng}`}.
Thème : ${themeLabels[theme as PoiTheme]}.
Aucun POI trouvé à proximité via OpenStreetMap. Génère une balade plausible de 4 étapes autour de ce point, avec des coordonnées proches et réalistes (décalages max ±0.004 degrés). 
Réponds UNIQUEMENT avec ce JSON valide :
{
  "titre": "Titre poétique (max 8 mots)",
  "intro": "Phrase d'introduction",
  "duree": "durée en minutes",
  "distance": "distance en mètres",
  "etapes": [{"numero":1,"titre":"...","description":"...","detail":"...","direction":"...","lat":${location.lat},"lng":${location.lng}}],
  "anecdote_finale": "..."
}`;

    const client = new Groq({ apiKey });
    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      temperature: 0.75,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "Réponse vide de l'IA" }, { status: 500 });
    }

    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const data = JSON.parse(cleaned);

    // Inject real coords from OSM if AI hallucinated them
    if (hasPois && data.etapes) {
      data.etapes = data.etapes.map((etape: { lat?: number; lng?: number; [key: string]: unknown }, i: number) => {
        const poi = pois[i];
        if (poi && (Math.abs((etape.lat ?? 0) - poi.lat) > 0.01 || Math.abs((etape.lng ?? 0) - poi.lng) > 0.01)) {
          return { ...etape, lat: poi.lat, lng: poi.lng };
        }
        return etape;
      });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
