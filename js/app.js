/* ============================================================
   APP.JS — View router, theme switcher, init
   TypeCraft v2
   Depends on: all other JS modules
============================================================ */

/* ----------------------------------------------------------
   VIEW ROUTER
---------------------------------------------------------- */
function gotoView(v) {
  document.querySelectorAll(".view").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(el => el.classList.remove("active"));
  document.getElementById("view-" + v).classList.add("active");

  // Highlight the matching nav tab
  const keywords = { typing:["practice","⌨"], race:["race","🏎"], leaderboard:["board","🏆"], stats:["stat","📊"] };
  document.querySelectorAll(".nav-tab").forEach(el => {
    const t = el.textContent.toLowerCase();
    if ((keywords[v] || []).some(k => t.includes(k.toLowerCase()))) el.classList.add("active");
  });

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
  { id:"midnight", name:"Midnight",    sub:"Deep blue",  dot:"#2563eb" },
  { id:"forest",   name:"Forest",      sub:"Dark green", dot:"#16a34a" },
  { id:"sunset",   name:"Sunset",      sub:"Warm amber", dot:"#d97706" },
  { id:"rose",     name:"Rose",        sub:"Pink/magenta", dot:"#db2777" },
  { id:"light",    name:"Light",       sub:"Clean white",  dot:"#6d28d9" },
  { id:"hacker",   name:"Hacker",      sub:"Terminal",   dot:"#00bb30" },
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
  grid.innerHTML = THEMES.map(t => `
    <div class="theme-swatch ${t.id === currentTheme ? "active" : ""}"
         data-theme="${t.id}"
         style="background:${t.id === 'light' ? '#f5f5f8' : '#0f0f1a'};
                border-color:${t.id === currentTheme ? t.dot : 'transparent'}"
         onclick="applyTheme('${t.id}')">
      <div class="ts-dot" style="background:${t.dot}"></div>
      <div class="ts-name" style="color:${t.id === 'light' ? '#1a1a2e' : '#ece9ff'}">${t.name}</div>
      <div class="ts-sub"  style="color:${t.id === 'light' ? '#4a4a6a' : '#8b86aa'}">${t.sub}</div>
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
