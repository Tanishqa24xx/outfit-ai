// src/app/pinterest/page.js
// Inspo tab: vibe input → AI styles your wardrobe for that aesthetic.
// Pinterest image API doesn't exist freely — this focuses on outfit quality.

'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/db';

const VIBES = [
  { label: '🤍 Clean Girl',    value: 'clean girl — slicked bun, neutral tones, fitted basics, gold jewelry' },
  { label: '🖤 K-Pop Airport', value: 'kpop idol airport — monochrome, oversized structured jacket, wide-leg pants' },
  { label: '💼 Office Siren',  value: 'office siren — sleek tailored pieces, power dressing, confident professional' },
  { label: '☕ Quiet Luxury',  value: 'quiet luxury — neutral palette, no logos, timeless silhouettes' },
  { label: '🌆 Street Style',  value: 'street style — wide-leg jeans, bold layers, chunky sneakers' },
  { label: '🌙 Night Out',     value: 'night out — sleek, confident, elevated and slightly sexy' },
  { label: '🔥 Dark Academia', value: 'dark academia — rich tones, structured layers, moody intellectual' },
  { label: '🌿 Coastal Cool',  value: 'coastal minimalist — light neutrals, relaxed silhouettes, effortless' },
];

export default function InspiredPage() {
  const [wardrobe, setWardrobe] = useState([]);
  const [vibe,     setVibe]     = useState('');
  const [outfits,  setOutfits]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const loadWardrobe = useCallback(async () => {
    const all = await db.wardrobeItems.where('status').equals('tagged').toArray();
    setWardrobe(all);
  }, []);

  useEffect(() => { loadWardrobe(); }, [loadWardrobe]);

  async function handleSearch(activeVibe) {
    const v = activeVibe || vibe;
    if (!v.trim()) return;
    if (wardrobe.length === 0) { setError('Tag your wardrobe items first.'); return; }

    setLoading(true);
    setError(null);
    setOutfits([]);

    try {
      const wardrobeData = wardrobe.map(({ id, category, colors, geminiTags }) => ({
        id, category, colors,
        description: geminiTags?.description || category,
        fit:    geminiTags?.fit    || 'unknown',
        weight: geminiTags?.weight || 'medium',
        fabricType: geminiTags?.fabricType || 'unknown',
        geminiTags,
      }));

      // Reuse the recommend API with vibe as extraNotes and neutral occasion/weather
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wardrobe: wardrobeData,
          occasion: 'everyday',
          weather: 'warm',
          style: 'clean-girl',
          extraNotes: `Style the outfit to match this specific aesthetic: ${v}`,
        }),
      });

      const data = await res.json();
      if (data.success) setOutfits(data.outfits);
      else setError(data.error || 'Something went wrong');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">✦ Inspo</h1>
      <p className="text-neutral-500 text-sm mb-6">
        Pick a vibe — AI recreates it with your actual wardrobe.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {VIBES.map(v => (
          <button
            key={v.value}
            onClick={() => { setVibe(v.value); handleSearch(v.value); }}
            disabled={loading}
            className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700
                       text-sm text-neutral-300 px-4 py-2 rounded-full transition-colors disabled:opacity-40"
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3 mb-8">
        <input
          value={vibe}
          onChange={e => setVibe(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="e.g. Hanni NewJeans, Zendaya Emmys, old money summer..."
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl
                     px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none
                     focus:border-neutral-500 transition-colors"
        />
        <button
          onClick={() => handleSearch()}
          disabled={loading || !vibe.trim()}
          className="bg-white text-black px-5 py-3 rounded-xl font-semibold text-sm
                     hover:bg-neutral-200 transition-colors disabled:opacity-40 shrink-0"
        >
          {loading ? '...' : 'Style me'}
        </button>
      </div>

      {loading && (
        <p className="text-neutral-400 text-sm text-center animate-pulse py-12">
          Matching your wardrobe to the vibe...
        </p>
      )}

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {outfits.length > 0 && (
        <div className="space-y-6">
          {outfits.map((outfit, i) => (
            <VibeOutfitCard key={i} outfit={outfit} index={i} wardrobe={wardrobe} vibe={vibe} />
          ))}
        </div>
      )}
    </main>
  );
}

function VibeOutfitCard({ outfit, index, wardrobe, vibe }) {
  const [expanded, setExpanded] = useState(false);
  const [saved,    setSaved]    = useState(false);

  const usedItems = useMemo(
    () => (outfit.itemIds || [])
      .map(id => wardrobe.find(w => Number(w.id) === Number(id)))
      .filter(Boolean),
    [outfit.itemIds, wardrobe]
  );

  async function handleSave() {
    if (saved) return;
    try {
      await db.savedOutfits.add({
        outfitName:       outfit.outfitName,
        occasion:         'inspo',
        style:            vibe.slice(0, 40),
        dateCreated:      new Date(),
        itemIds:          outfit.itemIds,
        itemDescriptions: outfit.itemDescriptions,
        styling:          outfit.styling,
        whyItWorks:       outfit.whyItWorks,
        accessories:      outfit.accessories,
        styleInspo:       outfit.styleInspo,
      });
      setSaved(true);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="bg-neutral-900 rounded-2xl p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-xs text-neutral-500">Look {index + 1}</span>
          <h3 className="text-base font-semibold">{outfit.outfitName}</h3>
          {outfit.styleInspo && (
            <p className="text-xs text-neutral-400 mt-0.5 italic">✦ {outfit.styleInspo}</p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saved}
          className={`text-sm px-3 py-1.5 rounded-full border transition-colors shrink-0 ${
            saved ? 'bg-white text-black border-white' : 'border-neutral-600 text-neutral-400 hover:border-neutral-400'
          }`}
        >
          {saved ? '✓ Saved' : '+ Save'}
        </button>
      </div>

      {usedItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {usedItems.map(item => <WardrobeThumb key={item.id} item={item} />)}
        </div>
      )}

      <div className="bg-neutral-800 rounded-xl p-4 mb-4">
        <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">How to wear it</p>
        <p className="text-sm text-neutral-200">{outfit.styling}</p>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
      >
        {expanded ? '▲ Less' : '▼ Accessories + why it works'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-neutral-800 pt-3">
          {outfit.whyItWorks && (
            <p className="text-sm text-neutral-400">{outfit.whyItWorks}</p>
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
    <div className="w-20 h-20 rounded-lg overflow-hidden border border-neutral-700 shrink-0">
      <img src={url} className="w-full h-full object-cover" alt={item.category} />
    </div>
  );
}