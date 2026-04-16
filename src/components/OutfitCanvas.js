'use client';
import { useEffect, useRef, useState } from 'react';

// ─── Body zone definitions ─────────────────────────────────────────────────────
// Canvas is 320 × 560. All coordinates are in canvas pixels.
// Each zone is [x, y, width, height] — the rectangle where that
// clothing category sits on the body silhouette.
//
// Why rectangles and not exact body shapes?
// We use ctx.clip() with these so clothing images are
// cropped to the right body region. This creates the spatial
// illusion of clothes "on" a body without needing a photo model.

const ZONES = {
  outerwear: [ 35,  88,  250, 195],  // full torso + shoulders, widest
  dress:     [ 65,  95,  190, 310],  // torso to knee
  jumpsuit:  [ 65,  95,  190, 310],
  top:       [ 65, 100,  190, 155],  // chest to waist
  bottom:    [ 68, 245,  184, 180],  // waist to knee
  shoes:     [ 75, 435,  170,  90],  // feet area
  bag:       [238, 165,   70,  85],  // right side, mid torso
  accessory: [ 12, 110,   55,  55],  // left shoulder
};

// Draw order — later items render ON TOP of earlier ones,
// mirroring how you physically layer clothing
const DRAW_ORDER = [
  'dress', 'jumpsuit',   // full-body base
  'bottom',              // pants / skirt
  'top',                 // top overlaps waistband
  'outerwear',           // jacket / coat over everything
  'shoes',
  'bag',
  'accessory',
];

// Skin tone palette — HSL-based so they look like actual skin
const SKIN_TONES = {
  porcelain: '#F5E6D8',
  ivory:     '#EDD9C0',
  beige:     '#D4A574',
  tan:       '#C68642',
  brown:     '#8D5524',
  deep:      '#4A2912',
};

