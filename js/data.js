/* ============================================================
   DATA.JS — Text library (merged) & constants
   TypeCraft v2

   Language data now lives in separate files:
     js/data-en.js  → TXT_EN  (English)
     js/data-mm.js  → TXT_MM  (Burmese)
     js/data-mon.js → TXT_MON (Mon)

   Structure: TXT[language][difficulty][mode] = string[]
   Languages: en | mm | mon
   Difficulties: easy | medium | hard
   Modes: words | sentences | quotes
============================================================ */
const TXT = Object.assign({}, TXT_EN, TXT_MM, TXT_MON);

/* ----------------------------------------------------------
   CONSTANTS
---------------------------------------------------------- */
const LANG_NAMES = { en:"🇺🇸 English", mm:"🇲🇲 Burmese", mon:"Mon မောန်" };
const LANG_SHORT  = { en:"English", mm:"Burmese", mon:"Mon" };

const BOT_NAMES  = ["Pixel","Nova","Zeta","Blaze","Kira"];
const BOT_COLORS = ["var(--cyan)","var(--amber)","var(--pink)","var(--green)","var(--red)"];
const BOT_EMOJIS = ["🤖","🦾","⚡","🔥","💫"];

const DIFF_HINTS = {
  easy:   "Easy · Common everyday words",
  medium: "Medium · Extended vocabulary",
  hard:   "Hard · Complex professional text"
};

/* ----------------------------------------------------------
   HELPER
---------------------------------------------------------- */
function getText(lang, diff, mode) {
  const pool = TXT[lang]?.[diff]?.[mode === "custom" ? "words" : mode]
             || TXT[lang]?.[diff]?.words
             || TXT.en.easy.words;
  if (mode === "words") return getWordSequence(pool);
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Monkeytype-style word mode: build a unique random sequence of
 * individual words drawn from the pool. The pool entries may be
 * single words (huge Mon vocab) or phrases (en/mm fallback), so we
 * split every entry on whitespace and pick random words from the
 * merged list. Each test gets a fresh, near-unique passage.
 */
function getWordSequence(pool) {
  const words = [];
  const seen  = new Set();
  pool.forEach(s => s.split(/\s+/).forEach(w => {
    if (!w || seen.has(w)) return;
    seen.add(w);
    words.push(w);
  }));
  if (words.length < 8) return pool[Math.floor(Math.random() * pool.length)];
  const n = 28 + Math.floor(Math.random() * 18); // 28–45 words per passage
  let out = [];
  for (let i = 0; i < n; i++) {
    let w = words[Math.floor(Math.random() * words.length)];
    if (i > 0 && Math.random() < 0.6) { // occasionally re-draw to add variety
      const w2 = words[Math.floor(Math.random() * words.length)];
      if (w2 !== w) w = w2;
    }
    out.push(w);
  }
  return out.join(" ");
}

function esc(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;");
}

function calcWPM(correctChars, t0) {
  const elapsed = (Date.now() - t0) / 60000;
  return elapsed > 0 ? Math.max(0, Math.round((correctChars / 5) / elapsed)) : 0;
}
