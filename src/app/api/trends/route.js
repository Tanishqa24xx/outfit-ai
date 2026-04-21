import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { vibe, wardrobe } = await request.json();

    const wardrobeList = wardrobe
      .map(i => `[${i.id}] ${i.category} — ${i.description} (${(i.colors || []).join(', ')})`)
      .join('\n');

    const prompt = `You are a fashion trend analyst and personal stylist.

The user wants to dress inspired by this vibe/aesthetic:
"${vibe}"

Think like Pinterest. What does this aesthetic look like right now in 2025?
Translate it into actual outfit combinations using ONLY the items below.

WARDROBE (use ONLY these exact IDs):
${wardrobeList}

Respond ONLY with valid JSON — no markdown:
{
  "trendSummary": "2-3 sentences: what this aesthetic looks like right now, key characteristics",
  "keyElements": ["element1", "element2", "element3"],
  "moodWords": ["word1", "word2", "word3"],
  "outfits": [
    {
      "outfitName": "name",
      "itemIds": [1, 2],
      "itemDescriptions": ["desc1", "desc2"],
      "styling": "how to wear it — tuck, layer, proportions",
      "whyItFitsVibe": "how this outfit captures the aesthetic",
      "accessories": {
        "shoes": "specific",
        "bag": "specific",
        "jewelry": "specific",
        "layer": "specific or none"
      },
      "styleInspo": "specific icon/idol this look references"
    }
  ]
}

Rules:
- Create 3 outfits
- Use ONLY item IDs from the wardrobe list — never invent IDs
- Each outfit must use 2–4 real IDs
- Each outfit must feel distinctly different
- If wardrobe items are limited, be creative with styling notes`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.9,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ success: false, error: data.error?.message }, { status: 500 });
    }

    const text = data.choices[0].message.content.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    // Validate IDs server-side — strip hallucinated ones
    const validIdSet = new Set(wardrobe.map(i => i.id));
    result.outfits = result.outfits.map(outfit => {
      const seen = new Set();
      const validIds = (outfit.itemIds || []).filter(id => {
        const item = wardrobe.find(w => w.id === id);
        if (!validIdSet.has(id) || !item || seen.has(item.category)) return false;
        seen.add(item.category);
        return true;
      });
      return {
        ...outfit,
        itemIds: validIds,
        itemDescriptions: validIds.map(id => wardrobe.find(w => w.id === id)?.description || ''),
      };
    });

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error('Trends error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}