'use strict';
/* 預影 — 玩法驗證 Demo。邏輯(update*)與繪製(render)分離。 */

var CW = (window.Art && Art.canvas && Art.canvas.width) || 720;
var CH = (window.Art && Art.canvas && Art.canvas.height) || 1280;

/* ===== 參數(spec 數值參數表) ===== */
var DT = 1 / 60;
var GRAV = 2400;
var JUMP_V = 900;
var WALK = 260;
var PW = 40, PH = 56;
var HOOK_RANGE = 160;
var HOOK_TIME = 0.12;
var SWING_STRONG = 1200;
var SWING_WEAK = 650;
var PREVIEW_AHEAD = 30;
var GATE_DELAY = 0.3;
var MAX_GEN = 3;
var DYING_TIME = 0.6;
var MAX_FRAMES = 3600; // 60 秒 * 60 幀
var EPS = 0.01;

/* ===== 關卡配置 ===== */
var Level = {
  ground: { x: 0, y: 1200, w: 600, h: 80 },
  plat1: { x: 0, y: 1000, w: 480, h: 24 },
  plat2: { x: 240, y: 580, w: 480, h: 24 },
  spike: { x: 0, y: 976, w: 60, h: 24 },
  plate: { x: 80, y: 988, w: 80, h: 12 },
  gate: { x: 560, y: 360, w: 24, h: 220 },
  goal: { x: 640, y: 500, w: 48, h: 80 },
  spawn: { x: 60, y: 1144 },
  plateSurfaceY: 1000
};

/* ===== 佔位(style.md 沒有的圖形) ===== */
var Placeholder = {
  helpPageCount: (window.Art && Art.guidePages) || 7,
  // 遊戲中叫出說明的提示
  drawHint: function (ctx) {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(200,200,220,0.6)';
    ctx.font = '18px sans-serif';
    ctx.fillText('H 說明   R 整關重來', 10, CH - 10);
    ctx.restore();
  }
};

/* ===== 狀態 ===== */
var Input = { left: false, right: false, jump: false, hook: false };
var G = {
  phase: 'play',      // play | dying | win | lose
  gen: 1,
  hookLeft: 1,
  records: [],        // 已結束各代的紀錄(第 1 代在 [0])
  rec: [],            // 本代錄製中
  ghost: null,        // { rec, points, gen }
  tick: 0,            // 本代出生後經過幀數
  player: null,
  gate: { open: false, timer: 0 },
  plateDown: false,
  dyingT: 0,
  replay: [],         // 過關回放 [{rec, gen, i}]
  helpOpen: true,
  helpPage: 0,
  helpFromGame: false
};

/* ===== 工具 ===== */
function overlapX(ax, aw, bx, bw) { return ax < bx + bw && ax + aw > bx; }
function overlapRect(ax, ay, aw, ah, b) {
  return ax < b.x + b.w && ax + aw > b.x && ay < b.y + b.h && ay + ah > b.y;
}

function ghostFrame(i) {
  var g = G.ghost;
  if (!g) return null;
  var n = g.rec.length;
  return g.rec[((i % n) + n) % n];
}

function buildPoints(rec) {
  var pts = [];
  for (var i = 0; i < rec.length; i++) {
    var f = rec[i];
    pts.push({ x: f.x + PW / 2, y: f.y + PH / 2, mode: f.m });
  }
  return pts;
}

// 腳底與開關所在平台表面同高、著地、水平重疊
function plateMode(x, y, grounded) {
  if (!grounded) return 'air';
  var p = Level.plate;
  if (Math.abs(y + PH - Level.plateSurfaceY) < EPS && overlapX(x, PW, p.x, p.w)) return 'plate';
  return 'ground';
}

/* ===== 開局 / 換代 ===== */
function newRun() {
  G.records = [];
  G.gen = 1;
  G.phase = 'play';
  G.replay = [];
  spawnGen();
}

function spawnGen() {
  var s = Level.spawn;
  G.player = {
    x: s.x, y: s.y, vx: 0, vy: 0, facing: 1,
    grounded: true, ride: false, state: 'idle',
    hook: null, hookLine: null
  };
  G.rec = [];
  G.tick = 0;
  G.hookLeft = 1;
  G.dyingT = 0;
  G.phase = 'play';
  if (G.gen > 1) {
    var r = G.records[G.records.length - 1];
    G.ghost = { rec: r, points: buildPoints(r), gen: G.gen - 1 };
  } else {
    G.ghost = null;
  }
  G.gate = { open: false, timer: 0 };
  Input.jump = false;
  Input.hook = false;
  pushFrame();
  updatePlateGate();
}

