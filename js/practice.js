/* ============================================================
   PRACTICE.JS — Practice/typing mode engine
   Monara Type v2
   Depends on: data.js, audio.js, storage.js
============================================================ */

/* ----------------------------------------------------------
   PRACTICE STATE
---------------------------------------------------------- */
const P = {
  lang:"en", mode:"words", time:30, diff:"easy", hl:"char",
  wordCount:0, km:true,
  text:"", chars:[], cursor:0,
  started:false, finished:false,
  timer:null, remaining:30,
  correct:0, wrong:0, keys:0, streak:0,
  t0:null, lastResult:null, samples:[]
};

/* ----------------------------------------------------------
   RENDERING
---------------------------------------------------------- */
function renderTyping() {
  if (P.hl === "word") { renderWordMode(); updateWordMean(); return; }
  const el = document.getElementById("textDisplay");
  el.className = "text-display" + scriptFontClass(P.lang);
  el.innerHTML = P.chars.map((c, i) => {
    let cls = "char";
    if (i < P.cursor) cls += c.ok ? " correct" : " wrong";
    else if (i === P.cursor) cls += " cursor";
    return `<span class="${cls}">${c.ch === " " ? "&nbsp;" : esc(c.ch)}</span>`;
  }).join("");
  updateWordMean();
  scrollCursorIntoView(el);
}

function renderWordMode() {
  const el = document.getElementById("textDisplay");
  el.className = "text-display" + scriptFontClass(P.lang);
  const words = P.text.split(" ");
  let charIdx = 0;
  const html = words.map(w => {
    const wStart = charIdx;
    const wEnd   = charIdx + w.length;
    let cls = "word";
    if (P.cursor > wEnd) {
      const wChars = P.chars.slice(wStart, wEnd);
      cls += wChars.every(c => c.ok) ? " word-correct" : " word-wrong";
    } else if (P.cursor >= wStart && P.cursor <= wEnd) {
      cls += " word-current";
    } else {
      cls += " word-pending";
    }
    const spanChars = [...w].map((ch, ci) => {
      const gi = wStart + ci;
      let cc = "char";
      if (gi < P.cursor)       cc += P.chars[gi]?.ok ? " correct" : " wrong";
      else if (gi === P.cursor) cc += " cursor";
      return `<span class="${cc}">${esc(ch)}</span>`;
    }).join("");
    charIdx = wEnd + 1;
    return `<span class="${cls}">${spanChars}</span>`;
  }).join(`<span class="word-space">&nbsp;</span>`);
  el.innerHTML = html;
  scrollCursorIntoView(el);
}

/* Keep the active cursor visible: if the typing card scrolls the
   passage (auto-scroll), nudge the container so the caret stays in view. */
function scrollCursorIntoView(el) {
  el = el || document.getElementById("textDisplay") || document.getElementById("raceTextDisplay");
  if (!el) return;
  const cur = el.querySelector(".char.cursor") || el.querySelector(".word.cursor");
  if (!cur || !el.scrollHeight) return;
  const lineH  = cur.offsetHeight || 20;
  const top    = cur.offsetTop;
  const bottom = top + lineH;
  if (top < el.scrollTop || bottom > el.scrollTop + el.clientHeight) {
    el.scrollTop = Math.max(0, top - (el.clientHeight - lineH) / 2);
  }
}

/* Show the English gloss of the word currently being typed (Mon words mode).
   Uses MON_GLOSS from data-mon.js (Mon Wiktionary glosses). */
function updateWordMean() {
  const el = document.getElementById("wordMean");
  if (!el) return;
  if (P.lang !== "mon" || P.mode !== "words" || !P.text) {
    el.textContent = "";
    el.style.display = "none";
    return;
  }
  let idx = 0, cur = "";
  for (const word of P.text.split(" ")) {
    const end = idx + word.length;
    if (P.cursor >= idx && P.cursor <= end) { cur = word; break; }
    idx = end + 1;
  }
  const g = (typeof MON_GLOSS !== "undefined") && MON_GLOSS[cur];
  if (g) {
    el.textContent = cur + " — " + g;
    el.style.display = "block";
  } else {
    el.textContent = "";
    el.style.display = "none";
  }
}

