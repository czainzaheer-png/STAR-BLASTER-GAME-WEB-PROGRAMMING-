// ---------- game.js ----------
// Core game engine: the main loop, spawning logic, collision detection,
// and overall state management for Star Blaster.

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = new AudioEngine();

    this.state = 'start'; // start | playing | paused | gameover
    this.keys = {};
    this.pointer = { active: false, x: 0, y: 0 };

    this.stars = [];
    this.bullets = [];
    this.enemies = [];
    this.powerups = [];
    this.particles = [];

    this.score = 0;
    this.highScore = Utils.storageGet('sb_highscore', 0);
    this.wave = 1;
    this.spawnTimer = 0;
    this.spawnedThisWave = 0;
    this.waveEnemyTarget = 6;
    this.bossActive = false;
    this.lastTime = 0;

    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._bindInput();

    for (let i = 0; i < 90; i++) this.stars.push(new Star(this.w, this.h));

    requestAnimationFrame((t) => this._loop(t));
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _bindInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyP') this.togglePause();
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    this.canvas.addEventListener('mousemove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.pointer.x = e.clientX - r.left;
      this.pointer.y = e.clientY - r.top;
      this.pointer.active = true;
    });
    this.canvas.addEventListener('mousedown', () => { this.pointer.firing = true; });
    window.addEventListener('mouseup', () => { this.pointer.firing = false; });

    // Touch stick
    const stick = document.getElementById('touchStick');
    const knob = document.getElementById('touchStickKnob');
    let stickActive = false, stickOrigin = { x: 0, y: 0 };
    const stickMax = 40;

    const stickStart = (e) => {
      stickActive = true;
      const t = e.touches[0];
      const r = stick.getBoundingClientRect();
      stickOrigin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const stickMove = (e) => {
      if (!stickActive) return;
      const t = e.touches[0];
      let dx = t.clientX - stickOrigin.x;
      let dy = t.clientY - stickOrigin.y;
      const d = Math.min(Math.hypot(dx, dy), stickMax);
      const ang = Math.atan2(dy, dx);
      dx = Math.cos(ang) * d; dy = Math.sin(ang) * d;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.touchVector = { x: dx / stickMax, y: dy / stickMax };
      e.preventDefault();
    };
    const stickEnd = () => {
      stickActive = false;
      knob.style.transform = 'translate(0,0)';
      this.touchVector = { x: 0, y: 0 };
    };
    stick.addEventListener('touchstart', stickStart, { passive: false });
    stick.addEventListener('touchmove', stickMove, { passive: false });
    stick.addEventListener('touchend', stickEnd);
    stick.addEventListener('touchcancel', stickEnd);

    const fireBtn = document.getElementById('touchFire');
    fireBtn.addEventListener('touchstart', (e) => { this.touchFiring = true; e.preventDefault(); }, { passive: false });
    fireBtn.addEventListener('touchend', () => { this.touchFiring = false; });
  }

  reset() {
    this.player = new Player(this.w, this.h);
    this.bullets = [];
    this.enemies = [];
    this.powerups = [];
    this.particles = [];
    this.score = 0;
    this.wave = 1;
    this.spawnTimer = 0;
    this.spawnedThisWave = 0;
    this.waveEnemyTarget = 6;
    this.bossActive = false;
    this.state = 'playing';
    this._announceWave();
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      document.getElementById('pauseScreen').classList.remove('hidden');
    } else if (this.state === 'paused') {
      this.state = 'playing';
      document.getElementById('pauseScreen').classList.add('hidden');
    }
  }

  _announceWave() {
    const banner = document.getElementById('waveBanner');
    banner.textContent = this.wave % 5 === 0 ? `⚠ BOSS WAVE ${this.wave} ⚠` : `WAVE ${this.wave}`;
    banner.classList.remove('hidden');
    banner.style.animation = 'none';
    void banner.offsetWidth;
    banner.style.animation = '';
    this.audio.waveStart();
    if (this.wave % 5 === 0) this.audio.boss();
  }

  _spawnEnemy() {
    const scale = 1 + (this.wave - 1) * 0.18;
    const isBossWave = this.wave % 5 === 0;

    if (isBossWave && !this.bossActive && this.spawnedThisWave === 0) {
      this.enemies.push(new Enemy(this.w / 2, -60, 'boss', 1 + (this.wave / 5 - 1) * 0.6));
      this.bossActive = true;
      this.spawnedThisWave = this.waveEnemyTarget; // no more regular spawns this wave
      return;
    }
    if (isBossWave) return;

    const roll = Math.random();
    let type = 'grunt';
    if (roll > 0.85) type = 'tank';
    else if (roll > 0.55) type = 'striker';

    const x = Utils.rand(40, this.w - 40);
    this.enemies.push(new Enemy(x, -40, type, scale));
    this.spawnedThisWave++;
  }

  _update(dt) {
    if (this.state !== 'playing') return;

    this.stars.forEach(s => s.update(dt, this.w, this.h));

    // ---- input / movement ----
    const p = this.player;
    let mx = 0, my = 0;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) mx -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) mx += 1;
    if (this.keys['ArrowUp'] || this.keys['KeyW']) my -= 1;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) my += 1;
    if (this.touchVector) { mx += this.touchVector.x; my += this.touchVector.y; }

    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my) || 1;
      p.x += (mx / len) * p.speed * dt;
      p.y += (my / len) * p.speed * dt;
    } else if (this.pointer.active && !this.touchVector) {
      p.x = Utils.lerp(p.x, this.pointer.x, Math.min(1, dt * 10));
      p.y = Utils.lerp(p.y, this.pointer.y, Math.min(1, dt * 10));
    }
    p.update(dt, { w: this.w, h: this.h });

    const wantsFire = this.keys['Space'] || this.pointer.firing || this.touchFiring;
    if (wantsFire && p.canFire()) p.fire(this.bullets, this.audio);

    // ---- spawn logic ----
    if (!this.bossActive) {
      this.spawnTimer -= dt;
      const interval = Math.max(0.35, 1.1 - this.wave * 0.04);
      if (this.spawnTimer <= 0 && this.spawnedThisWave < this.waveEnemyTarget) {
        this._spawnEnemy();
        this.spawnTimer = interval;
      }
    }
    if (this.spawnedThisWave >= this.waveEnemyTarget && this.enemies.length === 0) {
      this.wave++;
      this.waveEnemyTarget = 6 + this.wave * 2;
      this.spawnedThisWave = 0;
      this.bossActive = false;
      this._announceWave();
    }

    // ---- update entities ----
    this.bullets.forEach(b => b.update(dt, this.w, this.h));
    this.bullets = this.bullets.filter(b => !b.dead);

    this.enemies.forEach(e => e.update(dt, { w: this.w, h: this.h }, this.bullets, this.audio));

    this.powerups.forEach(pu => pu.update(dt, { w: this.w, h: this.h }));
    this.powerups = this.powerups.filter(pu => !pu.dead);

    this.particles.forEach(pt => pt.update(dt));
    this.particles = this.particles.filter(pt => !pt.dead);

    this._handleCollisions();

    this.enemies = this.enemies.filter(e => !e.dead);

    // update HUD
    document.getElementById('scoreVal').textContent = this.score;
    document.getElementById('waveVal').textContent = this.wave;
    document.getElementById('livesVal').textContent = '❤'.repeat(Math.max(0, p.lives));

    if (p.lives <= 0) this._gameOver();
  }

  _spawnExplosion(x, y, color, count = 16) {
    for (let i = 0; i < count; i++) this.particles.push(new Particle(x, y, color));
    this.audio.explosion();
  }

  _handleCollisions() {
    const p = this.player;

    // player bullets vs enemies
    for (const b of this.bullets) {
      if (!b.fromPlayer || b.dead) continue;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Utils.circleHit(b.x, b.y, b.radius, e.x, e.y, e.radius)) {
          b.dead = true;
          e.hit(b.damage);
          this.audio.hit();
          if (e.dead) {
            this.score += e.score;
            this._spawnExplosion(e.x, e.y, e.color, e.type === 'boss' ? 60 : 16);
            if (e.type === 'boss') this.bossActive = false;
            if (Math.random() < (e.type === 'boss' ? 1 : 0.16)) {
              this.powerups.push(new PowerUp(e.x, e.y));
            }
          }
          break;
        }
      }
    }

    // enemy bullets vs player
    for (const b of this.bullets) {
      if (b.fromPlayer || b.dead) continue;
      if (Utils.circleHit(b.x, b.y, b.radius, p.x, p.y, p.radius)) {
        b.dead = true;
        if (p.takeHit()) {
          this._spawnExplosion(p.x, p.y, '#ff5050', 10);
        }
      }
    }

    // enemies colliding with player (ram damage)
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Utils.circleHit(e.x, e.y, e.radius, p.x, p.y, p.radius)) {
        e.hit(999);
        this._spawnExplosion(e.x, e.y, e.color, 14);
        if (p.takeHit()) this._spawnExplosion(p.x, p.y, '#ff5050', 10);
      }
    }

    // powerups vs player
    for (const pu of this.powerups) {
      if (pu.dead) continue;
      if (Utils.circleHit(pu.x, pu.y, pu.radius, p.x, p.y, p.radius)) {
        pu.dead = true;
        this.audio.powerup();
        if (pu.type === 'shield') p.shieldTime = 6;
        else if (pu.type === 'rapid') p.rapidTime = 7;
        else if (pu.type === 'multi') p.multiTime = 8;
        else if (pu.type === 'life') p.lives = Math.min(p.lives + 1, 9);
      }
    }
  }

  _gameOver() {
    this.state = 'gameover';
    this.audio.gameOver();
    if (this.score > this.highScore) {
      this.highScore = this.score;
      Utils.storageSet('sb_highscore', this.highScore);
      document.getElementById('newHighBadge').classList.remove('hidden');
    } else {
      document.getElementById('newHighBadge').classList.add('hidden');
    }
    document.getElementById('finalScore').textContent = this.score;
    document.getElementById('highScoreVal').textContent = this.highScore;
    document.getElementById('gameOverScreen').classList.remove('hidden');
  }

  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    this.stars.forEach(s => s.draw(ctx));

    if (this.state === 'playing' || this.state === 'paused') {
      this.powerups.forEach(pu => pu.draw(ctx));
      this.enemies.forEach(e => e.draw(ctx));
      this.bullets.forEach(b => b.draw(ctx));
      this.particles.forEach(pt => pt.draw(ctx));
      if (this.player) this.player.draw(ctx);
    }
  }

  _loop(timestamp) {
    const dt = Math.min(0.033, (timestamp - this.lastTime) / 1000 || 0);
    this.lastTime = timestamp;

    this._update(dt);
    this._draw();

    requestAnimationFrame((t) => this._loop(t));
  }
}
