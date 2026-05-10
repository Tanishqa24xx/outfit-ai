// outfit-ai\src\lib\tagger.js

import { db } from './db';

export async function tagItem(itemId) {
  const item = await db.wardrobeItems.get(itemId);
  if (!item || item.status === 'tagged') return;

  await db.wardrobeItems.update(itemId, { status: 'tagging' });

  try {
    // Convert Blob → base64 so we can send it to the API as JSON
    const arrayBuffer = await item.imageBlob.arrayBuffer();
    const uint8Array  = new Uint8Array(arrayBuffer);
    const binary      = uint8Array.reduce((acc, b) => acc + String.fromCharCode(b), '');
    const base64      = btoa(binary);
    const mimeType    = item.imageBlob.type || 'image/jpeg';

    const response = await fetch('/api/analyze-clothing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64, mimeType }),
    });

    const data = await response.json();

    if (data.success) {
      await db.wardrobeItems.update(itemId, {
        colors:     data.tags.colors,
        styles:     data.tags.styles,
        occasions:  data.tags.occasions,
        category:   data.tags.category,
        geminiTags: data.tags,
        status:     'tagged',
      });
    } else {
      await db.wardrobeItems.update(itemId, { status: 'error' });
    }
  } catch (err) {
    console.error('Tagging failed for item', itemId, err);
    await db.wardrobeItems.update(itemId, { status: 'error' });
  }
}

export async function tagAllPending() {
  const pending = await db.wardrobeItems
    .where('status')
    .anyOf(['untagged', 'error'])
    .toArray();

  // Tag sequentially to avoid hammering the API
  for (const item of pending) {
    await tagItem(item.id);
  }
}