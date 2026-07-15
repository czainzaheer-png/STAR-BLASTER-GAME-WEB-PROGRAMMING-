// ---------- entities.js ----------
// All the game object classes: Player, Bullet, Enemy, PowerUp, Particle, Star.

class Star {
  constructor(w, h) {
    this.reset(w, h, true);
  }
  reset(w, h, initial = false) {
    this.x = Utils.rand(0, w);
    this.y = initial ? Utils.rand(0, h) : -4;
    this.size = Utils.rand(0.6, 2.4);
    this.speed = Utils.rand(30, 140);
  }
  update(dt, w, h) {
    this.y += this.speed * dt;
    if (this.y > h + 4) this.reset(w, h);
  }
  draw(ctx) {
    ctx.globalAlpha = 0.4 + this.size / 3;
    ctx.fillStyle = '#dfefff';
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

class Particle {
  constructor(x, y, color) {
    this.x = x; this.y = y;
    const angle = Utils.rand(0, Math.PI * 2);
    const speed = Utils.rand(40, 240);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = Utils.rand(0.3, 0.7);
    this.age = 0;
    this.size = Utils.rand(1.5, 4);
    this.color = color;
  }
  update(dt) {
    this.age += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.94;
    this.vy *= 0.94;
  }
  get dead() { return this.age >= this.life; }
  draw(ctx) {
    const t = 1 - this.age / this.life;
    ctx.globalAlpha = Utils.clamp(t, 0, 1);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * t, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class Bullet {
  constructor(x, y, vx, vy, opts = {}) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.radius = opts.radius || 4;
    this.color = opts.color || '#4df3ff';
    this.fromPlayer = opts.fromPlayer !== false;
    this.damage = opts.damage || 1;
    this.dead = false;
  }
  update(dt, w, h) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y < -20 || this.y > h + 20 || this.x < -20 || this.x > w + 20) this.dead = true;
  }
  draw(ctx) {
    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.radius, this.radius * 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Player {
  constructor(w, h) {
    this.w = 44; this.h = 44;
    this.x = w / 2;
    this.y = h - 90;
    this.speed = 420;
    this.radius = 16;
    this.cooldown = 0;
    this.fireRate = 0.26;
    this.lives = 3;
    this.invuln = 0;
    this.shieldTime = 0;
    this.rapidTime = 0;
    this.multiTime = 0;
    this.thrusterPhase = 0;
  }
  get isShielded() { return this.shieldTime > 0; }
  update(dt, bounds) {
    this.x = Utils.clamp(this.x, this.w / 2, bounds.w - this.w / 2);
    this.y = Utils.clamp(this.y, this.h / 2, bounds.h - this.h / 2);
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.shieldTime > 0) this.shieldTime -= dt;
    if (this.rapidTime > 0) this.rapidTime -= dt;
    if (this.multiTime > 0) this.multiTime -= dt;
    this.thrusterPhase += dt * 12;
  }
  canFire() { return this.cooldown <= 0; }
  fire(bulletList, audio) {
    const rate = this.rapidTime > 0 ? this.fireRate * 0.4 : this.fireRate;
    this.cooldown = rate;
    const baseSpeed = -820;
    if (this.multiTime > 0) {
      bulletList.push(new Bullet(this.x - 14, this.y - 20, -40, baseSpeed, { color: '#4df3ff' }));
      bulletList.push(new Bullet(this.x, this.y - 26, 0, baseSpeed, { color: '#4df3ff' }));
      bulletList.push(new Bullet(this.x + 14, this.y - 20, 40, baseSpeed, { color: '#4df3ff' }));
    } else {
      bulletList.push(new Bullet(this.x, this.y - 26, 0, baseSpeed, { color: '#4df3ff' }));
    }
    audio.shoot();
  }
  takeHit() {
    if (this.invuln > 0 || this.isShielded) return false;
    this.lives -= 1;
    this.invuln = 1.6;
    return true;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.invuln > 0 && Math.floor(this.invuln * 14) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }
    // thruster flame
    const flameLen = 10 + Math.sin(this.thrusterPhase) * 4;
    const flameGrad = ctx.createLinearGradient(0, 14, 0, 14 + flameLen);
    flameGrad.addColorStop(0, '#ffe14d');
    flameGrad.addColorStop(1, 'rgba(255,60,60,0)');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(-8, 14);
    ctx.lineTo(8, 14);
    ctx.lineTo(0, 14 + flameLen);
    ctx.closePath();
    ctx.fill();

    // ship body
    ctx.shadowColor = '#4df3ff';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#e8fbff';
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(16, 16);
    ctx.lineTo(6, 10);
    ctx.lineTo(0, 16);
    ctx.lineTo(-6, 10);
    ctx.lineTo(-16, 16);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#4df3ff';
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(8, 4);
    ctx.lineTo(-8, 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ff3c9c';
    ctx.beginPath();
    ctx.arc(0, -4, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (this.isShielded) {
      ctx.save();
      ctx.strokeStyle = 'rgba(77,243,255,0.8)';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#4df3ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

const ENEMY_TYPES = {
  grunt: { hp: 1, speed: 70, radius: 15, score: 10, color: '#ff3c9c', fireRate: 2.6 },
  striker: { hp: 2, speed: 110, radius: 16, score: 20, color: '#9b5cff', fireRate: 1.8 },
  tank: { hp: 4, speed: 45, radius: 22, score: 40, color: '#ffe14d', fireRate: 3.2 },
  boss: { hp: 60, speed: 30, radius: 46, score: 500, color: '#ff2e2e', fireRate: 0.5 }
};

class Enemy {
  constructor(x, y, type, waveScale = 1) {
    const def = ENEMY_TYPES[type];
    this.type = type;
    this.x = x; this.y = y;
    this.radius = def.radius;
    this.hp = Math.ceil(def.hp * waveScale);
    this.maxHp = this.hp;
    this.speed = def.speed;
    this.score = def.score;
    this.color = def.color;
    this.fireTimer = Utils.rand(0.5, def.fireRate);
    this.fireRate = def.fireRate;
    this.dead = false;
    this.phase = Utils.rand(0, Math.PI * 2);
    this.entryY = y;
    this.vx = Utils.choice([-1, 1]) * Utils.rand(20, 60);
  }
  update(dt, bounds, bulletList, audio) {
    this.phase += dt * 1.6;
    if (this.type === 'boss') {
      this.x += Math.sin(this.phase) * 60 * dt;
      if (this.y < 120) this.y += this.speed * dt;
    } else {
      this.y += this.speed * dt;
      this.x += Math.sin(this.phase) * 30 * dt;
    }
    this.x = Utils.clamp(this.x, this.radius, bounds.w - this.radius);

    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && this.y > 0 && this.y < bounds.h - 60) {
      this.fireTimer = this.fireRate + Utils.rand(-0.4, 0.4);
      const dx = 0, dy = 1;
      bulletList.push(new Bullet(this.x, this.y + this.radius, dx * 260, dy * 260, {
        color: '#ff5050', fromPlayer: false, radius: 4
      }));
      audio.enemyShoot();
    }
    if (this.y - this.radius > bounds.h) this.dead = true;
  }
  hit(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0) this.dead = true;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = this.color;

    if (this.type === 'boss') {
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius, this.radius * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b0000';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, this.radius);
      ctx.lineTo(this.radius, -this.radius * 0.6);
      ctx.lineTo(0, -this.radius * 0.1);
      ctx.lineTo(-this.radius, -this.radius * 0.6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // health bar for tougher enemies
    if (this.maxHp > 1) {
      const barW = this.radius * 2;
      const pct = Utils.clamp(this.hp / this.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 12, barW, 4);
      ctx.fillStyle = pct > 0.4 ? '#4dff88' : '#ff4d4d';
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 12, barW * pct, 4);
    }
  }
}

const POWERUP_TYPES = ['shield', 'rapid', 'multi', 'life'];
const POWERUP_META = {
  shield: { color: '#4df3ff', icon: '🛡' },
  rapid: { color: '#ffe14d', icon: '⚡' },
  multi: { color: '#9b5cff', icon: '✳' },
  life: { color: '#ff3c9c', icon: '❤' }
};

class PowerUp {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.type = Utils.choice(POWERUP_TYPES);
    this.radius = 14;
    this.speed = 90;
    this.dead = false;
    this.phase = Utils.rand(0, Math.PI * 2);
  }
  update(dt, bounds) {
    this.y += this.speed * dt;
    this.phase += dt * 4;
    if (this.y - this.radius > bounds.h) this.dead = true;
  }
  draw(ctx) {
    const meta = POWERUP_META[this.type];
    const bob = Math.sin(this.phase) * 3;
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    ctx.shadowColor = meta.color;
    ctx.shadowBlur = 16;
    ctx.strokeStyle = meta.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(meta.icon, 0, 1);
    ctx.restore();
  }
}
