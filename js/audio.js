/* ============================================================
   AUDIO.JS — Web Audio sound engine
   TypeCraft v2
============================================================ */

let _audioCtx = null;
let soundOn   = false;

function _getCtx() {
  if (!_audioCtx)
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

/** Play a click tick — green = correct, red = wrong */
function playTick(correct = true) {
  if (!soundOn) return;
  try {
    const ctx  = _getCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = correct ? "triangle" : "sawtooth";
    osc.frequency.setValueAtTime(correct ? 800 : 220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(correct ? 1200 : 180, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(correct ? 0.06 : 0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.07);
  } catch(e) {}
}

/** Upward arpeggio on test finish */
function playFinish() {
  if (!soundOn) return;
  try {
    const ctx  = _getCtx();
    const notes = [523, 659, 784, 1047];
    [0, 0.1, 0.2, 0.35].forEach((t, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(notes[i], ctx.currentTime + t);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.2);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.22);
    });
  } catch(e) {}
}

/** 3-2-1-GO beeps for race countdown */
function playRaceStart() {
  if (!soundOn) return;
  try {
    const ctx   = _getCtx();
    const freqs = [400, 400, 400, 800];
    [0, 0.15, 0.3, 0.45].forEach((t, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.value = freqs[i];
      gain.gain.setValueAtTime(0.08, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.12);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.14);
    });
  } catch(e) {}
}

/** Toggle sound on/off — call from the sound button */
function toggleSound() {
  soundOn = !soundOn;
  const btn = document.getElementById("soundBtn");
  if (!btn) return;
  btn.textContent = soundOn ? "🔊 Sound" : "🔇 Sound";
  btn.className   = "sound-btn" + (soundOn ? " on" : "");
  if (soundOn) _getCtx(); // warm-up AudioContext on user gesture
}
