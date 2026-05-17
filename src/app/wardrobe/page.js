// src/app/wardrobe/page.js
'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { db } from '@/lib/db';
import { tagItem, tagAllPending } from '@/lib/tagger';

const CATEGORIES  = ['top','bottom','outerwear','dress','shoes','bag','accessory'];

// Multi-select — a cropped fitted top gets both 'fitted' and 'cropped'
const FIT_OPTIONS = [
  'fitted','slim','straight','relaxed','oversized','cropped',
  'wide-leg','flared','high-waisted','low-rise','boxy','longline',
];
const WEIGHT_OPTIONS = ['light','medium','heavy'];
const FABRIC_OPTIONS = [
  'cotton','linen','silk','satin','chiffon',          // naturals / light
  'knit','jersey','ribbed','velvet',                   // stretch / texture
  'woven','denim','twill','corduroy',                  // structured wovens
  'structured','flowy','athletic','mesh','leather','faux-leather',
];

const COLORS = [
  'white','ivory','off-white','cream','beige','tan','camel',
  'black','charcoal','dark-grey','grey','light-grey',
  'navy','cobalt','royal-blue','medium-blue','light-blue','sky-blue','baby-blue',
  'light-wash-denim','medium-wash-denim','dark-wash-denim',
  'forest-green','olive','sage','mint','emerald',
  'red','burgundy','wine','rust','terracotta',
  'hot-pink','blush','light-pink','dusty-rose','mauve',
  'rich-brown','chocolate','caramel','warm-tan',
  'purple','lilac','lavender','yellow','mustard','orange',
  'gold','silver','multicolor','print',
];

const OCCASIONS = [
  'everyday','work','meeting','date-night','going-out','brunch',
  'travel','beach','wedding-guest','formal-event','college','party',
  'business-formal','business-casual','smart-casual','athleisure',
];

export default function WardrobePage() {
  const [items,     setItems]     = useState([]);
  const [uploading, setUploading] = useState(false);
  const [preview,   setPreview]   = useState(null);
  const [meta,      setMeta]      = useState({ category: 'top' });
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef();

  const loadItems = useCallback(async () => {
    const all = await db.wardrobeItems.toArray();
    setItems(all.reverse());
  }, []);

  useEffect(() => {
    loadItems();
    tagAllPending().then(() => loadItems());
  }, [loadItems]);

  async function hashImage(arrayBuffer) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!selectedFile) return;
    setUploading(true);
    const arrayBuffer = await selectedFile.arrayBuffer();
    const hash  = await hashImage(arrayBuffer);
    const blob  = new Blob([arrayBuffer], { type: selectedFile.type });
    const newId = await db.wardrobeItems.add({
      imageBlob: blob, imageHash: hash,
      category: meta.category,
      colors: [], styles: [], occasions: [],
      geminiTags: null, status: 'untagged', dateAdded: new Date(),
    });
    setPreview(null);
    setSelectedFile(null);
    setUploading(false);
    fileRef.current.value = '';
    loadItems();
    tagItem(newId).then(() => loadItems());
  }

  async function handleDelete(id) {
    await db.wardrobeItems.delete(id);
    loadItems();
  }

  async function handleRetag(id) {
    await db.wardrobeItems.update(id, { status: 'untagged' });
    loadItems();
    await tagItem(id);
    loadItems();
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Wardrobe</h1>

      {/* Upload */}
      <div className="bg-neutral-900 rounded-xl p-6 mb-8">
        <p className="text-sm text-neutral-400 mb-4">Add item</p>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <div
          onClick={() => fileRef.current.click()}
          className="border-2 border-dashed border-neutral-700 rounded-lg p-8
                     text-center cursor-pointer hover:border-neutral-500 transition-colors"
        >
          {preview
            ? <img src={preview} className="max-h-48 mx-auto rounded" alt="preview" />
            : <p className="text-neutral-500">Click to upload a photo</p>
          }
        </div>
        {preview && (
          <div className="flex gap-3 mt-4 items-center">
            <select
              value={meta.category}
              onChange={e => setMeta({ ...meta, category: e.target.value })}
              className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={handleSave}
              className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium"
            >
              {uploading ? 'Saving...' : 'Save to wardrobe'}
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items.map(item => (
          <WardrobeCard
            key={item.id}
            item={item}
            onDelete={handleDelete}
            onRetag={handleRetag}
            onEdit={loadItems}
          />
        ))}
      </div>
    </main>
  );
}

