/* ============================================================
   STATS.JS — Leaderboard & statistics view
   TypeCraft v2
   Depends on: data.js, storage.js
============================================================ */

/* ----------------------------------------------------------
   LEADERBOARD
---------------------------------------------------------- */
let lbFilter = "all";

function filterLB(el, filter) {
  document.querySelectorAll(".lb-filter").forEach(b => b.classList.remove("active"));
  el.classList.add("active");
  lbFilter = filter;
  renderLB();
}

function renderLB() {
  let data = LS.getLB();
  if (lbFilter !== "all") {
    data = data.filter(d => d.lang === lbFilter || d.diff === lbFilter);
  }
  data.sort((a, b) => b.wpm - a.wpm);

  const el = document.getElementById("lbBody");
  if (!data.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🏆</div>
      <p>No scores yet. Complete a session and save!</p>
    </div>`;
    return;
  }

  const rankCls   = ["gold","silver","bronze"];
  const rankIcons = ["🥇","🥈","🥉"];

  el.innerHTML = `<table class="lb-table">
    <thead>
      <tr>
        <th>#</th><th>Player</th><th>WPM</th><th>Accuracy</th>
        <th>Lang</th><th>Diff</th><th>Date</th>
      </tr>
    </thead>
    <tbody>
      ${data.slice(0, 25).map((r, i) => `
        <tr class="lb-row">
          <td><span class="lb-rank ${rankCls[i] || ""}">${rankIcons[i] || i + 1}</span></td>
          <td style="font-family:var(--sans);font-weight:700">${esc(r.name)}</td>
          <td><span class="lb-wpm">${r.wpm}</span></td>
          <td>${r.acc}%</td>
          <td><span class="pill pill-${r.lang}">${LANG_SHORT[r.lang] || r.lang}</span></td>
          <td><span class="pill pill-${r.diff}">${r.diff}</span></td>
          <td style="color:var(--text3);font-size:11px">${new Date(r.ts).toLocaleDateString()}</td>
        </tr>`).join("")}
    </tbody>
  </table>`;
}

function clearLB() {
  if (confirm("Clear all leaderboard entries?")) {
    LS.setLB([]);
    renderLB();
  }
}

/* ----------------------------------------------------------
   STATS VIEW
---------------------------------------------------------- */
function renderStats() {
  const h  = LS.getH();
  const el = document.getElementById("statsOverview");

  if (!h.length) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">📊</div>
      <p>No data yet. Complete sessions to see stats!</p>
    </div>`;
    document.getElementById("histBody").innerHTML = "";
    drawChart("wpmChart", [], [], "#a78bfa");
    drawChart("accChart", [], [], "#4ade80");
    return;
  }

  const wpms = h.map(x => x.wpm);
  const accs = h.map(x => x.acc);
  const best = Math.max(...wpms);
  const avg  = Math.round(wpms.reduce((a, b) => a + b, 0) / wpms.length);
  const bAcc = Math.max(...accs);
  const aAcc = Math.round(accs.reduce((a, b) => a + b, 0) / accs.length);
  const rec  = h.slice(0, 10);
  const rAvg = Math.round(rec.map(x => x.wpm).reduce((a, b) => a + b, 0) / rec.length);

  el.innerHTML = `
    <div class="big-stat"><div class="bsv">${best}</div><div class="bsl">Best WPM</div><div class="bss">All-time record</div></div>
    <div class="big-stat"><div class="bsv">${avg}</div><div class="bsl">Avg WPM</div><div class="bss">${h.length} sessions</div></div>
    <div class="big-stat"><div class="bsv">${bAcc}%</div><div class="bsl">Best Acc</div><div class="bss">Personal best</div></div>
    <div class="big-stat"><div class="bsv">${aAcc}%</div><div class="bsl">Avg Acc</div><div class="bss">Overall</div></div>
    <div class="big-stat"><div class="bsv">${h.length}</div><div class="bsl">Sessions</div><div class="bss">Total practice</div></div>
    <div class="big-stat"><div class="bsv">${rAvg}</div><div class="bsl">Recent</div><div class="bss">Last 10 avg WPM</div></div>`;

  const rev30 = h.slice(0, 30).reverse();
  drawChart("wpmChart", rev30.map((_, i) => i + 1), rev30.map(x => x.wpm), "#a78bfa");
  drawChart("accChart", rev30.map((_, i) => i + 1), rev30.map(x => x.acc), "#4ade80");

  document.getElementById("histBody").innerHTML = `
    <table class="hist-table">
      <thead>
        <tr><th>#</th><th>WPM</th><th>Acc</th><th>Lang</th><th>Diff</th><th>Date</th></tr>
      </thead>
      <tbody>
        ${h.slice(0, 20).map((x, i) => `
          <tr>
            <td style="color:var(--text3)">#${i + 1}</td>
            <td style="font-weight:600;color:var(--p)">${x.wpm}</td>
            <td>${x.acc}%</td>
            <td><span class="pill pill-${x.lang}">${LANG_SHORT[x.lang] || x.lang}</span></td>
            <td><span class="pill pill-${x.diff}">${x.diff}</span></td>
            <td style="color:var(--text3);font-size:11px">${new Date(x.ts).toLocaleDateString()}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
}

function clearHist() {
  if (confirm("Clear all session history?")) {
    LS.setH([]);
    renderStats();
  }
}

/* ----------------------------------------------------------
   CANVAS CHART
---------------------------------------------------------- */
function drawChart(canvasId, labels, data, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.parentElement.clientWidth || 600;
  const H   = 160;

  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + "px";
  canvas.style.height = H + "px";
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  if (!data.length) {
    ctx.fillStyle = "#4a4668";
    ctx.font      = "13px Outfit,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No data yet", W / 2, H / 2);
    return;
  }

  const pad = { t:12, r:16, b:28, l:38 };
  const cW  = W - pad.l - pad.r;
  const cH  = H - pad.t - pad.b;
  const max = Math.max(...data, 1);
  const min = Math.max(0, Math.min(...data) - 5);

  // Horizontal grid lines + Y labels
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth   = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + cH * i / 4;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cW, y); ctx.stroke();
    ctx.fillStyle = "#4a4668";
    ctx.font      = "10px 'JetBrains Mono',monospace";
    ctx.textAlign = "right";
    ctx.fillText(Math.round(max - (max - min) * i / 4), pad.l - 4, y + 4);
  }

  if (data.length < 2) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pad.l + cW / 2, pad.t + cH / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const xS  = cW / (data.length - 1);
  const pts = data.map((v, i) => ({
    x: pad.l + i * xS,
    y: pad.t + cH - ((v - min) / (max - min || 1)) * cH
  }));

  // Gradient fill
  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH);
  grad.addColorStop(0, color + "33");
  grad.addColorStop(1, color + "00");
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pad.t + cH);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, pad.t + cH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Smooth line
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2;
    ctx.bezierCurveTo(cx, pts[i - 1].y, cx, pts[i].y, pts[i].x, pts[i].y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Data points
  pts.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
}

/* Redraw charts on window resize */
window.addEventListener("resize", () => {
  const h = LS.getH();
  if (!h.length) return;
  const rev30 = h.slice(0, 30).reverse();
  drawChart("wpmChart", rev30.map((_, i) => i + 1), rev30.map(x => x.wpm), "#a78bfa");
  drawChart("accChart", rev30.map((_, i) => i + 1), rev30.map(x => x.acc), "#4ade80");
});
