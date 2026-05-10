// outfit-ai\src\app\page.js

'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/db';

const OCCASIONS = [
  'everyday', 'college', 'work', 'meeting',
  'business-formal', 'business-casual', 'smart-casual',
  'date-night', 'going-out', 'party', 'brunch',
  'travel', 'beach', 'wedding-guest', 'formal-event',
];
const WEATHER = ['hot', 'warm', 'mild', 'cool', 'cold', 'rainy', 'humid'];
const STYLES = [
  'clean-girl', 'kpop-inspired', 'elegant', 'boss-girl',
  'streetwear', 'athleisure', 'business-formal', 'business-casual', 'smart-casual',
];

export default function RecommendPage() {
  const [wardrobe,   setWardrobe]   = useState([]);
  const [occasion,   setOccasion]   = useState('everyday');
  const [weather,    setWeather]    = useState('warm');
  const [style,      setStyle]      = useState('clean-girl');
  const [extraNotes, setExtraNotes] = useState('');
  const [outfits,    setOutfits]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  const loadWardrobe = useCallback(async () => {
    const all = await db.wardrobeItems.toArray();
    setWardrobe(all);
  }, []);

  useEffect(() => { loadWardrobe(); }, [loadWardrobe]);

  const taggedCount = useMemo(
    () => wardrobe.filter(i => i.status === 'tagged').length,
    [wardrobe]
  );

  async function handleRecommend() {
    if (taggedCount === 0) {
      setError('No tagged items. Upload clothes in the Wardrobe tab first.');
      return;
    }
    setLoading(true);
    setError(null);
    setOutfits([]);

    try {
      const wardrobeData = wardrobe
        .filter(i => i.status === 'tagged')
        .map(({ id, category, colors, styles, occasions, geminiTags }) => ({
          id, category, colors, styles, occasions, geminiTags,
        }));

      const res  = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wardrobe: wardrobeData, occasion, weather, style, extraNotes }),
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
      <h1 className="text-2xl font-bold mb-2">What to wear</h1>
      <p className="text-neutral-500 text-sm mb-8">{taggedCount} tagged items in wardrobe</p>

      <div className="bg-neutral-900 rounded-2xl p-6 mb-8 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Occasion',   value: occasion, set: setOccasion, opts: OCCASIONS },
            { label: 'Weather',    value: weather,  set: setWeather,  opts: WEATHER  },
            { label: 'Style vibe', value: style,    set: setStyle,    opts: STYLES   },
          ].map(({ label, value, set, opts }) => (
            <div key={label}>
              <label className="text-xs text-neutral-400 block mb-1">{label}</label>
              <select
                value={value}
                onChange={e => set(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>

        <div>
          <label className="text-xs text-neutral-400 block mb-1">
            Notes <span className="text-neutral-600">(optional)</span>
          </label>
          <input
            value={extraNotes}
            onChange={e => setExtraNotes(e.target.value)}
            placeholder="e.g. avoiding heels today, important interview..."
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600"
          />
        </div>

        <button
          onClick={handleRecommend}
          disabled={loading}
          className="w-full bg-white text-black py-3 rounded-xl font-semibold text-sm
                     hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Styling your outfit...' : '✦ Get outfit recommendations'}
        </button>

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {outfits.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-base font-semibold text-neutral-300">Your outfits for today</h2>
          {outfits.map((outfit, i) => (
            <OutfitCard
              key={i}
              outfit={outfit}
              index={i}
              wardrobe={wardrobe}
              occasion={occasion}
              style={style}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function OutfitCard({ outfit, index, wardrobe, occasion, style }) {
  const [expanded, setExpanded] = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [saving,   setSaving]   = useState(false);

  const usedItems = useMemo(
    () => (outfit.itemIds || [])
      .map(id => wardrobe.find(w => Number(w.id) === Number(id)))
      .filter(Boolean),
    [outfit.itemIds, wardrobe]
  );

  async function handleSave() {
    if (saved || saving) return;
    setSaving(true);
    try {
      await db.savedOutfits.add({
        outfitName:       outfit.outfitName,
        occasion,
        style,
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
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-neutral-900 rounded-2xl p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-xs text-neutral-500">Outfit {index + 1}</span>
          <h3 className="text-lg font-semibold">{outfit.outfitName}</h3>
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

      {usedItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {usedItems.map(item => <WardrobeThumb key={item.id} item={item} />)}
        </div>
      )}

      <div className="mb-4 bg-neutral-800 rounded-xl p-4">
        <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">How to wear it</p>
        <p className="text-sm text-neutral-200">{outfit.styling}</p>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
      >
        {expanded ? '▲ Less' : '▼ Why it works + accessories'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-4 border-t border-neutral-800 pt-4">
          {outfit.whyItWorks && (
            <p className="text-sm text-neutral-400">{outfit.whyItWorks}</p>
          )}
          {outfit.accessories && (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(outfit.accessories).map(([key, value]) =>
                value && value !== 'none needed' ? (
                  <div key={key} className="bg-neutral-800 rounded-lg p-3">
                    <p className="text-xs text-neutral-500 capitalize">{key}</p>
                    <p className="text-sm text-neutral-200">{value}</p>
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
    <div className="w-20 h-20 rounded-lg overflow-hidden border border-neutral-700">
      <img src={url} className="w-full h-full object-cover" alt={item.category} />
    </div>
  );
}