function pushFrame() {
  var p = G.player;
  var hl = p.hookLine;
  G.rec.push({
    x: p.x, y: p.y, f: p.facing, s: p.state, g: p.grounded,
    m: plateMode(p.x, p.y, p.grounded),
    hk: hl ? { x1: hl.x1, y1: hl.y1, x2: hl.x2, y2: hl.y2 } : null
  });
}

/* ===== 鉤爪 ===== */
function canHook() {
  var p = G.player;
  if (!G.ghost || G.hookLeft <= 0 || !p || p.hook || G.phase !== 'play') return false;
  var gc = ghostFrame(G.tick);
  var dx = (p.x + PW / 2) - (gc.x + PW / 2);
  var dy = (p.y + PH / 2) - (gc.y + PH / 2);
  return Math.sqrt(dx * dx + dy * dy) <= HOOK_RANGE;
}

// 回傳 true 表示本幀被拉動吃掉
function stepHook(p, gc, wrap) {
  var h = p.hook;
  if (wrap) { // 規則 21: 幽靈循環跳回第 0 幀, 鉤爪中斷
    p.hook = null;
    p.vx = 0; p.vy = 0;
    p.grounded = false; p.ride = false;
    return false;
  }
  h.el += DT;
  var t = Math.min(1, h.el / HOOK_TIME);
  var tx = gc.x, ty = gc.y - PH;
  if (tx !== p.x) p.facing = tx > p.x ? 1 : -1;
  p.x = h.sx + (tx - h.sx) * t;
  p.y = h.sy + (ty - h.sy) * t;
  p.hookLine = { x1: p.x + PW / 2, y1: p.y + PH / 2, x2: gc.x + PW / 2, y2: gc.y };
  p.state = 'hook';
  if (h.el >= HOOK_TIME - 1e-9) {
    p.x = tx; p.y = ty;
    p.vx = 0;
    p.vy = gc.g ? -SWING_WEAK : -SWING_STRONG; // 幽靈著地 → 弱甩; 騰空 → 強甩
    p.grounded = false; p.ride = false;
    p.hook = null;
  }
  return true;
}

/* ===== 玩家更新 ===== */
function solidRects() {
  var l = [Level.ground];
  if (!G.gate.open) l.push(Level.gate);
  return l;
}

function updatePlayer() {
  var p = G.player;
  var jump = Input.jump, zp = Input.hook;
  Input.jump = false; Input.hook = false;
  p.hookLine = null;

  var gc = ghostFrame(G.tick);
  var gp = ghostFrame(G.tick - 1);
  var wrap = !!G.ghost && (G.tick % G.ghost.rec.length === 0);
  if (wrap) gp = gc;

  if (!p.hook && zp && canHook()) {
    p.hook = { el: 0, sx: p.x, sy: p.y };
    G.hookLeft = 0;
  }
  if (p.hook) {
    if (stepHook(p, gc, wrap)) return;
  }

  var dir = (Input.left ? -1 : 0) + (Input.right ? 1 : 0);
  p.vx = dir * WALK;
  if (dir) p.facing = dir;

  // 規則 12/13: 跟著幽靈移動; 循環回頭時離開
  var carry = 0;
  if (p.ride) {
    if (gc && !wrap) {
      carry = gc.x - gp.x;
      p.y = gc.y - PH;
    } else {
      p.ride = false; p.grounded = false; p.vy = 0;
    }
  }
  var wasRide = p.ride;

  if (jump && p.grounded) {
    p.vy = -JUMP_V;
    p.grounded = false;
    p.ride = false;
    wasRide = false;
  }

  // 水平移動 + 實心物碰撞
  var prevX = p.x;
  p.x += carry + p.vx * DT;
  if (p.x < 0) p.x = 0;
  if (p.x > CW - PW) p.x = CW - PW;
  var solids = solidRects();
  for (var i = 0; i < solids.length; i++) {
    var r = solids[i];
    if (overlapRect(p.x, p.y, PW, PH, r) && p.y + PH > r.y + EPS) {
      if (prevX + PW <= r.x + EPS) p.x = r.x - PW;
      else if (prevX >= r.x + r.w - EPS) p.x = r.x + r.w;
    }
  }

  // 垂直移動
  var prevBottom = p.y + PH;
  var dy = p.vy * DT + 0.5 * GRAV * DT * DT;
  p.vy += GRAV * DT;
  p.y += dy;
  p.grounded = false;
  p.ride = false;
  if (p.vy >= 0) {
    var bottom = p.y + PH;
    var best = Infinity, onGhost = false;
    var tops = [Level.ground, Level.plat1, Level.plat2];
    if (!G.gate.open) tops.push(Level.gate);
    for (var j = 0; j < tops.length; j++) {
      var q = tops[j];
      if (overlapX(p.x, PW, q.x, q.w) && prevBottom <= q.y + EPS && bottom >= q.y && q.y < best) {
        best = q.y; onGhost = false;
      }
    }
    if (gc && overlapX(p.x, PW, gc.x, PW) && bottom >= gc.y &&
        (wasRide || prevBottom <= gp.y + EPS) && gc.y < best - 0.001) {
      best = gc.y; onGhost = true;
    }
    if (best < Infinity) {
      p.y = best - PH;
      p.vy = 0;
      p.grounded = true;
      p.ride = onGhost;
    }
  }

  if (p.hook) p.state = 'hook';
  else if (!p.grounded) p.state = 'air';
  else p.state = p.vx !== 0 ? 'run' : 'idle';
}

