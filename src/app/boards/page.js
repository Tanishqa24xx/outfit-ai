'use client';
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import OutfitCanvas from '@/components/OutfitCanvas';

export default function BoardsPage() {
  const [savedOutfits, setSavedOutfits] = useState([]);
  const [wardrobe,     setWardrobe]     = useState([]);

  const loadData = useCallback(async () => {
    // Load both in parallel — no reason to wait for one before starting the other
    const [items, outfits] = await Promise.all([
      db.wardrobeItems.toArray(),
      db.savedOutfits.orderBy('dateCreated').reverse().toArray(),
    ]);
    setWardrobe(items);
    setSavedOutfits(outfits);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleDelete(id) {
    await db.savedOutfits.delete(id);
    loadData();
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Style Boards</h1>
      <p className="text-neutral-500 text-sm mb-8">
        Your saved looks — {savedOutfits.length} outfit{savedOutfits.length !== 1 ? 's' : ''}
      </p>

      {savedOutfits.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-neutral-800 rounded-2xl">
          <p className="text-neutral-500 mb-2">No outfits saved yet.</p>
          <p className="text-neutral-600 text-sm">
            Generate recommendations and hit <span className="text-neutral-400">+ Save</span> on any outfit.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {savedOutfits.map(outfit => {
            // Reconstruct the actual wardrobe item objects from the saved IDs
            // This is why we save itemIds — so we can look up the blobs here
            const items = (outfit.itemIds || [])
              .map(id => wardrobe.find(w => Number(w.id) === Number(id)))
              .filter(Boolean);

            return (
              <BoardCard
                key={outfit.id}
                outfit={outfit}
                items={items}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}

// ─── BoardCard ────────────────────────────────────────────────────────────────
function BoardCard({ outfit, items, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800">
      {/* Header */}
      <div className="flex justify-between items-start p-5 pb-3">
        <div>
          <h3 className="text-base font-semibold">{outfit.outfitName}</h3>
          <p className="text-xs text-neutral-500 capitalize mt-0.5">
            {outfit.style} · {outfit.occasion} · {outfit.weather}
          </p>
        </div>
        <button
          onClick={() => onDelete(outfit.id)}
          className="text-xs text-red-400 hover:text-red-300 transition-colors ml-4 shrink-0"
        >
          Remove
        </button>
      </div>

      {/* Mannequin canvas — this is the Phase 4 output */}
      {items.length > 0 ? (
        <div className="bg-neutral-950 px-4 py-3">
          <OutfitCanvas items={items} />
        </div>
      ) : (
        <div className="mx-4 mb-3 h-32 bg-neutral-800 rounded-xl flex items-center justify-center">
          <p className="text-xs text-neutral-600">Wardrobe items not found</p>
        </div>
      )}

      {/* Styling notes — always visible */}
      <div className="px-5 pb-4 pt-3">
        {outfit.styleInspo && (
          <p className="text-xs text-neutral-500 italic mb-2">✦ {outfit.styleInspo}</p>
        )}
        <p className="text-sm text-neutral-300 line-clamp-2">{outfit.styling}</p>

        {/* Expandable details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-neutral-600 hover:text-neutral-400 mt-2 transition-colors"
        >
          {expanded ? '▲ Less' : '▼ More details'}
        </button>

        {expanded && (
          <div className="mt-3 space-y-3 border-t border-neutral-800 pt-3">
            {outfit.whyItWorks && (
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Why it works</p>
                <p className="text-sm text-neutral-400">{outfit.whyItWorks}</p>
              </div>
            )}
            {outfit.accessories && (
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wide mb-2">Complete the look</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(outfit.accessories).map(([key, value]) =>
                    value ? (
                      <div key={key} className="bg-neutral-800 rounded-lg p-2">
                        <p className="text-xs text-neutral-500 capitalize">{key}</p>
                        <p className="text-xs text-neutral-300">{value}</p>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            )}
            <p className="text-xs text-neutral-600">
              Saved {new Date(outfit.dateCreated).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}