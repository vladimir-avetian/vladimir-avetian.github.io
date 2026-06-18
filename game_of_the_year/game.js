(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const healthPips = document.getElementById("healthPips");
  const levelCount = document.getElementById("levelCount");
  const killCount = document.getElementById("killCount");
  const killTarget = document.getElementById("killTarget");
  const scoreCount = document.getElementById("scoreCount");
  const buffMeter = document.getElementById("buffMeter");
  const soulAscended = document.getElementById("soulAscended");
  const soulHell = document.getElementById("soulHell");
  const soulStuck = document.getElementById("soulStuck");
  const overlay = document.getElementById("screenOverlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayStats = document.getElementById("overlayStats");
  const startButton = document.getElementById("startButton");
  const muteButton = document.getElementById("muteButton");

  const VIEW_W = 960;
  const VIEW_H = 540;
  const WORLD_W = 4300;
  const GRAVITY = 1980;
  const MAX_FALL = 960;
  const SAFE_TOP = -140;
  const GREEN_SCORE_VALUE = 3;
  const MAX_LEVEL = 5;
  const SWORD_BUFF_DURATION = 8;
  const GATE_X = 2860;
  const GATE_Y = 118;
  const GATE_W = 38;
  const GATE_H = 374;
  const SNOW_X = GATE_X + 100;
  const COFFIN_W = 90;
  const COFFIN_H = 40;
  const COFFIN_HIT_LAUNCH = 6;
  const SOUL_SPAWN_CHANCE = 0.24;
  const SOUL_ARM_DELAY = 0.75;
  const SPEED_BOOST_DURATION = 14;
  const SPEED_STACK_MAX = 3;
  const MOON_RAY_INTERVAL = 1.45;
  const MOON_RAY_BURSTS = 3;

  const LEVELS = [
    { target: 4, greens: 6, red: false, star: false, winter: false },
    { target: 5, greens: 8, red: false, star: false, winter: false },
    { target: 6, greens: 9, red: false, star: true, winter: false },
    { target: 6, greens: 10, red: true, star: false, winter: false },
    { target: 7, greens: 11, red: false, star: false, winter: true }
  ];

  const keys = new Set();
  const touch = {
    left: false,
    right: false,
    jump: false,
    attack: false
  };

  const colors = {
    black: "#030303",
    iron: "#111111",
    stone: "#1a1918",
    stoneTop: "#d8d5ca",
    bone: "#f2efe5",
    ash: "#9d9890",
    blood: "#9d1118",
    ember: "#ef3a2d",
    redDark: "#5f090d",
    redHot: "#cf151f",
    rot: "#81a65a",
    rotDark: "#425333",
    soul: "#b7f5ff",
    speed: "#f8e76b"
  };

  const platforms = [
    { x: -220, y: 492, w: 4820, h: 92 },
    { x: 230, y: 402, w: 230, h: 28 },
    { x: 615, y: 330, w: 250, h: 28 },
    { x: 1015, y: 420, w: 310, h: 28 },
    { x: 1430, y: 348, w: 225, h: 28 },
    { x: 1770, y: 280, w: 260, h: 28 },
    { x: 2110, y: 392, w: 300, h: 28 },
    { x: 2530, y: 322, w: 250, h: 28 },
    { x: 3020, y: 432, w: 260, h: 28 },
    { x: 3370, y: 372, w: 260, h: 28 },
    { x: 3770, y: 318, w: 280, h: 28 }
  ];

  const scenery = {
    trees: [130, 390, 760, 1140, 1510, 1880, 2260, 2710, 3120, 3500, 3980],
    graves: [320, 530, 940, 1220, 1680, 2030, 2380, 2730, 3170],
    spires: [520, 880, 1370, 1940, 2480, 3040, 3720]
  };

  let player;
  let zombies;
  let chests;
  let coffins;
  let souls;
  let devils;
  let powerups;
  let notices;
  let altar;
  let moonRays;
  let particles;
  let cameraX = 0;
  let currentLevel = 1;
  let gateOpen = false;
  let moonBleeding = false;
  let moonRayTimer = 0;
  let moonRayBurstsLeft = 0;
  let iceRound = false;
  let gameState = "intro";
  let levelBannerTimer = 0;
  let levelBannerLevel = 1;
  let jumpQueued = false;
  let previousTime = 0;
  let shake = 0;
  let targetKills = 0;
  let uiHealth = -1;
  let uiKills = -1;
  let uiScore = -1;
  let uiBuff = -1;
  let uiLevel = -1;
  let uiSoulStats = "";
  let soulStats = {
    ascended: 0,
    hell: 0,
    stuck: 0
  };

  const audio = {
    ctx: null,
    muted: false,
    musicTimer: null,
    musicStep: 0
  };

  function newPlayer() {
    return {
      x: 74,
      y: 410,
      w: 34,
      h: 58,
      vx: 0,
      vy: 0,
      dir: 1,
      onGround: false,
      hp: 5,
      maxHp: 5,
      invuln: 0,
      attackTimer: 0,
      attackCooldown: 0,
      attackId: 0,
      greenKills: 0,
      score: 0,
      swordBuff: 0,
      speedBoost: 0,
      speedLevel: 0,
      bossSlain: false
    };
  }

  function levelConfig() {
    return LEVELS[currentLevel - 1] || LEVELS[LEVELS.length - 1];
  }

  function levelHasBoss() {
    return Boolean(levelConfig().red);
  }

  function levelHasStar() {
    return Boolean(levelConfig().star);
  }

  function spawnZombies() {
    const config = levelConfig();
    const greenSpawns = [
      [610, 430],
      [795, 270],
      [1065, 360],
      [1280, 430],
      [1510, 288],
      [1720, 430],
      [1888, 220],
      [2190, 330],
      [2390, 430],
      [2650, 260],
      [3120, 370]
    ];
    const enemies = greenSpawns
      .slice(0, config.greens)
      .map(([x, y]) => zombie(x, y, "green"));

    if (config.red) {
      enemies.push(zombie(2760, 422, "red"));
    }

    return enemies;
  }

  function spawnChests() {
    return [
      chest(438, 370),
      chest(1168, 388),
      chest(2290, 360)
    ];
  }

  function chest(x, y) {
    return {
      x,
      y,
      w: 44,
      h: 31,
      opened: false,
      pulse: Math.random() * Math.PI * 2
    };
  }

  function coffin(x, y) {
    return {
      kind: "coffin",
      x,
      y,
      w: COFFIN_W,
      h: COFFIN_H,
      vx: 0,
      vy: 0,
      dir: 1,
      onGround: false,
      launched: false,
      soulStuck: false,
      hitCount: 0,
      hitBy: 0,
      hits: new Set()
    };
  }

  function devil(x, y) {
    return {
      x: x - 13,
      y: y - 18,
      w: 26,
      h: 32,
      vx: random(-220, 220),
      vy: -160,
      dir: Math.random() > 0.5 ? 1 : -1,
      onGround: false,
      attackCooldown: 0.45,
      jumpTimer: random(0.18, 0.52),
      hitBy: 0,
      dying: false,
      deathAge: 0,
      dead: false,
      age: 0,
      phase: Math.random() * Math.PI * 2
    };
  }

  function soul(x, y) {
    return {
      x: x - 16,
      y: y - 24,
      w: 32,
      h: 40,
      age: 0,
      phase: Math.random() * Math.PI * 2,
      driftX: x - 16,
      spawnY: y - 24,
      hitBy: 0,
      dying: false,
      deathAge: 0,
      saved: false,
      dead: false
    };
  }

  function speedPowerup(x, y) {
    return {
      x: x - 13,
      y: y - 13,
      w: 26,
      h: 26,
      vx: random(-70, 70),
      vy: -285,
      age: 0,
      pickupDelay: 0.2,
      pulse: Math.random() * Math.PI * 2,
      collected: false
    };
  }

  function winterAltar() {
    return {
      x: 176,
      y: 430,
      w: 58,
      h: 62,
      hp: 4,
      maxHp: 4,
      broken: false,
      hitBy: 0,
      pulse: Math.random() * Math.PI * 2
    };
  }

  function zombie(x, y, type) {
    const red = type === "red";
    const levelBoost = Math.max(0, currentLevel - 1);

    return {
      x,
      y,
      type,
      w: red ? 54 : 38,
      h: red ? 70 : 52,
      vx: 0,
      vy: 0,
      dir: Math.random() > 0.5 ? 1 : -1,
      hp: red ? 20 + levelBoost * 2 : 1,
      maxHp: red ? 20 + levelBoost * 2 : 1,
      damage: red ? 2 : 1,
      patrolSpeed: red ? 62 : 72 + levelBoost * 7,
      chaseSpeed: red ? 162 : 118 + levelBoost * 10,
      aggro: red ? 760 : 470,
      onGround: false,
      attackCooldown: 0,
      hitTimer: 0,
      hitBy: 0,
      bossCooldown: 0,
      bossWindup: 0,
      bossStrike: 0,
      bossJumpCooldown: 0,
      strikeHit: false,
      spiked: false,
      spikeTimer: 0,
      spikeCooldown: red ? random(3.2, 5.8) : random(4.0, 8.5),
      dead: false
    };
  }

  function resetSoulStats() {
    soulStats = {
      ascended: 0,
      hell: 0,
      stuck: 0
    };
  }

  function startAttempt(level) {
    currentLevel = clamp(level, 1, MAX_LEVEL);
    player = newPlayer();
    resetSoulStats();
    setupLevel(false);
    gameState = "playing";
    overlay.classList.add("hidden");
    clearOverlayStats();
    updateUi(true);
    ensureAudio();
    startMusic();
    playSound("start");
  }

  function resetGame() {
    startAttempt(1);
  }

  function retryCurrentLevel() {
    startAttempt(currentLevel);
  }

  function setupLevel(withEntranceBurst = true) {
    zombies = spawnZombies();
    chests = spawnChests();
    coffins = [];
    souls = [];
    devils = [];
    powerups = [];
    notices = [];
    altar = levelConfig().winter ? winterAltar() : null;
    moonRays = [];
    particles = [];
    cameraX = 0;
    gateOpen = false;
    moonBleeding = false;
    moonRayTimer = 0;
    moonRayBurstsLeft = 0;
    iceRound = levelConfig().winter;
    shake = withEntranceBurst ? 18 : 0;
    targetKills = levelConfig().target;
    uiHealth = -1;
    uiKills = -1;
    uiScore = -1;
    uiBuff = -1;
    uiLevel = -1;
    uiSoulStats = "";
    jumpQueued = false;
    showLevelBanner(currentLevel);
    updateUi(true);

    if (withEntranceBurst) {
      addSparks(player.x + player.w / 2, player.y + player.h / 2, 64);
      playSound("start");
    }
  }

  function startNextLevel() {
    const carriedScore = player.score;
    const carriedHp = Math.max(1, player.hp);

    currentLevel += 1;
    player = newPlayer();
    player.score = carriedScore;
    player.hp = carriedHp;
    player.invuln = 1.4;
    overlay.classList.add("hidden");
    setupLevel(true);
  }

  function soulStatsSummary() {
    return [
      `Level: ${currentLevel}`,
      `Souls Saved: ${soulStats.ascended}`,
      `Souls Sent to Hell: ${soulStats.hell}`,
      `Souls Stuck: ${soulStats.stuck}`
    ].join("\n");
  }

  function clearOverlayStats() {
    overlayStats.textContent = "";
    overlayStats.classList.add("hidden");
  }

  function setOverlay(title, buttonText, statsText = "") {
    overlayTitle.textContent = title;
    startButton.textContent = buttonText;
    overlayStats.textContent = statsText;
    overlayStats.classList.toggle("hidden", statsText.length === 0);
    overlay.classList.remove("hidden");
  }

  function updateUi(force = false) {
    if (force || uiLevel !== currentLevel) {
      levelCount.textContent = String(currentLevel);
      uiLevel = currentLevel;
    }

    if (force || uiHealth !== player.hp) {
      healthPips.innerHTML = "";
      for (let i = 0; i < player.maxHp; i += 1) {
        const pip = document.createElement("span");
        pip.className = i < player.hp ? "pip" : "pip empty";
        healthPips.appendChild(pip);
      }
      uiHealth = player.hp;
    }

    if (force || uiKills !== player.greenKills) {
      killCount.textContent = String(Math.min(player.greenKills, targetKills));
      killTarget.textContent = String(targetKills);
      uiKills = player.greenKills;
    }

    if (force || uiScore !== player.score) {
      scoreCount.textContent = String(player.score);
      uiScore = player.score;
    }

    const buffParts = [];
    const rageSeconds = Math.ceil(player.swordBuff);
    const speedSeconds = Math.ceil(player.speedBoost);

    if (rageSeconds > 0) {
      buffParts.push(`RAGE ${rageSeconds}`);
    }

    if (speedSeconds > 0) {
      buffParts.push(`SPEED x${speedMultiplier()} ${speedSeconds}`);
    }

    const buffText = buffParts.length > 0 ? buffParts.join(" ") : "RAGE";
    if (force || uiBuff !== buffText) {
      buffMeter.textContent = buffText;
      buffMeter.classList.toggle("active", buffParts.length > 0);
      uiBuff = buffText;
    }

    const soulStatsText = `${soulStats.ascended}/${soulStats.hell}/${soulStats.stuck}`;
    if (force || uiSoulStats !== soulStatsText) {
      soulAscended.textContent = String(soulStats.ascended);
      soulHell.textContent = String(soulStats.hell);
      soulStuck.textContent = String(soulStats.stuck);
      uiSoulStats = soulStatsText;
    }
  }

  function ensureAudio() {
    if (audio.ctx || audio.muted) {
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return;
    }

    audio.ctx = new AudioContext();
  }

  function playSound(name) {
    if (audio.muted || !audio.ctx) {
      return;
    }

    if (audio.ctx.state === "suspended") {
      audio.ctx.resume();
    }

    const now = audio.ctx.currentTime;

    if (name === "riff") {
      playMetalRiff(now);
      return;
    }

    const gain = audio.ctx.createGain();
    gain.connect(audio.ctx.destination);
    gain.gain.setValueAtTime(0.0001, now);

    const osc = audio.ctx.createOscillator();
    osc.connect(gain);

    if (name === "slash") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.exponentialRampToValueAtTime(92, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.15);
      return;
    }

    if (name === "hit") {
      osc.type = "square";
      osc.frequency.setValueAtTime(88, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.22);
      return;
    }

    if (name === "jump") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.1, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.12);
      return;
    }

    osc.type = "sine";
    osc.frequency.setValueAtTime(55, now);
    osc.frequency.exponentialRampToValueAtTime(39, now + 0.7);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
    osc.start(now);
    osc.stop(now + 0.8);
  }

  function playMetalRiff(now) {
    const master = audio.ctx.createGain();
    master.connect(audio.ctx.destination);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.24, now + 0.018);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.92);

    const notes = [82.41, 82.41, 110, 98, 82.41, 65.41, 73.42, 82.41];

    for (let i = 0; i < notes.length; i += 1) {
      const t = now + i * 0.09;
      const stop = t + (i === notes.length - 1 ? 0.22 : 0.075);
      const noteGain = audio.ctx.createGain();
      noteGain.connect(master);
      noteGain.gain.setValueAtTime(0.0001, t);
      noteGain.gain.exponentialRampToValueAtTime(i % 2 === 0 ? 0.56 : 0.42, t + 0.006);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, stop);

      for (const mult of [1, 1.5]) {
        const osc = audio.ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(notes[i] * mult, t);
        osc.detune.setValueAtTime(mult === 1 ? -8 : 6, t);
        osc.connect(noteGain);
        osc.start(t);
        osc.stop(stop + 0.02);
      }
    }
  }

  function startMusic() {
    if (audio.muted || !audio.ctx || audio.musicTimer) {
      return;
    }

    audio.musicStep = 0;
    scheduleMusicStep();
  }

  function stopMusic() {
    if (!audio.musicTimer) {
      return;
    }

    clearTimeout(audio.musicTimer);
    audio.musicTimer = null;
  }

  function scheduleMusicStep() {
    if (audio.muted || !audio.ctx || gameState !== "playing") {
      audio.musicTimer = null;
      return;
    }

    audio.musicTimer = setTimeout(() => {
      audio.musicTimer = null;
      playMusicStep();
      scheduleMusicStep();
    }, 150 / musicSpeedScale());
  }

  function musicSpeedScale() {
    return speedMultiplier() * 0.5;
  }

  function playMusicStep() {
    if (audio.muted || !audio.ctx || gameState !== "playing") {
      return;
    }

    if (audio.ctx.state === "suspended") {
      audio.ctx.resume();
    }

    const now = audio.ctx.currentTime;
    const minorField = [0, 3, 5, 7, 10, 12, 15, 19];
    const step = audio.musicStep;
    const speed = Math.max(1, musicSpeedScale());
    const root = 130.81;
    const degreeA = minorField[(step + Math.floor(step / 11)) % minorField.length];
    const degreeB = minorField[(step * 2 + 3) % minorField.length];
    const noteA = root * 2 ** (degreeA / 12);
    const noteB = root * 2 ** (degreeB / 12);
    const voiceDuration = Math.max(0.28, 1.15 / Math.sqrt(speed));
    const voiceVolume = 0.026 / Math.sqrt(speed);

    if (step % 8 === 0) {
      playAmbientTone(root * 0.5, now, 2.2 / Math.sqrt(speed), 0.032 / Math.sqrt(speed), "sine", -7);
    }

    if (step % 3 !== 2) {
      playAmbientTone(noteA, now, voiceDuration, voiceVolume, "sine", -3);
    }

    if (step % 5 === 0 || speed >= 4) {
      playAmbientTone(noteB * 2, now + 0.025, voiceDuration * 0.72, voiceVolume * 0.66, "triangle", 5);
    }

    if (step % 13 === 0) {
      playAmbientTone(root * 2 ** (10 / 12), now + 0.05, 1.6 / Math.sqrt(speed), 0.014, "sine", 11);
    }

    audio.musicStep += 1;
  }

  function playAmbientTone(freq, time, duration, volume, type, detune = 0) {
    const gain = audio.ctx.createGain();
    gain.connect(audio.ctx.destination);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    const offsets = detune === 0 ? [0] : [0, detune];
    for (const offset of offsets) {
      const osc = audio.ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);
      osc.detune.setValueAtTime(offset, time);
      osc.connect(gain);
      osc.start(time);
      osc.stop(time + duration + 0.06);
    }
  }

  function startAttack() {
    if (gameState !== "playing" || player.attackCooldown > 0) {
      return;
    }

    const boosted = player.swordBuff > 0;
    const speedScale = speedMultiplier();
    const attackScale = speedIsBoosted() ? Math.min(speedScale, 4) : 1;
    const baseTimer = boosted ? 0.32 : 0.26;
    const baseCooldown = boosted ? 0.3 : 0.43;

    player.attackTimer = Math.max(0.14, baseTimer / Math.min(attackScale, 2.2));
    player.attackCooldown = Math.max(0.1, baseCooldown / attackScale);
    player.attackId += 1;
    playSound("slash");
  }

  function damagePlayer(amount, sourceDir) {
    if (player.invuln > 0 || gameState !== "playing") {
      return;
    }

    player.hp = Math.max(0, player.hp - amount);
    player.invuln = 1.0;
    player.vx = sourceDir * 260;
    player.vy = -310;
    shake = Math.max(shake, 11);
    addBlood(player.x + player.w / 2, player.y + 22, 10, sourceDir);
    playSound("hit");
    updateUi();

    if (player.hp <= 0) {
      gameState = "lost";
      stopMusic();
      setOverlay("Fallen", "Retry", soulStatsSummary());
      return;
    }
  }

  function damageZombie(enemy, sourceDir, amount = 1, heavy = false, sourceType = "normal") {
    if (enemy.dead) {
      return;
    }

    if (enemy.spiked && sourceType !== "speed") {
      enemy.hitTimer = 0.12;
      addSparks(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 14);
      shake = Math.max(shake, 4);
      playSound("hit");
      return;
    }

    const bigHit = heavy || amount > 1;
    enemy.hp -= amount;
    enemy.hitTimer = bigHit ? 0.32 : 0.24;
    enemy.vx = sourceDir * (bigHit ? 430 : 310);
    enemy.vy = bigHit ? -380 : -260;
    addBlood(enemy.x + enemy.w / 2, enemy.y + 22, bigHit ? 20 : 12, sourceDir);
    shake = Math.max(shake, bigHit ? 9 : 5);
    playSound("hit");

    if (enemy.hp <= 0) {
      enemy.dead = true;
      addBlood(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, enemy.type === "red" ? 42 : 24, sourceDir);

      if (enemy.type === "green") {
        player.greenKills += 1;
        player.score += GREEN_SCORE_VALUE;
        if (sourceType === "coffin") {
          spawnSoulFromEnemy(enemy);
        } else {
          spawnGreenDeathReward(enemy);
        }
        updateGateState();
      } else {
        if (sourceType === "coffin") {
          spawnSoulFromEnemy(enemy);
        }
        player.bossSlain = true;
        player.score += 15;
        updateGateState();
      }

      updateUi();
    }
  }

  function spawnGreenDeathReward(enemy) {
    const centerX = enemy.x + enemy.w / 2;
    const groundY = enemy.y + enemy.h;

    if (Math.random() < SOUL_SPAWN_CHANCE) {
      spawnSoulFromEnemy(enemy);
      return;
    }

    spawnStuckCoffin(centerX - COFFIN_W / 2, groundY - COFFIN_H);
  }

  function spawnSoulFromEnemy(enemy) {
    const centerX = enemy.x + enemy.w / 2;
    const centerY = enemy.y + enemy.h * (enemy.type === "red" ? 0.42 : 0.48);
    souls.push(soul(centerX, centerY));
    addSoulWisps(centerX, centerY, enemy.type === "red" ? 30 : 18);
  }

  function spawnSoulFromCoffin(box) {
    const centerX = box.x + box.w / 2;
    const centerY = box.y + box.h * 0.38;
    souls.push(soul(centerX, centerY));
    addSoulWisps(centerX, centerY, 22);
  }

  function spawnStuckCoffin(x, y) {
    const box = coffin(x, y);
    box.soulStuck = true;
    coffins.push(box);
    soulStats.stuck += 1;
    updateUi();
    return box;
  }

  function releaseStuckSoul(box) {
    if (!box.soulStuck) {
      return;
    }

    box.soulStuck = false;
    soulStats.stuck = Math.max(0, soulStats.stuck - 1);
    spawnSoulFromCoffin(box);
    updateUi();
  }

  function updateGateState() {
    if (!moonBleeding && player.greenKills >= targetKills) {
      moonBleeding = true;
      if (levelHasStar()) {
        moonRayBurstsLeft = MOON_RAY_BURSTS;
        moonRayTimer = 0.28;
      }
      shake = Math.max(shake, 10);
      playSound("start");
    }

    if (player.greenKills >= targetKills && (!levelHasBoss() || player.bossSlain)) {
      openGate();
    }
  }

  function openGate() {
    if (gateOpen) {
      return;
    }

    gateOpen = true;
    shake = Math.max(shake, 18);
    addSparks(GATE_X + GATE_W / 2, GATE_Y + GATE_H - 20, 58);
    playSound("start");
  }

  function openChest(chest) {
    if (chest.opened) {
      return;
    }

    chest.opened = true;
    player.swordBuff = SWORD_BUFF_DURATION;
    addSparks(chest.x + chest.w / 2, chest.y + 10, 38);
    shake = Math.max(shake, 6);
    playSound("riff");
    updateUi();
  }

  function hitCoffin(box, dir) {
    if (box.destroyed || box.launched) {
      return;
    }

    if (swordIsBoosted()) {
      launchCoffin(box, dir, true);
      return;
    }

    box.hitCount = Math.min(COFFIN_HIT_LAUNCH, box.hitCount + 1);
    box.vx += dir * 78;
    box.vy = Math.min(box.vy, -80);
    addSparks(box.x + box.w / 2, box.y + box.h / 2, 10);
    if (scatterNearbyCoffins(box, dir, 185) > 0) {
      box.vx -= dir * 110;
      box.vy = Math.min(box.vy, -105);
    }
    playSound("hit");

    if (box.hitCount >= COFFIN_HIT_LAUNCH) {
      launchCoffin(box, dir, false);
    }
  }

  function hitAltar() {
    if (!altar || altar.broken) {
      return;
    }

    altar.hp -= 1;
    addSparks(altar.x + altar.w / 2, altar.y + altar.h / 2, 20);
    playSound("hit");

    if (altar.hp <= 0) {
      altar.broken = true;
      player.hp = player.maxHp;
      player.invuln = Math.max(player.invuln, 0.7);
      shake = Math.max(shake, 14);
      addSparks(altar.x + altar.w / 2, altar.y + altar.h / 2, 54);
      playSound("riff");
      updateUi(true);
    }
  }

  function addSparks(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x,
        y,
        vx: random(-230, 230),
        vy: random(-390, -80),
        life: random(0.26, 0.72),
        age: 0,
        size: random(2, 5),
        color: i % 3 === 0 ? colors.bone : colors.ember
      });
    }
  }

  function addSoulWisps(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x,
        y,
        vx: random(-90, 90),
        vy: random(-240, -55),
        life: random(0.42, 0.95),
        age: 0,
        size: random(2, 5),
        color: i % 3 === 0 ? colors.soul : colors.bone
      });
    }
  }

  function swordDamage() {
    return player.swordBuff > 0 ? 3 : 1;
  }

  function stompDamage() {
    return player.swordBuff > 0 ? 3 : 2;
  }

  function swordIsBoosted() {
    return player.swordBuff > 0;
  }

  function speedIsBoosted() {
    return player.speedBoost > 0;
  }

  function speedMultiplier() {
    if (!speedIsBoosted()) {
      return 1;
    }

    return 2 ** clamp(player.speedLevel || 1, 1, SPEED_STACK_MAX);
  }

  function addBlood(x, y, count, dir) {
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x,
        y,
        vx: dir * random(80, 310) + random(-80, 80),
        vy: random(-320, -70),
        life: random(0.28, 0.82),
        age: 0,
        size: random(2, 6),
        color: i % 4 === 0 ? colors.ember : colors.blood
      });
    }
  }

  function update(dt) {
    if (gameState !== "playing") {
      updateParticles(dt);
      updateNotices(dt);
      draw(performance.now() / 1000);
      return;
    }

    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    player.attackTimer = Math.max(0, player.attackTimer - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    player.swordBuff = Math.max(0, player.swordBuff - dt);
    player.speedBoost = Math.max(0, player.speedBoost - dt);
    levelBannerTimer = Math.max(0, levelBannerTimer - dt);
    if (player.speedBoost <= 0) {
      player.speedLevel = 0;
    }

    updatePlayer(dt);
    if (gameState !== "playing") {
      updateParticles(dt);
      updateNotices(dt);
      draw(performance.now() / 1000);
      return;
    }

    updateMaxSpeedRampage();
    updateSouls(dt);
    updateDevils(dt);
    updatePowerups(dt);
    updateCoffins(dt);
    updateZombies(dt);
    updateMoonRays(dt);
    updateParticles(dt);
    updateNotices(dt);
    updateCamera(dt);
    updateUi();
    draw(performance.now() / 1000);
  }

  function updatePlayer(dt) {
    const left = keys.has("ArrowLeft") || keys.has("KeyA") || touch.left;
    const right = keys.has("ArrowRight") || keys.has("KeyD") || touch.right;
    const inputX = Number(right) - Number(left);
    const speedScale = speedMultiplier();
    const maxSpeed = (player.onGround ? 275 : 250) * speedScale;
    const accel = (player.onGround ? 2500 : 1420) * (1 + (speedScale - 1) * 0.72);

    if (inputX !== 0) {
      player.dir = inputX;
      player.vx = approach(player.vx, inputX * maxSpeed, accel * dt);
    } else {
      const friction = (player.onGround ? 2300 : 760) * (1 + (speedScale - 1) * 0.48);
      player.vx = approach(player.vx, 0, friction * dt);
    }

    if ((jumpQueued || touch.jump) && player.onGround) {
      player.vy = -720;
      player.onGround = false;
      jumpQueued = false;
      playSound("jump");
    }

    if (touch.attack) {
      startAttack();
    }

    player.vy = Math.min(player.vy + GRAVITY * dt, MAX_FALL);
    moveAndCollide(player, dt, false);
    player.x = clamp(player.x, 18, WORLD_W - player.w - 18);

    if (speedIsBoosted() && Math.abs(player.vx) > 260 * Math.min(speedScale, 3) && Math.random() < 0.42) {
      particles.push({
        x: player.x + player.w / 2 - player.dir * 18,
        y: player.y + random(20, player.h - 4),
        vx: -player.dir * random(120, 260) * Math.min(speedScale, 3),
        vy: random(-65, 45),
        life: random(0.16, 0.34),
        age: 0,
        size: random(2, 5),
        color: Math.random() > 0.5 ? colors.speed : colors.soul
      });
    }

    if (player.y > VIEW_H + 80 || player.y < SAFE_TOP) {
      damagePlayer(1, player.dir > 0 ? -1 : 1);
      player.x = Math.max(50, cameraX + 100);
      player.y = 330;
      player.vx = 0;
      player.vy = 0;
    }

    if (gateOpen && player.x > WORLD_W - 170) {
      if (currentLevel >= MAX_LEVEL) {
        gameState = "won";
        setOverlay("Frozen Oath", "Again", soulStatsSummary());
        stopMusic();
        playSound("start");
      } else {
        startNextLevel();
      }
      return;
    }

    if (player.attackTimer > 0.1) {
      const blade = slashRect();

      for (const box of coffins) {
        if (box.hitBy !== player.attackId && intersects(blade, box)) {
          box.hitBy = player.attackId;
          hitCoffin(box, player.dir);
        }
      }

      if (altar && !altar.broken && altar.hitBy !== player.attackId && intersects(blade, altar)) {
        altar.hitBy = player.attackId;
        hitAltar();
      }

      for (const ray of moonRays) {
        if (ray.age < 0.2 && !ray.cutBySword && segmentIntersectsRect(raySegment(ray), blade)) {
          ray.cutBySword = true;
          ray.life = Math.min(ray.life, ray.age + 0.18);
          addSparks(blade.x + blade.w / 2, blade.y + blade.h / 2, 16);
        }
      }

      for (const spirit of souls) {
        if (soulIsVulnerable(spirit) && spirit.hitBy !== player.attackId && intersects(blade, spirit)) {
          spirit.hitBy = player.attackId;
          killSoul(spirit);
        }
      }

      for (const imp of devils) {
        if (!imp.dead && !imp.dying && imp.hitBy !== player.attackId && intersects(blade, imp)) {
          imp.hitBy = player.attackId;
          killDevil(imp, player.dir);
        }
      }

      for (const chestItem of chests) {
        if (!chestItem.opened && chestItem.hitBy !== player.attackId && intersects(blade, chestItem)) {
          chestItem.hitBy = player.attackId;
          openChest(chestItem);
        }
      }

      for (const enemy of zombies) {
        if (!enemy.dead && enemy.hitBy !== player.attackId && intersects(blade, enemy)) {
          enemy.hitBy = player.attackId;
          damageZombie(enemy, player.dir, swordDamage(), swordIsBoosted());
        }
      }
    }
  }

  function updateZombies(dt) {
    for (const enemy of zombies) {
      if (enemy.dead) {
        enemy.vy = Math.min(enemy.vy + GRAVITY * dt, MAX_FALL);
        enemy.vx = approach(enemy.vx, 0, 900 * dt);
        moveAndCollide(enemy, dt, true);
        continue;
      }

      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
      enemy.hitTimer = Math.max(0, enemy.hitTimer - dt);
      enemy.bossCooldown = Math.max(0, enemy.bossCooldown - dt);
      enemy.bossJumpCooldown = Math.max(0, enemy.bossJumpCooldown - dt);
      enemy.bossStrike = Math.max(0, enemy.bossStrike - dt);
      updateSpikeState(enemy, dt);

      const windupBefore = enemy.bossWindup;
      enemy.bossWindup = Math.max(0, enemy.bossWindup - dt);

      if (windupBefore > 0 && enemy.bossWindup <= 0) {
        enemy.bossStrike = 0.22;
        enemy.strikeHit = false;
        playSound("slash");
      }

      const dist = player.x + player.w / 2 - (enemy.x + enemy.w / 2);
      const closeY = Math.abs(player.y - enemy.y) < (enemy.type === "red" ? 170 : 115);
      const seesPlayer = Math.abs(dist) < enemy.aggro && closeY;

      if (enemy.hitTimer <= 0) {
        if (seesPlayer && Math.abs(dist) > 34) {
          enemy.dir = Math.sign(dist) || enemy.dir;
        }

        const speed = seesPlayer ? enemy.chaseSpeed : enemy.patrolSpeed;
        const canWalk = enemy.bossWindup <= 0 && enemy.bossStrike <= 0;
        enemy.vx = approach(enemy.vx, canWalk ? enemy.dir * speed : 0, 860 * dt);
      }

      if (enemy.type === "red") {
        updateRedBoss(enemy, dist, seesPlayer);
      }

      enemy.vy = Math.min(enemy.vy + GRAVITY * dt, MAX_FALL);
      moveAndCollide(enemy, dt, true);

      if (enemy.onGround && !hasFloorAhead(enemy)) {
        enemy.dir *= -1;
        enemy.vx *= -0.25;
      }

      const bodyBox = {
        x: enemy.x - 5,
        y: enemy.y + 7,
        w: enemy.w + 10,
        h: enemy.h - 6
      };

      if (intersects(player, bodyBox)) {
        if (playerAtMaxSpeed()) {
          damageZombie(enemy, Math.sign(player.vx) || player.dir || 1, 999, true, "speed");
          continue;
        }

        const stomp = player.vy > 120 && player.y + player.h - enemy.y < (enemy.type === "red" ? 28 : 22);
        if (enemy.spiked) {
          player.vy = -340;
          damagePlayer(enemy.damage + 1, player.x < enemy.x ? -1 : 1);
        } else if (stomp) {
          player.vy = -455;
          damageZombie(enemy, player.dir, stompDamage(), true);
        } else if (enemy.attackCooldown <= 0) {
          enemy.attackCooldown = enemy.type === "red" ? 0.95 : 1.1;
          damagePlayer(enemy.damage, player.x < enemy.x ? -1 : 1);
        }
      }
    }
  }

  function updateSpikeState(enemy, dt) {
    if (!iceRound || enemy.dead) {
      enemy.spiked = false;
      return;
    }

    if (enemy.spiked) {
      enemy.spikeTimer = Math.max(0, enemy.spikeTimer - dt);
      if (enemy.spikeTimer <= 0) {
        enemy.spiked = false;
        enemy.spikeCooldown = random(enemy.type === "red" ? 4.2 : 5.4, enemy.type === "red" ? 7.2 : 9.2);
      }
      return;
    }

    enemy.spikeCooldown = Math.max(0, enemy.spikeCooldown - dt);
    if (enemy.spikeCooldown <= 0) {
      enemy.spiked = true;
      enemy.spikeTimer = random(enemy.type === "red" ? 2.8 : 1.8, enemy.type === "red" ? 4.1 : 3.2);
      enemy.hitTimer = 0.16;
      addSparks(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 18);
    }
  }

  function updateSouls(dt) {
    for (const spirit of souls) {
      if (spirit.dead) {
        continue;
      }

      if (spirit.dying) {
        spirit.deathAge += dt;
        spirit.y += 10 * dt;
        if (spirit.deathAge >= 0.58) {
          spirit.dead = true;
        }
        continue;
      }

      spirit.age += dt;
      const riseSpeed = spirit.age < SOUL_ARM_DELAY
        ? 62
        : 38 + Math.sin(spirit.age * 2.4 + spirit.phase) * 6;
      spirit.y -= riseSpeed * dt;
      spirit.x = spirit.driftX + Math.sin(spirit.age * 1.65 + spirit.phase) * 14;

      if (soulEscapedScreen(spirit)) {
        saveSoul(spirit);
      }
    }

    souls = souls.filter((spirit) => !spirit.dead);
  }

  function soulEscapedScreen(spirit) {
    return spirit.y + spirit.h < -24;
  }

  function saveSoul(spirit) {
    if (spirit.saved) {
      return;
    }

    spirit.saved = true;
    spirit.dead = true;
    soulStats.ascended += 1;
    addNotice("SAVED +1", VIEW_W * 0.5, 132, colors.soul);
    updateUi();
  }

  function killSoul(spirit) {
    if (!soulIsVulnerable(spirit)) {
      return;
    }

    spirit.dying = true;
    spirit.deathAge = 0;
    const imp = devil(spirit.x + spirit.w / 2, spirit.y + spirit.h / 2 + 8);
    imp.hitBy = player.attackId;
    devils.push(imp);
    addSoulWisps(spirit.x + spirit.w / 2, spirit.y + spirit.h / 2, 34);
    addSparks(spirit.x + spirit.w / 2, spirit.y + spirit.h / 2, 18);
    shake = Math.max(shake, 8);
    playSound("riff");
  }

  function soulIsVulnerable(spirit) {
    return !spirit.dying && !spirit.dead && spirit.age >= SOUL_ARM_DELAY;
  }

  function updateDevils(dt) {
    for (const imp of devils) {
      if (imp.dead) {
        continue;
      }

      if (imp.dying) {
        imp.deathAge += dt;
        imp.vx = approach(imp.vx, 0, 980 * dt);
        imp.vy = Math.min(imp.vy + GRAVITY * 0.45 * dt, 620);
        imp.y += (90 + imp.deathAge * 520) * dt;

        if (imp.deathAge >= 0.8) {
          imp.dead = true;
        }
        continue;
      }

      imp.age += dt;
      imp.attackCooldown = Math.max(0, imp.attackCooldown - dt);
      imp.jumpTimer = Math.max(0, imp.jumpTimer - dt);

      if (imp.onGround && imp.jumpTimer <= 0) {
        imp.dir = player.x + player.w / 2 < imp.x + imp.w / 2 ? -1 : 1;
        imp.vx = imp.dir * random(235, 345);
        imp.vy = -random(420, 560);
        imp.jumpTimer = random(0.22, 0.58);
        playSound("jump");
      } else if (!imp.onGround) {
        imp.vx = approach(imp.vx, imp.dir * 260, 520 * dt);
      }

      imp.vy = Math.min(imp.vy + GRAVITY * dt, MAX_FALL);
      moveAndCollide(imp, dt, true);

      if (!imp.dying && intersects(player, imp) && imp.attackCooldown <= 0) {
        imp.attackCooldown = 0.8;
        damagePlayer(1, player.x < imp.x ? -1 : 1);
      }
    }

    devils = devils.filter((imp) => !imp.dead && imp.age < 14);
  }

  function killDevil(imp, dir) {
    if (imp.dead || imp.dying) {
      return;
    }

    imp.dying = true;
    imp.deathAge = 0;
    imp.vx = dir * 70;
    imp.vy = 120;
    soulStats.hell += 1;
    powerups.push(speedPowerup(imp.x + imp.w / 2, imp.y + imp.h / 2));
    addSoulWisps(imp.x + imp.w / 2, imp.y + imp.h / 2, 24);
    addSparks(imp.x + imp.w / 2, imp.y + imp.h / 2, 24);
    addNotice("HELL +1", VIEW_W * 0.5, 160, colors.ember);
    shake = Math.max(shake, 7);
    playSound("riff");
    updateUi();

    for (let i = 0; i < 8; i += 1) {
      particles.push({
        x: imp.x + imp.w / 2,
        y: imp.y + imp.h / 2,
        vx: dir * random(80, 260) + random(-80, 80),
        vy: random(-280, -70),
        life: random(0.24, 0.58),
        age: 0,
        size: random(2, 5),
        color: colors.blood
      });
    }
  }

  function updatePowerups(dt) {
    for (const item of powerups) {
      if (item.collected) {
        continue;
      }

      const prevY = item.y;
      item.age += dt;
      item.pickupDelay = Math.max(0, item.pickupDelay - dt);
      item.vy = Math.min(item.vy + GRAVITY * 0.58 * dt, MAX_FALL);
      item.x += item.vx * dt;
      item.y += item.vy * dt;

      for (const platform of platforms) {
        if (!intersects(item, platform)) {
          continue;
        }

        if (prevY + item.h <= platform.y) {
          item.y = platform.y - item.h;
          item.vy = 0;
          item.vx = approach(item.vx, 0, 560 * dt);
        }
      }

      if (item.pickupDelay <= 0 && intersects(player, item)) {
        collectSpeedPowerup(item);
      }
    }

    powerups = powerups.filter((item) => !item.collected && item.age < 12);
  }

  function collectSpeedPowerup(item) {
    item.collected = true;
    player.speedLevel = player.speedBoost > 0
      ? Math.min(SPEED_STACK_MAX, Math.max(1, player.speedLevel) + 1)
      : 1;
    player.speedBoost = Math.max(player.speedBoost, SPEED_BOOST_DURATION);
    player.vx += player.dir * (160 + speedMultiplier() * 70);
    addSoulWisps(item.x + item.w / 2, item.y + item.h / 2, 28);
    shake = Math.max(shake, 6 + speedMultiplier());
    playSound("riff");
    updateUi(true);
  }

  function updateMaxSpeedRampage() {
    if (!playerAtMaxSpeed()) {
      return;
    }

    const hitDir = Math.sign(player.vx) || player.dir || 1;
    const blast = maxSpeedRampageBox();

    for (const enemy of zombies) {
      if (!enemy.dead && intersects(blast, enemy)) {
        damageZombie(enemy, hitDir, 999, true, "speed");
      }
    }

    for (const imp of devils) {
      if (!imp.dead && !imp.dying && intersects(blast, imp)) {
        killDevil(imp, hitDir);
      }
    }

    for (const box of coffins) {
      if (!box.destroyed && intersects(blast, box)) {
        explodeCoffin(box, hitDir);
      }
    }
  }

  function playerAtMaxSpeed() {
    return speedMultiplier() >= 2 ** SPEED_STACK_MAX;
  }

  function maxSpeedRampageBox() {
    const lead = Math.min(86, Math.abs(player.vx) * 0.032);
    return {
      x: player.x - 12 + (player.dir > 0 ? 0 : -lead),
      y: player.y - 10,
      w: player.w + 24 + lead,
      h: player.h + 20
    };
  }

  function updateCoffins(dt) {
    for (const box of coffins) {
      if (box.destroyed) {
        continue;
      }

      box.vy = Math.min(box.vy + GRAVITY * dt, MAX_FALL);

      if (box.onGround) {
        const drag = box.launched ? 210 : 520;
        box.vx = approach(box.vx, 0, drag * dt);
      }

      moveAndCollide(box, dt, false);

      if (box.launched) {
        damageEnemiesWithCoffin(box);

        if (box.onGround && Math.abs(box.vx) < 36) {
          box.launched = false;
          box.hits.clear();
        }
      }
    }

    coffins = coffins.filter((box) => !box.destroyed);
  }

  function damageEnemiesWithCoffin(box) {
    for (const enemy of zombies) {
      if (enemy.dead || box.hits.has(enemy)) {
        continue;
      }

      if (intersects(box, enemy)) {
        box.hits.add(enemy);
        const hitDir = Math.sign(box.vx) || box.dir || 1;
        damageZombie(enemy, hitDir, enemy.type === "red" ? 5 : 5, true, "coffin");
        box.vx *= 0.72;
        box.vy = Math.min(box.vy, -120);
        shake = Math.max(shake, 8);
      }
    }
  }

  function explodeCoffin(box, dir = 1) {
    if (box.destroyed) {
      return;
    }

    box.destroyed = true;
    box.launched = false;
    releaseStuckSoul(box);
    scatterNearbyCoffins(box, dir, 560);

    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    addSparks(cx, cy, 54);

    for (let i = 0; i < 20; i += 1) {
      particles.push({
        x: cx,
        y: cy,
        vx: dir * random(80, 360) + random(-210, 210),
        vy: random(-420, -80),
        life: random(0.28, 0.7),
        age: 0,
        size: random(3, 7),
        color: i % 3 === 0 ? "#8a4f24" : colors.bone
      });
    }

    const blast = {
      x: box.x - 26,
      y: box.y - 22,
      w: box.w + 52,
      h: box.h + 52
    };

    for (const enemy of zombies) {
      if (!enemy.dead && intersects(blast, enemy)) {
        damageZombie(enemy, dir, enemy.type === "red" ? 4 : 3, true, "coffin");
      }
    }

    shake = Math.max(shake, 14);
    playSound("hit");
  }

  function updateMoonRays(dt) {
    if (levelHasStar() && moonBleeding && moonRayBurstsLeft > 0 && gameState === "playing") {
      moonRayTimer -= dt;
      if (moonRayTimer <= 0) {
        spawnMoonRays();
        moonRayBurstsLeft -= 1;
        moonRayTimer = MOON_RAY_INTERVAL + random(-0.28, 0.36);
      }
    }

    for (const ray of moonRays) {
      ray.age += dt;
      if (ray.age < 0.08 || ray.cutBySword) {
        continue;
      }

      const segment = raySegment(ray);

      if (!ray.hitPlayer && segmentIntersectsRect(segment, screenRect(player))) {
        ray.hitPlayer = true;
        damagePlayer(1, Math.cos(ray.angle) >= 0 ? 1 : -1);
      }

      for (const enemy of zombies) {
        if (enemy.dead || ray.hits.has(enemy)) {
          continue;
        }

        if (segmentIntersectsRect(segment, screenRect(enemy))) {
          ray.hits.add(enemy);
          damageZombie(enemy, Math.cos(ray.angle) >= 0 ? 1 : -1, 2, true);
        }
      }
    }

    moonRays = moonRays.filter((ray) => ray.age < ray.life);
  }

  function spawnMoonRays() {
    const origin = moonOrigin();
    const baseAngles = [-0.08, 0.48, 1.05, 1.58, 2.08, 2.62];
    const start = Math.floor(random(0, baseAngles.length));
    const count = 3;

    for (let i = 0; i < count; i += 1) {
      const angle = baseAngles[(start + i * 2) % baseAngles.length] + random(-0.11, 0.11);
      moonRays.push({
        x: origin.x + random(-26, 26),
        y: origin.y + random(-20, 30),
        angle,
        age: 0,
        life: 0.86,
        width: random(8, 15),
        hitPlayer: false,
        cutBySword: false,
        hits: new Set()
      });
    }
  }

  function moonOrigin() {
    return {
      x: 770 - cameraX * 0.055,
      y: 92
    };
  }

  function raySegment(ray) {
    const length = 120 + ray.age * 1050;
    return {
      x1: ray.x,
      y1: ray.y,
      x2: ray.x + Math.cos(ray.angle) * length,
      y2: ray.y + Math.sin(ray.angle) * length,
      width: ray.width
    };
  }

  function screenRect(entity) {
    return {
      x: entity.x - cameraX,
      y: entity.y,
      w: entity.w,
      h: entity.h
    };
  }

  function updateRedBoss(enemy, dist, seesPlayer) {
    if (!seesPlayer || enemy.hitTimer > 0 || enemy.dead) {
      return;
    }

    if (enemy.bossStrike > 0) {
      const strike = bossStrikeRect(enemy);
      if (!enemy.strikeHit && intersects(player, strike)) {
        enemy.strikeHit = true;
        damagePlayer(2, enemy.dir);
      }
      return;
    }

    if (enemy.bossWindup > 0 || enemy.bossCooldown > 0) {
      return;
    }

    const distance = Math.abs(dist);

    if (enemy.onGround && distance > 155 && distance < 520 && enemy.bossJumpCooldown <= 0) {
      enemy.dir = Math.sign(dist) || enemy.dir;
      enemy.vy = -690;
      enemy.vx = enemy.dir * 330;
      enemy.bossCooldown = 1.1;
      enemy.bossJumpCooldown = 2.4;
      playSound("jump");
      return;
    }

    if (distance < 132) {
      enemy.dir = Math.sign(dist) || enemy.dir;
      enemy.bossWindup = 0.36;
      enemy.bossCooldown = 1.45;
      enemy.strikeHit = false;
    }
  }

  function bossStrikeRect(enemy) {
    return {
      x: enemy.dir > 0 ? enemy.x + enemy.w - 8 : enemy.x - 82,
      y: enemy.y + 20,
      w: 90,
      h: 46
    };
  }

  function updateParticles(dt) {
    for (const particle of particles) {
      particle.age += dt;
      particle.vy += 940 * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }

    particles = particles.filter((particle) => particle.age < particle.life);
  }

  function updateNotices(dt) {
    for (const notice of notices) {
      notice.age += dt;
      notice.y -= notice.float * dt;
    }

    notices = notices.filter((notice) => notice.age < notice.life);
  }

  function showLevelBanner(level) {
    levelBannerLevel = level;
    levelBannerTimer = 2.1;
  }

  function addNotice(text, x, y, color) {
    notices.push({
      text,
      x,
      y,
      color,
      age: 0,
      life: 1.45,
      float: 18
    });
  }

  function updateCamera(dt) {
    const desired = clamp(player.x + player.w / 2 - VIEW_W * 0.42, 0, WORLD_W - VIEW_W);
    cameraX += (desired - cameraX) * Math.min(1, dt * 6.5);
    shake = Math.max(0, shake - 28 * dt);
  }

  function moveAndCollide(entity, dt, canTurn) {
    const prevX = entity.x;
    const prevY = entity.y;

    entity.x += entity.vx * dt;
    for (const platform of activeSolids(entity)) {
      if (platform.destroyed) {
        continue;
      }

      if (!intersects(entity, platform)) {
        continue;
      }

      if (entity === player && platform.kind === "coffin" && playerAtMaxSpeed()) {
        explodeCoffin(platform, Math.sign(entity.vx) || entity.dir || 1);
        continue;
      }

      if (prevX + entity.w <= platform.x) {
        if (scatterCollidingCoffins(entity, platform, 1)) {
          continue;
        }
        if (tryLaunchCoffin(platform, entity, 1)) {
          continue;
        }
        entity.x = platform.x - entity.w;
        entity.vx = 0;
        if (canTurn) entity.dir *= -1;
      } else if (prevX >= platform.x + platform.w) {
        if (scatterCollidingCoffins(entity, platform, -1)) {
          continue;
        }
        if (tryLaunchCoffin(platform, entity, -1)) {
          continue;
        }
        entity.x = platform.x + platform.w;
        entity.vx = 0;
        if (canTurn) entity.dir *= -1;
      } else if (entity.kind === "coffin" && platform.kind === "coffin") {
        const dir = entity.x + entity.w / 2 < platform.x + platform.w / 2 ? 1 : -1;
        if (scatterCollidingCoffins(entity, platform, dir)) {
          continue;
        }
      }
    }

    entity.y += entity.vy * dt;
    entity.onGround = false;
    for (const platform of activeSolids(entity)) {
      if (platform.destroyed) {
        continue;
      }

      if (!intersects(entity, platform)) {
        continue;
      }

      if (entity === player && platform.kind === "coffin" && playerAtMaxSpeed()) {
        explodeCoffin(platform, Math.sign(entity.vx) || entity.dir || 1);
        continue;
      }

      if (prevY + entity.h <= platform.y) {
        entity.y = platform.y - entity.h;
        entity.vy = 0;
        entity.onGround = true;
      } else if (prevY >= platform.y + platform.h) {
        entity.y = platform.y + platform.h;
        entity.vy = 0;
      }
    }
  }

  function activeSolids(entity) {
    const solids = platforms.concat(coffins.filter((box) => box !== entity && !box.destroyed));

    if (!gateOpen) {
      solids.push(closedGate());
    }

    return solids;
  }

  function tryLaunchCoffin(solid, entity, dir) {
    if (solid.kind !== "coffin" || entity !== player || !swordIsBoosted() || Math.abs(entity.vx) < 35) {
      return false;
    }

    launchCoffin(solid, dir);
    solid.x = dir > 0 ? entity.x + entity.w + 3 : entity.x - solid.w - 3;
    return true;
  }

  function scatterCollidingCoffins(entity, solid, dir) {
    if (entity.kind !== "coffin" || solid.kind !== "coffin") {
      return false;
    }

    const incomingSpeed = Math.abs(entity.vx);
    const standingSpeed = Math.abs(solid.vx);
    const impulse = Math.max(170, incomingSpeed * 0.72 + standingSpeed * 0.38);
    const rebound = Math.max(55, standingSpeed * 0.36);

    entity.x = dir > 0 ? solid.x - entity.w - 1 : solid.x + solid.w + 1;
    entity.vx = -dir * rebound;
    entity.vy = Math.min(entity.vy, -82);
    solid.vx = dir * impulse;
    solid.vy = Math.min(solid.vy, -108);
    entity.dir = -dir;
    solid.dir = dir;

    if (incomingSpeed > 220 || entity.launched) {
      solid.launched = true;
      solid.hits.clear();
    }

    if (standingSpeed > 220 || solid.launched) {
      entity.launched = true;
      entity.hits.clear();
    }

    scatterNearbyCoffins(solid, dir, impulse * 0.52, entity);
    shake = Math.max(shake, 5);
    addSparks((entity.x + solid.x + solid.w) / 2, Math.min(entity.y, solid.y) + 12, 12);
    playSound("hit");
    return true;
  }

  function scatterNearbyCoffins(source, dir, force, skip = null) {
    let scattered = 0;

    for (const other of coffins) {
      if (other.destroyed || other === source || other === skip) {
        continue;
      }

      const gap = dir > 0 ? other.x - (source.x + source.w) : source.x - (other.x + other.w);
      const verticalOverlap = source.y < other.y + other.h + 9 && source.y + source.h + 9 > other.y;

      if (gap < -18 || gap > 26 || !verticalOverlap) {
        continue;
      }

      const strength = force * (1 - Math.max(0, gap) / 32);
      other.vx += dir * Math.max(90, strength);
      other.vy = Math.min(other.vy, -80 - strength * 0.12);
      other.dir = dir;

      if (force > 360 || source.launched) {
        other.launched = true;
        other.hits.clear();
      }

      addSparks(other.x + other.w / 2, other.y + other.h / 2, 8);
      scattered += 1;
    }

    return scattered;
  }

  function launchCoffin(solid, dir, spendRage = true) {
    solid.launched = true;
    solid.dir = dir;
    solid.vx = dir * 760;
    solid.vy = Math.min(solid.vy, -120);
    solid.hitCount = 0;
    solid.hits.clear();
    if (spendRage) {
      player.swordBuff = 0;
    }
    shake = Math.max(shake, 11);
    addSparks(solid.x + solid.w / 2, solid.y + solid.h / 2, 26);
    scatterNearbyCoffins(solid, dir, 430);
    playSound("hit");
    updateUi();
  }

  function closedGate() {
    return {
      x: GATE_X,
      y: GATE_Y,
      w: GATE_W,
      h: GATE_H
    };
  }

  function hasFloorAhead(entity) {
    const probeX = entity.x + (entity.dir > 0 ? entity.w + 10 : -10);
    const probeY = entity.y + entity.h + 8;

    return platforms.some((platform) => (
      probeX >= platform.x &&
      probeX <= platform.x + platform.w &&
      probeY >= platform.y &&
      probeY <= platform.y + platform.h + 16
    ));
  }

  function slashRect() {
    const reach = swordIsBoosted() ? 92 : 62;
    return {
      x: player.dir > 0 ? player.x + player.w - 8 : player.x - reach + 8,
      y: swordIsBoosted() ? player.y + 5 : player.y + 12,
      w: reach,
      h: swordIsBoosted() ? 48 : 36
    };
  }

  function draw(time) {
    const shakeX = shake > 0 ? Math.sin(time * 61) * shake : 0;
    const shakeY = shake > 0 ? Math.cos(time * 47) * shake * 0.45 : 0;

    ctx.save();
    ctx.translate(Math.round(shakeX), Math.round(shakeY));
    drawSky(time);
    drawDistantShapes(time);
    drawPlatforms(time);
    drawGate(time);
    drawChests(time);
    drawCoffins(time);
    drawAltar(time);
    drawParticles();
    drawPowerups(time);
    drawSouls(time);
    drawDevils(time);

    for (const enemy of zombies) {
      if (!enemy.dead || enemy.type === "red") {
        drawZombie(enemy, time);
      }
    }

    drawKnight(player, time);

    if (player.attackTimer > 0.1 && gameState === "playing") {
      drawSlash(time);
    }

    drawMoonRays(time);
    drawWeather(time);
    ctx.restore();
    drawLevelBanner(time);
    drawNotices(time);
  }

  function drawSky(time) {
    const snow = snowZoneLevel();
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    gradient.addColorStop(0, mixRgb("#050505", "#121212", snow));
    gradient.addColorStop(0.62, mixRgb("#0c0b0b", "#181716", snow));
    gradient.addColorStop(1, mixRgb("#17080a", "#2a2722", snow));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    const moonX = 770 - cameraX * 0.055;
    const moonY = 92;
    const bloodLevel = moonBloodLevel();
    ctx.save();
    ctx.globalAlpha = 0.96;
    ctx.fillStyle = mixRgb("#ddd8ca", colors.blood, bloodLevel);
    ctx.beginPath();
    ctx.arc(moonX, moonY, 58, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#090909";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(moonX - 8, moonY - 44);
    ctx.lineTo(moonX + 4, moonY - 16);
    ctx.lineTo(moonX - 12, moonY + 10);
    ctx.lineTo(moonX + 10, moonY + 40);
    ctx.stroke();

    if (levelHasStar()) {
      ctx.save();
      ctx.shadowColor = colors.ember;
      ctx.shadowBlur = 12 + bloodLevel * 18;
      ctx.strokeStyle = `rgba(239, 58, 45, ${0.42 + bloodLevel * 0.44})`;
      ctx.lineWidth = 4.2;
      drawStarSigil(moonX, moonY + 1, 30);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = bloodLevel > 0.75 ? colors.bone : "rgba(242, 239, 229, 0.62)";
      ctx.lineWidth = 1.4;
      drawStarSigil(moonX, moonY + 1, 30);
      ctx.restore();
    }

    ctx.restore();

    ctx.fillStyle = "rgba(242, 239, 229, 0.7)";
    for (let i = 0; i < 44; i += 1) {
      const x = (i * 187 + Math.sin(i * 9.2) * 80 - cameraX * 0.08) % (VIEW_W + 80);
      const y = 24 + (i * 37) % 190;
      ctx.fillRect(x < -20 ? x + VIEW_W + 80 : x, y, 1, 1);
    }
  }

  function drawLevelBanner(time) {
    if (levelBannerTimer <= 0 || gameState !== "playing") {
      return;
    }

    const fadeIn = clamp((2.1 - levelBannerTimer) / 0.28, 0, 1);
    const fadeOut = clamp(levelBannerTimer / 0.42, 0, 1);
    const alpha = Math.min(fadeIn, fadeOut);
    const pulse = Math.sin(time * 12) * 2;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 64px Georgia, serif";
    ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
    ctx.fillRect(0, VIEW_H * 0.5 - 58, VIEW_W, 116);
    ctx.fillStyle = colors.bone;
    ctx.shadowColor = colors.blood;
    ctx.shadowBlur = 18;
    ctx.fillText(`LEVEL ${levelBannerLevel}`, VIEW_W / 2, VIEW_H / 2 + pulse);
    ctx.shadowBlur = 0;
    ctx.font = "900 18px Georgia, serif";
    ctx.fillStyle = colors.ember;
    ctx.fillText(levelSubtitle(), VIEW_W / 2, VIEW_H / 2 + 48);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function levelSubtitle() {
    if (currentLevel === 3) return "MOON SIGIL";
    if (currentLevel === 4) return "RED GATEKEEPER";
    if (currentLevel === 5) return "WINTER ALTAR";
    return "GRAVE MARCH";
  }

  function drawNotices(time) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 30px Georgia, serif";

    for (const notice of notices) {
      const fade = Math.min(1, notice.age / 0.18, (notice.life - notice.age) / 0.34);
      ctx.globalAlpha = Math.max(0, fade);
      ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
      ctx.fillRect(notice.x - 112, notice.y - 22, 224, 44);
      ctx.fillStyle = notice.color;
      ctx.shadowColor = notice.color;
      ctx.shadowBlur = 12 + Math.sin(time * 16) * 3;
      ctx.fillText(notice.text, notice.x, notice.y);
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function moonBloodLevel() {
    return clamp((player ? player.greenKills : 0) / Math.max(1, targetKills), 0, 1);
  }

  function snowZoneLevel() {
    if (iceRound) {
      return 1;
    }

    if (!gateOpen) {
      return 0;
    }

    return clamp((cameraX + VIEW_W * 0.5 - SNOW_X) / 520, 0, 1);
  }

  function mixRgb(from, to, amount) {
    const a = hexToRgb(from);
    const b = hexToRgb(to);
    const t = clamp(amount, 0, 1);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    return `rgb(${r}, ${g}, ${bl})`;
  }

  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function drawDistantShapes(time) {
    drawMountains(0.12, 405, "#111111", 80);
    drawMountains(0.22, 445, "#171514", 55);

    ctx.save();
    ctx.translate(-cameraX * 0.44, 0);

    for (const x of scenery.spires) {
      drawSpire(x, 296 + Math.sin(x) * 14);
    }

    for (const x of scenery.trees) {
      drawDeadTree(x, 476, 0.8 + (x % 4) * 0.08, time);
    }

    for (const x of scenery.graves) {
      drawGrave(x, 480, x % 3);
    }

    ctx.restore();
  }

  function drawMountains(parallax, baseY, color, step) {
    const offset = -cameraX * parallax;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-80, VIEW_H);

    for (let x = -120; x <= VIEW_W + 160; x += step) {
      const worldX = x - offset;
      const peak = baseY - 95 - Math.abs(Math.sin(worldX * 0.009)) * 120;
      ctx.lineTo(x, peak);
      ctx.lineTo(x + step * 0.5, baseY - 30 - Math.abs(Math.cos(worldX * 0.013)) * 72);
    }

    ctx.lineTo(VIEW_W + 140, VIEW_H);
    ctx.closePath();
    ctx.fill();
  }

  function drawSpire(x, y) {
    ctx.fillStyle = "#080808";
    ctx.strokeStyle = "#2c2a28";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x - 28, 492);
    ctx.lineTo(x - 18, y + 72);
    ctx.lineTo(x - 10, y + 72);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 10, y + 72);
    ctx.lineTo(x + 20, y + 72);
    ctx.lineTo(x + 31, 492);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#d9d7cf";
    ctx.fillRect(x - 2, y + 39, 4, 30);
    ctx.fillRect(x - 13, y + 51, 26, 4);
  }

  function drawDeadTree(x, groundY, scale, time) {
    ctx.save();
    ctx.translate(x, groundY);
    ctx.scale(scale, scale);
    ctx.strokeStyle = "#0a0a0a";
    ctx.lineWidth = 9;
    ctx.lineCap = "square";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(4, -74);
    ctx.lineTo(-4, -136);
    ctx.stroke();

    ctx.lineWidth = 5;
    const sway = Math.sin(time * 0.7 + x) * 3;
    branch(0, -70, -42, -100 + sway);
    branch(2, -84, 40, -124 - sway);
    branch(-3, -112, -32, -156 + sway);
    branch(-3, -116, 35, -158 - sway);
    branch(0, -134, 0, -178);

    ctx.strokeStyle = "rgba(216, 213, 202, 0.18)";
    ctx.lineWidth = 2;
    branch(-5, -128, -29, -150 + sway);
    ctx.restore();
  }

  function branch(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawGrave(x, y, style) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((style - 1) * 0.08);
    ctx.fillStyle = "#111";
    ctx.strokeStyle = "#37322e";
    ctx.lineWidth = 2;

    if (style === 1) {
      ctx.fillRect(-6, -42, 12, 42);
      ctx.fillRect(-20, -30, 40, 10);
    } else {
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(-15, -28);
      ctx.quadraticCurveTo(0, -48, 15, -28);
      ctx.lineTo(18, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPlatforms(time) {
    ctx.save();
    ctx.translate(-cameraX, 0);

    for (const platform of platforms) {
      drawPlatform(platform, time);
    }

    ctx.restore();
  }

  function drawPlatform(platform, time) {
    ctx.fillStyle = colors.stone;
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);

    ctx.fillStyle = "#080808";
    for (let x = platform.x; x < platform.x + platform.w; x += 48) {
      const jag = 12 + ((x * 17) % 19);
      ctx.beginPath();
      ctx.moveTo(x, platform.y + platform.h);
      ctx.lineTo(x + 24, platform.y + platform.h + jag);
      ctx.lineTo(x + 48, platform.y + platform.h);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = colors.stoneTop;
    ctx.fillRect(platform.x, platform.y, platform.w, 4);

    const snowStart = iceRound ? platform.x : Math.max(platform.x, SNOW_X);
    const snowW = platform.x + platform.w - snowStart;
    if (snowW > 0 && (gateOpen || iceRound)) {
      ctx.fillStyle = "rgba(242, 239, 229, 0.9)";
      ctx.fillRect(snowStart, platform.y - 4, snowW, 7);
      ctx.fillStyle = "rgba(157, 17, 24, 0.18)";
      for (let x = snowStart + 30; x < platform.x + platform.w - 24; x += 140) {
        ctx.fillRect(x, platform.y - 2, 18, 3);
      }
    }

    ctx.strokeStyle = "rgba(242, 239, 229, 0.16)";
    ctx.lineWidth = 1;
    for (let x = platform.x + 18; x < platform.x + platform.w - 20; x += 82) {
      const crack = Math.sin((x + time * 12) * 0.11) * 10;
      ctx.beginPath();
      ctx.moveTo(x, platform.y + 8);
      ctx.lineTo(x + 13 + crack, platform.y + 20);
      ctx.lineTo(x + 6, platform.y + platform.h - 8);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(157, 17, 24, 0.35)";
    for (let x = platform.x + 32; x < platform.x + platform.w - 18; x += 170) {
      ctx.fillRect(x, platform.y + 4, 26, 3);
    }
  }

  function drawGate(time) {
    if (gateOpen) {
      return;
    }

    const gate = closedGate();
    const x = Math.round(gate.x - cameraX);
    const y = gate.y;

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
    ctx.fillRect(-10, 0, gate.w + 20, gate.h);

    ctx.fillStyle = "#0b0b0b";
    ctx.strokeStyle = "#d8d5ca";
    ctx.lineWidth = 2;
    ctx.fillRect(0, 0, gate.w, gate.h);
    ctx.strokeRect(0, 0, gate.w, gate.h);

    ctx.fillStyle = colors.bone;
    for (let i = 0; i < 6; i += 1) {
      const by = 28 + i * 54;
      ctx.fillRect(6, by, 26, 7);
      ctx.fillRect(15, by - 18, 8, 42);
    }

    ctx.strokeStyle = colors.blood;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(7, 92);
    ctx.lineTo(31, 124);
    ctx.lineTo(7, 156);
    ctx.lineTo(31, 188);
    ctx.stroke();

    ctx.fillStyle = `rgba(239, 58, 45, ${0.25 + Math.sin(time * 7) * 0.15})`;
    ctx.fillRect(8, gate.h - 42, 22, 24);
    ctx.restore();
  }

  function drawChests(time) {
    ctx.save();
    ctx.translate(-cameraX, 0);

    for (const chestItem of chests) {
      drawChest(chestItem, time);
    }

    ctx.restore();
  }

  function drawCoffins(time) {
    ctx.save();
    ctx.translate(-cameraX, 0);

    for (const box of coffins) {
      drawCoffin(box, time);
    }

    ctx.restore();
  }

  function drawSouls(time) {
    ctx.save();
    ctx.translate(-cameraX, 0);

    for (const spirit of souls) {
      drawSoul(spirit, time);
    }

    ctx.restore();
  }

  function drawDevils(time) {
    ctx.save();
    ctx.translate(-cameraX, 0);

    for (const imp of devils) {
      drawDevil(imp, time);
    }

    ctx.restore();
  }

  function drawPowerups(time) {
    ctx.save();
    ctx.translate(-cameraX, 0);

    for (const item of powerups) {
      drawSpeedPowerup(item, time);
    }

    ctx.restore();
  }

  function drawAltar(time) {
    if (!altar) {
      return;
    }

    ctx.save();
    ctx.translate(Math.round(altar.x - cameraX), altar.y);

    if (altar.broken) {
      ctx.fillStyle = "#111";
      ctx.fillRect(5, 43, 47, 19);
      ctx.fillStyle = colors.bone;
      ctx.fillRect(13, 36, 11, 11);
      ctx.fillRect(31, 38, 15, 9);
      ctx.restore();
      return;
    }

    const pulse = 0.32 + Math.sin(time * 5 + altar.pulse) * 0.14;
    ctx.fillStyle = `rgba(239, 58, 45, ${pulse})`;
    ctx.beginPath();
    ctx.ellipse(altar.w / 2, 22, 28, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#090909";
    ctx.strokeStyle = colors.bone;
    ctx.lineWidth = 2;
    ctx.fillRect(7, 22, 44, 40);
    ctx.strokeRect(7, 22, 44, 40);

    ctx.fillStyle = colors.bone;
    ctx.fillRect(25, 3, 8, 42);
    ctx.fillRect(14, 16, 30, 8);

    ctx.fillStyle = colors.blood;
    ctx.fillRect(13, 52, 32 * Math.max(0, altar.hp / altar.maxHp), 5);
    ctx.restore();
  }

  function drawCoffin(box, time) {
    ctx.save();
    ctx.translate(box.x, box.y);
    ctx.rotate(box.launched ? Math.sin(time * 16 + box.x) * 0.04 : 0);

    ctx.fillStyle = "#080808";
    ctx.fillRect(7, 1, box.w - 14, box.h - 1);

    ctx.fillStyle = "#21150c";
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(box.w - 14, 0);
    ctx.lineTo(box.w, 9);
    ctx.lineTo(box.w - 9, box.h);
    ctx.lineTo(9, box.h);
    ctx.lineTo(0, 9);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#3a2110";
    ctx.beginPath();
    ctx.moveTo(17, 5);
    ctx.lineTo(box.w - 17, 5);
    ctx.lineTo(box.w - 9, 12);
    ctx.lineTo(box.w - 14, box.h - 5);
    ctx.lineTo(14, box.h - 5);
    ctx.lineTo(9, 12);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = box.launched ? colors.ember : "#d8d5ca";
    ctx.lineWidth = box.launched ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(box.w - 14, 0);
    ctx.lineTo(box.w, 9);
    ctx.lineTo(box.w - 9, box.h);
    ctx.lineTo(9, box.h);
    ctx.lineTo(0, 9);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = colors.blood;
    ctx.fillRect(13, 13, box.w - 26, 3);

    ctx.strokeStyle = "rgba(8, 8, 8, 0.7)";
    ctx.lineWidth = 2;
    for (let x = 17; x < box.w - 12; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, 5);
      ctx.lineTo(x - 5, box.h - 5);
      ctx.stroke();
    }

    ctx.strokeStyle = "#5c3419";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(12, box.h - 4);
    ctx.lineTo(box.w - 12, box.h - 4);
    ctx.stroke();

    drawBasicCoffinCross(box);

    ctx.strokeStyle = colors.ember;
    ctx.lineWidth = 1;
    for (let i = 0; i < box.hitCount; i += 1) {
      const x = 9 + i * 7;
      ctx.beginPath();
      ctx.moveTo(x, 5);
      ctx.lineTo(x + 5, 14);
      ctx.lineTo(x + 1, 25);
      ctx.stroke();
    }

    if (box.launched) {
      ctx.globalAlpha = 0.35 + Math.sin(time * 20) * 0.12;
      ctx.fillStyle = colors.ember;
      ctx.fillRect(box.dir > 0 ? -12 : box.w + 4, 8, 10, 16);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function drawBasicCoffinCross(box) {
    const cx = box.w / 2;
    const cy = box.h / 2;
    const wood = "#8a4f24";
    const woodLight = "#c28a4a";
    const outline = "#080808";
    const stemH = Math.max(28, box.h - 8);
    const topY = cy - stemH / 2;

    ctx.save();
    ctx.fillStyle = outline;
    ctx.fillRect(cx - 4, topY - 1, 8, stemH + 2);
    ctx.fillRect(cx - 18, cy - 4, 36, 8);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = wood;
    ctx.fillRect(cx - 3, topY, 6, stemH);
    ctx.fillRect(cx - 17, cy - 3, 34, 6);
    ctx.restore();

    ctx.fillStyle = woodLight;
    ctx.fillRect(cx - 2, topY + 2, 1, stemH - 4);
    ctx.fillRect(cx - 15, cy - 2, 30, 1);
  }

  function drawSoul(spirit, time) {
    const dying = spirit.dying;
    const vulnerable = soulIsVulnerable(spirit);
    const armT = clamp(spirit.age / SOUL_ARM_DELAY, 0, 1);
    const deathT = dying ? clamp(spirit.deathAge / 0.58, 0, 1) : 0;
    const pulse = dying
      ? 0.92 - deathT * 0.46
      : (0.38 + armT * 0.34) + Math.sin(time * 5 + spirit.phase) * 0.16;
    const cx = spirit.x + spirit.w / 2;
    const cy = spirit.y + spirit.h / 2;

    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = dying ? "rgba(239, 58, 45, 0.26)" : "rgba(183, 245, 255, 0.22)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 28 + deathT * 12, 34 + deathT * 10, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!dying && !vulnerable) {
      ctx.strokeStyle = "rgba(183, 245, 255, 0.44)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 13, spirit.spawnY + 34);
      ctx.quadraticCurveTo(cx - 6, spirit.y + 30, cx - 10, spirit.y + 14);
      ctx.moveTo(cx + 13, spirit.spawnY + 34);
      ctx.quadraticCurveTo(cx + 6, spirit.y + 30, cx + 10, spirit.y + 14);
      ctx.stroke();
    }

    ctx.strokeStyle = dying ? colors.ember : (vulnerable ? colors.soul : "rgba(183, 245, 255, 0.52)");
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (dying) {
      ctx.moveTo(cx - 14, spirit.y + 4);
      ctx.lineTo(cx - 3, spirit.y + 2);
      ctx.moveTo(cx + 3, spirit.y + 2);
      ctx.lineTo(cx + 14, spirit.y + 4);
    } else {
      ctx.ellipse(cx, spirit.y + 4, 11, 4, 0, 0, Math.PI * 2);
    }
    ctx.stroke();

    ctx.fillStyle = dying ? "#d8d5ca" : colors.bone;
    ctx.beginPath();
    ctx.arc(cx, spirit.y + 13 + deathT * 2, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = dying ? "rgba(216, 213, 202, 0.72)" : "rgba(242, 239, 229, 0.9)";
    ctx.beginPath();
    ctx.moveTo(cx - 8, spirit.y + 21);
    ctx.quadraticCurveTo(cx, spirit.y + 32, cx - 7, spirit.y + 40);
    ctx.quadraticCurveTo(cx, spirit.y + 36, cx + 7, spirit.y + 40);
    ctx.quadraticCurveTo(cx, spirit.y + 32, cx + 8, spirit.y + 21);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = dying ? colors.ember : colors.soul;
    ctx.beginPath();
    ctx.moveTo(cx - 8, spirit.y + 22);
    ctx.quadraticCurveTo(cx - 30, spirit.y + 15 + deathT * 14, cx - 22, spirit.y + 34 + deathT * 8);
    ctx.quadraticCurveTo(cx - 12, spirit.y + 31, cx - 8, spirit.y + 22);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 8, spirit.y + 22);
    ctx.quadraticCurveTo(cx + 30, spirit.y + 15 + deathT * 14, cx + 22, spirit.y + 34 + deathT * 8);
    ctx.quadraticCurveTo(cx + 12, spirit.y + 31, cx + 8, spirit.y + 22);
    ctx.fill();

    if (dying) {
      ctx.strokeStyle = "#050505";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 6, spirit.y + 10);
      ctx.lineTo(cx - 1, spirit.y + 15);
      ctx.moveTo(cx - 1, spirit.y + 10);
      ctx.lineTo(cx - 6, spirit.y + 15);
      ctx.moveTo(cx + 1, spirit.y + 10);
      ctx.lineTo(cx + 6, spirit.y + 15);
      ctx.moveTo(cx + 6, spirit.y + 10);
      ctx.lineTo(cx + 1, spirit.y + 15);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#050505";
      ctx.fillRect(cx - 4, spirit.y + 12, 3, 2);
      ctx.fillRect(cx + 2, spirit.y + 12, 3, 2);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawDevil(imp, time) {
    const dying = imp.dying;
    const deathT = dying ? clamp(imp.deathAge / 0.8, 0, 1) : 0;
    const cx = imp.x + imp.w / 2;
    const foot = imp.y + imp.h;
    const hop = Math.sin(time * 18 + imp.phase) * (imp.onGround ? 2 : 4);

    ctx.save();
    ctx.globalAlpha = 1 - deathT * 0.42;
    ctx.translate(cx, foot + hop + deathT * 18);
    ctx.scale(imp.dir, 1);

    if (dying) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
      ctx.beginPath();
      ctx.ellipse(0, 5, 25 + deathT * 18, 8 + deathT * 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = colors.ember;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-27, 2);
      ctx.lineTo(-9, 6);
      ctx.lineTo(7, 3);
      ctx.lineTo(28, 7);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(239, 58, 45, 0.22)";
    ctx.beginPath();
    ctx.ellipse(0, -15, 22, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#070707";
    ctx.beginPath();
    ctx.moveTo(-10, -8);
    ctx.quadraticCurveTo(-12, -28, 0, -34);
    ctx.quadraticCurveTo(12, -28, 10, -8);
    ctx.lineTo(6, 0);
    ctx.lineTo(-7, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colors.ember;
    ctx.beginPath();
    ctx.moveTo(-7, -28);
    ctx.lineTo(-18, -42);
    ctx.lineTo(-5, -32);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(7, -28);
    ctx.lineTo(18, -42);
    ctx.lineTo(5, -32);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colors.redHot;
    ctx.fillRect(-6, -22, 4, 3);
    ctx.fillRect(3, -22, 4, 3);

    ctx.strokeStyle = colors.blood;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(6, -6);
    ctx.quadraticCurveTo(19, -11, 15, -24);
    ctx.stroke();

    ctx.strokeStyle = "#050505";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-6, -1);
    ctx.lineTo(-11, 6);
    ctx.moveTo(6, -1);
    ctx.lineTo(12, 6);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawSpeedPowerup(item, time) {
    const cx = item.x + item.w / 2;
    const cy = item.y + item.h / 2 + Math.sin(time * 8 + item.pulse) * 2;
    const alpha = item.pickupDelay > 0 ? 0.62 : 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(248, 231, 107, 0.22)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, 24, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.speed;
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy - 15);
    ctx.lineTo(cx - 9, cy + 2);
    ctx.lineTo(cx, cy + 2);
    ctx.lineTo(cx - 4, cy + 16);
    ctx.lineTo(cx + 12, cy - 4);
    ctx.lineTo(cx + 2, cy - 4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = colors.soul;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - 5);
    ctx.lineTo(cx - 28, cy - 13);
    ctx.moveTo(cx - 15, cy + 3);
    ctx.lineTo(cx - 30, cy + 8);
    ctx.moveTo(cx + 14, cy - 5);
    ctx.lineTo(cx + 28, cy - 13);
    ctx.moveTo(cx + 15, cy + 3);
    ctx.lineTo(cx + 30, cy + 8);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawChest(chestItem, time) {
    const bob = chestItem.opened ? 0 : Math.sin(time * 5 + chestItem.pulse) * 2;
    const x = chestItem.x;
    const y = chestItem.y + bob;

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = chestItem.opened ? "#151515" : "#21150c";
    ctx.fillRect(0, 9, chestItem.w, chestItem.h - 9);
    ctx.fillStyle = chestItem.opened ? "#0b0b0b" : "#3a0508";
    ctx.fillRect(3, 0, chestItem.w - 6, 16);
    ctx.fillStyle = "#d8d5ca";
    ctx.fillRect(18, 14, 8, 8);

    ctx.strokeStyle = "#080808";
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 9, chestItem.w, chestItem.h - 9);
    ctx.strokeRect(3, 0, chestItem.w - 6, 16);

    if (!chestItem.opened) {
      ctx.fillStyle = `rgba(239, 58, 45, ${0.22 + Math.sin(time * 8 + chestItem.pulse) * 0.12})`;
      ctx.fillRect(7, 4, chestItem.w - 14, 4);
    } else {
      ctx.fillStyle = "#050505";
      ctx.fillRect(6, 4, chestItem.w - 12, 7);
    }

    ctx.restore();
  }

  function drawKnight(knight, time) {
    const sx = Math.round(knight.x - cameraX);
    const sy = Math.round(knight.y);
    const flicker = knight.invuln > 0 && Math.floor(time * 18) % 2 === 0;

    if (flicker) {
      ctx.globalAlpha = 0.55;
    }

    ctx.save();
    ctx.translate(sx + knight.w / 2, sy);
    ctx.scale(knight.dir, 1);

    const stride = Math.sin(time * 12) * (Math.abs(knight.vx) > 30 && knight.onGround ? 4 : 1);
    const boosted = swordIsBoosted();
    const fast = speedIsBoosted();

    if (fast) {
      ctx.globalAlpha = 0.26;
      ctx.fillStyle = colors.speed;
      for (let i = 1; i <= 3; i += 1) {
        ctx.fillRect(-(18 + i * 12), 23 + i * 4, 22 - i * 3, 5);
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "#3a0508";
    ctx.beginPath();
    ctx.moveTo(-12, 18);
    ctx.lineTo(-27, 58);
    ctx.lineTo(10, 55);
    ctx.lineTo(8, 20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#070707";
    ctx.fillRect(-13, 17, 27, 28);
    ctx.fillStyle = "#bdb7aa";
    ctx.fillRect(-10, 20, 21, 4);
    ctx.fillRect(-5, 24, 4, 19);
    ctx.fillStyle = "#050505";
    ctx.fillRect(-12, 43, 10, 15 + stride);
    ctx.fillRect(4, 43, 10, 15 - stride);

    ctx.fillStyle = "#cfc8ba";
    ctx.beginPath();
    ctx.moveTo(-15, 18);
    ctx.lineTo(-11, 2);
    ctx.lineTo(0, -7);
    ctx.lineTo(13, 2);
    ctx.lineTo(16, 18);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#050505";
    ctx.fillRect(-10, 8, 20, 4);
    ctx.fillStyle = "#e8e1d5";
    ctx.fillRect(-15, 16, 31, 4);
    ctx.fillStyle = "#0b0b0b";
    ctx.beginPath();
    ctx.moveTo(-12, 4);
    ctx.lineTo(-34, -8);
    ctx.lineTo(-13, 13);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, 4);
    ctx.lineTo(34, -8);
    ctx.lineTo(13, 13);
    ctx.closePath();
    ctx.fill();

    if (boosted) {
      ctx.globalAlpha = 0.36;
      ctx.fillStyle = colors.ember;
      ctx.beginPath();
      ctx.ellipse(8, 34, 34, 48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = boosted ? colors.ember : colors.bone;
    ctx.lineWidth = boosted ? 6 : 4;
    ctx.beginPath();
    ctx.moveTo(12, 27);

    if (knight.attackTimer > 0.1) {
      ctx.lineTo(boosted ? 94 : 71, boosted ? 5 : 13);
      ctx.stroke();
      ctx.fillStyle = boosted ? colors.bone : colors.bone;
      ctx.fillRect(boosted ? 88 : 68, boosted ? 0 : 9, boosted ? 28 : 19, boosted ? 10 : 7);
    } else {
      ctx.lineTo(34, 64);
      ctx.stroke();
    }

    ctx.fillStyle = "#211a16";
    ctx.fillRect(8, 26, 15, 7);
    ctx.restore();

    ctx.globalAlpha = 1;
  }

  function drawZombie(enemy, time) {
    const sx = Math.round(enemy.x - cameraX);
    const sy = Math.round(enemy.y);
    const lean = enemy.hitTimer > 0 ? enemy.dir * -0.18 : Math.sin(time * 4 + enemy.x) * 0.08;
    const alpha = enemy.dead ? 0.38 : 1;
    const red = enemy.type === "red";
    const bodyRx = red ? 34 : 24;
    const bodyRy = red ? 30 : 22;
    const bodyY = red ? -48 : -35;
    const walk = Math.sin(time * (red ? 7.5 : 10) + enemy.x * 0.07) * (enemy.dead ? 0 : 4);
    const meatColor = enemy.hitTimer > 0 ? colors.bone : (red ? "#8f1117" : "#7b4b32");
    const meatDark = red ? "#3c070a" : "#311810";
    const crust = red ? colors.redHot : "#b86c42";
    const eyeColor = red ? colors.ember : colors.rot;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(sx + enemy.w / 2, sy + enemy.h);
    ctx.scale(enemy.dir, 1);
    ctx.rotate(lean);

    ctx.fillStyle = "rgba(0, 0, 0, 0.36)";
    ctx.beginPath();
    ctx.ellipse(0, -2, red ? 36 : 25, red ? 9 : 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#090909";
    ctx.lineCap = "round";
    ctx.lineWidth = red ? 8 : 6;
    ctx.beginPath();
    ctx.moveTo(red ? -14 : -9, red ? -24 : -17);
    ctx.lineTo(red ? -23 : -16, -3 - walk);
    ctx.moveTo(red ? 13 : 9, red ? -24 : -17);
    ctx.lineTo(red ? 24 : 16, -3 + walk);
    ctx.stroke();

    ctx.fillStyle = "#050505";
    ctx.beginPath();
    ctx.ellipse(red ? -24 : -16, -1 - walk, red ? 11 : 8, red ? 4 : 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(red ? 25 : 16, -1 + walk, red ? 11 : 8, red ? 4 : 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = meatDark;
    ctx.beginPath();
    ctx.ellipse(0, bodyY + 4, bodyRx + 3, bodyRy + 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = meatColor;
    ctx.beginPath();
    ctx.ellipse(0, bodyY, bodyRx, bodyRy, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = crust;
    for (let i = 0; i < (red ? 9 : 6); i += 1) {
      const angle = i * 1.91 + enemy.x * 0.01;
      const spotX = Math.cos(angle) * bodyRx * 0.48;
      const spotY = bodyY + Math.sin(angle * 1.3) * bodyRy * 0.52;
      ctx.globalAlpha = alpha * (red ? 0.42 : 0.32);
      ctx.beginPath();
      ctx.ellipse(spotX, spotY, red ? 6 : 4, red ? 4 : 3, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = alpha;

    ctx.strokeStyle = "rgba(242, 239, 229, 0.18)";
    ctx.lineWidth = red ? 4 : 3;
    ctx.beginPath();
    ctx.arc(-8, bodyY - 6, bodyRx * 0.58, Math.PI * 1.08, Math.PI * 1.62);
    ctx.stroke();

    ctx.fillStyle = "#050505";
    ctx.beginPath();
    ctx.ellipse(red ? -12 : -8, bodyY - 5, red ? 6 : 4, red ? 7 : 5, -0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(red ? 11 : 8, bodyY - 5, red ? 6 : 4, red ? 7 : 5, 0.16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = eyeColor;
    ctx.fillRect(red ? -14 : -9, bodyY - 7, red ? 4 : 3, red ? 3 : 2);
    ctx.fillRect(red ? 9 : 7, bodyY - 7, red ? 4 : 3, red ? 3 : 2);

    ctx.strokeStyle = red ? colors.bone : "#050505";
    ctx.lineWidth = red ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(red ? -16 : -10, bodyY + 12);
    ctx.quadraticCurveTo(0, bodyY + (red ? 20 : 15), red ? 16 : 10, bodyY + 12);
    ctx.stroke();

    if (red) {
      ctx.fillStyle = "#050505";
      ctx.beginPath();
      ctx.moveTo(-21, bodyY - bodyRy + 8);
      ctx.lineTo(-43, bodyY - bodyRy - 20);
      ctx.lineTo(-13, bodyY - bodyRy);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(21, bodyY - bodyRy + 8);
      ctx.lineTo(43, bodyY - bodyRy - 20);
      ctx.lineTo(13, bodyY - bodyRy);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = "#141414";
    ctx.lineWidth = red ? 6 : 4;
    ctx.beginPath();
    ctx.moveTo(red ? -26 : -18, bodyY - 4);
    ctx.lineTo(red ? -43 : -31, bodyY + 7 + Math.sin(time * 9) * 3);
    ctx.moveTo(red ? 26 : 18, bodyY - 4);
    ctx.lineTo(red ? 43 : 31, bodyY + 4 + Math.cos(time * 7) * 3);
    ctx.stroke();

    if (red && (enemy.bossWindup > 0 || enemy.bossStrike > 0)) {
      const striking = enemy.bossStrike > 0;
      ctx.strokeStyle = striking ? colors.bone : colors.ember;
      ctx.lineWidth = striking ? 8 : 6;
      ctx.beginPath();
      ctx.moveTo(28, bodyY - 5);
      if (striking) {
        ctx.lineTo(83, bodyY + 14);
        ctx.lineTo(96, bodyY + 7);
      } else {
        ctx.lineTo(42, bodyY - 52);
        ctx.lineTo(50, bodyY - 65);
      }
      ctx.stroke();

      ctx.fillStyle = striking ? colors.blood : colors.ember;
      ctx.fillRect(striking ? 79 : 43, striking ? bodyY + 9 : bodyY - 69, striking ? 26 : 11, striking ? 9 : 22);
    }

    if (enemy.spiked) {
      ctx.fillStyle = colors.bone;
      const top = bodyY - bodyRy - 6;
      const left = red ? -31 : -22;
      const right = red ? 31 : 22;
      for (let x = left; x <= right; x += red ? 10 : 8) {
        ctx.beginPath();
        ctx.moveTo(x, top + 20);
        ctx.lineTo(x + 5, top);
        ctx.lineTo(x + 10, top + 20);
        ctx.closePath();
        ctx.fill();
      }

      ctx.strokeStyle = colors.ember;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, bodyY, red ? 41 : 29, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (!enemy.dead) {
      ctx.fillStyle = "#080808";
      ctx.fillRect(red ? -25 : -16, bodyY - bodyRy - 14, red ? 50 : 32, red ? 5 : 3);
      ctx.fillStyle = red ? colors.redHot : colors.blood;
      ctx.fillRect(red ? -25 : -16, bodyY - bodyRy - 14, (red ? 50 : 32) * Math.max(0, enemy.hp / enemy.maxHp), red ? 5 : 3);
    }

    ctx.restore();
  }

  function drawSlash(time) {
    const blade = slashRect();
    const x = blade.x - cameraX;
    const y = blade.y;
    const boosted = swordIsBoosted();

    ctx.save();
    ctx.globalAlpha = boosted ? 0.86 : 0.72;
    ctx.fillStyle = boosted ? colors.ember : colors.bone;
    ctx.beginPath();
    if (player.dir > 0) {
      ctx.moveTo(x + 4, y + blade.h - 6);
      ctx.lineTo(x + blade.w, y);
      ctx.lineTo(x + blade.w - 7, y + blade.h - 4);
    } else {
      ctx.moveTo(x + blade.w - 4, y + blade.h - 6);
      ctx.lineTo(x, y);
      ctx.lineTo(x + 7, y + blade.h - 4);
    }
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = (boosted ? 0.65 : 0.44) + Math.sin(time * 80) * 0.12;
    ctx.fillStyle = boosted ? colors.bone : colors.blood;
    ctx.fillRect(x + 8, y + blade.h - 6, blade.w - 16, boosted ? 6 : 4);
    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    ctx.translate(-cameraX, 0);

    for (const particle of particles) {
      const alpha = 1 - particle.age / particle.life;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawMoonRays(time) {
    ctx.save();

    for (const ray of moonRays) {
      const segment = raySegment(ray);
      const fade = 1 - ray.age / ray.life;
      const pulse = 0.58 + Math.sin(time * 22 + ray.angle) * 0.18;
      ctx.globalAlpha = Math.max(0, fade) * pulse;
      ctx.strokeStyle = ray.cutBySword ? colors.bone : colors.ember;
      ctx.lineWidth = ray.width;
      ctx.beginPath();
      ctx.moveTo(segment.x1, segment.y1);
      ctx.lineTo(segment.x2, segment.y2);
      ctx.stroke();

      ctx.globalAlpha = Math.max(0, fade) * 0.75;
      ctx.strokeStyle = colors.blood;
      ctx.lineWidth = Math.max(2, ray.width * 0.38);
      ctx.beginPath();
      ctx.moveTo(segment.x1, segment.y1);
      ctx.lineTo(segment.x2, segment.y2);
      ctx.stroke();
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawWeather(time) {
    const snow = snowZoneLevel();

    if (snow > 0) {
      drawSnow(time, snow);
      return;
    }

    drawForegroundAsh(time);
  }

  function drawSnow(time, amount) {
    ctx.save();
    ctx.globalAlpha = 0.35 + amount * 0.45;
    ctx.fillStyle = colors.bone;

    for (let i = 0; i < 110; i += 1) {
      const speed = 18 + (i % 7) * 9;
      const drift = Math.sin(time * 0.9 + i) * (14 + amount * 16);
      const x = (i * 83 + cameraX * 0.24 + drift) % (VIEW_W + 50) - 25;
      const y = (i * 47 + time * speed) % (VIEW_H + 36) - 18;
      const size = i % 5 === 0 ? 3 : 2;
      ctx.fillRect(x, y, size, size);
    }

    ctx.globalAlpha = amount * 0.18;
    ctx.fillStyle = colors.bone;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
  }

  function drawForegroundAsh(time) {
    ctx.fillStyle = "rgba(242, 239, 229, 0.5)";

    for (let i = 0; i < 76; i += 1) {
      const x = (i * 71 + time * (10 + (i % 7) * 3)) % (VIEW_W + 40) - 20;
      const y = (i * 97 + time * (18 + (i % 5))) % (VIEW_H + 30) - 15;
      ctx.fillRect(x, y, i % 3 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
    }
  }

  function drawStarSigil(x, y, radius) {
    ctx.beginPath();
    for (let i = 0; i <= 5; i += 1) {
      const angle = Math.PI / 2 + i * Math.PI * 0.8;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  }

  function intersects(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function segmentIntersectsRect(segment, rect) {
    const pad = segment.width || 0;
    const box = {
      x: rect.x - pad,
      y: rect.y - pad,
      w: rect.w + pad * 2,
      h: rect.h + pad * 2
    };

    if (pointInRect(segment.x1, segment.y1, box) || pointInRect(segment.x2, segment.y2, box)) {
      return true;
    }

    const edges = [
      [box.x, box.y, box.x + box.w, box.y],
      [box.x + box.w, box.y, box.x + box.w, box.y + box.h],
      [box.x + box.w, box.y + box.h, box.x, box.y + box.h],
      [box.x, box.y + box.h, box.x, box.y]
    ];

    return edges.some((edge) => linesIntersect(segment.x1, segment.y1, segment.x2, segment.y2, edge[0], edge[1], edge[2], edge[3]));
  }

  function pointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  function linesIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    const d1 = direction(x3, y3, x4, y4, x1, y1);
    const d2 = direction(x3, y3, x4, y4, x2, y2);
    const d3 = direction(x1, y1, x2, y2, x3, y3);
    const d4 = direction(x1, y1, x2, y2, x4, y4);

    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  }

  function direction(ax, ay, bx, by, cx, cy) {
    return (cx - ax) * (by - ay) - (cy - ay) * (bx - ax);
  }

  function approach(value, target, amount) {
    if (value < target) {
      return Math.min(value + amount, target);
    }
    if (value > target) {
      return Math.max(value - amount, target);
    }
    return target;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function isJumpKey(code) {
    return code === "ArrowUp" || code === "KeyW" || code === "Space";
  }

  function isAttackKey(code) {
    return code === "KeyJ" || code === "KeyK" || code === "KeyE" || code === "Enter";
  }

  function isGameKey(code) {
    return (
      code === "ArrowLeft" ||
      code === "ArrowRight" ||
      code === "ArrowUp" ||
      code === "ArrowDown" ||
      code === "KeyA" ||
      code === "KeyD" ||
      code === "KeyW" ||
      code === "KeyS" ||
      code === "Space" ||
      code === "KeyJ" ||
      code === "KeyK" ||
      code === "KeyE" ||
      code === "Enter"
    );
  }

  function handleOverlayAction() {
    if (gameState === "lost") {
      retryCurrentLevel();
      return;
    }

    resetGame();
  }

  function acceptsOverlayAction() {
    return gameState === "intro" || gameState === "lost" || gameState === "won";
  }

  function handleKeyDown(event) {
    if (isGameKey(event.code)) {
      event.preventDefault();
    }

    if (acceptsOverlayAction() && (event.code === "Enter" || event.code === "Space")) {
      handleOverlayAction();
      return;
    }

    keys.add(event.code);

    if (isJumpKey(event.code)) {
      jumpQueued = true;
    }

    if (isAttackKey(event.code)) {
      startAttack();
    }
  }

  function handleKeyUp(event) {
    keys.delete(event.code);
  }

  function handlePointerAttack(event) {
    if (event.target.closest(".touch-controls") || event.target.closest(".screen-overlay")) {
      return;
    }

    ensureAudio();
    if (gameState === "playing") {
      startAttack();
    }
  }

  function bindTouchControls() {
    for (const button of document.querySelectorAll("[data-touch]")) {
      const action = button.dataset.touch;

      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        button.classList.add("is-held");
        touch[action] = true;
        ensureAudio();

        if (action === "jump") {
          jumpQueued = true;
        }

        if (action === "attack") {
          startAttack();
        }
      });

      const release = (event) => {
        if (event.pointerId !== undefined && button.hasPointerCapture(event.pointerId)) {
          button.releasePointerCapture(event.pointerId);
        }
        button.classList.remove("is-held");
        touch[action] = false;
      };

      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("pointerleave", release);
    }
  }

  function loop(time) {
    const seconds = time / 1000;
    const dt = Math.min(0.033, seconds - previousTime || 0);
    previousTime = seconds;
    update(dt);
    requestAnimationFrame(loop);
  }

  startButton.addEventListener("click", handleOverlayAction);
  muteButton.addEventListener("click", () => {
    audio.muted = !audio.muted;
    muteButton.setAttribute("aria-pressed", String(audio.muted));

    if (audio.muted) {
      stopMusic();
    } else {
      ensureAudio();
      startMusic();
      playSound("start");
    }
  });

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  canvas.addEventListener("pointerdown", handlePointerAttack);
  bindTouchControls();

  player = newPlayer();
  currentLevel = 1;
  zombies = spawnZombies();
  chests = spawnChests();
  coffins = [];
  souls = [];
  devils = [];
  powerups = [];
  notices = [];
  altar = null;
  moonRays = [];
  particles = [];
  soulStats = {
    ascended: 0,
    hell: 0,
    stuck: 0
  };
  targetKills = levelConfig().target;
  updateUi(true);
  draw(0);
  requestAnimationFrame(loop);
})();
