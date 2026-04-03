import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  try {
    const { apiKey: clientKey, location, rayon = 500 } = await req.json();

    const apiKey = process.env.GROQ_API_KEY || clientKey;
    if (!apiKey) {
      return NextResponse.json({ error: "Clé API manquante" }, { status: 400 });
    }
    if (!location) {
      return NextResponse.json({ error: "Localisation manquante" }, { status: 400 });
    }

    const client = new Groq({ apiKey });

    const prompt = `Tu es un guide local passionné qui crée des balades narratives. Tu dois créer une balade à pied autour du point GPS suivant : latitude ${location.lat}, longitude ${location.lng}.

Génère un parcours narratif de 5 étapes dans un rayon de ${rayon} mètres. Chaque étape doit être un lieu réel ou plausible avec une histoire.

Réponds UNIQUEMENT avec ce JSON valide :

{
  "titre": "Un titre poétique pour cette balade (max 8 mots)",
  "intro": "Une phrase d'introduction qui donne l'ambiance du quartier/secteur",
  "duree": "Durée estimée en minutes",
  "distance": "Distance totale approximative en mètres",
  "etapes": [
    {
      "numero": 1,
      "titre": "Titre court de l'étape",
      "description": "Ce qu'il y a à voir et l'histoire du lieu. 3-4 phrases, ton d'un local.",
      "detail": "Un détail précis à chercher ou observer sur place",
      "direction": "Instruction de déplacement vers la prochaine étape (ex: 'Remonte la rue vers le nord, 80 mètres')",
      "lat_offset": 0.0002,
      "lng_offset": 0.0001
    }
  ],
  "anecdote_finale": "Une dernière pensée sur ce quartier — ce qui le rend unique."
}

Les lat_offset et lng_offset sont des décalages par rapport au point de départ pour simuler la position GPS de chaque étape. Varie-les pour créer un trajet cohérent. Sois créatif, évocateur, précis. Parle comme un voisin du quartier, pas comme un guide touristique.`;

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1800,
      temperature: 0.85,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "Réponse vide de l'IA" }, { status: 500 });
    }

    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const data = JSON.parse(cleaned);

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
