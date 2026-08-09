/* ============================================================
   RACE.JS — Multiplayer race mode engine
   TypeCraft v2
   Depends on: data.js, audio.js
============================================================ */

/* ----------------------------------------------------------
   RACE STATE
---------------------------------------------------------- */
const R = {
  lang:"en", diff:"easy", bots:2,
  text:"", chars:[], cursor:0,
  started:false, finished:false,
  timer:null, remaining:120, t0:null,
  correct:0, keys:0,
  players:[],     // {name,color,emoji,progress,wpm,isUser,finished,finishTime}
  botIntervals:[],
  raceLen:0
};

/* ----------------------------------------------------------
   SETUP SCREEN
---------------------------------------------------------- */
function setupRace() {
  document.getElementById("raceSetup").style.display  = "block";
  document.getElementById("raceGame").style.display   = "none";
  document.getElementById("raceResult").classList.remove("show");
  R.bots = 2; R.lang = "en"; R.diff = "easy";
  renderPlayerCards();

  // Reset pill highlights
  const reset = (grp, attr, val) =>
    document.querySelectorAll(`#${grp} .pill-btn`).forEach(b => {
      b.classList.remove("active");
      if (b.dataset[attr] === val) b.classList.add("active");
    });
  reset("raceBotGrp",  "bots",  "2");
  reset("raceLangGrp", "rlang", "en");
  reset("raceDiffGrp", "rdiff", "easy");
}

function renderPlayerCards() {
  const pc = document.getElementById("racePlayerList");
  pc.innerHTML = "";
  const cards = [{ name:"You", isUser:true },
    ...Array.from({ length: R.bots }, (_, i) => ({ name: BOT_NAMES[i], isUser: false }))];
  cards.forEach((p, i) => {
    const d = document.createElement("div");
    d.className = "player-card" + (p.isUser ? " you" : "");
    d.innerHTML = `<div class="pc-name">${p.isUser ? "🧑 You" : BOT_EMOJIS[i - 1] + " " + p.name}</div>
                   <div class="pc-wpm">${p.isUser ? "Your score" : "AI opponent"}</div>`;
    pc.appendChild(d);
  });
}

/* Pill controls on the race setup screen */
(function bindRacePills() {
  const bind = (grp, key, cb) =>
    document.querySelectorAll(`#${grp} .pill-btn`).forEach(btn =>
      btn.addEventListener("click", function() {
        document.querySelectorAll(`#${grp} .pill-btn`).forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        if (cb) cb(this.dataset[key]);
      })
    );
  bind("raceLangGrp", "rlang", v => { R.lang = v; renderPlayerCards(); });
  bind("raceDiffGrp", "rdiff", v => { R.diff = v; });
  bind("raceBotGrp",  "bots",  v => { R.bots = parseInt(v); renderPlayerCards(); });
})();