/* ----------------------------------------------------------
   STATS BAR
---------------------------------------------------------- */
function updateStats() {
  const wpm = P.t0 ? calcWPM(P.correct, P.t0, P.lang) : 0;
  const raw  = P.t0 ? calcWPM(P.keys, P.t0, P.lang)   : 0;
  const tot  = P.correct + P.wrong;
  const acc  = tot > 0 ? Math.round((P.correct / tot) * 100) : 100;
  setVal("wpmD", wpm);
  setVal("rawD", raw);
  setVal("accD", acc + "%");
  setVal("strD", P.streak);
  setVal("chrD", P.correct);
  return { wpm, raw, acc };
}

function setVal(id, v) {
  const el = document.getElementById(id);
  if (!el || el.textContent === String(v)) return;
  el.textContent = v;
  el.classList.remove("bump");
  void el.offsetWidth;
  el.classList.add("bump");
}

/* ----------------------------------------------------------
   TIMER
---------------------------------------------------------- */
function startTimer() {
  if (P.timer) clearInterval(P.timer);
  const fill = document.getElementById("timeFill");
  const td   = document.getElementById("timeD");
  P.timer = setInterval(() => {
    P.remaining = Math.max(0, P.remaining - 1);
    const pct = (P.remaining / P.time) * 100;
    fill.style.width      = pct + "%";
    fill.style.background = pct < 20 ? "var(--red)" : pct < 50 ? "var(--amber)" : "var(--p)";
    td.textContent = P.remaining;
    sampleWPM();
    updateStats();
    if (P.remaining <= 0) finishTest();
  }, 1000);
}

/* ----------------------------------------------------------
   LIVE WPM CHART
   Samples WPM once per second while typing and draws a smooth
   mini line chart on a canvas (theme-aware accent color).
---------------------------------------------------------- */
function sampleWPM() {
  if (!P.t0) return;
  const wpm = Math.round(calcWPM(P.correct, P.t0, P.lang));
  P.samples.push(wpm);
  if (P.samples.length > 400) P.samples.shift();
  const lbl = document.getElementById("liveWpmLabel");
  if (lbl) lbl.textContent = wpm + " WPM";
  drawMiniChart("liveChart", P.samples);
}

function drawMiniChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !canvas.parentElement) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement.clientWidth || 320;
  const H = 120;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (!data || !data.length) return;

  const cs = getComputedStyle(document.body);
  const color = (cs.getPropertyValue("--p").trim() || "#a78bfa");

  const pad = { t: 10, r: 10, b: 10, l: 10 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => ({
    x: pad.l + cW * i / Math.max(1, data.length - 1),
    y: pad.t + cH - (v / max) * cH
  }));

  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH);
  grad.addColorStop(0, color + "40");
  grad.addColorStop(1, color + "00");
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pad.t + cH);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, pad.t + cH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2;
    ctx.bezierCurveTo(cx, pts[i - 1].y, cx, pts[i].y, pts[i].x, pts[i].y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.lineJoin    = "round";
  ctx.lineCap     = "round";
  ctx.stroke();

  const last = pts[pts.length - 1];
  ctx.beginPath();
  ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

/* ----------------------------------------------------------
   KEYBOARD KEYMAP
   A QWERTY visual with touch-typing finger hints. Highlights the
   physical key for the next character (English mode only).
---------------------------------------------------------- */
const KM_ROWS = [
  { off: 0, keys: ["`","1","2","3","4","5","6","7","8","9","0","-","="] },
  { off: 1, keys: ["q","w","e","r","t","y","u","i","o","p","[","]","\\"] },
  { off: 2, keys: ["a","s","d","f","g","h","j","k","l",";","'"] },
  { off: 3, keys: ["z","x","c","v","b","n","m",",",".","/"] },
  { off: 0, keys: [" "] }
];
const KM_FINGERS = {
  "`":["L","pinky"], "1":["L","pinky"], "2":["L","ring"], "3":["L","middle"], "4":["L","index"], "5":["L","index"],
  "6":["R","index"], "7":["R","index"], "8":["R","middle"], "9":["R","ring"], "0":["R","pinky"], "-":["R","pinky"], "=":["R","pinky"],
  "q":["L","pinky"], "w":["L","ring"], "e":["L","middle"], "r":["L","index"], "t":["L","index"],
  "y":["R","index"], "u":["R","index"], "i":["R","middle"], "o":["R","ring"], "p":["R","pinky"], "[":["R","pinky"], "]":["R","pinky"], "\\":["R","pinky"],
  "a":["L","pinky"], "s":["L","ring"], "d":["L","middle"], "f":["L","index"], "g":["L","index"],
  "h":["R","index"], "j":["R","index"], "k":["R","middle"], "l":["R","ring"], ";":["R","pinky"], "'":["R","pinky"],
  "z":["L","pinky"], "x":["L","ring"], "c":["L","middle"], "v":["L","index"], "b":["L","index"],
  "n":["R","index"], "m":["R","index"], ",":["R","middle"], ".":["R","ring"], "/":["R","pinky"],
  " ":["T","thumb"]
};
const KM_HOME = ["a","s","d","f","j","k","l",";"];

function renderKeymap() {
  const el = document.getElementById("keymap");
  if (!el) return;
  el.innerHTML = KM_ROWS.map(row =>
    `<div class="keymap-row"${row.off ? ' style="margin-left:' + (row.off * 18) + 'px"' : ""}>` +
      row.keys.map(k => {
        const f = KM_FINGERS[k] || ["", ""];
        const cls = "kkey"
          + (f[0] === "L" ? " lh" : f[0] === "R" ? " rh" : "")
          + (KM_HOME.includes(k) ? " home" : "")
          + (k === " " ? " space" : "");
        return `<span class="${cls}" data-k="${k}">${k === " " ? "SPACE" : esc(k)}</span>`;
      }).join("") +
    `</div>`).join("");
}

function updateKeymap() {
  const wrap = document.getElementById("keymapWrap");
  const hint = document.getElementById("keymapHint");
  if (!wrap || wrap.classList.contains("hidden")) { if (hint) hint.textContent = ""; return; }
  wrap.querySelectorAll(".kkey.hit").forEach(k => k.classList.remove("hit"));
  if (hint) hint.textContent = "";
  if (P.lang !== "en" || !P.chars.length) return;
  const target = P.chars[P.cursor]?.ch;
  if (!target) return;
  const key = target.toLowerCase();
  let found = null;
  wrap.querySelectorAll(".kkey").forEach(k => { if (k.dataset.k === key) found = k; });
  if (!found) return;
  found.classList.add("hit");
  if (hint) {
    const f = KM_FINGERS[key] || KM_FINGERS[target] || null;
    if (f) {
      const hand = f[0] === "L" ? "Left" : f[0] === "R" ? "Right" : "Both";
      hint.textContent = "Next key: " + (key === " " ? "Space" : target.toUpperCase()) + " · " + hand + " " + f[1] + " finger";
    }
  }
}

function toggleKeymap() {
  P.km = !P.km;
  applyKeymapState();
  saveSettings();
}

function applyKeymapState() {
  const wrap = document.getElementById("keymapWrap");
  const btn  = document.getElementById("keymapBtn");
  const show = P.lang === "en" && P.km;
  if (wrap) wrap.classList.toggle("hidden", !show);
  if (btn) { btn.style.display = P.lang === "en" ? "inline-flex" : "none"; btn.classList.toggle("on", show); }
}

/* ----------------------------------------------------------
   FINISH / RESULTS
---------------------------------------------------------- */
function finishTest() {
  if (P.timer) clearInterval(P.timer);
  P.finished = true;
  const { wpm, raw, acc } = updateStats();
  P.lastResult = { wpm, raw, acc, correct: P.correct, lang: P.lang, diff: P.diff, time: P.time, mode: P.mode, wordCount: P.wordCount };
  LS.addH({ wpm, raw, acc, lang: P.lang, diff: P.diff, mode: P.mode });
  LS.recordStreak();
  playFinish();

  document.getElementById("mainCard").style.display  = "none";
  document.getElementById("actionRow").style.display = "none";
  const rs = document.getElementById("resultScreen");
  rs.classList.add("show");
  drawMiniChart("rChart", P.samples);

  const trophy = wpm >= 100 ? "🏆" : wpm >= 60 ? "⭐" : wpm >= 30 ? "👍" : "💪";
  document.getElementById("rTrophy").textContent = trophy;
  document.getElementById("rTitle").textContent  = wpm >= 80 ? "Outstanding!" : wpm >= 50 ? "Great Work!" : "Keep Going!";
  document.getElementById("rSub").textContent    = LANG_SHORT[P.lang] + " · " + P.diff + " · "
    + (P.mode === "words" && P.wordCount > 0 ? P.wordCount + " words" : P.time + "s");
  document.getElementById("rWpm").textContent    = wpm;
  document.getElementById("rAcc").textContent    = acc + "%";
  document.getElementById("rRaw").textContent    = raw;
  document.getElementById("rChars").textContent  = P.correct;
  document.getElementById("saveBtn").textContent = "💾 Save Score";
  document.getElementById("saveBtn").disabled    = false;

  setTimeout(() => {
    document.getElementById("rWpmBar").style.width  = Math.min(100, wpm) + "%";
    document.getElementById("rAccBar").style.width  = acc + "%";
  }, 100);
}

/* ----------------------------------------------------------
   INIT / RESTART
---------------------------------------------------------- */
function initTest(keepText) {
  // Mon corpus is lazy-loaded: ensure it's available before rendering Mon text
  if (P.lang === "mon" && !monDataLoaded()) {
    const el = document.getElementById("textDisplay");
    if (el) el.textContent = "Loading Mon data…";
    loadMonData(() => initTest(keepText));
    return;
  }
  if (P.timer) clearInterval(P.timer);
  if (!keepText) {
    const count = P.mode === "sentences" ? sentencesForTime(P.time)
               : P.mode === "words" && P.wordCount > 0 ? P.wordCount : undefined;
    const t = getText(P.lang, P.diff, P.mode, count);
    P.text  = t;
    P.chars = [...t].map(ch => ({ ch, ok: null }));
  } else {
    P.chars = [...P.text].map(ch => ({ ch, ok: null }));
  }
  P.cursor = 0;
  P.started = P.finished = false;
  P.remaining = P.time;
  P.correct = P.wrong = P.keys = P.streak = 0;
  P.t0 = null;

  P.samples = [];
  const lw = document.getElementById("liveChartWrap");
  if (lw) lw.classList.remove("active");
  const lbl = document.getElementById("liveWpmLabel");
  if (lbl) lbl.textContent = "0 WPM";
  drawMiniChart("liveChart", []);
  renderKeymap();
  applyKeymapState();
  updateKeymap();

  document.getElementById("timeFill").style.width      = "100%";
  document.getElementById("timeFill").style.background = "var(--p)";
  document.getElementById("timeD").textContent         = P.time;

  ["wpmD","rawD","strD","chrD"].forEach(id =>
    document.getElementById(id).textContent = "0"
  );
  document.getElementById("accD").textContent = "100%";

  const inp = document.getElementById("typingInput");
  inp.value       = "";
  inp.className   = "typing-input" + scriptFontClass(P.lang);
  inp.placeholder = P.lang === "en" ? "Start typing…" : P.lang === "mon" ? "ချူညိ…" : "ရိုက်ပါ…";

  const badge = document.getElementById("langBadge");
  badge.className   = "lang-badge lb-" + P.lang;
  badge.textContent = LANG_NAMES[P.lang];

  // Mon keyboard toggle only in Mon mode
  const kbdBtn = document.getElementById("monKbdBtn");
  if (kbdBtn) kbdBtn.style.display = P.lang === "mon" ? "inline-flex" : "none";
  if (P.lang !== "mon") {
    const kbd = document.getElementById("monKbd");
    if (kbd && kbd.classList.contains("open")) { kbd.classList.remove("open"); kbdBtn.classList.remove("on"); }
  }

  const diffIdx = ["easy","medium","hard"].indexOf(P.diff);
  const hints   = ["Easy · Common words", "Medium · Extended vocabulary", "Hard · Complex text"];
  const modeTxt = P.mode === "words" && P.wordCount > 0 ? P.wordCount + " words" : P.mode;
  document.getElementById("diffHint").textContent = (hints[diffIdx] || hints[0]) + " · " + modeTxt;

  document.getElementById("mainCard").style.display    = "block";
  document.getElementById("actionRow").style.display   = "flex";
  document.getElementById("resultScreen").classList.remove("show");

  renderTyping();
  inp.focus();
}

function restartTest() { initTest(true); }
function newText()      { initTest(false); }

/* ----------------------------------------------------------
   INPUT HANDLER
---------------------------------------------------------- */
document.getElementById("typingInput").addEventListener("input", function() {
  if (P.finished) return;
  if (!P.started) {
    P.started = true; P.t0 = Date.now(); startTimer();
    const lw = document.getElementById("liveChartWrap");
    if (lw) lw.classList.add("active");
  }

  const val = this.value;
  if (!val.length) {
    P.cursor = 0;
    P.chars.forEach(c => c.ok = null);
    renderTyping();
    return;
  }
  if (val.length > P.chars.length) {
    this.value = val.slice(0, P.chars.length);
    return;
  }

  const i  = val.length - 1;
  const ok = val[i] === P.chars[i].ch;
  P.chars[i].ok = ok;
  P.cursor = val.length;
  P.keys++;
  ok ? (P.correct++, P.streak++) : (P.wrong++, P.streak = 0);
  playTick(ok);

  // Auto-advance to next passage when complete (word-count mode finishes instead)
  if (P.cursor >= P.chars.length) {
    if (P.mode === "words" && P.wordCount > 0) { finishTest(); return; }
    const count = P.mode === "sentences" ? sentencesForTime(P.time) : undefined;
    const t = getText(P.lang, P.diff, P.mode, count);
    P.text  = t;
    P.chars = [...t].map(ch => ({ ch, ok: null }));
    P.cursor = 0;
    setTimeout(() => { this.value = ""; renderTyping(); updateKeymap(); }, 60);
    return;
  }
  renderTyping();
  updateKeymap();
  updateStats();
});

document.getElementById("typingInput").addEventListener("keydown", function(e) {
  if (e.key === "Backspace") {
    const nl = Math.max(0, this.value.length - 1);
    if (nl < P.cursor && P.chars[nl]) {
      const prev = P.chars[nl].ok;
      if (prev === true)      P.correct = Math.max(0, P.correct - 1);
      else if (prev === false) P.wrong  = Math.max(0, P.wrong - 1);
      P.chars[nl].ok = null;
      P.cursor = nl;
      renderTyping();
      updateKeymap();
      updateStats();
    }
  }
  if (e.key === "Tab") { e.preventDefault(); restartTest(); }
});

/* ----------------------------------------------------------
   PILL GROUP CONTROLS
---------------------------------------------------------- */
function setupPillGroup(groupId, dataKey, callback) {
  document.querySelectorAll(`#${groupId} .pill-btn`).forEach(btn => {
    btn.addEventListener("click", function() {
      document.querySelectorAll(`#${groupId} .pill-btn`).forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      if (callback) callback(this.dataset[dataKey], this);
    });
  });
}

/* Persist the current practice settings for next visit */
function saveSettings() {
  LS.setSettings({ lang: P.lang, diff: P.diff, time: P.time, mode: P.mode, hl: P.hl, wordCount: P.wordCount, km: P.km });
}

/* Align pill highlight states with the current P settings */
function syncPills() {
  const map = { langGrp: "lang", timeGrp: "time", diffGrp: "diff", modeGrp: "mode", hlGrp: "hl", wordsGrp: "words" };
  Object.entries(map).forEach(([grp, key]) => {
    document.querySelectorAll(`#${grp} .pill-btn`).forEach(b => {
      b.classList.toggle("active", String(b.dataset[key]) === String(P[key]));
    });
  });
}

setupPillGroup("langGrp", "lang", v => { P.lang = v; initTest(false); saveSettings(); });
setupPillGroup("timeGrp", "time", v => { P.time = parseInt(v); P.wordCount = 0; syncPills(); initTest(false); saveSettings(); });
setupPillGroup("diffGrp", "diff", v => { P.diff = v; initTest(false); saveSettings(); });
setupPillGroup("hlGrp",   "hl",   v => { P.hl   = v; renderTyping(); saveSettings(); });
setupPillGroup("wordsGrp", "words", v => { P.wordCount = parseInt(v); initTest(false); saveSettings(); });
setupPillGroup("modeGrp", "mode", v => {
  P.mode = v;
  if (v === "custom") {
    const t = prompt("Paste your custom text:");
    if (t && t.trim()) {
      P.text  = t.trim();
      P.chars = [...P.text].map(ch => ({ ch, ok: null }));
      initTest(true);
    } else {
      P.mode = "words";
      document.querySelector("#modeGrp .pill-btn")?.classList.add("active");
    }
  } else {
    initTest(false);
  }
  saveSettings();
});

/* ----------------------------------------------------------
   MON VIRTUAL KEYBOARD
   Mon script needs a dedicated input layout, so we provide an
   on-screen reference keyboard that inserts characters directly
   into the typing input. Shown only in Mon language mode.
---------------------------------------------------------- */
const MON_KBD = {
  label: "Mon Alphabet",
  rows: [
    { name: "Consonants",
      keys: ["က","ခ","ဂ","ဃ","ၚ","စ","ဆ","ဇ","ၛ","ဉ","ည","ဋ","ဌ","ဍ","ဎ",
             "တ","ထ","ဒ","ဓ","န","ပ","ဖ","ဗ","ဘ","မ","ယ","ရ","လ","ဝ","သ","ဟ","ၠ","အ"] },
    { name: "Vowels & signs",
      keys: ["ာ","ါ","ိ","ီ","ု","ူ","ဳ","ဴ","ဵ","ဲ","ံ","့","း","ျ","ြ","ွ","ှ","်"] },
    { name: "Mon letters",
      keys: ["ၜ","ၝ","ၞ","ၟ","ၠ","ၐ","ၑ","ဣ","ဥ","ဦ","ဨ"] },
    { name: "Numbers & punctuation",
      keys: ["၀","၁","၂","၃","၄","၅","၆","၇","၈","၉","၊","။","၎"," ",
             { label: "⌫", cls: "mk-del", fn: "monDel" }] }
  ]
};

function renderMonKbd(id = "monKbd") {
  const el   = document.getElementById(id);
  const race = id === "raceMonKbd";
  el.innerHTML = `<div class="mon-kbd-title">${MON_KBD.label} — click a key to type</div>` +
    `<div class="mon-kbd-hint">Recommended keyboard: Mon Anonta (Keyman)</div>` +
    MON_KBD.rows.map(row => `
      <div class="mon-kbd-row">
        <span class="mon-kbd-group">${row.name}</span>
        ${row.keys.map(k => {
          if (typeof k === "string") return `<button class="mk" onclick="monKey('${k}', ${race})">${k === " " ? "␣" : k}</button>`;
          return `<button class="mk ${k.cls || ""}" onclick="${k.fn}(${race})">${k.label}</button>`;
        }).join("")}
      </div>`).join("");
}

function toggleMonKbd(race = false) {
  const kbd  = document.getElementById(race ? "raceMonKbd" : "monKbd");
  const btn  = document.getElementById(race ? "raceMonKbdBtn" : "monKbdBtn");
  const open = kbd.classList.toggle("open");
  btn.classList.toggle("on", open);
}

function monKey(ch, race = false) { mobileInsert(ch, race); }

function monDel(race = false)     { mobileBackspace(race); }

/* ----------------------------------------------------------
   MOBILE HELPERS
---------------------------------------------------------- */
function mobileInsert(ch, race = false) {
  const id  = race ? "raceInput" : "typingInput";
  const inp = document.getElementById(id);
  inp.value += ch;
  inp.dispatchEvent(new InputEvent("input", { bubbles: true, data: ch }));
  inp.focus();
}

function mobileBackspace(race = false) {
  const id  = race ? "raceInput" : "typingInput";
  const inp = document.getElementById(id);
  inp.value = inp.value.slice(0, -1);
  inp.dispatchEvent(new InputEvent("input", { bubbles: true }));
  inp.focus();
}

/* ----------------------------------------------------------
   SAVE MODAL
---------------------------------------------------------- */
function openSaveModal() {
  const info = document.getElementById("modalInfo");
  if (info && P.lastResult) {
    info.textContent = `${P.lastResult.wpm} WPM · ${P.lastResult.acc}% accuracy`;
  }
  document.getElementById("nameInput").value = "";
  document.getElementById("saveModal").classList.add("show");
  setTimeout(() => document.getElementById("nameInput").focus(), 100);
}

function closeModal(id) {
  document.getElementById(id).classList.remove("show");
}

function confirmSave() {
  const name = document.getElementById("nameInput").value.trim() || "Anonymous";
  if (!P.lastResult) return;
  LS.addLB({ name, ...P.lastResult });
  closeModal("saveModal");
  ["saveBtn", "raceSaveBtn"].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) { btn.textContent = "✓ Saved!"; btn.disabled = true; }
  });
}

document.getElementById("nameInput")
  .addEventListener("keydown", e => { if (e.key === "Enter") confirmSave(); });

/* Apply saved settings (language, difficulty, time, mode, highlight) */
(function applySettings() {
  const s = LS.getSettings();
  if (s.lang && ["en", "mm", "mon"].includes(s.lang)) P.lang = s.lang;
  if (s.diff && ["easy", "medium", "hard"].includes(s.diff)) P.diff = s.diff;
  if (s.time && [15, 30, 60, 120].includes(s.time)) P.time = s.time;
  if (s.mode && ["words", "sentences", "quotes"].includes(s.mode)) P.mode = s.mode;
  if (s.hl && ["char", "word"].includes(s.hl)) P.hl = s.hl;
  if (s.wordCount && [10, 25, 50].includes(s.wordCount)) P.wordCount = s.wordCount;
  if (typeof s.km === "boolean") P.km = s.km;
  syncPills();
})();

/* Render the Mon virtual keyboards once on load (practice + race) */
renderMonKbd();
renderMonKbd("raceMonKbd");
