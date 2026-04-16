
import { NextResponse } from 'next/server';
import { USER_PROFILE } from '@/lib/profile';

export async function POST(request) {
  try {
    const { wardrobe } = await request.json();

    const prompt = `You are a personal stylist and wardrobe analyst. Analyze this person's wardrobe and recommend what they should buy next.

USER PROFILE:
- Height: ${USER_PROFILE.body.height}, Shape: ${USER_PROFILE.body.shape}
- Best colors: ${USER_PROFILE.skin.bestColors.join(', ')}
- Style: clean-girl, elegant, kpop-inspired, boss-girl, early career professional
- Priority occasions: business-formal, business-casual, smart-casual, everyday, college

CURRENT WARDROBE:
${JSON.stringify(wardrobe, null, 2)}

YOUR JOB:
1. Analyze what outfit combinations are currently possible
2. Identify what's MISSING that would unlock the MOST new outfit combinations
3. Prioritize items for early career professional (business-formal, business-casual, smart-casual)
4. Each recommended item must work with AT LEAST 3 existing wardrobe pieces
5. Focus on versatile, timeless pieces that work across multiple occasions
6. Consider her body profile — recommend pieces that flatter rectangular shape with broad shoulders

Respond with ONLY a JSON object. No markdown.
{
  "summary": "2-3 sentence analysis of current wardrobe strengths and gaps",
  "gaps": ["gap 1", "gap 2", "gap 3"],
  "items": [
    {
      "item": "item name",
      "category": "category",
      "outfitCount": 8,
      "whyBuy": "why this is a high-value purchase for her wardrobe specifically",
      "worksWith": ["works with item A + item B for X occasion", "works with item C for Y occasion"],
      "specific": "exact specification — color, fit, style details (e.g. 'high-waisted wide-leg black trousers, straight cut, not cropped')",
      "occasions": ["business-formal", "smart-casual"]
    }
  ],
  "priorityOrder": ["item to buy first and why", "item to buy second and why"]
}

Return 6-8 shopping items maximum. Quality over quantity. Only recommend items that genuinely unlock multiple new outfit combinations.`;

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
        temperature: 0.5,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ success: false, error: data.error?.message }, { status: 500 });
    }

    const text = data.choices[0].message.content.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const advice = JSON.parse(clean);

    return NextResponse.json({ success: true, advice });

  } catch (error) {
    console.error('Shopping advisor error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}