/* ----------------------------------------------------------
   START RACE
---------------------------------------------------------- */
function startRace() {
  // Clean up previous race
  if (R.timer) clearInterval(R.timer);
  R.botIntervals.forEach(clearInterval);
  R.botIntervals = [];

  const t    = getText(R.lang, R.diff, "sentences");
  R.text     = t;
  R.chars    = [...t].map(ch => ({ ch, ok: null }));
  R.cursor   = 0;
  R.started  = false;
  R.finished = false;
  R.remaining = 120;
  R.t0       = null;
  R.correct  = R.keys = 0;
  R.raceLen  = [...t].length;

  // Build player list with bot speeds
  const diffSpeeds = { easy:[30,45], medium:[45,65], hard:[55,80] };
  const [lo, hi]   = diffSpeeds[R.diff] || [30, 45];
  R.players = [
    { name:"You", color:"var(--p)", emoji:"🧑",
      progress:0, wpm:0, isUser:true, finished:false, finishTime:null },
    ...Array.from({ length: R.bots }, (_, i) => ({
      name: BOT_NAMES[i], color: BOT_COLORS[i], emoji: BOT_EMOJIS[i],
      progress:0, wpm:0, isUser:false, finished:false, finishTime:null,
      speed: lo + Math.random() * (hi - lo) + (Math.random() * 10 - 5)
    }))
  ];

  // Switch views
  document.getElementById("raceSetup").style.display = "none";
  document.getElementById("raceGame").style.display  = "block";
  document.getElementById("raceResult").classList.remove("show");

  renderRaceTrack();
  renderRaceText();
  document.getElementById("raceInput").value     = "";
  document.getElementById("raceInput").className = "typing-input"
    + (R.lang !== "en" ? " mm-font" : "");

  // Countdown 3-2-1-GO
  let cnt = 3;
  const cd = document.getElementById("countdown");
  cd.classList.add("show");
  document.getElementById("countNum").textContent = cnt;

  const ci = setInterval(() => {
    cnt--;
    if (cnt > 0) {
      document.getElementById("countNum").textContent = cnt;
    } else {
      clearInterval(ci);
      document.getElementById("countNum").textContent = "GO!";
      setTimeout(() => cd.classList.remove("show"), 500);
      playRaceStart();
      document.getElementById("raceInput").focus();
      startRaceBots();
      startRaceTimer();
    }
  }, 1000);
}

/* ----------------------------------------------------------
   RACE TRACK RENDERING
---------------------------------------------------------- */
function renderRaceTrack() {
  const el = document.getElementById("raceTrack");
  el.innerHTML = "";
  R.players.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = `racer-row racer-${i}`;
    row.id = `racer-${i}`;
    row.innerHTML = `
      <div class="racer-name">${p.emoji} ${p.name}</div>
      <div class="racer-track" style="position:relative">
        <div class="racer-fill" id="rf-${i}" style="width:0%;background:${p.color}"></div>
      </div>
      <div class="racer-wpm" id="rw-${i}">0 wpm</div>`;
    el.appendChild(row);
  });
}

function updateRaceTrack() {
  R.players.forEach((p, i) => {
    const fill = document.getElementById(`rf-${i}`);
    const wpm  = document.getElementById(`rw-${i}`);
    if (fill) { fill.style.width = Math.min(100, p.progress) + "%"; fill.style.background = p.color; }
    if (wpm)  wpm.textContent = Math.round(p.wpm) + " wpm";
  });
  const td = document.getElementById("raceTimeD");
  const rf = document.getElementById("raceTimeFill");
  const rc = document.getElementById("raceTimeCount");
  if (td) td.textContent = R.remaining + "s";
  if (rf) rf.style.width = (R.remaining / 120 * 100) + "%";
  if (rc) rc.textContent = R.remaining;
}

function renderRaceText() {
  const el = document.getElementById("raceTextDisplay");
  el.className = "text-display" + (R.lang !== "en" ? " mm-font" : "");
  el.innerHTML = R.chars.map((c, i) => {
    let cls = "char";
    if (i < R.cursor)       cls += c.ok ? " correct" : " wrong";
    else if (i === R.cursor) cls += " cursor";
    return `<span class="${cls}">${c.ch === " " ? "&nbsp;" : esc(c.ch)}</span>`;
  }).join("");
}

/* ----------------------------------------------------------
   BOT AI
---------------------------------------------------------- */
function startRaceBots() {
  R.players.filter(p => !p.isUser).forEach(p => {
    const charsPerSec = p.speed / 60 * 5;
    let charsDone = 0;
    const iv = setInterval(() => {
      if (p.finished || R.finished) return;
      const jitter = (Math.random() - 0.4) * charsPerSec * 0.3;
      charsDone = Math.min(R.raceLen, charsDone + charsPerSec + jitter);
      p.progress = (charsDone / R.raceLen) * 100;
      const elapsed = R.t0 ? (Date.now() - R.t0) / 60000 : 0.001;
      p.wpm = elapsed > 0 ? Math.round((charsDone / 5) / elapsed) : 0;
      if (charsDone >= R.raceLen && !p.finished) {
        p.finished    = true;
        p.finishTime  = R.t0 ? ((Date.now() - R.t0) / 1000).toFixed(1) : null;
        p.progress    = 100;
        clearInterval(iv);
      }
      updateRaceTrack();
    }, 200);
    R.botIntervals.push(iv);
  });
}

