// src/app/api/recommend/route.js

import { NextResponse } from 'next/server';

const STRICT_FORMAL = ['business-formal', 'formal-event', 'wedding-guest'];
const SEMI_FORMAL   = ['business-casual', 'smart-casual', 'meeting', 'work'];

// Banned everywhere except athleisure — checked at data layer, AI never sees these items
const ALWAYS_BANNED_NON_ATHLEISURE = ['yoga', 'legging', 'athletic tight', 'gym tight', 'yoga pant'];

// Skinny jeans banned for ALL professional/semi-professional occasions at data layer
// Prompt rules alone are insufficient — model ignores them
const SKINNY_BANNED_KEYWORDS = ['skinny', 'jegging'];
const SKINNY_BANNED_OCCASIONS = [
  'business-formal', 'business-casual', 'smart-casual', 'work', 'meeting',
  'formal-event', 'wedding-guest',
];

const OCCASION_BANNED = {
  strict: ['ripped', 'distressed', 'sweatpant', 'hoodie', 'baseball cap',
           'cargo', 'jogger', 'track pant', 'sneaker', 'trainer', 'yoga', 'legging'],
  semi:   ['cargo', 'jogger', 'track pant', 'ripped', 'distressed', 'hoodie', 'yoga', 'legging'],
};

const SHOE_RULES = {
  'business-formal': 'loafers, block heels, or pointed flats — NO sneakers',
  'business-casual': 'loafers, ankle boots, or block heels — NO sneakers',
  'smart-casual':    'loafers, ankle boots, or clean white sneakers only',
  'college':         'sneakers, loafers, or boots',
  'travel':          'sneakers or loafers — no heels',
  'athleisure':      'sneakers or trainers only',
  'default':         'shoes suitable for the occasion',
};

const STYLE_BOARDS = {
  'clean-girl':      'Minimal, effortless. Neutral tones, fitted tee tucked into straight or wide-leg jeans, gold jewelry, white sneakers or loafers.',
  'kpop-inspired':   'Monochrome layers, cropped pieces with wide-leg pants, oversized structured jackets, platform shoes.',
  'boss-girl':       'Power dressing: blazer over fitted top, straight or wide-leg trousers, pointed flats, structured bag.',
  'elegant':         'Quiet luxury: neutral palette, well-fitted basics, timeless silhouettes, no logos.',
  'streetwear':      'Wide-leg jeans, graphic tops, layered jackets, chunky sneakers.',
  'athleisure':      'Fitted athletic pieces, oversized hoodie or jacket, sleek sneakers.',
  'business-formal': 'Tailored blazer, wide-leg trousers or midi skirt, fitted blouse, pointed flats.',
  'business-casual': 'Blazer over tee, dark straight or wide-leg jeans/trousers, loafers or ankle boots.',
  'smart-casual':    'Dark straight or wide-leg jeans with blouse, knit over collared shirt, clean sneakers or loafers.',
};

function validateLayering(itemIds, allItems) {
  const items = itemIds
    .map(id => allItems.find(w => Number(w.id) === Number(id)))
    .filter(Boolean);

  const byCategory = {};
  for (const item of items) {
    if (byCategory[item.category]) return false;
    byCategory[item.category] = item;
  }

  const top       = byCategory['top'];
  const outerwear = byCategory['outerwear'];
  const dress     = byCategory['dress'];
  const bottom    = byCategory['bottom'];

  if (dress && (top || bottom)) return false;

  if (outerwear && top) {
    const topFitArr   = Array.isArray(top.fit) ? top.fit : [top.fit || 'unknown'];
    const topFabArr   = Array.isArray(top.fabricType) ? top.fabricType : [top.fabricType || 'unknown'];
    const topWeight   = top.geminiTags?.weight || top.weight || 'medium';
    const outerWeight = outerwear.geminiTags?.weight || outerwear.weight || 'medium';

    if (topWeight === 'heavy') return false;
    if (topFabArr.includes('knit') && (topFitArr.includes('oversized') || topFitArr.includes('relaxed'))) return false;
    const w = { light: 1, medium: 2, heavy: 3 };
    if ((w[outerWeight] || 2) < (w[topWeight] || 2)) return false;
  }

  return true;
}

const toArrLocal = v => Array.isArray(v) ? v : (v ? [v] : []);

