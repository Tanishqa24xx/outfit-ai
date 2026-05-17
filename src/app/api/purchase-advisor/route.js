// src/app/api/purchase-advisor/route.js

import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { item, store, wardrobe } = await request.json();

    const wardrobeList = wardrobe
      .map(i => `[${i.id}] ${i.category} — ${i.description} (${(i.colors||[]).join(', ')})`)
      .join('\n');

    const prompt = `You are a personal stylist and fashion buyer advisor.

The user wants to buy: "${item}"
${store ? `They want to buy from: ${store}` : ''}

USER PROFILE:
- Height: 5'2", rectangular build, broad shoulders, hip dips
- Skin: warm honey-brown
- Best colors: white, black, navy, red, camel, rust, olive, burgundy, blush, cobalt, brown
- Style: clean, elegant, confident — not girly, not grunge

CURRENT WARDROBE:
${wardrobeList}

YOUR JOB:
1. Recommend the BEST version of this item for her specifically (style/cut/length)
2. Recommend TOP 2-3 colors ranked by: (a) what works on her skin, (b) what fills wardrobe gaps
3. Show exactly which wardrobe items it would pair with and how
4. Recommend her size/fit (e.g. cropped vs regular vs longline, oversized vs fitted)
5. If store is mentioned, give specific search terms to find the right piece there
6. Flag any versions of this item she should AVOID (wrong cut for her body)

Respond ONLY with valid JSON, no markdown:
{
  "itemSummary": "one sentence — what type/cut is best for her and why",
  "bestCut": "specific recommendation e.g. 'cropped, hitting at the waist, not below hip'",
  "avoidCut": "what to avoid and why e.g. 'avoid longline — shortens her frame at 5'2\"'",
  "colors": [
    {
      "color": "color name",
      "rank": 1,
      "whySkin": "why it works on warm honey-brown skin",
      "whyWardrobe": "how many and which wardrobe items it unlocks"
    }
  ],
  "outfitCombinations": [
    {
      "combo": "item name + wardrobe item",
      "occasion": "occasion this works for",
      "styling": "how to wear it"
    }
  ],
  "sizeAdvice": "specific fit/size guidance for her body",
  "searchTerms": "${store ? `specific search terms for ${store}` : 'general search terms'}",
  "redFlags": ["what to avoid when shopping e.g. 'avoid oversized — will drown her frame'"]
}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.5,
      }),
    });

    const data = await response.json();
    if (!response.ok) return NextResponse.json({ success: false, error: data.error?.message }, { status: 500 });

    const text  = data.choices[0].message.content.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const advice = JSON.parse(clean);

    return NextResponse.json({ success: true, advice });
  } catch (err) {
    console.error('Purchase advisor error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}