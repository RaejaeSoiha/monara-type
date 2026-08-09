/* ============================================================
   STORAGE.JS — localStorage wrapper
   Monara Type v2
   Keys:
     tc2_lb  — leaderboard entries  (array)
     tc2_h   — session history      (array, max 100)
     tc2_theme — saved theme name   (string)
============================================================ */

const LS = {
  /* ---- Leaderboard ---- */
  getLB()  { try { return JSON.parse(localStorage.getItem("tc2_lb") || "[]"); } catch { return []; } },
  setLB(d) { localStorage.setItem("tc2_lb", JSON.stringify(d)); },
  addLB(entry) {
    const lb = this.getLB();
    lb.push({ ...entry, ts: Date.now() });
    lb.sort((a, b) => b.wpm - a.wpm);
    this.setLB(lb);
  },

  /* ---- Session history ---- */
  getH()  { try { return JSON.parse(localStorage.getItem("tc2_h") || "[]"); } catch { return []; } },
  setH(d) { localStorage.setItem("tc2_h", JSON.stringify(d)); },
  addH(entry) {
    const h = this.getH();
    h.unshift({ ...entry, ts: Date.now() });
    if (h.length > 100) h.length = 100;
    this.setH(h);
  },

   /* ---- Theme preference ---- */
  getTheme()      { return localStorage.getItem("tc2_theme") || "default"; },
  setTheme(name)  { localStorage.setItem("tc2_theme", name); },

  /* ---- Saved practice settings ---- */
  getSettings() { try { return JSON.parse(localStorage.getItem("tc2_settings") || "{}"); } catch { return {}; } },
  setSettings(s) { localStorage.setItem("tc2_settings", JSON.stringify(s)); },

  /* ---- Sound preference ---- */
  sound: {
    get() { return localStorage.getItem("tc2_sound") === "1"; },
    set(v) { localStorage.setItem("tc2_sound", v ? "1" : "0"); }
  },

  /* ---- Daily streak ---- */
  streak: {
    get() {
      try {
        return JSON.parse(localStorage.getItem("tc2_streak") || '{"count":0,"last":null}');
      } catch { return { count: 0, last: null }; }
    },
    set(s) { localStorage.setItem("tc2_streak", JSON.stringify(s)); }
  },
  recordStreak() {
    const s  = this.streak.get();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const t  = today.getTime();
    const y  = t - 86400000;
    if (s.last === t) return s.count;            // already counted today
    s.count = (s.last === y) ? s.count + 1 : 1;  // consecutive or reset
    s.last  = t;
    this.streak.set(s);
    return s.count;
  }
};
