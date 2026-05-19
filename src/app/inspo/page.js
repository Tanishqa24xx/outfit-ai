// outfit-ai\src\app\inspo\page.js
'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { db } from '@/lib/db';

export default function InspoPage() {
  const [photos, setPhotos] = useState([]);
  const fileRef = useRef();

  const load = useCallback(async () => {
    const all = await db.inspoPhotos.orderBy('dateAdded').reverse().toArray();
    setPhotos(all);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleFiles(files) {
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: file.type });
      const id = await db.inspoPhotos.add({
        imageBlob: blob, tags: null, status: 'analysing', dateAdded: new Date(),
      });
      load();
      const uint8 = new Uint8Array(arrayBuffer);
      const binary = uint8.reduce((a, b) => a + String.fromCharCode(b), '');
      const base64 = btoa(binary);
      try {
        const res = await fetch('/api/analyze-inspo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType: blob.type }),
        });
        const data = await res.json();
        await db.inspoPhotos.update(id, data.success
          ? { tags: data.tags, status: 'done' }
          : { status: 'error' });
      } catch {
        await db.inspoPhotos.update(id, { status: 'error' });
      }
      load();
    }
  }

  function handleFile(e) {
    const files = Array.from(e.target.files);
    if (files.length) handleFiles(files);
    fileRef.current.value = '';
  }

  async function handleDelete(id) {
    await db.inspoPhotos.delete(id);
    load();
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">📌 Inspo</h1>
      <p className="text-neutral-500 text-sm mb-6">
        Save outfit photos you love — AI learns your taste and uses it in recommendations.
      </p>

      <div className="bg-neutral-900 rounded-2xl p-4 mb-6">
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFile} className="hidden" />
        <div
          onClick={() => fileRef.current.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(Array.from(e.dataTransfer.files)); }}
          className="border-2 border-dashed border-neutral-700 rounded-xl p-6
                     text-center cursor-pointer hover:border-neutral-500 transition-colors"
        >
          <p className="text-neutral-400 text-sm">Click or drag & drop inspo photos</p>
          <p className="text-neutral-600 text-xs mt-1">Multiple files — each is analysed automatically</p>
        </div>
      </div>

      {photos.length === 0 ? (
        <p className="text-neutral-600 text-sm text-center py-12">
          No inspo photos yet. Save outfits you love from Pinterest, Instagram, anywhere.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map(photo => (
            <InspoCard key={photo.id} photo={photo} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </main>
  );
}

function InspoCard({ photo, onDelete }) {
  const url = useMemo(() => URL.createObjectURL(photo.imageBlob), [photo.imageBlob]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const statusColor = { analysing: 'text-blue-400', done: 'text-green-400', error: 'text-red-400' }[photo.status] || '';

  return (
    <div className="bg-neutral-900 rounded-xl overflow-hidden">
      <div className="relative aspect-[3/4]">
        <img src={url} className="w-full h-full object-cover" alt="inspo" />
        <button
          onClick={() => onDelete(photo.id)}
          className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full"
        >✕</button>
      </div>
      <div className="p-2">
        <p className={`text-xs ${statusColor} capitalize mb-1`}>{photo.status}</p>
        {photo.tags && (
          <>
            <p className="text-xs text-neutral-300 line-clamp-2">{photo.tags.outfitDescription}</p>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-neutral-600 mt-1"
            >
              {expanded ? '▲' : '▼ details'}
            </button>
            {expanded && (
              <div className="mt-2 space-y-1">
                <div className="flex flex-wrap gap-1">
                  {photo.tags.styleAesthetic?.map((s,i) => (
                    <span key={i} className="bg-neutral-800 text-neutral-400 text-xs px-1.5 py-0.5 rounded">{s}</span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {photo.tags.keyElements?.map((e,i) => (
                    <span key={i} className="border border-neutral-700 text-neutral-500 text-xs px-1.5 py-0.5 rounded">{e}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}