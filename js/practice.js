/* ============================================================
   PRACTICE.JS — Practice/typing mode engine
   TypeCraft v2
   Depends on: data.js, audio.js, storage.js
============================================================ */

/* ----------------------------------------------------------
   PRACTICE STATE
---------------------------------------------------------- */
const P = {
  lang:"en", mode:"words", time:30, diff:"easy", hl:"char",
  text:"", chars:[], cursor:0,
  started:false, finished:false,
  timer:null, remaining:30,
  correct:0, wrong:0, keys:0, streak:0,
  t0:null, lastResult:null
};

/* ----------------------------------------------------------
   RENDERING
---------------------------------------------------------- */
function renderTyping() {
  if (P.hl === "word") { renderWordMode(); return; }
  const el = document.getElementById("textDisplay");
  el.className = "text-display" + (P.lang !== "en" ? " mm-font" : "");
  el.innerHTML = P.chars.map((c, i) => {
    let cls = "char";
    if (i < P.cursor) cls += c.ok ? " correct" : " wrong";
    else if (i === P.cursor) cls += " cursor";
    return `<span class="${cls}">${c.ch === " " ? "&nbsp;" : esc(c.ch)}</span>`;
  }).join("");
}

function renderWordMode() {
  const el = document.getElementById("textDisplay");
  el.className = "text-display" + (P.lang !== "en" ? " mm-font" : "");
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
}

/* ----------------------------------------------------------
   STATS BAR
---------------------------------------------------------- */
function updateStats() {
  const wpm = P.t0 ? calcWPM(P.correct, P.t0) : 0;
  const raw  = P.t0 ? calcWPM(P.keys, P.t0)   : 0;
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
    updateStats();
    if (P.remaining <= 0) finishTest();
  }, 1000);
}

/* ----------------------------------------------------------
   FINISH / RESULTS
---------------------------------------------------------- */
function finishTest() {
  if (P.timer) clearInterval(P.timer);
  P.finished = true;
  const { wpm, raw, acc } = updateStats();
  P.lastResult = { wpm, raw, acc, correct: P.correct, lang: P.lang, diff: P.diff, time: P.time };
  LS.addH({ wpm, raw, acc, lang: P.lang, diff: P.diff, mode: P.mode });
  playFinish();

  document.getElementById("mainCard").style.display  = "none";
  document.getElementById("actionRow").style.display = "none";
  const rs = document.getElementById("resultScreen");
  rs.classList.add("show");

  const trophy = wpm >= 100 ? "🏆" : wpm >= 60 ? "⭐" : wpm >= 30 ? "👍" : "💪";
  document.getElementById("rTrophy").textContent = trophy;
  document.getElementById("rTitle").textContent  = wpm >= 80 ? "Outstanding!" : wpm >= 50 ? "Great Work!" : "Keep Going!";
  document.getElementById("rSub").textContent    = LANG_SHORT[P.lang] + " · " + P.diff + " · " + P.time + "s";
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
  if (P.timer) clearInterval(P.timer);
  if (!keepText) {
    const t = getText(P.lang, P.diff, P.mode);
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

  document.getElementById("timeFill").style.width      = "100%";
  document.getElementById("timeFill").style.background = "var(--p)";
  document.getElementById("timeD").textContent         = P.time;

  ["wpmD","rawD","strD","chrD"].forEach(id =>
    document.getElementById(id).textContent = "0"
  );
  document.getElementById("accD").textContent = "100%";

  const inp = document.getElementById("typingInput");
  inp.value       = "";
  inp.className   = "typing-input" + (P.lang !== "en" ? " mm-font" : "");
  inp.placeholder = P.lang === "en" ? "Start typing…" : "ရိုက်ပါ…";

  const badge = document.getElementById("langBadge");
  badge.className   = "lang-badge lb-" + P.lang;
  badge.textContent = LANG_NAMES[P.lang];

  const diffIdx = ["easy","medium","hard"].indexOf(P.diff);
  const hints   = ["Easy · Common words", "Medium · Extended vocabulary", "Hard · Complex text"];
  document.getElementById("diffHint").textContent = (hints[diffIdx] || hints[0]) + " · " + P.mode;

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
  if (!P.started) { P.started = true; P.t0 = Date.now(); startTimer(); }

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

  // Auto-advance to next passage when complete
  if (P.cursor >= P.chars.length) {
    const t = getText(P.lang, P.diff, P.mode);
    P.text  = t;
    P.chars = [...t].map(ch => ({ ch, ok: null }));
    P.cursor = 0;
    setTimeout(() => { this.value = ""; renderTyping(); }, 60);
    return;
  }
  renderTyping();
  updateStats();
});

document.getElementById("typingInput").addEventListener("keydown", function(e) {
  if (e.key === "Backspace") {
    const nl = Math.max(0, this.value.length - 1);
    if (nl < P.cursor && P.chars[nl]) {
      P.chars[nl].ok = null;
      P.cursor = nl;
      renderTyping();
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

setupPillGroup("langGrp", "lang", v => { P.lang = v; initTest(false); });
setupPillGroup("timeGrp", "time", v => { P.time = parseInt(v); initTest(false); });
setupPillGroup("diffGrp", "diff", v => { P.diff = v; initTest(false); });
setupPillGroup("hlGrp",   "hl",   v => { P.hl   = v; renderTyping(); });
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
});

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
  const saveBtn = document.getElementById("saveBtn");
  saveBtn.textContent = "✓ Saved!";
  saveBtn.disabled    = true;
}

document.getElementById("nameInput")
  .addEventListener("keydown", e => { if (e.key === "Enter") confirmSave(); });