function WardrobeCard({ item, onDelete, onRetag, onEdit }) {
  const url     = useMemo(() => URL.createObjectURL(item.imageBlob), [item.imageBlob]);
  const [editing, setEditing] = useState(false);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const statusColor = {
    untagged: 'text-yellow-500',
    tagging:  'text-blue-400',
    tagged:   'text-green-400',
    error:    'text-red-400',
  }[item.status] || 'text-neutral-500';

  // Surface the three critical tags so user knows what the AI decided
  const fitRaw    = item.geminiTags?.fit        || '—';
  const fit       = Array.isArray(fitRaw) ? fitRaw.join('+') : fitRaw;
  const weight    = item.geminiTags?.weight     || '—';
  const fabricRaw = item.geminiTags?.fabricType || '—';
  const fabric    = Array.isArray(fabricRaw) ? fabricRaw.join('+') : fabricRaw;

  return (
    <>
      <div
        className="bg-neutral-900 rounded-xl overflow-hidden cursor-pointer"
        onClick={() => setEditing(true)}
      >
        <img src={url} className="w-full aspect-square object-cover" alt={item.category} />
        <div className="p-2 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-neutral-400 capitalize">{item.category}</span>
            <button
              onClick={e => { e.stopPropagation(); onDelete(item.id); }}
              className="text-xs text-red-400 hover:text-red-300"
            >Remove</button>
          </div>
          <span className={`text-xs ${statusColor} capitalize`}>{item.status}</span>

          {/* Show critical tags — these control filtering */}
          {item.status === 'tagged' && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              <span className="bg-neutral-800 text-neutral-400 text-xs px-1.5 py-0.5 rounded">{fit}</span>
              <span className="bg-neutral-800 text-neutral-400 text-xs px-1.5 py-0.5 rounded">{weight}</span>
              <span className="bg-neutral-800 text-neutral-400 text-xs px-1.5 py-0.5 rounded">{fabric}</span>
            </div>
          )}

          {item.geminiTags?.description && (
            <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{item.geminiTags.description}</p>
          )}
        </div>
      </div>

      {editing && (
        <EditModal
          item={item}
          onSave={onEdit}
          onRetag={() => { onRetag(item.id); setEditing(false); }}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}

function EditModal({ item, onSave, onRetag, onClose }) {
  const [category,    setCategory]    = useState(item.category);
  const [description, setDescription] = useState(item.geminiTags?.description || '');
  const [fit,         setFit]         = useState(
    Array.isArray(item.geminiTags?.fit) ? item.geminiTags.fit
    : item.geminiTags?.fit ? [item.geminiTags.fit] : ['fitted']
  );
  const [weight,      setWeight]      = useState(item.geminiTags?.weight      || 'medium');
  const [fabricType,  setFabricType]  = useState(
    Array.isArray(item.geminiTags?.fabricType) ? item.geminiTags.fabricType
    : item.geminiTags?.fabricType ? [item.geminiTags.fabricType] : ['woven']
  );
  const [colors,      setColors]      = useState(item.colors    || []);
  const [occasions,   setOccasions]   = useState(item.occasions || []);

  function toggle(arr, setArr, v) {
    setArr(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  }

  async function handleSave() {
    await db.wardrobeItems.update(item.id, {
      category,
      colors,
      occasions,
      geminiTags: {
        ...item.geminiTags,
        description,
        fit,        // stored as array e.g. ['fitted','cropped']
        weight,
        fabricType,
      },
      status: 'tagged',
    });
    onSave();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-lg font-bold mb-4">Edit Item</h2>

        {/* Category */}
        <label className="text-xs text-neutral-400 block mb-1">Category</label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white mb-4"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Description */}
        <label className="text-xs text-neutral-400 block mb-1">Description</label>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white mb-4"
        />

        {/* ── Critical tags ── shown prominently with explanation */}
        <div className="bg-neutral-800 rounded-xl p-4 mb-4 space-y-4">
          <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide">
            Styling tags — these control outfit filtering
          </p>

          {/* Fit */}
          <div>
            <label className="text-xs text-neutral-400 block mb-1.5">
              Fit <span className="text-neutral-600">— pick all that apply (e.g. fitted + cropped)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {FIT_OPTIONS.map(f => (
                <button
                  key={f}
                  onClick={() => toggle(fit, setFit, f)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    fit.includes(f) ? 'bg-white text-black border-white' : 'border-neutral-600 text-neutral-400'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Weight */}
          <div>
            <label className="text-xs text-neutral-400 block mb-1.5">
              Weight <span className="text-neutral-600">— light (tee/silk) · medium (denim/knit) · heavy (coat/wool)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {WEIGHT_OPTIONS.map(w => (
                <button
                  key={w}
                  onClick={() => setWeight(w)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    weight === w ? 'bg-white text-black border-white' : 'border-neutral-600 text-neutral-400'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* Fabric */}
          <div>
            <label className="text-xs text-neutral-400 block mb-1.5">
              Fabric <span className="text-neutral-600">— pick all that apply (e.g. cotton + woven)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {FABRIC_OPTIONS.map(f => (
                <button
                  key={f}
                  onClick={() => toggle(fabricType, setFabricType, f)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    fabricType.includes(f) ? 'bg-white text-black border-white' : 'border-neutral-600 text-neutral-400'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Colors */}
        <label className="text-xs text-neutral-400 block mb-2">Colors</label>
        <div className="flex flex-wrap gap-2 mb-4">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => toggle(colors, setColors, c)}
              className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                colors.includes(c) ? 'bg-white text-black border-white' : 'border-neutral-600 text-neutral-400'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Occasions */}
        <label className="text-xs text-neutral-400 block mb-2">Occasions</label>
        <div className="flex flex-wrap gap-2 mb-6">
          {OCCASIONS.map(o => (
            <button
              key={o}
              onClick={() => toggle(occasions, setOccasions, o)}
              className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                occasions.includes(o) ? 'bg-white text-black border-white' : 'border-neutral-600 text-neutral-400'
              }`}
            >
              {o}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onRetag}
            className="flex-1 border border-neutral-600 text-neutral-400 py-2 rounded-lg text-sm hover:border-neutral-400 transition-colors"
          >
            ↺ Re-tag with AI
          </button>
          <button
            onClick={onClose}
            className="px-4 border border-neutral-700 text-neutral-500 py-2 rounded-lg text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-white text-black py-2 rounded-lg text-sm font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}