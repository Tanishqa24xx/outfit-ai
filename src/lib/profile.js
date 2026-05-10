// outfit-ai\src\lib\profile.js

export const USER_PROFILE = {
  body: {
    height: "5'2\"",
    cupSize: "B cup",
    shape: "rectangular or hourglass with broad shoulders, slim-medium build leaning towards thin, soft volume, medium-thick thighs, hip dips, slight tummy when seated",
    silhouettes: [
      {
        name: "Cropped top + high-waisted wide-leg pants",
        effect: "Creates waist definition, balances broad shoulders with volume below, elongates legs"
      },
      {
        name: "Fitted top + wide-leg or flared pants",
        effect: "Clean, elegant, balances upper body. One of the most flattering for rectangular shape"
      },
      {
        name: "Oversized top + fitted straight-leg pants",
        effect: "Relaxed streetwear/kpop vibe, tuck front to avoid looking shapeless"
      },
      {
        name: "Fitted top + fitted bottom (monochrome)",
        effect: "Creates a sleek elongated line — looks best in same color family. Can look very sharp and thin"
      },
      {
        name: "Flowy/draped top + slim straight pants",
        effect: "Hides tummy softly, still looks put-together and elegant"
      },
      {
        name: "Tucked fitted tee + straight/wide-leg jeans",
        effect: "Clean-girl signature — simple but intentional"
      },
      {
        name: "Mini/midi dress alone",
        effect: "Elongates figure, easy elegant look, works for many occasions"
      },
      {
        name: "Dress over pants/bottoms",
        effect: "Layered, kpop/editorial aesthetic, works when dress is structured"
      },
      {
        name: "Cropped jacket/blazer + high-waisted bottoms",
        effect: "Defines waist, adds structure, great for boss-girl and business looks"
      },
      {
        name: "Bodycon/clingy dress or top",
        effect: "Shows figure confidently — user is open to clingy outfits. Pair with confidence"
      },
      {
        name: "Longline top/cardigan + leggings or skinny pants",
        effect: "Covers hip dips, flattering for tummy, cozy but styled"
      },
      {
        name: "Wrap-style or belted pieces",
        effect: "Creates waist definition artificially — great for rectangular shape"
      }
    ],
    tips: [
      "V-necks, scoop necks, deep necklines — balance broad shoulders and elongate neck",
      "Avoid wide/boat/off-shoulder necklines — widens shoulders further",
      "High-waisted bottoms always — creates waist definition",
      "Cropped tops work very well — shortens torso, emphasizes waist",
      "Wide-leg and flared pants are ideal — balances broad shoulders",
      "Skinny jeans: use sparingly, only truly casual occasions, never business or smart-casual",
      "Hip dips: avoid very tight yoga pants as standalone — layer with longer top",
      "Slight tummy: flowy or draped tops, high-waisted bottoms, avoid low-rise",
      "Monochrome outfits create a long lean line — great for looking slimmer",
      "Clingy outfits are welcome — user is open to bodycon styles",
      "Tucking styles: full-tuck (formal), front-tuck (casual clean-girl), side-tuck (streetwear), knot-tie (crop effect)"
    ]
  },
  skin: {
    tone: "medium warm — honey and medium brown with cool-neutral undertone, suits both silver and gold jewelry",
    bestColors: [
      "rich brown", "white", "black", "navy", "red",
      "camel", "rust", "olive", "dusty rose", "burgundy",
      "cream", "cobalt blue", "forest green", "warm terracotta",
      "light pink", "blush", "mauve", "warm tan"
    ],
    avoidColors: ["neon yellow", "orange-red", "lime green", "muddy pastels"]
  },
  styleProfiles: {
    "clean-girl": "Minimal, polished, effortless. Neutral tones, fitted basics, simple gold or silver accessories. Front-tuck or half-tuck preferred.",
    "kpop-inspired": `Draw from ALL of these specific idols — explore each one's distinct aesthetic and vary which idol inspires each outfit:
      - V (BTS): avant-garde, artistic, unexpected layering, oversized silhouettes, muted/earthy tones
      - Jungkook (BTS): clean fitted basics, white tees, all-black, monochrome, sharp simplicity, half-tuck
      - Heeseung (Enhypen): dark academia meets streetwear, structured layered pieces, dark tones
      - Jake (Enhypen): preppy clean, polo shirts, neutral tones, collegiate put-together
      - Joshua (Seventeen): soft collegiate, cardigans over collared shirts, warm neutrals
      - S.Coups (Seventeen): bold streetwear, oversized confident silhouettes
      - Beomgyu (TXT): experimental, Y2K touches, graphic elements, playful layering
      - Bangchan (Stray Kids): bold, dark, layered, chains and structured pieces, powerful aesthetic
      - Le Sserafim: powerful, sleek, sporty-chic, confidence-forward
      - aespa: futuristic, bold, mix of edgy and feminine, unexpected combinations
      - Yoonchae (Katseye): girl-next-door meets global pop, fresh and approachable
      IMPORTANT: Translate male idol aesthetics into feminine versions for the user's body (broad shoulders, rectangular, 5'2"). Use their COLOR and SILHOUETTE logic. Each outfit should reference a DIFFERENT idol.`,
    "elegant": "Elevated, refined. Clean lines, quality-looking fabrics, understated sophistication. Minimal jewelry. Full tuck or structured pieces.",
    "boss-girl": "Powerful, sharp, authoritative. Structured pieces, monochrome, strong silhouettes. Blazers, tailored fits. Full tuck always.",
    "streetwear": "Urban, relaxed cool. Oversized elements balanced with fitted pieces. Side-tuck or knot-tie.",
    "athleisure": "Athletic meets casual. Avoid exposing hip dips — pair athletic bottoms with longer tops or layer a hoodie/jacket.",
    "business-formal": `PRIORITY STYLE for early career. Polished, professional, sharp:
      - Structured blazers are key
      - High-waisted tailored trousers (wide-leg or straight, never skinny)
      - Fitted blouses, button-downs, fitted knit tops — full tuck always
      - Monochrome outfits look most powerful
      - Midi skirts with tucked blouse
      - Dresses with blazer over top
      - Shoes: block heels, loafers, pointed flats
      - NEVER suggest skinny jeans`,
    "business-casual": `PRIORITY STYLE for early career:
      - Blazer over fitted tee or loose button-down
      - Wide-leg or straight trousers, never skinny jeans
      - Dark wash denim with structured top acceptable
      - Knit tops, fitted turtlenecks, neat blouses
      - Loafers, clean sneakers, block heels
      - NEVER suggest skinny jeans`,
    "smart-casual": `PRIORITY STYLE for early career:
      - Neat, intentional, versatile
      - Dark wash jeans acceptable, straight or wide-leg preferred
      - Fitted tops tucked in
      - Cardigans, lightweight blazers, structured jackets
      - Clean sneakers, loafers, ankle boots
      - Skinny jeans only if no other option — always note it's not preferred`
  },
  outfitRules: [
    "PRIORITY 1 — Occasion: always the primary filter. Respect strictly.",
    "PRIORITY 2 — Style profile: determines the vibe and aesthetic",
    "PRIORITY 3 — Silhouette: choose from the full silhouette list, pick what's MOST flattering for the occasion and available pieces. Don't limit to one type.",
    "PRIORITY 4 — Color harmony: use user's best colors, ensure pieces complement each other. Monochrome is always a strong choice.",
    "PRIORITY 5 — Layering: always consider what goes under/over. Specify EXACT tuck type.",
    "PRIORITY 6 — Fabric/texture: avoid clashing heavy textures, max 2 statement textures per outfit",
    "PRIORITY 7 — Complete the outfit: ALWAYS suggest specific shoes, bag, jewelry",
    "PRIORITY 8 — Shopping list: ONLY suggest items NOT already in the wardrobe",
    "PRIORITY 9 — Hip dips + tummy: for tight/athletic bottoms, always pair with hip-covering top. Use high-waisted pieces to manage tummy.",
    "PRIORITY 10 — Vary silhouettes across the 3 outfit recommendations — never give 3 outfits with the same silhouette",
    "Never say no suitable outfits found — always make best effort",
    "Clingy/bodycon outfits are welcome — user is open to showing figure",
    "Skinny jeans: ONLY casual. NEVER work/meeting/business/smart-casual",
    "User is NOT girly, NOT grunge — clean, elegant, occasionally bold",
    "Always vary which idol inspires each kpop outfit recommendation"
  ]
};