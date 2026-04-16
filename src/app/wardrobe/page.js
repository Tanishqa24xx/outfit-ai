'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { db } from '@/lib/db';
import { tagItem, tagAllPending } from '@/lib/tagger';

const CATEGORIES = ['top','bottom','outerwear','dress','shoes','bag','accessory'];

const COLORS = [
  // Whites & neutrals
  'white','ivory','off-white','cream','beige','tan','camel',
  // Greys & blacks
  'black','charcoal','dark-grey','grey','light-grey',
  // Blues — expanded
  'navy','dark-navy','cobalt','royal-blue','medium-blue',
  'light-blue','sky-blue','baby-blue','powder-blue',
  'light-wash-denim','medium-wash-denim','dark-wash-denim',
  // Greens
  'forest-green','olive','sage','mint','emerald',
  // Reds & pinks
  'red','burgundy','wine','rust','terracotta',
  'hot-pink','blush','light-pink','dusty-rose','mauve',
  // Browns
  'rich-brown','chocolate','caramel','warm-tan',
  // Others
  'purple','lilac','lavender','yellow','mustard',
  'orange','gold','silver','multicolor','print','white-print','black-print'
];

const STYLES = [
  'casual','smart-casual','business-casual','business-formal','streetwear',
  'athleisure','evening','cocktail','resort','minimalist','maximalist',
  'preppy','edgy','classic','clean-girl','kpop-inspired','elegant','boss-girl'
];

const OCCASIONS = [
  'everyday','work','meeting','date-night','going-out','brunch',
  'travel','beach','wedding-guest','formal-event','college','party'
];

export default function WardrobePage() {
  const [items, setItems]       = useState([]);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]   = useState(null);
  const [meta, setMeta]         = useState({ category: 'top' });
  const fileRef = useRef();
  const [selectedFile, setSelectedFile] = useState(null);

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
    const hashArray  = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);                          // store the file
    setPreview(URL.createObjectURL(file));
    setUploading(false);
  }

  async function handleSave() {
    if (!selectedFile) return;
    setUploading(true);

    const arrayBuffer = await selectedFile.arrayBuffer();
    const hash        = await hashImage(arrayBuffer);
    const blob        = new Blob([arrayBuffer], { type: selectedFile.type });

    const newId = await db.wardrobeItems.add({
      imageBlob:  blob,
      imageHash:  hash,
      category:   meta.category,
      colors:     [],
      styles:     [],
      occasions:  [],
      geminiTags: null,
      status:     'untagged',
      dateAdded:  new Date(),
    });

   
    setPreview(null);
    setSelectedFile(null);
    setUploading(false);
    fileRef.current.value = '';
    loadItems();

    // Fire and forget — runs in background
    tagItem(newId).then(() => loadItems());
  }

  async function handleDelete(id) {
    await db.wardrobeItems.delete(id);
    loadItems();
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Wardrobe</h1>

      {/* Upload area */}
      <div className="bg-neutral-900 rounded-xl p-6 mb-8">
        <p className="text-sm text-neutral-400 mb-4">Add item</p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />

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
              className="bg-neutral-900 border border-neutral-700 rounded-lg
                         px-3 py-2 text-sm text-white"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button 
              onClick={handleSave} 
              className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium" > 
              {uploading ? 'Saving...' : 'Save to wardrobe'} 
            </button>
          </div>
        )}
      </div>

      {/* Wardrobe grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items.map(item => (
          <WardrobeCard
            key={item.id}
            item={item}
            onDelete={handleDelete}
            onEdit={loadItems}
          />
        ))}
      </div>
    </main>
  );
}

function WardrobeCard({ item, onDelete, onEdit }) {
  const url = useMemo(() => URL.createObjectURL(item.imageBlob), [item.imageBlob]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);

  const statusColor = {
    untagged: 'text-yellow-500',
    tagging:  'text-blue-400',
    tagged:   'text-green-400',
    error:    'text-red-400',
  }[item.status] || 'text-neutral-500';

  return (
    <>
      <div className="bg-neutral-900 rounded-xl overflow-hidden cursor-pointer"
           onClick={() => setEditing(true)}>
        <img src={url} className="w-full aspect-square object-cover" alt={item.category} />
        <div className="p-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-neutral-400 capitalize">{item.category}</span>
            <button
              onClick={e => { e.stopPropagation(); onDelete(item.id); }}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>
          <span className={`text-xs ${statusColor} capitalize`}>{item.status}</span>
          {item.geminiTags?.description && (
            <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
              {item.geminiTags.description}
            </p>
          )}
          {item.colors?.length > 0 && (
            <p className="text-xs text-neutral-600 mt-1">{item.colors.join(', ')}</p>
          )}
        </div>
      </div>

      {editing && (
        <EditModal
          item={item}
          onSave={onEdit}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}

function EditModal({ item, onSave, onClose }) {
  const [category, setCategory]     = useState(item.category);
  const [colors, setColors]         = useState(item.colors || []);
  const [styles, setStyles]         = useState(item.styles || []);
  const [occasions, setOccasions]   = useState(item.occasions || []);
  const [description, setDescription] = useState(item.geminiTags?.description || '');

  function toggle(arr, setArr, value) {
    setArr(arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]);
  }

  async function handleSave() {
    await db.wardrobeItems.update(item.id, {
      category,
      colors,
      styles,
      occasions,
      geminiTags: { ...item.geminiTags, description },
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

        {/* Colors */}
        <label className="text-xs text-neutral-400 block mb-2">Colors</label>
        <div className="flex flex-wrap gap-2 mb-4">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => toggle(colors, setColors, c)}
              className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                colors.includes(c)
                  ? 'bg-white text-black border-white'
                  : 'border-neutral-600 text-neutral-400'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Styles */}
        <label className="text-xs text-neutral-400 block mb-2">Styles</label>
        <div className="flex flex-wrap gap-2 mb-4">
          {STYLES.map(s => (
            <button
              key={s}
              onClick={() => toggle(styles, setStyles, s)}
              className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                styles.includes(s)
                  ? 'bg-white text-black border-white'
                  : 'border-neutral-600 text-neutral-400'
              }`}
            >
              {s}
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
                occasions.includes(o)
                  ? 'bg-white text-black border-white'
                  : 'border-neutral-600 text-neutral-400'
              }`}
            >
              {o}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-neutral-600 text-neutral-400 py-2 rounded-lg text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-white text-black py-2 rounded-lg text-sm font-medium"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}