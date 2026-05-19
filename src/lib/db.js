// src/lib/db.js
import Dexie from 'dexie';

export const db = new Dexie('OutfitAI');

db.version(2).stores({
  wardrobeItems:   '++id, category, status, dateAdded',
  savedOutfits:    '++id, occasion, weather, boardName, dateCreated',
  userPreferences: '++id',
});

db.version(3).stores({
  wardrobeItems:   '++id, category, status, dateAdded',
  savedOutfits:    '++id, occasion, style, dateCreated',
  userPreferences: '++id',
});

// Version 4: inspo photos table
db.version(4).stores({
  wardrobeItems:   '++id, category, status, dateAdded',
  savedOutfits:    '++id, occasion, style, dateCreated',
  userPreferences: '++id',
  inspoPhotos:     '++id, status, dateAdded',
});