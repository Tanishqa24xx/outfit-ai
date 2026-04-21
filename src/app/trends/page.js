'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/db';

// Curated vibes — think Pinterest board names
const QUICK_VIBES = [
  { label: '🤍 Clean Girl',         value: 'clean girl aesthetic — slicked back, neutral tones, effortless minimal' },
  { label: '🖤 K-Pop Airport',       value: 'kpop idol airport fashion — monochrome, layered, oversized with fitted pieces' },
  { label: '💼 Office Siren',        value: 'office siren power dressing — sleek, tailored, confident professional' },
  { label: '☕ Quiet Luxury',        value: 'quiet luxury — neutral palette, no logos, timeless silhouettes, understated wealth' },
  { label: '🌆 Street Style',        value: 'street style — wide leg, graphic layers, chunky sneakers, cool urban' },
  { label: '🌸 Soft Feminine',       value: 'soft feminine — flowy fabrics, blush tones, delicate layering, feminine silhouettes' },
  { label: '🔥 Dark Academia',       value: 'dark academia — rich tones, structured layers, moody intellectual aesthetic' },
  { label: '✈️ Jet Set',             value: 'jet set travel style — polished, practical, elevated neutrals, put-together on the go' },
  { label: '🌙 Night Out',           value: 'going out look — sleek, confident, night-out energy, elevated and sexy' },
  { label: '🌿 Coastal Cool',        value: 'coastal minimalist — light neutrals, relaxed silhouettes, effortless summer' },
];

export default function TrendsPage() {
  const [wardrobe, setWardrobe]   = useState([]);
  const [vibe, setVibe]           = useState('');
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const loadWardrobe = useCallback(async () => {
    const all = await db.wardrobeItems.where('status').equals('tagged').toArray();
    setWardrobe(all);
  }, []);

  useEffect(() => { loadWardrobe(); }, [loadWardrobe]);

  async function handleGenerate(customVibe) {
    const activeVibe = customVibe || vibe;
    if (!activeVibe.trim()) return;
    if (wardrobe.length === 0) {
      setError('No tagged items found. Tag your wardrobe items first.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const wardrobeData = wardrobe.map(({ id, category, colors, geminiTags }) => ({
        id,
        category,
        colors,
        description: geminiTags?.description || category,
      }));

      const res = await fetch('/api/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vibe: activeVibe, wardrobe: wardrobeData }),
      });

      const data = await res.json();
      if (data.success) setResult(data.result);
      else setError(data.error || 'Something went wrong');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Trend Styler</h1>
      <p className="text-neutral-500 text-sm mb-8">
        Pick a vibe or describe one — AI recreates it with your actual wardrobe.
      </p>

      {/* Quick vibe pills */}
      <div className="mb-6">
        <p className="text-xs text-neutral-500 uppercase tracking-wide mb-3">Quick vibes</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_VIBES.map(v => (
            <button
              key={v.value}
              onClick={() => { setVibe(v.value); handleGenerate(v.value); }}
              disabled={loading}
              className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700
                         text-sm text-neutral-300 px-4 py-2 rounded-full transition-colors
                         disabled:opacity-40"
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom vibe input */}
      <div className="bg-neutral-900 rounded-2xl p-5 mb-8">
        <p className="text-xs text-neutral-500 mb-2">Or describe your own vibe</p>
        <div className="flex gap-3">
          <input
            value={vibe}
            onChange={e => setVibe(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            placeholder="e.g. Hanni from NewJeans, chill NYC winter, old money summer..."
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl
                       px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none
                       focus:border-neutral-500 transition-colors"
          />
          <button
            onClick={() => handleGenerate()}
            disabled={loading || !vibe.trim()}
            className="bg-white text-black px-5 py-3 rounded-xl font-semibold text-sm
                       hover:bg-neutral-200 transition-colors disabled:opacity-40 shrink-0"
          >
            {loading ? '...' : '✦ Style me'}
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Trend context card */}
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-2">The aesthetic</p>
            <p className="text-neutral-200 text-sm mb-4">{result.trendSummary}</p>
            <div className="flex gap-2 flex-wrap mb-3">
              {result.moodWords?.map((w, i) => (
                <span key={i} className="bg-neutral-800 text-neutral-300 text-xs px-3 py-1.5 rounded-full italic">
                  {w}
                </span>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {result.keyElements?.map((el, i) => (
                <span key={i} className="border border-neutral-700 text-neutral-400 text-xs px-3 py-1.5 rounded-full">
                  {el}
                </span>
              ))}
            </div>
          </div>

          {/* Outfit cards */}
          <h2 className="text-base font-semibold">Your wardrobe, this vibe</h2>
          {result.outfits?.map((outfit, i) => (
            <TrendOutfitCard key={i} outfit={outfit} index={i} wardrobe={wardrobe} />
          ))}
        </div>
      )}
    </main>
  );
}

function TrendOutfitCard({ outfit, index, wardrobe }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const usedItems = useMemo(
    () => (outfit.itemIds || []).map(id => wardrobe.find(w => w.id === id)).filter(Boolean),
    [outfit.itemIds, wardrobe]
  );

  async function handleSave() {
    if (saved || saving) return;
    setSaving(true);
    try {
      const { db } = await import('@/lib/db');
      await db.savedOutfits.add({
        outfitName:       outfit.outfitName,
        occasion:         'trends',
        weather:          'any',
        style:            'trend-inspired',
        dateCreated:      new Date(),
        itemIds:          outfit.itemIds,
        itemDescriptions: outfit.itemDescriptions,
        styling:          outfit.styling,
        whyItWorks:       outfit.whyItFitsVibe,
        silhouette:       '',
        accessories:      outfit.accessories,
        styleInspo:       outfit.styleInspo,
      });
      setSaved(true);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
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
          disabled={saved || saving}
          className={`text-sm px-3 py-1.5 rounded-full border transition-colors shrink-0 ${
            saved
              ? 'bg-white text-black border-white'
              : 'border-neutral-600 text-neutral-400 hover:border-neutral-400'
          }`}
        >
          {saving ? '...' : saved ? '✓ Saved' : '+ Save'}
        </button>
      </div>

      {/* Clothing thumbnails */}
      {usedItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {usedItems.map(item => <WardrobeThumb key={item.id} item={item} />)}
        </div>
      )}

      {/* Why it fits vibe */}
      <div className="bg-neutral-800 rounded-xl p-4 mb-4">
        <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Why this captures the vibe</p>
        <p className="text-sm text-neutral-200">{outfit.whyItFitsVibe}</p>
      </div>

      {/* Styling */}
      <div className="mb-4">
        <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">How to wear it</p>
        <p className="text-sm text-neutral-300">{outfit.styling}</p>
      </div>

      {/* Accessories — expandable */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
      >
        {expanded ? '▲ Less' : '▼ Complete the look'}
      </button>

      {expanded && outfit.accessories && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {Object.entries(outfit.accessories).map(([key, value]) =>
            value ? (
              <div key={key} className="bg-neutral-800 rounded-lg p-3">
                <p className="text-xs text-neutral-500 capitalize">{key}</p>
                <p className="text-xs text-neutral-300">{value}</p>
              </div>
            ) : null
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
    <div className="w-20 h-20 rounded-lg overflow-hidden border border-neutral-700">
      <img src={url} className="w-full h-full object-cover" alt={item.category} />
    </div>
  );
}