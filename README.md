# Outfit AI

A personal AI stylist that turns your wardrobe into intelligent outfit recommendations.

Built as a solo project to solve a real problem: having clothes but not knowing how to combine them well, especially for early-career professional settings.

---

## What it does

**Wardrobe** — Upload photos of your clothes. A vision model (Llama 4 Scout via Groq) automatically tags each item: category, fit, weight, fabric type, colors, and occasion suitability.

**Outfit recommendations** — Select occasion, weather, and style vibe. The AI recommends 3 outfits using only items you own, with:
- Physical layering validation (no heavy items under light ones, no two tops, no cargo in business settings)
- Body-shape-aware styling (silhouette logic for broad shoulders, waist illusion techniques)
- Skin-tone-aware color matching
- Specific styling instructions (tuck type, layering order, proportions)

**Saved outfits** — Save recommendations you like and browse them later.

**Shopping advisor** — Analyzes your current wardrobe and identifies which single purchases would unlock the most new outfit combinations.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| AI model | Llama 4 Scout 17B via Groq API |
| Local storage | Dexie (IndexedDB) — all clothing photos stay on-device |
| Styling | Tailwind CSS v4 |
| Deployment | Render |

---

## Key technical decisions

**On-device storage** — Clothing photos are stored in the browser's IndexedDB via Dexie, never uploaded to a server. Only base64-encoded images are sent to the Groq API for tagging, then discarded.

**Layering validation** — Outfit recommendations go through a two-pass filter: first in the API prompt (instructions to the model), then server-side in JavaScript (category deduplication, ID validation, weight conflict checks). The model cannot hallucinate item IDs that don't exist in your wardrobe.

**Occasion-aware filtering** — Items are filtered before being sent to the model based on occasion formality. Cargo pants, hoodies, and distressed items are excluded from business and smart-casual contexts at the data layer, not just via prompt instruction.

---

## Running locally

```bash
git clone https://github.com/yourusername/outfit-ai
cd outfit-ai
npm install
cp .env.example .env.local
# Add your Groq API key to .env.local (free at console.groq.com)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## What's next

- Outfit image reference feature (researching viable fashion APIs)
- Improved layering accuracy via fine-tuned prompts and user correction signals
- Calendar view to plan outfits across a week
- Cost-per-wear tracking

---

## Why I built this

Most AI fashion tools generate images of clothes you don't own. This one works with what's already in your closet — which is the actual problem worth solving.