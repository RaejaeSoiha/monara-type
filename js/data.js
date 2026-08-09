/* ============================================================
   DATA.JS — Text library (merged) & constants
   Monara Type v2

   Language data lives in separate files:
     js/data-en.js  → TXT_EN  (English)
     js/data-mm.js  → TXT_MM  (Burmese)
     js/data-mon.js → TXT_MON (Mon)  — LAZY-LOADED on demand

   Structure: TXT[language][difficulty][mode] = string[]
   Languages: en | mm | mon
   Difficulties: easy | medium | hard
   Modes: words | sentences | quotes

   The Mon corpus is ~1.5 MB, so it is NOT parsed at startup.
   It is fetched only when the user actually selects Mon
   (see loadMonData / monDataLoaded below).
============================================================ */
const TXT = Object.assign({}, TXT_EN, TXT_MM);

/* ----------------------------------------------------------
   LAZY MON CORPUS LOADER
   js/data-mon.js declares `const TXT_MON` in the global scope.
   It is injected via <script> on first use and merged into TXT.
---------------------------------------------------------- */
function monDataLoaded() { return !!TXT.mon; }

function loadMonData(cb) {
  if (monDataLoaded()) { if (cb) cb(); return; }
  const s = document.createElement("script");
  s.src = "js/data-mon.js";
  s.onload = () => {
    Object.assign(TXT, TXT_MON);
    if (cb) cb();
  };
  s.onerror = () => {
    console.error("Failed to load Mon data");
    if (cb) cb();
  };
  document.head.appendChild(s);
}

/* ----------------------------------------------------------
   CONSTANTS
---------------------------------------------------------- */
const LANG_NAMES = { en:"🇺🇸 English", mm:"🇲🇲 Burmese", mon:"Mon မန်" };
const LANG_SHORT  = { en:"English", mm:"Burmese", mon:"Mon" };

/* Font class for each script: Mon uses its own Unicode font stack. */
function scriptFontClass(lang) {
  return lang === "mon" ? " mon-font" : lang === "mm" ? " mm-font" : "";
}

/* Average characters-per-word for each language, measured from
   the actual text pools (pooled over difficulties & modes):
     en  ≈ 6.15   mm  ≈ 5.73   mon ≈ 11.30
   Standard typing WPM counts 5 chars/word (English convention).
   Normalizing by each language's real average word length keeps
   the leaderboard fair across languages: a Mon word (~11 chars)
   costs as much as it should, instead of being counted as 1
   "word" when only 5 chars have been typed.
   Values are rounded so the factors stay stable over time. */
const LANG_WORD_LEN = { en: 5, mm: 6, mon: 11 };

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
function getText(lang, diff, mode, count) {
  const pool = TXT[lang]?.[diff]?.[mode === "custom" ? "words" : mode]
             || TXT[lang]?.[diff]?.words
             || TXT.en.easy.words;
  if (mode === "words") return getWordSequence(pool, count);
  if (mode === "sentences") {
    // Mon/Burmese pool sentences end with particles (ရ/ည်) rather than a
    // full stop, so add "။" between them or multi-sentence passages would
    // read as one run-on sentence. English entries already end with ".".
    const sep = lang === "mon" || lang === "mm" ? "။ " : " ";
    return getSentenceSequence(pool, count || 1, sep);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Monkeytype-style word mode: build a unique random sequence of
 * individual words drawn from the pool. The pool entries may be
 * single words (huge Mon vocab) or phrases (en/mm fallback), so we
 * split every entry on whitespace and pick random words from the
 * merged list. Each test gets a fresh, near-unique passage.
 */
function getWordSequence(pool, count) {
  const words = [];
  const seen  = new Set();
  pool.forEach(s => s.split(/\s+/).forEach(w => {
    if (!w || seen.has(w)) return;
    seen.add(w);
    words.push(w);
  }));
  if (words.length < 8) return pool[Math.floor(Math.random() * pool.length)];
  const n = count || 28 + Math.floor(Math.random() * 18); // 28–45 words per passage (or exact count)
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

/* Sentences mode: longer sessions combine more sentences. The count
   scales with the user's configured time (15s→2, 30s→4, 60s→8, 120s→15)
   so the passage fills the chosen session length. */
function sentencesForTime(time) {
  return Math.max(2, Math.round((time || 30) / 8));
}

/* Build a passage from `count` distinct random sentences. Falls back
   to a single sentence when no count is given (race/quotes use this). */
function getSentenceSequence(pool, count, sep) {
  const n    = Math.max(1, Math.min(count || 1, pool.length));
  const used = new Set();
  const out  = [];
  for (let i = 0; i < n; i++) {
    let idx = Math.floor(Math.random() * pool.length);
    while (used.has(idx) && used.size < pool.length) {
      idx = Math.floor(Math.random() * pool.length);
    }
    used.add(idx);
    out.push(pool[idx]);
  }
  return out.join(sep || " ");
}

function esc(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;");
}

function calcWPM(correctChars, t0, lang) {
  const elapsed = (Date.now() - t0) / 60000;
  if (elapsed <= 0) return 0;
  const wl = LANG_WORD_LEN[lang] || 5;
  return Math.max(0, Math.round((correctChars / wl) / elapsed));
}
