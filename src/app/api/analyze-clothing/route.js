// outfit-ai\src\app\api\analyze-clothing\route.js

import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { imageBase64, mimeType } = await request.json();

    const prompt = `Analyze this clothing item and respond with ONLY a JSON object, no markdown, no explanation. Use this exact structure:
{
  "category": "top|bottom|outerwear|dress|shoes|bag|accessory",
  "colors": ["color1", "color2"],
  "styles": ["style1", "style2"],
  "occasions": ["occasion1", "occasion2"],
  "description": "one sentence description",
  "fit": "fitted|slim|straight|relaxed|oversized|cropped",
  "weight": "light|medium|heavy",
  "fabricType": "knit|woven|denim|jersey|structured|flowy|athletic"
}

For colors use specific names like: ivory, off-white, cream, black, charcoal, navy, cobalt, sky-blue, sage, olive, forest-green, burgundy, rust, camel, tan, beige, blush, hot-pink, lilac, purple, yellow, mustard, orange, red, gold, silver, multicolor, print.
For styles choose from: casual, smart-casual, business-casual, business-formal, streetwear, athleisure, evening, cocktail, resort, minimalist, maximalist, preppy, boho, edgy, classic.
For occasions choose from: everyday, work, meeting, date-night, going-out, brunch, travel, beach, wedding-guest, formal-event, college.
For fit: fitted = hugs the body, slim = close but not tight, straight = relaxed straight cut, relaxed = loose comfortable, oversized = intentionally large, cropped = shorter length.
For weight: light = thin fabric (tee, silk, chiffon), medium = moderate (denim, cotton, knit), heavy = thick (coat, wool, padded jacket).
For fabricType: knit = stretchy (sweater, jersey tee), woven = structured (button-down, blazer), denim = jeans/denim jacket, jersey = soft stretchy tee/dress, structured = blazer/coat with shape, flowy = draped/chiffon, athletic = activewear fabric.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        }],
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ success: false, error: data.error?.message }, { status: 500 });
    }

    const text = data.choices[0].message.content.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const tags = JSON.parse(clean);
    return NextResponse.json({ success: true, tags });

  } catch (error) {
    console.error('Route error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}