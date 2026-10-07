(function () {
'use strict';

// ===== 常數(照 spec 數值參數表與關卡配置) =====
var W = Art.canvas.width, H = Art.canvas.height;
var DT = 1 / 60;
var G = 2400, JUMP_V = 900, SPEED = 260;
var PW = 40, PH = 56;
var HOOK_RANGE = 160, HOOK_TIME = 0.12, FLING_AIR = 1200, FLING_GROUND = 650;
var LIFT_SPEED = 200, GATE_DELAY = 0.3, DYING_TIME = 0.6;
var MAX_FRAMES = 60 * 60, MAX_GEN = 3, GUIDE_PAGES = 7;

var GROUND = { x: 0, y: 1200, w: 600, h: 80 };
var PLAT1 = { x: 0, y: 780, w: 480, h: 24 };
var PLAT2 = { x: 240, y: 360, w: 480, h: 24 };
var PLATE_LIFT = { x: 160, y: 1188, w: 80, h: 12, surf: 1200 };
var PLATE_GATE = { x: 80, y: 768, w: 80, h: 12, surf: 780 };
var LIFT = { x: 480, w: 120, low: 1200, high: 780, h: 24 };
var GATE = { x: 560, y: 140, w: 24, h: 220 };
var SPIKE = { x: 0, y: 756, w: 60, h: 24 };
var GOAL = { x: 640, y: 280, w: 48, h: 80 };
var SPAWN = { x: 60, y: 1144 };

// ===== 狀態 =====
var S = {
  phase: 'play',          // play | dying | win | lose
  gen: 1, age: 0,
  rec: [], recs: [],
  ghostRec: null, gIdx: 0, ghostPath: null,
  hookLeft: 1,
  ly: LIFT.low, lyPrev: LIFT.low,
  plateLift: false, plateGate: false,
  gateOpen: false, gateTimer: 0,
  dyingT: 0,
  replay: null,
  guide: true, guidePage: 0,
  p: null
};
var keys = { left: false, right: false };
var jumpQ = false, hookQ = false;

function newPlayer() {
  return { x: SPAWN.x, y: SPAWN.y, vy: 0, sup: 'ground', facing: 1, state: 'idle',
           hookT: 0, hs: null, hookLine: null };
}

// ===== 工具 =====
function ovX(x, w, sx, sw) { return x + w > sx && x < sx + sw; }
function ovBox(x, y, w, h, r) { return x + w > r.x && x < r.x + r.w && y + h > r.y && y < r.y + r.h; }

function ghostPoseAt(rec, idx) { return rec ? rec[idx] : null; }

// 開關被壓住: 角色或幽靈著地, 腳底與開關所在表面同高, 水平有重疊
function platePressed(plate, ents) {
  for (var i = 0; i < ents.length; i++) {
    var e = ents[i];
    if (e && e.g && Math.abs(e.y + PH - plate.surf) < 0.5 && ovX(e.x, PW, plate.x, plate.w)) return true;
  }
  return false;
}

function resetMech() {
  S.ly = S.lyPrev = LIFT.low;
  S.gateOpen = false; S.gateTimer = 0;
  S.plateLift = S.plateGate = false;
}

function updateMech(playerBox) {
  S.lyPrev = S.ly;
  if (S.plateLift) S.ly = Math.max(LIFT.high, S.ly - LIFT_SPEED * DT);
  else S.ly = Math.min(LIFT.low, S.ly + LIFT_SPEED * DT);
  if (S.plateGate) { S.gateOpen = true; S.gateTimer = GATE_DELAY; }
  else if (S.gateOpen) {
    S.gateTimer -= DT;
    if (S.gateTimer <= 0 && !(playerBox && ovBox(playerBox.x, playerBox.y, PW, PH, GATE))) S.gateOpen = false;
  }
}

function computePlates() {
  var ents = [];
  var p = S.p;
  if (p && S.phase !== 'dying') ents.push({ x: p.x, y: p.y, g: p.sup !== null });
  if (S.ghostRec) ents.push(S.ghostRec[S.gIdx]);
  S.plateLift = platePressed(PLATE_LIFT, ents);
  S.plateGate = platePressed(PLATE_GATE, ents);
}

// ===== 開局 / 換代 =====
function ghostPathOf(rec) {
  if (!rec) return null;
  var pts = [];
  for (var i = 0; i < rec.length; i++) pts.push({ x: rec[i].x + PW / 2, y: rec[i].y + PH / 2 });
  return pts;
}

function recordFrame(p) {
  var h = null;
  if (p.state === 'hook' && p.hookLine) h = [p.hookLine.x1, p.hookLine.y1, p.hookLine.x2, p.hookLine.y2];
  S.rec.push({ x: p.x, y: p.y, f: p.facing, s: p.state, g: p.sup !== null, h: h });
}

function spawnGen(gen, ghostRec) {
  S.gen = gen;
  S.ghostRec = ghostRec;
  S.ghostPath = ghostPathOf(ghostRec);
  S.gIdx = 0;
  S.age = 0;
  S.hookLeft = 1;
  S.p = newPlayer();
  S.rec = [];
  S.dyingT = 0;
  S.phase = 'play';
  resetMech();
  recordFrame(S.p);
  computePlates();
}

function restartAll() {
  S.recs = [];
  S.replay = null;
  spawnGen(1, null);
}

function die() {
  S.p.state = 'dead';
  S.p.hookLine = null;
  S.recs[S.gen - 1] = S.rec;
  S.phase = 'dying';
  S.dyingT = 0;
}

function win() {
  var gs = [];
  for (var i = 0; i < S.gen - 1; i++) gs.push({ rec: S.recs[i], gen: i + 1 });
  gs.push({ rec: S.rec, gen: S.gen });
  S.replay = { t: 0, ghosts: gs };
  S.phase = 'win';
  resetMech();
}

// ===== 玩家物理 =====
function surfaceOf(id, gc) {
  switch (id) {
    case 'ground': return { x: GROUND.x, w: GROUND.w, top: GROUND.y };
    case 'p1': return { x: PLAT1.x, w: PLAT1.w, top: PLAT1.y };
    case 'p2': return { x: PLAT2.x, w: PLAT2.w, top: PLAT2.y };
    case 'lift': return { x: LIFT.x, w: LIFT.w, top: S.ly };
    case 'ghost': return gc ? { x: gc.x, w: PW, top: gc.y } : null;
  }
  return null;
}

function resolveSolidX(p, dx) {
  var solids = [GROUND];
  if (!S.gateOpen) solids.push(GATE);
  for (var i = 0; i < solids.length; i++) {
    var r = solids[i];
    if (ovBox(p.x, p.y, PW, PH, r)) {
      if (dx > 0) p.x = r.x - PW;
      else if (dx < 0) p.x = r.x + r.w;
      else p.x = (p.x + PW / 2 < r.x + r.w / 2) ? r.x - PW : r.x + r.w;
    }
  }
}

function tickPlay(inp) {
  var p = S.p;
  S.age++;
  var gc = null, gp = null, wrap = false;
  if (S.ghostRec) {
    var len = S.ghostRec.length;
    var idx = S.age % len;
    wrap = (idx === 0);
    gc = S.ghostRec[idx];
    gp = wrap ? gc : S.ghostRec[idx - 1];
    S.gIdx = idx;
  }
  updateMech(p);

  var dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  var hooking = p.state === 'hook';

  // 開始鉤爪
  if (!hooking && inp.hook && S.hookLeft > 0 && gc) {
    var dx0 = (p.x + PW / 2) - (gc.x + PW / 2), dy0 = (p.y + PH / 2) - (gc.y + PH / 2);
    if (Math.sqrt(dx0 * dx0 + dy0 * dy0) <= HOOK_RANGE) {
      S.hookLeft = 0;
      p.state = 'hook'; p.hookT = 0; p.hs = { x: p.x, y: p.y };
      p.sup = null; p.vy = 0;
      hooking = true;
    }
  }

  var skipMove = false;
  if (hooking) {
    if (wrap || !gc) {          // 幽靈循環跳回第 0 幀: 鉤爪中斷, 當下位置進入空中
      p.state = 'air'; p.hookLine = null; p.vy = 0; p.sup = null;
    } else {
      skipMove = true;
      p.hookT += DT;
      var f = Math.min(1, p.hookT / HOOK_TIME);
      p.x = p.hs.x + (gc.x - p.hs.x) * f;
      p.y = p.hs.y + ((gc.y - PH) - p.hs.y) * f;
      p.facing = (gc.x >= p.hs.x) ? 1 : -1;
      p.hookLine = { x1: p.x + PW / 2, y1: p.y + PH / 2, x2: gc.x + PW / 2, y2: gc.y };
      if (f >= 1) {
        p.vy = gc.g ? -FLING_GROUND : -FLING_AIR;
        p.state = 'air'; p.hookLine = null; p.sup = null;
        // 拉動結束當幀不再積分, 下一幀起才向上飛; 水平速度歸零
      }
    }
  }
  if (!skipMove) normalMove(p, inp, dir, gc, gp, wrap);

  // 結果判定
  var dead = false, won = false;
  if (ovBox(p.x, p.y, PW, PH, GOAL)) won = true;
  else if (p.y > H) dead = true;
  else if (ovBox(p.x, p.y, PW, PH, SPIKE)) dead = true;
  else if (S.age >= MAX_FRAMES) dead = true;

  // 動作狀態
  if (p.state !== 'hook') p.state = (p.sup !== null) ? (dir !== 0 ? 'run' : 'idle') : 'air';
  recordFrame(p);
  computePlates();

  if (won) win();
  else if (dead) die();
}

function normalMove(p, inp, dir, gc, gp, wrap) {
  var ox = p.x;
  if (p.sup === 'ghost') {
    if (!gc || wrap) { p.sup = null; p.vy = 0; }       // 幽靈跳回第 0 幀: 不瞬移, 進入空中
    else p.x += gc.x - gp.x;
  }
  if (dir) p.facing = dir;
  p.x += dir * SPEED * DT;
  if (p.x < 0) p.x = 0;
  if (p.x > W - PW) p.x = W - PW;
  resolveSolidX(p, p.x - ox);

  // 站在與升降台頂面同高處(含最低點與地面齊平、最高點與平台一齊平)時, 視為站在升降台上, 隨它移動
  if (p.sup && p.sup !== 'lift' && p.sup !== 'ghost' && ovX(p.x, PW, LIFT.x, LIFT.w) && Math.abs(p.y + PH - S.lyPrev) < 0.01) p.sup = 'lift';
  if (p.sup) {
    var s = surfaceOf(p.sup, gc);
    if (!s || !ovX(p.x, PW, s.x, s.w)) p.sup = null;
    else { p.y = s.top - PH; p.vy = 0; }
  }
  if (p.sup && inp.jump) { p.vy = -JUMP_V; p.sup = null; }

  if (!p.sup) {
    var pb = p.y + PH;
    p.y += p.vy * DT + 0.5 * G * DT * DT;
    p.vy += G * DT;
    var b = p.y + PH;
    if (p.vy >= 0) {
      var best = null;
      var cands = [
        { id: 'ground', s: surfaceOf('ground'), prev: GROUND.y },
        { id: 'p1', s: surfaceOf('p1'), prev: PLAT1.y },
        { id: 'p2', s: surfaceOf('p2'), prev: PLAT2.y },
        { id: 'lift', s: surfaceOf('lift'), prev: S.lyPrev }
      ];
      if (gc) cands.push({ id: 'ghost', s: surfaceOf('ghost', gc), prev: wrap ? gc.y : gp.y });
      for (var i = 0; i < cands.length; i++) {
        var c = cands[i];
        if (ovX(p.x, PW, c.s.x, c.s.w) && pb <= c.prev + 0.01 && b >= c.s.top) {
          if (!best || c.s.top < best.s.top) best = c;
        }
      }
      if (best) { p.y = best.s.top - PH; p.vy = 0; p.sup = best.id; }
    }
    if (!S.gateOpen && p.vy < 0 && ovBox(p.x, p.y, PW, PH, GATE)) { p.y = GATE.y + GATE.h; p.vy = 0; }
  }
}

function tickReplay() {
  var R = S.replay;
  R.t++;
  var ents = [];
  for (var i = 0; i < R.ghosts.length; i++) {
    var g = R.ghosts[i];
    g.idx = R.t % g.rec.length;
    ents.push(g.rec[g.idx]);
  }
  updateMech(null);
  S.plateLift = platePressed(PLATE_LIFT, ents);
  S.plateGate = platePressed(PLATE_GATE, ents);
}

function step() {
  if (S.guide) return;
  if (S.phase === 'play') {
    tickPlay({ left: keys.left, right: keys.right, jump: jumpQ, hook: hookQ });
  } else if (S.phase === 'dying') {
    S.dyingT += DT;
    if (S.dyingT >= DYING_TIME) {
      if (S.gen < MAX_GEN) spawnGen(S.gen + 1, S.rec);
      else S.phase = 'lose';
    }
  } else if (S.phase === 'win') {
    tickReplay();
  }
  jumpQ = false; hookQ = false;
}

// ===== 繪製 =====
function hookable() {
  if (S.phase !== 'play' || S.guide || S.hookLeft <= 0 || !S.ghostRec || S.p.state === 'hook') return false;
  var gc = S.ghostRec[S.gIdx], p = S.p;
  var dx = (p.x + PW / 2) - (gc.x + PW / 2), dy = (p.y + PH / 2) - (gc.y + PH / 2);
  return Math.sqrt(dx * dx + dy * dy) <= HOOK_RANGE;
}

function drawGhostPose(ctx, pose, gen, hookableFlag) {
  Art.drawGhost(ctx, { x: pose.x, y: pose.y, facing: pose.f, state: pose.s, gen: gen, hookable: !!hookableFlag });
  if (pose.h) Art.drawHook(ctx, { x1: pose.h[0], y1: pose.h[1], x2: pose.h[2], y2: pose.h[3] });
}

function render(ctx) {
  Art.drawBackground(ctx, {});
  Art.drawPlatform(ctx, { x: GROUND.x, y: GROUND.y, w: GROUND.w, h: GROUND.h });
  Art.drawPlatform(ctx, { x: PLAT1.x, y: PLAT1.y, w: PLAT1.w, h: PLAT1.h });
  Art.drawPlatform(ctx, { x: PLAT2.x, y: PLAT2.y, w: PLAT2.w, h: PLAT2.h });
  Art.drawSpike(ctx, { x: SPIKE.x, y: SPIKE.y, w: SPIKE.w });
  Art.drawPlate(ctx, { x: PLATE_LIFT.x, y: PLATE_LIFT.y, pressed: S.plateLift, kind: 'lift' });
  Art.drawPlate(ctx, { x: PLATE_GATE.x, y: PLATE_GATE.y, pressed: S.plateGate, kind: 'gate' });
  Art.drawLift(ctx, { x: LIFT.x, y: S.ly, active: S.plateLift });
  Art.drawGate(ctx, { x: GATE.x, y: GATE.y, open: S.gateOpen });
  Art.drawGoal(ctx, { x: GOAL.x, y: GOAL.y });

  if (S.phase === 'win' && S.replay) {
    for (var i = 0; i < S.replay.ghosts.length; i++) {
      var g = S.replay.ghosts[i];
      var idx = (g.idx !== undefined) ? g.idx : 0;
      drawGhostPose(ctx, g.rec[idx], g.gen, false);
    }
  } else {
    if (S.ghostRec) {
      Art.drawGhostPath(ctx, { points: S.ghostPath, progress: S.gIdx });
      drawGhostPose(ctx, S.ghostRec[S.gIdx], S.gen - 1, hookable());
    }
    var p = S.p;
    if (p.hookLine && p.state === 'hook') Art.drawHook(ctx, p.hookLine);
    Art.drawPlayer(ctx, { x: p.x, y: p.y, facing: p.facing, state: p.state, gen: S.gen });
  }
  Art.drawHud(ctx, { gen: S.gen, maxGen: MAX_GEN, phase: S.phase, hookLeft: S.hookLeft, hookMax: 1 });
  if (S.guide) Art.drawGuidePage(ctx, { page: S.guidePage });
}

// ===== 輸入(只有鍵盤) =====
var HANDLED = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, Space: 1, KeyZ: 1, KeyR: 1, KeyH: 1 };

window.addEventListener('keydown', function (e) {
  if (!HANDLED[e.code]) return;
  e.preventDefault();
  if (e.repeat) return;
  var c = e.code;
  if (c === 'ArrowLeft') keys.left = true;
  if (c === 'ArrowRight') keys.right = true;
  if (S.guide) {
    if (c === 'Space') {
      S.guidePage++;
      if (S.guidePage >= GUIDE_PAGES) { S.guide = false; S.guidePage = 0; }
    } else if (c === 'KeyH') { S.guide = false; S.guidePage = 0; }
    return;
  }
  if (c === 'KeyH') { S.guide = true; S.guidePage = 0; return; }
  if (c === 'KeyR') { restartAll(); return; }
  if (S.phase === 'win' || S.phase === 'lose') {
    if (c === 'Space') restartAll();
    return;
  }
  if (S.phase !== 'play') return;
  if (c === 'Space' || c === 'ArrowUp') jumpQ = true;
  if (c === 'KeyZ') hookQ = true;
});

window.addEventListener('keyup', function (e) {
  if (e.code === 'ArrowLeft') keys.left = false;
  if (e.code === 'ArrowRight') keys.right = false;
  if (HANDLED[e.code]) e.preventDefault();
});

window.addEventListener('blur', function () { keys.left = keys.right = false; });

// ===== 畫布與主迴圈 =====
var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');

function layout() {
  var scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  if (!(scale > 0)) scale = 1;
  var cssW = Math.floor(W * scale), cssH = Math.floor(H * scale);
  var dpr = window.devicePixelRatio || 1;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
}
window.addEventListener('resize', layout);
layout();

restartAll();

var last = 0, acc = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  try {
    var dt = last ? (ts - last) / 1000 : DT;
    last = ts;
    dt = Math.min(Math.max(dt, 0), 1 / 30);
    acc += dt;
    while (acc >= DT - 1e-9) { step(); acc -= DT; }
    if (acc < 0) acc = 0;
    render(ctx);
  } catch (err) {
    console.error(err);
  }
}
requestAnimationFrame(frame);
})();