/* ----------------------------------------------------------
   RACE TIMER
---------------------------------------------------------- */
function startRaceTimer() {
  if (R.timer) clearInterval(R.timer);
  R.remaining = 120;
  R.timer = setInterval(() => {
    R.remaining--;
    updateRaceTrack();
    if (R.remaining <= 0) finishRace();
  }, 1000);
}

/* ----------------------------------------------------------
   RACE INPUT HANDLER
---------------------------------------------------------- */
document.getElementById("raceInput").addEventListener("input", function() {
  if (R.finished) return;
  if (!R.started) { R.started = true; R.t0 = Date.now(); }

  const val = this.value;
  if (!val.length) { R.cursor = 0; R.chars.forEach(c => c.ok = null); renderRaceText(); return; }
  if (val.length > R.chars.length) { this.value = val.slice(0, R.chars.length); return; }

  const i  = val.length - 1;
  const ok = val[i] === R.chars[i].ch;
  R.chars[i].ok = ok;
  R.cursor = val.length;
  R.keys++;
  if (ok) R.correct++;
  playTick(ok);

  const pct = (R.cursor / R.raceLen) * 100;
  R.players[0].progress = pct;
  const el = (Date.now() - R.t0) / 60000;
  R.players[0].wpm = el > 0 ? Math.round((R.correct / 5) / el) : 0;

  updateRaceTrack();
  renderRaceText();

  if (R.cursor >= R.raceLen && !R.players[0].finished) {
    R.players[0].finished   = true;
    R.players[0].finishTime = R.t0 ? ((Date.now() - R.t0) / 1000).toFixed(1) : null;
    finishRace();
  }
});

/* ----------------------------------------------------------
   FINISH RACE
---------------------------------------------------------- */
function finishRace() {
  if (R.timer) clearInterval(R.timer);
  R.botIntervals.forEach(clearInterval);
  R.finished = true;
  R.players.forEach(p => { if (!p.finishTime) p.finishTime = null; });
  playFinish();
  setTimeout(showRaceResult, 600);
}

function showRaceResult() {
  document.getElementById("raceGame").style.display = "none";
  const rr = document.getElementById("raceResult");
  rr.classList.add("show");

  const sorted = [...R.players].sort((a, b) => {
    if (a.finished && !b.finished) return -1;
    if (!a.finished && b.finished) return 1;
    if (a.finished && b.finished) return parseFloat(a.finishTime) - parseFloat(b.finishTime);
    return b.progress - a.progress;
  });

  const userPlace = sorted.findIndex(p => p.isUser) + 1;
  document.getElementById("raceTrophy").textContent     = userPlace === 1 ? "🏆" : userPlace <= 3 ? "🥈" : "💨";
  document.getElementById("raceResultTitle").textContent =
    userPlace === 1 ? "You Won! 🏆" : userPlace <= 3 ? "Podium Finish!" : "Nice Race!";

  const podium = document.getElementById("racePodium");
  podium.innerHTML = "";
  const top3    = sorted.slice(0, 3);
  const display = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights  = ["50px","70px","35px"];
  const places   = ["🥈","🥇","🥉"];

  display.forEach((p, i) => {
    const slot = document.createElement("div");
    slot.className = "podium-slot";
    slot.innerHTML = `
      <div class="podium-place">${places[i]}</div>
      <div class="podium-name">${p.emoji} ${p.name}${p.isUser ? " (You)" : ""}</div>
      <div class="podium-wpm">${Math.round(p.wpm)} WPM</div>
      <div class="podium-bar" style="height:${heights[i]};background:${p.color}"></div>`;
    podium.appendChild(slot);
  });
}
