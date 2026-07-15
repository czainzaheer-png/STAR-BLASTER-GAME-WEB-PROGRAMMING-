// ---------- audio.js ----------
// Lightweight synthesized sound effects via the Web Audio API.
// No external audio files are required, so the game works fully offline.

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = Utils.storageGet('sb_muted', false);
    this.masterGain = null;
  }

  _ensureCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.35;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    Utils.storageSet('sb_muted', this.muted);
    if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  _tone(freq, duration, type = 'square', startGain = 0.6, glideTo = null) {
    if (this.muted) return;
    this._ensureCtx();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (glideTo) {
      osc.frequency.exponentialRampToValueAtTime(glideTo, this.ctx.currentTime + duration);
    }
    gain.gain.setValueAtTime(startGain, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  _noise(duration, startGain = 0.4) {
    if (this.muted) return;
    this._ensureCtx();
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(startGain, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    src.connect(gain);
    gain.connect(this.masterGain);
    src.start();
  }

  shoot() { this._tone(880, 0.08, 'square', 0.25, 440); }
  enemyShoot() { this._tone(220, 0.12, 'sawtooth', 0.2, 120); }
  explosion() { this._noise(0.35, 0.5); }
  hit() { this._tone(150, 0.15, 'sawtooth', 0.4, 60); }
  powerup() { this._tone(523, 0.08, 'sine', 0.4, 1046); }
  gameOver() { this._tone(300, 0.6, 'sawtooth', 0.4, 60); }
  waveStart() { this._tone(660, 0.2, 'triangle', 0.3, 990); }
  boss() { this._tone(110, 0.5, 'sawtooth', 0.5, 55); }
}
