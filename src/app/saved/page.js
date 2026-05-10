// outfit-ai\src\app\saved\page.js

'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/db';

export default function SavedPage() {
  const [outfits, setOutfits] = useState([]);
  const [wardrobe, setWardrobe] = useState([]);

  const load = useCallback(async () => {
    const [saved, ward] = await Promise.all([
      db.savedOutfits.orderBy('dateCreated').reverse().toArray(),
      db.wardrobeItems.toArray(),
    ]);
    setOutfits(saved);
    setWardrobe(ward);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    await db.savedOutfits.delete(id);
    load();
  }

  if (outfits.length === 0) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Saved Outfits</h1>
        <p className="text-neutral-500 text-sm">No saved outfits yet. Save one from the Outfits tab.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Saved Outfits</h1>
      <p className="text-neutral-500 text-sm mb-8">{outfits.length} saved</p>
      <div className="space-y-4">
        {outfits.map(outfit => (
          <SavedCard
            key={outfit.id}
            outfit={outfit}
            wardrobe={wardrobe}
            onDelete={() => handleDelete(outfit.id)}
          />
        ))}
      </div>
    </main>
  );
}

function SavedCard({ outfit, wardrobe, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  const usedItems = useMemo(
    () => (outfit.itemIds || [])
      .map(id => wardrobe.find(w => Number(w.id) === Number(id)))
      .filter(Boolean),
    [outfit.itemIds, wardrobe]
  );

  return (
    <div className="bg-neutral-900 rounded-2xl p-5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-sm">{outfit.outfitName}</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            {outfit.occasion} · {outfit.style} · {new Date(outfit.dateCreated).toLocaleDateString()}
          </p>
        </div>
        <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-300 shrink-0">Remove</button>
      </div>

      {usedItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {usedItems.map(item => <WardrobeThumb key={item.id} item={item} />)}
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
      >
        {expanded ? '▲ Less' : '▼ Styling details'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-neutral-800 pt-3">
          {outfit.styling && (
            <div className="bg-neutral-800 rounded-xl p-3">
              <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">How to wear</p>
              <p className="text-sm text-neutral-200">{outfit.styling}</p>
            </div>
          )}
          {outfit.accessories && (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(outfit.accessories).map(([k, v]) =>
                v && v !== 'none needed' ? (
                  <div key={k} className="bg-neutral-800 rounded-lg p-3">
                    <p className="text-xs text-neutral-500 capitalize">{k}</p>
                    <p className="text-xs text-neutral-200">{v}</p>
                  </div>
                ) : null
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WardrobeThumb({ item }) {
  const url = useMemo(() => URL.createObjectURL(item.imageBlob), [item.imageBlob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <div className="w-16 h-16 rounded-lg overflow-hidden border border-neutral-700 shrink-0">
      <img src={url} className="w-full h-full object-cover" alt={item.category} />
    </div>
  );
}