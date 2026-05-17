// src/app/purchase/page.js
'use client';
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';

export default function PurchasePage() {
  const [wardrobe, setWardrobe] = useState([]);
  const [item,     setItem]     = useState('');
  const [store,    setStore]    = useState('');
  const [advice,   setAdvice]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const loadWardrobe = useCallback(async () => {
    const all = await db.wardrobeItems.where('status').equals('tagged').toArray();
    setWardrobe(all);
  }, []);

  useEffect(() => { loadWardrobe(); }, [loadWardrobe]);

  async function handleAsk() {
    if (!item.trim()) return;
    setLoading(true);
    setError(null);
    setAdvice(null);

    try {
      const wardrobeData = wardrobe.map(({ id, category, colors, geminiTags }) => ({
        id, category, colors,
        description: geminiTags?.description || category,
      }));

      const res  = await fetch('/api/purchase-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item, store, wardrobe: wardrobeData }),
      });
      const data = await res.json();
      if (data.success) setAdvice(data.advice);
      else setError(data.error || 'Something went wrong');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Should I buy it?</h1>
      <p className="text-neutral-500 text-sm mb-8">
        Tell me what you want to buy — I'll tell you which cut, color, and size works for your body and wardrobe.
      </p>

      <div className="bg-neutral-900 rounded-2xl p-5 space-y-4 mb-8">
        <div>
          <label className="text-xs text-neutral-400 block mb-1">What do you want to buy?</label>
          <input
            value={item}
            onChange={e => setItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAsk()}
            placeholder="e.g. leather jacket, wide-leg trousers, white shirt..."
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5
                       text-sm text-white placeholder-neutral-600 outline-none focus:border-neutral-500"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-400 block mb-1">
            Where are you buying from? <span className="text-neutral-600">(optional)</span>
          </label>
          <input
            value={store}
            onChange={e => setStore(e.target.value)}
            placeholder="e.g. Shein, Zara, ASOS, H&M..."
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5
                       text-sm text-white placeholder-neutral-600 outline-none focus:border-neutral-500"
          />
        </div>
        <button
          onClick={handleAsk}
          disabled={loading || !item.trim()}
          className="w-full bg-white text-black py-3 rounded-xl font-semibold text-sm
                     hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          {loading ? 'Analysing...' : '✦ Advise me'}
        </button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {advice && <PurchaseResult advice={advice} store={store} item={item} />}
    </main>
  );
}

function PurchaseResult({ advice, store, item }) {
  return (
    <div className="space-y-4">

      {/* Best cut */}
      <div className="bg-neutral-900 rounded-2xl p-5">
        <p className="text-xs text-neutral-500 uppercase tracking-wide mb-2">Best cut for you</p>
        <p className="text-sm text-white font-medium mb-1">{advice.bestCut}</p>
        <p className="text-xs text-neutral-400">{advice.itemSummary}</p>
        {advice.avoidCut && (
          <div className="mt-3 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
            <p className="text-xs text-red-400">✕ Avoid: {advice.avoidCut}</p>
          </div>
        )}
      </div>

      {/* Size advice */}
      {advice.sizeAdvice && (
        <div className="bg-neutral-900 rounded-2xl p-5">
          <p className="text-xs text-neutral-500 uppercase tracking-wide mb-2">Size & fit</p>
          <p className="text-sm text-neutral-200">{advice.sizeAdvice}</p>
        </div>
      )}

      {/* Color ranking */}
      {advice.colors?.length > 0 && (
        <div className="bg-neutral-900 rounded-2xl p-5">
          <p className="text-xs text-neutral-500 uppercase tracking-wide mb-3">Best colors, ranked</p>
          <div className="space-y-3">
            {advice.colors.map((c, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="text-neutral-600 text-xs w-4 shrink-0 mt-0.5">{i + 1}</span>
                <div>
                  <p className="text-sm font-medium capitalize">{c.color}</p>
                  <p className="text-xs text-neutral-500">{c.whySkin}</p>
                  <p className="text-xs text-neutral-600">{c.whyWardrobe}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outfit combinations */}
      {advice.outfitCombinations?.length > 0 && (
        <div className="bg-neutral-900 rounded-2xl p-5">
          <p className="text-xs text-neutral-500 uppercase tracking-wide mb-3">What it pairs with</p>
          <div className="space-y-3">
            {advice.outfitCombinations.map((o, i) => (
              <div key={i} className="border-l-2 border-neutral-700 pl-3">
                <p className="text-sm text-white">{o.combo}</p>
                <p className="text-xs text-neutral-500">{o.occasion} · {o.styling}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search terms */}
      {advice.searchTerms && (
        <div className="bg-neutral-900 rounded-2xl p-5">
          <p className="text-xs text-neutral-500 uppercase tracking-wide mb-2">
            {store ? `Search on ${store}` : 'Search terms'}
          </p>
          <p className="text-sm text-white font-mono bg-neutral-800 rounded-lg px-3 py-2">
            "{advice.searchTerms}"
          </p>
          {store && (
            <a
              href={`https://www.${store.toLowerCase().replace(/\s/g,'')}.com/search?q=${encodeURIComponent(advice.searchTerms)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-neutral-500 hover:text-white underline mt-2 inline-block"
            >
              Open {store} →
            </a>
          )}
        </div>
      )}

      {/* Red flags */}
      {advice.redFlags?.length > 0 && (
        <div className="bg-red-950/20 border border-red-900/30 rounded-2xl p-5">
          <p className="text-xs text-red-500 uppercase tracking-wide mb-2">What to avoid</p>
          <ul className="space-y-1">
            {advice.redFlags.map((f, i) => (
              <li key={i} className="text-xs text-red-400 flex gap-2">
                <span>✕</span><span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}