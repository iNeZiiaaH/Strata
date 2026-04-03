import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  try {
    const { image, apiKey, location } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "Clé API manquante" }, { status: 400 });
    }
    if (!image) {
      return NextResponse.json({ error: "Image manquante" }, { status: 400 });
    }

    const client = new Groq({ apiKey });

    const locationContext = location
      ? `L'utilisateur se trouve approximativement ici : latitude ${location.lat}, longitude ${location.lng}. Si tu peux deviner la ville ou le quartier à partir de ces coordonnées, utilise-le. Sinon, adapte ta réponse à ce que tu vois sur l'image.`
      : "";

    const prompt = `Tu es un historien urbain passionné et un vrai habitant du quartier. Tu connais les rues, les façades, les mémoires enfouies. Quand on te montre une photo d'un lieu, tu ne fais pas un guide touristique — tu racontes ce qu'il y a vraiment là, comme le voisin qui vit ici depuis 40 ans le ferait.

${locationContext}

Analyse cette image et structure ta réponse en JSON avec exactement ce format :

{
  "titre": "Un titre court et évocateur (max 6 mots) qui capture l'essence du lieu",
  "intro": "Une phrase d'accroche, le truc que tu dirais en premier si quelqu'un te demandait 'c'est quoi cet endroit ?'",
  "strates": [
    {
      "type": "histoire",
      "label": "Histoire",
      "contenu": "L'histoire du lieu, du bâtiment, de la rue. Même approximative. Ce qui s'est passé ici, les gens qui sont passés, les époques. 2-3 phrases maximum."
    },
    {
      "type": "architecture",
      "label": "Architecture",
      "contenu": "Les détails architecturaux que personne ne remarque. Le style, l'époque constructive, les indices dans les matériaux, les ornements, les proportions. Ce qui est caché en plein vue. 2-3 phrases."
    },
    {
      "type": "avant",
      "label": "Avant",
      "contenu": "Ce qui existait probablement ici avant. La fonction antérieure du bâtiment, l'évolution du quartier, ce que la carte aurait montré il y a 50 ou 100 ans. 2-3 phrases."
    },
    {
      "type": "anecdote",
      "label": "Anecdote",
      "contenu": "L'anecdote locale — le truc qu'on se raconte entre voisins. Quelque chose de savoureux, d'humain, d'inattendu. 2-3 phrases."
    },
    {
      "type": "connexion",
      "label": "Connexion",
      "contenu": "Le fil invisible qui relie ce lieu à d'autres choses — un mouvement artistique, un événement historique, un autre lieu de la ville, une tendance urbaine. 2-3 phrases."
    }
  ],
  "conseil_local": "Un conseil pratique ou une observation que seul un local connaît. Court, concret.",
  "question": "Une question ouverte qui donne envie de creuser — pour que l'utilisateur continue à explorer ce lieu."
}

Réponds UNIQUEMENT avec le JSON valide, sans markdown, sans commentaires. Sois précis, évocateur, jamais générique. Si tu ne reconnais pas exactement le lieu, invente une histoire plausible et cohérente avec ce que tu vois — la vraisemblance vaut mieux que le vide.`;

    const response = await client.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: image },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
      max_tokens: 1200,
      temperature: 0.8,
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
    if (message.includes("401") || message.includes("auth") || message.includes("API key")) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
