# Strata — Lis la ville comme un local

> Tu vois des façades. Un local lit les strates.

## Ce que fait Strata

Pointe ton téléphone sur un bâtiment, une rue, une façade, une devanture — Strata te raconte ce qu'il y a vraiment là. Pas le guide touristique. Le truc que le voisin du quartier t'aurait dit.

### Mode Scanner
- Prends une photo ou importe une image d'un lieu
- GPT-4o Vision analyse l'image et génère 5 strates narratives :
  - **Histoire** — L'histoire du lieu et de ses habitants
  - **Architecture** — Les détails cachés en plein vue
  - **Avant** — Ce qui existait ici avant
  - **Anecdote** — Ce que les gens du quartier se racontent
  - **Connexion** — Les fils invisibles entre les lieux

### Mode Balade
- Géolocalisation automatique
- Génère un parcours narratif de 5 étapes autour de toi
- Chaque étape : description locale, détail à observer, direction pour continuer

## Démarrage rapide

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000)

Au premier lancement, l'app demande une clé API OpenAI (stockée uniquement dans le navigateur, jamais envoyée ailleurs).

## Configuration

La clé API OpenAI peut être saisie directement dans l'interface, ou définie dans `.env.local` :

```env
OPENAI_API_KEY=sk-...
```

Obtiens une clé sur [platform.openai.com/api-keys](https://platform.openai.com/api-keys).

## Stack technique

- **Next.js 16** (App Router, Turbopack)
- **TypeScript**
- **Tailwind CSS v4**
- **OpenAI GPT-4o Vision** pour l'analyse d'images et la génération narrative
- API Routes Next.js pour les appels OpenAI (clé jamais exposée côté client)

## Architecture

```
app/
  page.tsx          — Page d'accueil
  scanner/          — Mode Scanner (caméra + analyse IA)
  balade/           — Mode Balade (géoloc + parcours narratif)
  api/
    analyze/        — Route API: analyse d'image GPT-4o
    balade/         — Route API: génération de parcours
components/
  ApiKeyModal.tsx   — Modal de saisie de clé API
lib/
  store.ts          — Gestion locale de la clé API
```