function filterByOccasion(items, occasion) {
  const isStrict     = STRICT_FORMAL.includes(occasion);
  const isSemi       = SEMI_FORMAL.includes(occasion);
  const isAthleisure = occasion === 'athleisure';
  const banSkinny    = SKINNY_BANNED_OCCASIONS.includes(occasion);

  return items.filter(item => {
    const d = (item.geminiTags?.description || item.description || '').toLowerCase();

    // Yoga/leggings banned everywhere except athleisure
    if (!isAthleisure && ALWAYS_BANNED_NON_ATHLEISURE.some(k => d.includes(k))) return false;

    // Skinny jeans banned for all professional occasions — description AND fit check
    const fitArr = toArrLocal(item.geminiTags?.fit || item.fit);
    if (banSkinny && (
      SKINNY_BANNED_KEYWORDS.some(k => d.includes(k)) ||
      (item.category === 'bottom' && fitArr.includes('fitted') && !fitArr.some(f => ['wide-leg','straight','flared','relaxed'].includes(f)) && (d.includes('jean') || d.includes('denim')))
    )) return false;

    if (isStrict) return !OCCASION_BANNED.strict.some(k => d.includes(k));
    if (isSemi)   return !OCCASION_BANNED.semi.some(k => d.includes(k));
    return true;
  });
}