/* ===== 開關 / 門 ===== */
function updateGate(pressed, playerPresent) {
  var g = G.gate;
  G.plateDown = pressed;
  if (pressed) {
    g.open = true;
    g.timer = GATE_DELAY;
  } else if (g.open) {
    g.timer -= DT;
    if (g.timer <= 0) {
      var p = G.player;
      var blocked = playerPresent && p && overlapRect(p.x, p.y, PW, PH, Level.gate);
      if (!blocked) g.open = false; // 規則 24: 角色與門重疊時延後
    }
  }
}

function updatePlateGate() {
  var pressed = false;
  var p = G.player;
  var present = G.phase === 'play' && !!p;
  if (present && plateMode(p.x, p.y, p.grounded) === 'plate') pressed = true;
  if (G.ghost && ghostFrame(G.tick).m === 'plate') pressed = true;
  updateGate(pressed, present);
}

/* ===== 死亡 / 過關 ===== */
function checkDeath() {
  var p = G.player;
  if (overlapRect(p.x, p.y, PW, PH, Level.spike)) return true;
  if (p.y >= CH) return true; // 掉出畫面下緣
  if (G.rec.length >= MAX_FRAMES) return true; // 錄滿 60 秒
  return false;
}

function startDying() {
  G.phase = 'dying';
  G.dyingT = 0;
  G.player.state = 'dead';
  G.player.hook = null;
  G.records.push(G.rec);
}

function startWin() {
  G.phase = 'win';
  var recs = G.records.slice();
  recs.push(G.rec);
  G.replay = [];
  for (var i = 0; i < recs.length; i++) G.replay.push({ rec: recs[i], gen: i + 1, i: 0 });
  G.gate = { open: false, timer: 0 };
  G.plateDown = false;
}

/* ===== 每幀更新 ===== */
function stepGame() {
  if (G.helpOpen) return;
  if (G.phase === 'play') {
    G.tick++;
    updatePlayer();
    updatePlateGate();
    pushFrame();
    var p = G.player;
    if (checkDeath()) {
      startDying();
    } else if (overlapRect(p.x, p.y, PW, PH, Level.goal)) {
      startWin();
    }
  } else if (G.phase === 'dying') {
    G.tick++;
    G.dyingT += DT;
    updatePlateGate();
    if (G.dyingT >= DYING_TIME - 1e-9) {
      if (G.gen < MAX_GEN) { G.gen++; spawnGen(); }
      else G.phase = 'lose';
    }
  } else if (G.phase === 'lose') {
    G.tick++;
    updatePlateGate();
  } else if (G.phase === 'win') {
    var pressed = false;
    for (var i = 0; i < G.replay.length; i++) {
      var e = G.replay[i];
      e.i = (e.i + 1) % e.rec.length;
      if (e.rec[e.i].m === 'plate') pressed = true;
    }
    updateGate(pressed, false);
  }
}

