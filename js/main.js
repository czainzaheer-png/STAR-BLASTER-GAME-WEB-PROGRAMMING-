// ---------- main.js ----------
// Entry point: creates the Game instance and wires up all UI screen buttons.

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const game = new Game(canvas);

  const startScreen = document.getElementById('startScreen');
  const howToScreen = document.getElementById('howToScreen');
  const pauseScreen = document.getElementById('pauseScreen');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const waveBanner = document.getElementById('waveBanner');

  document.getElementById('startHighScore').textContent = game.highScore;
  document.getElementById('highScoreVal').textContent = game.highScore;

  function hideAllOverlays() {
    [startScreen, howToScreen, pauseScreen, gameOverScreen].forEach(el => el.classList.add('hidden'));
  }

  document.getElementById('startBtn').addEventListener('click', () => {
    hideAllOverlays();
    game.reset();
  });

  document.getElementById('howToBtn').addEventListener('click', () => {
    startScreen.classList.add('hidden');
    howToScreen.classList.remove('hidden');
  });

  document.getElementById('backBtn').addEventListener('click', () => {
    howToScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
  });

  document.getElementById('pauseBtn').addEventListener('click', () => {
    if (game.state === 'playing' || game.state === 'paused') game.togglePause();
  });

  document.getElementById('resumeBtn').addEventListener('click', () => game.togglePause());

  document.getElementById('restartFromPauseBtn').addEventListener('click', () => {
    pauseScreen.classList.add('hidden');
    game.reset();
  });

  document.getElementById('restartBtn').addEventListener('click', () => {
    hideAllOverlays();
    game.reset();
  });

  document.getElementById('muteBtn').addEventListener('click', (e) => {
    const muted = game.audio.toggleMute();
    e.target.textContent = muted ? '🔇' : '🔊';
  });

  // Hide the wave banner element after its CSS animation completes each time it's shown.
  const bannerObserver = new MutationObserver(() => {
    if (!waveBanner.classList.contains('hidden')) {
      clearTimeout(waveBanner._hideTimeout);
      waveBanner._hideTimeout = setTimeout(() => waveBanner.classList.add('hidden'), 1600);
    }
  });
  bannerObserver.observe(waveBanner, { childList: true, characterData: true, subtree: true });

  // Patch _announceWave to also reveal the banner element reliably (in case text is unchanged).
  const originalAnnounce = game._announceWave.bind(game);
  game._announceWave = function () {
    originalAnnounce();
    waveBanner.classList.remove('hidden');
    clearTimeout(waveBanner._hideTimeout);
    waveBanner._hideTimeout = setTimeout(() => waveBanner.classList.add('hidden'), 1600);
  };

  // Resume/suspend audio context on first user gesture (autoplay policies).
  const resumeAudio = () => { game.audio._ensureCtx(); window.removeEventListener('pointerdown', resumeAudio); };
  window.addEventListener('pointerdown', resumeAudio);

  // Prevent space/arrow keys from scrolling the page.
  window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  }, { passive: false });
});