export async function POST(request) {
  try {
    const { wardrobe: raw, occasion, weather, style, extraNotes, inspoContext } = await request.json();

    // Normalise fit/fabricType — DB may store string (old) or array (new)
    const toArr = v => Array.isArray(v) ? v : (v ? [v] : []);

    const allItems = (raw || []).map(i => ({
      ...i,
      id:          Number(i.id),
      fit:         toArr(i.geminiTags?.fit    || i.fit),
      weight:      i.geminiTags?.weight       || i.weight      || 'medium',
      fabricType:  toArr(i.geminiTags?.fabricType || i.fabricType),
      description: i.geminiTags?.description  || i.description || i.category,
    }));

    const filtered      = filterByOccasion(allItems, occasion);
    const isForBusiness = STRICT_FORMAL.includes(occasion) || SEMI_FORMAL.includes(occasion);
    const shoeRule      = SHOE_RULES[occasion]  || SHOE_RULES['default'];
    const board         = STYLE_BOARDS[style]   || STYLE_BOARDS['clean-girl'];
    const seed          = Math.floor(Math.random() * 99999);

    const hasDress   = filtered.some(i => i.category === 'dress');
    const hasBottoms = filtered.some(i => i.category === 'bottom');

    // Detect if non-skinny bottoms exist — deprioritise skinny if so
    const hasNonSkinnyBottoms = filtered.some(i => {
      if (i.category !== 'bottom') return false;
      const d   = (i.geminiTags?.description || i.description || '').toLowerCase();
      const fits = Array.isArray(i.fit) ? i.fit : [i.fit || ''];
      return d.includes('wide') || d.includes('straight') || d.includes('trouser') || d.includes('flare') ||
             fits.some(f => ['wide-leg','straight','relaxed','flared'].includes(f));
    });

    const bottomRule = (!hasDress && hasBottoms)
      ? 'REQUIRED: every outfit MUST include a bottom item.'
      : '';

    const skinnyRule = hasNonSkinnyBottoms
      ? 'JEANS RULE: ALWAYS prefer wide-leg or straight-cut bottoms first. Use skinny jeans ONLY as a last resort when no other bottom works with the chosen top. Never default to skinny.'
      : '';

    const wardrobeList = filtered
      .map(i => {
        const fit    = i.fit.length        ? i.fit.join('+')        : 'unknown';
        const fabric = i.fabricType.length ? i.fabricType.join('+') : 'unknown';
        return `[${i.id}] ${i.category} | fit:${fit} | weight:${i.weight} | fabric:${fabric} — ${i.description} (${(i.colors || []).join(', ')})`;
      })
      .join('\n');

    const prompt = `You are a personal stylist. Seed:${seed}

BODY — apply every rule below to every outfit:
- Rectangle shape: NO natural waist. MUST create waist illusion in every outfit.
  Waist techniques (pick one per outfit, state it explicitly in styling):
  · High-waisted bottom + cropped or tucked top
  · Full-tuck or front-tuck into high-waisted bottoms
  · Monochrome head-to-toe for a lean elongated line
  · Belted or wrap-style piece
- Broad shoulders: prefer V-neck, scoop neck, or deep necklines. Avoid boat neck, off-shoulder.
- Hip dips: high-waisted bottoms always. If bottom is tight/fitted, pair with a longer top that grazes the hip.
- Height 5'2": avoid overwhelming volume — cropped proportions work well. No midi skirts with chunky tops.
- Skin: warm honey-brown. Best colors: white, black, navy, red, brown, camel, rust, olive, burgundy, blush, cobalt.

STYLE: ${style} — ${board}
OCCASION: ${occasion} | WEATHER: ${weather}
${extraNotes ? `NOTES: ${extraNotes}` : ''}

${isForBusiness ? `PROFESSIONAL: structured pieces only. ${shoeRule}` : `SHOES: ${shoeRule}`}
${bottomRule}
${skinnyRule}

PHYSICAL LAYERING — NON-NEGOTIABLE:
- ONE item per category maximum
- fit:oversized OR weight:heavy OR fabric:knit top → NO outerwear
- fit:fitted/slim + weight:light/medium top → structured outerwear OK (fabric:structured or fabric:woven only)
- Never dress + top or dress + bottom
- When in doubt: 2-piece outfit beats forced layering

${inspoContext && inspoContext.length > 0 ? `
STYLE INSPO — outfits the user has saved and loves. Use these to inform silhouette, color, and mood choices:
${inspoContext.map((p,i) => `Inspo ${i+1}: ${p.outfitDescription} | Silhouette: ${p.silhouette} | Elements: ${(p.keyElements||[]).join(', ')} | Mood: ${(p.moodWords||[]).join(', ')}`).join('\n')}

Apply these learnings — if user consistently saves monochrome outfits, bias towards monochrome. If they save wide-leg silhouettes, prioritise those.
` : ''}
WARDROBE — use ONLY these exact IDs, do not invent:
${wardrobeList}

Create 3 outfits. Each must have a DIFFERENT silhouette. Each must explicitly state which waist technique is used.

JSON array only, no markdown:
[
  {
    "outfitName": "name",
    "itemIds": [1, 2],
    "itemDescriptions": ["desc1", "desc2"],
    "styling": "layer by layer — waist technique used, tuck style, proportions",
    "whyItWorks": "body shape rationale + coloring + occasion fit",
    "accessories": {
      "shoes": "specific",
      "bag": "specific",
      "jewelry": "specific",
      "layer": "specific outerwear OR none needed"
    },
    "styleInspo": "specific person/aesthetic and why"
  }
]`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:       'meta-llama/llama-4-scout-17b-16e-instruct',
        messages:    [{ role: 'user', content: prompt }],
        max_tokens:  2000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ success: false, error: data.error?.message }, { status: 500 });
    }

    const text    = data.choices[0].message.content.trim();
    const clean   = text.replace(/```json|```/g, '').trim();
    const outfits = JSON.parse(clean);

    const validIdSet = new Set(filtered.map(i => i.id));

    const processed = outfits
      .map(outfit => {
        const seen     = new Set();
        const validIds = (outfit.itemIds || [])
          .map(id => Number(id))
          .filter(id => {
            if (!validIdSet.has(id)) return false;
            const item = filtered.find(w => w.id === id);
            if (!item || seen.has(item.category)) return false;
            seen.add(item.category);
            return true;
          });

        if (!validateLayering(validIds, filtered)) return null;

        return {
          ...outfit,
          itemIds:          validIds,
          itemDescriptions: validIds.map(id => filtered.find(w => w.id === id)?.description || ''),
        };
      })
      .filter(Boolean);

    // Fallback: strip outerwear and return if all failed validation
    const final = processed.length > 0 ? processed : outfits.map(outfit => {
      const seen     = new Set();
      const validIds = (outfit.itemIds || [])
        .map(id => Number(id))
        .filter(id => {
          if (!validIdSet.has(id)) return false;
          const item = filtered.find(w => w.id === id);
          if (!item || seen.has(item.category) || item.category === 'outerwear') return false;
          seen.add(item.category);
          return true;
        });
      return {
        ...outfit,
        itemIds:          validIds,
        itemDescriptions: validIds.map(id => filtered.find(w => w.id === id)?.description || ''),
      };
    });

    return NextResponse.json({ success: true, outfits: final });

  } catch (error) {
    console.error('Recommend error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}