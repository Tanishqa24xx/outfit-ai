
'use client';
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import { USER_PROFILE } from '@/lib/profile';

export default function ShoppingPage() {
  const [wardrobe, setWardrobe]   = useState([]);
  const [advice, setAdvice]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const loadWardrobe = useCallback(async () => {
    const all = await db.wardrobeItems
      .where('status').equals('tagged')
      .toArray();
    setWardrobe(all);
  }, []);

  useEffect(() => { loadWardrobe(); }, [loadWardrobe]);

  async function handleAnalyze() {
    if (wardrobe.length === 0) {
      setError('No tagged items found. Tag your wardrobe items first.');
      return;
    }
    setLoading(true);
    setError(null);
    setAdvice(null);

    try {
      const wardrobeData = wardrobe.map(({ id, category, colors, styles, occasions, geminiTags }) => ({
        id, category, colors, styles, occasions,
        description: geminiTags?.description || category
      }));

      const res = await fetch('/api/shopping-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          wardrobe: wardrobeData,
          profile: USER_PROFILE // Critical missing piece
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAdvice(data.advice);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Shopping Advisor</h1>
      <p className="text-neutral-500 text-sm mb-8">
        AI analyzes your entire wardrobe and recommends items worth buying — ones that work with many outfits, not just one.
      </p>

      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full bg-white text-black py-3 rounded-xl font-semibold text-sm
                   hover:bg-neutral-200 transition-colors disabled:opacity-50 mb-8"
      >
        {loading ? 'Analyzing your wardrobe...' : '✦ Analyze my wardrobe'}
      </button>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {advice && (
        <div className="space-y-6">

          {/* Gaps summary */}
          <div className="bg-neutral-900 rounded-2xl p-6">
            <h2 className="font-semibold mb-1">Wardrobe gaps</h2>
            <p className="text-neutral-400 text-sm mb-4">{advice.summary}</p>
            <div className="flex flex-wrap gap-2">
              {advice.gaps?.map((gap, i) => (
                <span key={i} className="bg-neutral-800 text-neutral-300 text-xs px-3 py-1.5 rounded-full">
                  {gap}
                </span>
              ))}
            </div>
          </div>

          {/* Shopping recommendations */}
          <div className="space-y-4">
            <h2 className="font-semibold">What to buy</h2>
            {advice.items?.map((item, i) => (
              <ShoppingItem key={i} item={item} index={i} />
            ))}
          </div>

          {/* Priority order */}
          <div className="bg-neutral-900 rounded-2xl p-6">
            <h2 className="font-semibold mb-3">Buy in this order</h2>
            <ol className="space-y-2">
              {advice.priorityOrder?.map((item, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="text-neutral-500 text-sm w-5 shrink-0">{i + 1}.</span>
                  <span className="text-sm text-neutral-300">{item}</span>
                </li>
              ))}
            </ol>
          </div>

        </div>
      )}
    </main>
  );
}

function ShoppingItem({ item, index }) {
  const [open, setOpen] = useState(index < 2);

  return (
    <div className="bg-neutral-900 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-5 text-left flex justify-between items-center"
      >
        <div>
          <p className="font-medium">{item.item}</p>
          <p className="text-xs text-neutral-500 mt-0.5">{item.category} · works with {item.outfitCount} outfit combinations</p>
        </div>
        <span className="text-neutral-500 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-neutral-800 pt-4">
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Why buy this</p>
            <p className="text-sm text-neutral-300">{item.whyBuy}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Works with</p>
            <ul className="space-y-1">
              {item.worksWith?.map((combo, i) => (
                <li key={i} className="text-sm text-neutral-400">• {combo}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Specific recommendation</p>
            <p className="text-sm text-neutral-300">{item.specific}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {item.occasions?.map((o, i) => (
              <span key={i} className="bg-neutral-800 text-neutral-400 text-xs px-2 py-1 rounded-full">{o}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}