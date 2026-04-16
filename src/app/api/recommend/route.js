import { NextResponse } from 'next/server';

// These constants live server-side only — never sent to the browser
const STRICT_FORMAL = ['business-formal', 'formal-event', 'wedding-guest'];
const SEMI_FORMAL   = ['business-casual', 'smart-casual', 'meeting', 'work'];

// Hard-filter these keywords OUT before the AI ever sees the items
// This is a security/quality layer — the AI can't override it
const FORMAL_BANNED = ['ripped', 'distressed', 'yoga pant', 'sweatpant', 'hoodie', 'baseball cap'];
const STRICT_BANNED = ['skinny jean', 'cargo short', 'zip-up hoodie'];

function filterWardrobe(items, occasion) {
  const isStrict = STRICT_FORMAL.includes(occasion);
  const isSemi   = SEMI_FORMAL.includes(occasion);
  if (!isStrict && !isSemi) return items;

  return items.filter(item => {
    const d = (item.description || '').toLowerCase();
    if (FORMAL_BANNED.some(k => d.includes(k))) return false;
    if (isStrict && STRICT_BANNED.some(k => d.includes(k))) return false;
    return true;
  });
}

// Style reference boards — the AI uses these as a creative anchor
const BOARDS = {
  'clean-girl':      'Clean girl aesthetic: slicked bun, neutral tones, fitted tee tucked into straight jeans, gold jewelry, tote bag, white sneakers or loafers. Effortless but intentional.',
  'kpop-inspired':   'Kpop fashion: monochrome layers, cropped pieces with wide-leg pants, mixing textures, structured oversized jackets, platform shoes, chain accessories. Vary the idol inspiration each outfit.',
  'boss-girl':       'Office siren / power dressing: blazer over fitted top, straight trousers, pointed flats or loafers, minimal gold jewelry, structured bag.',
  'elegant':         'Quiet luxury: neutral palette, well-fitted basics, timeless silhouettes, no logos, gold studs, leather tote.',
  'streetwear':      'Street style: wide-leg jeans, graphic or bold tops, layered jackets, chunky sneakers, crossbody bag.',
  'athleisure':      'Gym to street: fitted athletic pieces, oversized hoodie or jacket over, sleek sneakers, mini bag.',
  'business-formal': 'Power dressing: tailored blazer, wide-leg trousers or midi skirt, fitted blouse, pointed flats or heels, structured handbag.',
  'business-casual': 'Smart professional: blazer over tee, dark jeans or trousers, loafers or ankle boots, tote bag.',
  'smart-casual':    'Elevated everyday: dark jeans with blouse, knit over collared shirt, clean sneakers or loafers.',
};

const SHOES = {
  'business-formal': 'loafers, block heels, or pointed flats only',
  'business-casual': 'loafers, ankle boots, or block heels',
  'smart-casual':    'loafers, ankle boots, or minimal clean white sneakers',
  'college':         'sneakers, loafers, or boots — no heels',
  'travel':          'sneakers or loafers — no heels',
  'athleisure':      'sneakers or trainers only',
  'default':         'shoes appropriate for the occasion',
};

export async function POST(request) {
  try {
    const { wardrobe: candidates, occasion, weather, style, extraNotes } = await request.json();
    
    // Random seed so the AI doesn't produce identical results each time
    const seed = Math.floor(Math.random() * 99999);

    const items = (candidates || []).map(i => ({
      id:          i.id,
      category:    i.category,
      colors:      i.colors,
      description: i.geminiTags?.description || i.description || i.category,
    }));

    const filtered      = filterWardrobe(items, occasion);
    const isForBusiness = STRICT_FORMAL.includes(occasion) || SEMI_FORMAL.includes(occasion);
    const shoeRule      = SHOES[occasion] || SHOES['default'];
    const board         = BOARDS[style]   || BOARDS['clean-girl'];

    // Build the wardrobe list as a string — this was the broken template literal
    // The fix: build it separately so there are no nested backticks
    const wardrobeList = filtered
      .map(i => `[${i.id}] ${i.category} — ${i.description} (${(i.colors || []).join(', ')})`)
      .join('\n');

    const professionalRules = isForBusiness
      ? `PROFESSIONAL RULES:
- business-formal: structured pieces only. No jeans, no sneakers. Min 2 layers.
- business-casual / smart-casual: dark wash straight or wide-leg jeans OK. No skinny jeans.
- Shoes: ${shoeRule}`
      : `CASUAL RULES:
- No blazers for college, travel, athleisure.
- Shoes: ${shoeRule}
- Suggest layering as optional.`;

    const prompt = `You are a creative personal stylist. Seed: ${seed}.

PERSON:
- Body: 5'2", rectangular + hourglass (broad shoulders, no defined waist). Create waist illusion: high-waisted bottoms, cropped tops, belts, tucking. V-necks balance shoulders. Monochrome elongates.
- Skin: warm honey-brown. Best colors: white, black, navy, red, brown, camel, rust, olive, burgundy, blush, cobalt.
- Vibe: clean, elegant, confident. Not girly. Not grunge. Open to fitted and clingy styles.

STYLE BOARD (${style}): ${board}

OCCASION: ${occasion} | WEATHER: ${weather}
${extraNotes ? `NOTES: ${extraNotes}` : ''}

${professionalRules}

LAYERING: Only layer pieces that work physically together. Specify tuck: full-tuck / front-tuck / side-tuck / knot-tie.

WARDROBE — ${filtered.length} items. Use ONLY these exact IDs:
${wardrobeList}

TASK: Create 3 outfits.

STRICT RULES:
- Use ONLY item IDs from the wardrobe list above
- itemIds must be real numbers from the list — do NOT invent IDs
- Each outfit must contain 2 to 4 real IDs
- Each outfit: different silhouette, different color story, different mood
- Each styleInspo: reference a different idol or icon

Respond ONLY with valid JSON array, no markdown:
[
  {
    "outfitName": "name",
    "silhouette": "silhouette and why it suits her",
    "itemIds": [1, 2],
    "itemDescriptions": ["desc 1", "desc 2"],
    "styling": "layer by layer — what goes first, tuck type, how to wear each piece",
    "whyItWorks": "body shape, coloring, occasion",
    "accessories": {
      "shoes": "specific — must follow shoe rule above",
      "bag": "specific",
      "jewelry": "specific",
      "layer": "specific outer layer or none needed"
    },
    "styleInspo": "specific idol/icon and exactly why this outfit matches their aesthetic"
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
        temperature: 0.95,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ success: false, error: data.error?.message }, { status: 500 });
    }

    const text   = data.choices[0].message.content.trim();
    const clean  = text.replace(/```json|```/g, '').trim();
    const outfits = JSON.parse(clean);

    // Server-side validation: strip any IDs the AI hallucinated
    const validIdSet = new Set(filtered.map(i => i.id));

    const processed = outfits.map(outfit => {
      const seen     = new Set();
      const validIds = (outfit.itemIds || []).filter(id => {
        if (!validIdSet.has(id)) return false;            // hallucinated ID
        const item = filtered.find(w => w.id === id);
        if (!item || seen.has(item.category)) return false; // duplicate category
        seen.add(item.category);
        return true;
      });

      return {
        ...outfit,
        itemIds:          validIds,
        itemDescriptions: validIds.map(id => filtered.find(w => w.id === id)?.description || ''),
      };
    });

    return NextResponse.json({ success: true, outfits: processed });

  } catch (error) {
    console.error('Recommend error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}