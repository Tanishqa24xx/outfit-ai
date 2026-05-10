// outfit-ai\src\lib\db.js

import Dexie from 'dexie';

export const db = new Dexie('OutfitAI');

// Version history matters — never remove old versions, only add new ones.
// Dexie uses these to run migrations when the user's browser has an older schema.
db.version(2).stores({
  wardrobeItems: '++id, category, status, dateAdded',
  savedOutfits:  '++id, occasion, weather, boardName, dateCreated',
  userPreferences: '++id',
});

// Version 3: add itemIds index to savedOutfits so boards can query by item
db.version(3).stores({
  wardrobeItems: '++id, category, status, dateAdded',
  savedOutfits:  '++id, occasion, style, dateCreated',
  userPreferences: '++id',
});