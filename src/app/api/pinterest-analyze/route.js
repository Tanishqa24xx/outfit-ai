
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { input } = await request.json();

    const prompt = `
You are a fashion stylist AI.

Analyze this Pinterest-inspired outfit or description and extract structured style DNA.

INPUT:
${input}

Respond ONLY with JSON:
{
  "silhouette": "describe outfit structure",
  "colors": ["color1", "color2"],
  "vibe": "clean minimal / streetwear / elegant etc",
  "layering": "none / light / heavy",
  "keyPieces": ["item1", "item2"],
  "styleKeywords": ["keyword1", "keyword2"]
}
`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    const text = data.choices[0].message.content.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json({ success: true, dna: parsed });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}