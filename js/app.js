/* ============================================================
   APP.JS — View router, theme switcher, init
   Monara Type v2
   Depends on: all other JS modules
============================================================ */

/* ----------------------------------------------------------
   VIEW ROUTER
---------------------------------------------------------- */
function gotoView(v) {
  // Pause/abort timers of the view being left so sessions don't run in the background
  const cur = document.querySelector(".view.active");
  if (cur) {
    if (cur.id === "view-typing" && P.timer) { clearInterval(P.timer); P.timer = null; }
    if (cur.id === "view-race") stopRace();
  }

  document.querySelectorAll(".view").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(el => el.classList.remove("active"));
  document.getElementById("view-" + v).classList.add("active");

  // Highlight the matching nav tab
  const keywords = { typing:["practice","⌨"], race:["race","🏎"], leaderboard:["board","🏆"], stats:["stat","📊"] };
  document.querySelectorAll(".nav-tab").forEach(el => {
    const t = el.textContent.toLowerCase();
    if ((keywords[v] || []).some(k => t.includes(k.toLowerCase()))) el.classList.add("active");
  });

  if (v === "typing" && P.started && !P.finished && !P.timer) startTimer();
  if (v === "leaderboard") renderLB();
  if (v === "stats")       renderStats();
  if (v === "race")        setupRace();
}

/* ----------------------------------------------------------
   THEME SYSTEM
   Themes: default | midnight | forest | sunset | rose | light | hacker
---------------------------------------------------------- */
const THEMES = [
  { id:"default",  name:"Dark Purple", sub:"Original",   dot:"#7c3aed" },
  { id:"ocean",    name:"Ocean",       sub:"Deep teal",  dot:"#0d9488" },
  { id:"neon",     name:"Neon",        sub:"Vivid purple", dot:"#a21caf" },
  { id:"ember",    name:"Ember",       sub:"Warm orange", dot:"#ea580c" },
  { id:"mint",     name:"Mint",        sub:"Fresh green", dot:"#10b981" },
  { id:"ice",      name:"Ice",         sub:"Cool cyan",  dot:"#06b6d4" },
  { id:"berry",    name:"Berry",       sub:"Deep magenta", dot:"#db2777" },
  { id:"midnight", name:"Midnight",    sub:"Deep blue",  dot:"#2563eb" },
  { id:"forest",   name:"Forest",      sub:"Dark green", dot:"#16a34a" },
  { id:"sunset",   name:"Sunset",      sub:"Warm amber", dot:"#d97706" },
  { id:"rose",     name:"Rose",        sub:"Pink/magenta", dot:"#db2777" },
  { id:"light",    name:"Light",       sub:"Clean white",  dot:"#6d28d9" },
  { id:"hacker",   name:"Hacker",      sub:"Terminal",   dot:"#00bb30" },
  { id:"classic",  name:"Classic",     sub:"Typewriter", dot:"#b45309" },
];

let currentTheme = "default";

function applyTheme(themeId) {
  currentTheme = themeId;
  document.body.className = themeId === "default" ? "" : "theme-" + themeId;
  LS.setTheme(themeId);
  // Update active swatch in panel (if open)
  document.querySelectorAll(".theme-swatch").forEach(s => {
    s.classList.toggle("active", s.dataset.theme === themeId);
  });
}

function openThemePanel() {
  const panel = document.getElementById("themePanel");
  const grid  = document.getElementById("themeGrid");

  // Build swatches
  const lightTheme = (id) => id === 'light' || id === 'classic';
  grid.innerHTML = THEMES.map(t => `
    <div class="theme-swatch ${t.id === currentTheme ? "active" : ""}"
         data-theme="${t.id}"
         style="background:${lightTheme(t.id) ? (t.id === 'classic' ? '#f3ead7' : '#f5f5f8') : '#0f0f1a'};
                border-color:${t.id === currentTheme ? t.dot : 'transparent'}"
         onclick="applyTheme('${t.id}')">
      <div class="ts-dot" style="background:${t.dot}"></div>
      <div class="ts-name" style="color:${lightTheme(t.id) ? '#1a1a2e' : '#ece9ff'}">${t.name}</div>
      <div class="ts-sub"  style="color:${lightTheme(t.id) ? '#7d6c50' : '#8b86aa'}">${t.sub}</div>
    </div>`).join("");

  panel.classList.add("show");
}

function closeThemePanel() {
  document.getElementById("themePanel").classList.remove("show");
}

// Close panel on backdrop click
document.getElementById("themePanel").addEventListener("click", function(e) {
  if (e.target === this) closeThemePanel();
});

/* ----------------------------------------------------------
   KEYBOARD SHORTCUTS (global)
   Tab  → restart practice (handled in practice.js)
   Esc  → close any open panel/modal
---------------------------------------------------------- */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeThemePanel();
    closeModal("saveModal");
  }
});

/* Pause timers while the tab is hidden so sessions don't drain */
document.addEventListener("visibilitychange", () => {
  const active = document.querySelector(".view.active");
  if (document.hidden) {
    if (P.timer) { clearInterval(P.timer); P.timer = null; }
    if (R.timer) { clearInterval(R.timer); R.timer = null; }
  } else {
    if (P.started && !P.finished && !P.timer && active && active.id === "view-typing") startTimer();
    if (R.started && !R.finished && !R.timer && active && active.id === "view-race") resumeRaceTimer();
  }
});

/* ----------------------------------------------------------
   BOOT / INIT
---------------------------------------------------------- */
(function boot() {
  // Restore saved theme
  const saved = LS.getTheme();
  if (saved && saved !== "default") applyTheme(saved);

  // Start practice view
  setupRace();
  initTest(false);
})();
