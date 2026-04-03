# Strata — Lis la ville comme un local

> Tu vois des façades. Un local lit les strates.

## Ce que fait Strata

Pointe ton téléphone sur un bâtiment, une rue, une façade, une devanture — Strata te raconte ce qu'il y a vraiment là. Pas le guide touristique. Le truc que le voisin du quartier t'aurait dit.

### Mode Scanner
- Prends une photo ou importe une image d'un lieu
- Llama 4 Vision (via Groq) analyse l'image et génère 5 strates narratives :
  - **Histoire** — L'histoire du lieu et de ses habitants
  - **Architecture** — Les détails cachés en plein vue
  - **Avant** — Ce qui existait ici avant
  - **Anecdote** — Ce que les gens du quartier se racontent
  - **Connexion** — Les fils invisibles entre les lieux

### Mode Balade
- Géolocalisation GPS en temps réel
- Génère un parcours narratif de 5 étapes autour de ta position
- Carte interactive (Leaflet + OpenStreetMap, tuiles sombres)
- Navigation GPS live : distance et direction vers chaque étape
- Détection automatique d'arrivée à moins de 40 mètres

## Démarrage rapide

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000)

## Stack technique

- **Next.js 16** (App Router, Turbopack)
- **TypeScript**
- **Tailwind CSS v4**
- **Groq SDK** — Llama 4 Scout (vision) pour le scanner, Llama 3.3 70B pour la balade
- **Leaflet + OpenStreetMap** — carte GPS gratuite