// ─── Draw the mannequin body silhouette ───────────────────────────────────────
// Pure Canvas path commands — no external image needed.
// bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY)
//   cp1/cp2 = control points that "pull" the curve
function drawMannequin(ctx, skinColor) {
  ctx.save();
  ctx.fillStyle = skinColor;

  // Head
  ctx.shadowColor   = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur    = 14;
  ctx.shadowOffsetY = 6;
  ctx.beginPath();
  ctx.arc(160, 52, 40, 0, Math.PI * 2);
  ctx.fill();

  // Neck
  ctx.beginPath();
  ctx.roundRect(145, 88, 30, 20, 4);
  ctx.fill();

  // Torso + hips (the main body shape)
  ctx.beginPath();
  ctx.moveTo(82, 105);                          // left shoulder start
  ctx.bezierCurveTo(55, 130, 58, 185, 72, 235); // left side curving inward at waist
  ctx.bezierCurveTo(65, 255, 63, 272, 72, 285); // left hip flare
  ctx.lineTo(76, 440);                           // left leg down
  ctx.lineTo(106, 440);
  ctx.lineTo(108, 288);                          // back up inside left leg
  ctx.bezierCurveTo(118, 305, 142, 308, 160, 304); // crotch curve
  ctx.bezierCurveTo(178, 308, 202, 305, 212, 288);
  ctx.lineTo(214, 440);                          // right leg down
  ctx.lineTo(244, 440);
  ctx.lineTo(248, 285);                          // back up outside right leg
  ctx.bezierCurveTo(257, 272, 255, 255, 248, 235); // right hip
  ctx.bezierCurveTo(262, 185, 265, 130, 238, 105); // right side back to shoulder
  ctx.bezierCurveTo(215, 94, 190, 90, 160, 90);  // top across shoulders
  ctx.bezierCurveTo(130, 90, 105, 94, 82, 105);
  ctx.fill();

  // Left arm
  ctx.beginPath();
  ctx.moveTo(82, 108);
  ctx.bezierCurveTo(45, 118, 32, 145, 30, 200);
  ctx.bezierCurveTo(28, 230, 32, 255, 36, 265);
  ctx.bezierCurveTo(50, 262, 65, 258, 72, 250);
  ctx.bezierCurveTo(68, 220, 66, 175, 72, 145);
  ctx.bezierCurveTo(75, 125, 80, 112, 82, 108);
  ctx.fill();

  // Right arm
  ctx.beginPath();
  ctx.moveTo(238, 108);
  ctx.bezierCurveTo(275, 118, 288, 145, 290, 200);
  ctx.bezierCurveTo(292, 230, 288, 255, 284, 265);
  ctx.bezierCurveTo(270, 262, 255, 258, 248, 250);
  ctx.bezierCurveTo(252, 220, 254, 175, 248, 145);
  ctx.bezierCurveTo(245, 125, 240, 112, 238, 108);
  ctx.fill();

  // Feet
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.ellipse(100, 445, 30, 10, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(220, 445, 30, 10, 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ─── Draw a clothing image clipped to its body zone ───────────────────────────
// clip() restricts all drawing to inside the defined path.
// ctx.save() / ctx.restore() sandbox the clip so it doesn't affect other draws.
function drawClippedItem(ctx, img, zone) {
  const [x, y, w, h] = zone;

  ctx.save();

  // Define the clip boundary
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  // Shadow for depth — only visible inside the clip
  ctx.shadowColor   = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur    = 10;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 3;

  // Slight bleed beyond zone edges so there's no pixel gap at the border
  ctx.drawImage(img, x - 6, y - 6, w + 12, h + 12);

  ctx.restore(); // removes both the clip AND the shadow
}

// ─── Load a Blob as an HTMLImageElement ──────────────────────────────────────
const loadImage = (blob) =>
  new Promise((resolve) => {
    if (!blob) return resolve(null);
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });

// ─── Component ────────────────────────────────────────────────────────────────
export default function OutfitCanvas({ items }) {
  const canvasRef = useRef(null);
  const [skinTone, setSkinTone] = useState('tan');

  // Redraw whenever items or skin tone changes
  useEffect(() => {
    if (!items || items.length === 0) return;

    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');

    async function draw() {
      // Map items by category
      const byCat = {};
      items.forEach(item => { byCat[item.category] = item; });

      // Load all images in parallel — much faster than one-by-one
      const loadedMap = {};
      await Promise.all(
        DRAW_ORDER.map(async (cat) => {
          const item = byCat[cat];
          if (!item?.imageBlob) return;
          const img = await loadImage(item.imageBlob);
          if (img) loadedMap[cat] = img;
        })
      );

      // Clear before drawing
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bg.addColorStop(0, '#1c1c2e');
      bg.addColorStop(1, '#12122a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Mannequin
      drawMannequin(ctx, SKIN_TONES[skinTone]);

      // 3. Clothing — in draw order
      for (const cat of DRAW_ORDER) {
        const img  = loadedMap[cat];
        const zone = ZONES[cat];
        if (img && zone) {
          drawClippedItem(ctx, img, zone);
        }
      }

      // 4. Vignette — gives a polished "studio shot" feel
      const vignette = ctx.createRadialGradient(160, 280, 80, 160, 280, 300);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    draw();
  }, [items, skinTone]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link     = document.createElement('a');
    link.download  = 'my-outfit.png';
    link.href      = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={320}
        height={560}
        className="w-full max-w-xs rounded-2xl mx-auto"
        style={{ background: '#1c1c2e' }}
      />

      {/* Skin tone selector */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-neutral-500 tracking-wide">Model skin tone</p>
        <div className="flex gap-2">
          {Object.entries(SKIN_TONES).map(([name, hex]) => (
            <button
              key={name}
              title={name}
              onClick={() => setSkinTone(name)}
              className={`w-7 h-7 rounded-full border-2 transition-all duration-150 ${
                skinTone === name
                  ? 'border-white scale-110 shadow-lg'
                  : 'border-transparent hover:border-neutral-500'
              }`}
              style={{ background: hex }}
            />
          ))}
        </div>
      </div>

      <button
        onClick={handleDownload}
        className="text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300
                   px-4 py-2 rounded-full border border-neutral-700 transition-colors"
      >
        ↓ Download outfit
      </button>
    </div>
  );
}