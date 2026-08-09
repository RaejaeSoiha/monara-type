/* ============================================================
   STORAGE.JS — localStorage wrapper
   TypeCraft v2
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
  setTheme(name)  { localStorage.setItem("tc2_theme", name); }
};
