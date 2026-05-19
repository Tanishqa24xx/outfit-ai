// src/app/api/analyze-inspo/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { imageBase64, mimeType } = await request.json();

    const prompt = `Analyse this outfit photo and extract styling information. Respond ONLY with JSON:
{
  "outfitDescription": "one sentence describing the full outfit",
  "silhouette": "e.g. cropped top + wide-leg pants, oversized jacket + fitted bottom",
  "styleAesthetic": ["e.g. clean-girl", "minimalist", "kpop-inspired"],
  "keyElements": ["e.g. monochrome", "high-waisted", "tucked-in top"],
  "colorPalette": ["color1", "color2"],
  "occasion": "e.g. everyday, smart-casual, going-out",
  "bodyTechniques": ["e.g. waist definition via tuck", "elongating with monochrome"],
  "moodWords": ["e.g. effortless", "sleek", "confident"]
}`;

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
    if (!response.ok) return NextResponse.json({ success: false, error: data.error?.message }, { status: 500 });

    const text  = data.choices[0].message.content.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const tags  = JSON.parse(clean);
    return NextResponse.json({ success: true, tags });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}