// ---------- utils.js ----------
// Small shared helper functions used across the game.

const Utils = {
  rand(min, max) {
    return Math.random() * (max - min) + min;
  },
  randInt(min, max) {
    return Math.floor(this.rand(min, max + 1));
  },
  clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  },
  dist(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },
  circleHit(ax, ay, ar, bx, by, br) {
    return this.dist(ax, ay, bx, by) < ar + br;
  },
  lerp(a, b, t) {
    return a + (b - a) * t;
  },
  choice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },
  storageGet(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  },
  storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* storage unavailable, ignore */ }
  }
};