/* ===== 繪製(只讀狀態) ===== */
function render(ctx) {
  if (G.helpOpen) {
    Art.drawGuidePage(ctx, { page: G.helpPage });
    return;
  }
  Art.drawBackground(ctx, {});
  var L = Level, g, i;
  Art.drawPlatform(ctx, { x: L.ground.x, y: L.ground.y, w: L.ground.w, h: L.ground.h });
  Art.drawPlatform(ctx, { x: L.plat1.x, y: L.plat1.y, w: L.plat1.w, h: L.plat1.h });
  Art.drawPlatform(ctx, { x: L.plat2.x, y: L.plat2.y, w: L.plat2.w, h: L.plat2.h });
  Art.drawSpike(ctx, { x: L.spike.x, y: L.spike.y, w: L.spike.w });
  Art.drawPlate(ctx, { x: L.plate.x, y: L.plate.y, pressed: G.plateDown });
  Art.drawGate(ctx, { x: L.gate.x, y: L.gate.y, open: G.gate.open });
  Art.drawGoal(ctx, { x: L.goal.x, y: L.goal.y });

  if (G.phase === 'win') {
    for (i = 0; i < G.replay.length; i++) {
      var e = G.replay[i], f = e.rec[e.i];
      Art.drawGhost(ctx, { x: f.x, y: f.y, facing: f.f, state: f.s, gen: e.gen, hookable: false });
      if (f.hk) Art.drawHook(ctx, f.hk);
    }
  } else {
    g = G.ghost;
    if (g) {
      var n = g.rec.length;
      var gi = G.tick % n;
      var gf = g.rec[gi];
      Art.drawGhostPath(ctx, { points: g.points, progress: gi });
      var pf = g.rec[(gi + PREVIEW_AHEAD) % n];
      Art.drawGhostPreview(ctx, { x: pf.x, y: pf.y, facing: pf.f, state: pf.s, gen: g.gen });
      Art.drawGhost(ctx, {
        x: gf.x, y: gf.y, facing: gf.f, state: gf.s, gen: g.gen,
        hookable: G.phase === 'play' && canHook()
      });
      if (gf.hk) Art.drawHook(ctx, gf.hk);
    }
    var p = G.player;
    if (p.hookLine) Art.drawHook(ctx, p.hookLine);
    Art.drawPlayer(ctx, { x: p.x, y: p.y, facing: p.facing, state: p.state, gen: G.gen });
  }
  Art.drawHud(ctx, { gen: G.gen, maxGen: MAX_GEN, phase: G.phase, hookLeft: G.hookLeft, hookMax: 1 });
  if (G.phase === 'play' || G.phase === 'dying') Placeholder.drawHint(ctx);
}

/* ===== 輸入(只有鍵盤) ===== */
var KEYMAP = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', Space: 'space',
  KeyZ: 'hook', KeyR: 'reset', KeyH: 'help'
};
var heldKeys = { left: false, right: false };

function onKeyDown(e) {
  var k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  if (e.repeat) return;
  if (k === 'left' || k === 'right') { heldKeys[k] = true; Input[k] = true; return; }
  if (G.helpOpen) {
    if (k === 'space') {
      if (G.helpPage < Placeholder.helpPageCount - 1) G.helpPage++;
      else { G.helpOpen = false; if (!G.helpFromGame) newRun(); }
    } else if (k === 'help' && G.helpFromGame) {
      G.helpOpen = false;
    }
    return;
  }
  if (k === 'help') { G.helpOpen = true; G.helpPage = 0; G.helpFromGame = true; return; }
  if (k === 'reset') { newRun(); return; }
  if (k === 'space') {
    if (G.phase === 'win' || G.phase === 'lose') { newRun(); return; }
    if (G.phase === 'play') Input.jump = true;
    return;
  }
  if (k === 'up') { if (G.phase === 'play') Input.jump = true; return; }
  if (k === 'hook') { if (G.phase === 'play') Input.hook = true; }
}

function onKeyUp(e) {
  var k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  if (k === 'left' || k === 'right') { heldKeys[k] = false; Input[k] = false; }
}

function onBlur() {
  heldKeys.left = heldKeys.right = false;
  Input.left = Input.right = false;
}

/* ===== 啟動 ===== */
var canvas = null, ctx = null;
var lastTime = 0, acc = 0;

function resize() {
  var s = Math.min(window.innerWidth / CW, window.innerHeight / CH);
  var dpr = window.devicePixelRatio || 1;
  canvas.style.width = Math.floor(CW * s) + 'px';
  canvas.style.height = Math.floor(CH * s) + 'px';
  canvas.width = Math.round(CW * s * dpr);
  canvas.height = Math.round(CH * s * dpr);
}

function frame(t) {
  var dt = (t - lastTime) / 1000;
  lastTime = t;
  if (dt > 1 / 30) dt = 1 / 30; // 切分頁回來不瞬移
  if (dt < 0) dt = 0;
  acc += dt;
  while (acc >= DT) { stepGame(); acc -= DT; }
  ctx.setTransform(canvas.width / CW, 0, 0, canvas.height / CH, 0, 0);
  render(ctx);
  requestAnimationFrame(frame);
}

function boot() {
  canvas = document.getElementById('c');
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  newRun();
  G.helpOpen = true; G.helpPage = 0; G.helpFromGame = false;
  lastTime = performance.now();
  requestAnimationFrame(frame);
}
boot();
