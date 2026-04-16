// outfitEngine.js
// This module handles LOCAL outfit generation and scoring.
// It runs entirely in the browser — no API calls.
// The AI recommend route uses this as a pre-filter before sending to Groq.

// Integrity hash: detect if an item was tampered with in IndexedDB
async function generateIntegrityHash(item) {
  const msgUint8   = new TextEncoder().encode(item.id + item.category);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate every valid combination of wardrobe items
export function generateOutfits(items) {
  const tops      = items.filter(i => i.category === 'top');
  const bottoms   = items.filter(i => i.category === 'bottom');
  const shoes     = items.filter(i => i.category === 'shoes');
  const dresses   = items.filter(i => i.category === 'dress');
  const outerwear = items.filter(i => i.category === 'outerwear');

  const outfits = [];

  // Top + bottom + shoe combos
  for (const top of tops) {
    for (const bottom of bottoms) {
      for (const shoe of shoes) {
        outfits.push({ items: [top, bottom, shoe] });
      }
    }
  }

  // Dress + shoe combos
  for (const dress of dresses) {
    for (const shoe of shoes) {
      outfits.push({ items: [dress, shoe] });
    }
  }

  // Randomly layer outerwear on top of existing combos
  for (const combo of outfits) {
    if (Math.random() > 0.5 && outerwear.length > 0) {
      const randomOuter = outerwear[Math.floor(Math.random() * outerwear.length)];
      combo.items.push(randomOuter);
    }
  }

  return outfits;
}

// Score an outfit based on body/style heuristics
// Higher score = better match for the context
export function scoreOutfit(outfit, context) {
  let score = 0;
  const items = outfit.items;

  // Leg-lengthening bonus for 5'2" rectangular frame
  const hasHighWaist  = items.some(i => i.geminiTags?.description?.toLowerCase().includes('high-waisted'));
  const hasCroppedTop = items.some(i => i.category === 'top' && i.geminiTags?.description?.toLowerCase().includes('cropped'));
  if (hasHighWaist && hasCroppedTop) score += 10;

  // K-Pop monochrome + oversized bonus
  if (context.style === 'kpop-inspired') {
    const isMonochrome  = new Set(items.flatMap(i => i.colors)).size <= 2;
    const hasOversized  = items.some(i => i.geminiTags?.description?.toLowerCase().includes('oversized'));
    if (isMonochrome && hasOversized) score += 8;
  }

  // Hard penalty for occasion mismatch
  const occasionMismatch = items.some(i => i.occasions && !i.occasions.includes(context.occasion));
  if (occasionMismatch) score -= 20;

  return score;
}

// Main export: filter → generate → score → return top 5
export async function getTopOutfits(items, context) {
  // Integrity check — catch tampered IndexedDB data
  for (const item of items) {
    const check = await generateIntegrityHash(item);
    if (item.hash && item.hash !== check) {
      throw new Error(`Security Alert: Item ${item.id} integrity failure.`);
    }
  }

  // Pre-filter by occasion before generating combinations (saves memory)
  const validItems = items.filter(item => item.occasions?.includes(context.occasion));

  const combos = generateOutfits(validItems);

  return combos
    .map(o => ({ ...o, score: scoreOutfit(o, context) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}