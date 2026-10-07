(function () {
'use strict';

// ===== 常數(照 spec 數值參數表) =====
var DT = 1 / 60;
var GRAV = 2400, JUMP_V = 900, WALK = 260;
var PW = 40, PH = 56;
var SPAWN_X = 60, SPAWN_Y = 1144;
var MAX_GEN = 3, HOOK_MAX = 2, HOOK_RANGE = 160;
var CHARGE_TIME = 1, AIR_CAP = 1700, GROUND_CAP = 800;
var LAUNCH_FRAMES = 18;      // 彈射時間 0.3 秒
var HOOK_SHOW_FRAMES = 9;    // 鉤索顯示 0.15 秒
var SEESAW_V = 1550, SEESAW_FRAMES = 18;
var LIFT_SPEED = 200, LIFT_TOP = 780, LIFT_BOT = 1200;
var GATE_DELAY = 0.3;
var DYING_FRAMES = 36;
var REC_LIMIT = 3600;
var PATH_FRAMES = 300;
var CW = (window.Art && Art.canvas && Art.canvas.width) || 720;
var CH = (window.Art && Art.canvas && Art.canvas.height) || 1280;

// ===== 關卡 =====
var GROUND = { x: 0, y: 1200, w: 600, h: 80 };
var PLAT1 = { x: 0, y: 780, w: 480, h: 24 };
var PLAT2 = { x: 240, y: 360, w: 480, h: 24 };
var SPIKE = { x: 0, y: 756, w: 60, h: 24 };
var PLATE = { lift: { x: 160, y: 1188, w: 80, s: 1200 }, gate: { x: 80, y: 768, w: 80, s: 780 } };
var LIFT = { x: 480, w: 120, h: 24 };
var GATE = { x: 560, y: 140, w: 24, h: 220 };
var SEESAW = { x: 180, y: 768, w: 200, h: 12, dropX0: 180, dropX1: 260, launchX0: 300, launchX1: 380, surf: 780 };
var GOAL = { x: 640, y: 280, w: 48, h: 80 };

// ===== 佔位(style.md/interface 沒有的圖形集中在這) =====
var Placeholder = {
  guideTitles: ['走到旗子', '先死一次', '死了變幽靈', '踩幽靈', '鉤幽靈', '開關', '翹翹板', '只看得見上一個人'],
  guideTexts: [
    '←→ 走、空白鍵跳、R 整關重來',
    '一個人到不了, 要先死一次',
    '死掉的你會一直重演',
    '幽靈的頭能站, 還會載你走',
    '幽靈發光時按 Z 瞄準, 每人 2 次',
    '有人踩住, 同色的東西才會動',
    '有人落在這頭, 那頭的人會飛起',
    '共三人, 只看得見上一個的幽靈'
  ],
  guideBg: function (ctx) { ctx.fillStyle = '#10121c'; ctx.fillRect(0, 0, CW, CH); },
  guideText: function (ctx, page, midGame) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, CW, 150);
    ctx.fillRect(0, CH - 70, CW, 70);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('第 ' + (page + 1) + ' 頁  ' + Placeholder.guideTitles[page], CW / 2, 50);
    ctx.font = '28px sans-serif';
    ctx.fillText(Placeholder.guideTexts[page], CW / 2, 106);
    ctx.font = '26px sans-serif';
    var last = page === Placeholder.guideTexts.length - 1;
    var hint = last ? (midGame ? '空白鍵 回到遊戲' : '空白鍵 開始遊戲') : '空白鍵 下一頁';
    ctx.fillText(hint + '  (' + (page + 1) + '/' + Placeholder.guideTexts.length + ')', CW / 2, CH - 35);
    ctx.restore();
  },
  helpHint: function (ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('H 說明', CW - 12, CH - 12);
    ctx.restore();
  }
};

// ===== 狀態 =====
var W = null;
var guideOpen = true, guidePage = 0, guideMid = false;
var keys = { left: false, right: false };
var jumpReq = false;

function newGame() {
  W = {
    gen: 1, records: [], rec: null, P: null, ghost: null,
    liftY: LIFT_BOT, gateOpen: false, gateTimer: 0, seesawT: 0,
    pressLift: false, pressGate: false,
    phase: 'play', dyingT: 0, aim: null, replay: null
  };
  spawn();
}

function spawn() {
  W.P = {
    x: SPAWN_X, y: SPAWN_Y, vx: 0, vy: 0, facing: 1, grounded: true,
    onLift: false, onGhost: false, launchLeft: 0, hookFrames: 0, hook: null,
    hookLeft: HOOK_MAX, state: 'idle', target: null
  };
  W.liftY = LIFT_BOT; W.gateOpen = false; W.gateTimer = 0; W.seesawT = 0;
  W.pressLift = false; W.pressGate = false; W.aim = null; W.phase = 'play';
  W.ghost = W.gen >= 2 ? { rec: W.records[W.gen - 2], idx: 0, gen: W.gen - 1 } : null;
  W.rec = [];
  pushRec(null);
}

function pushRec(h) {
  var P = W.P;
  W.rec.push({ x: P.x, y: P.y, f: P.facing, s: P.state, g: P.grounded, h: h });
}

// ===== 工具 =====
function ox(ax, aw, bx, bw) { return ax + aw > bx && ax < bx + bw; }
function rectHit(P, r) {
  return P.x + PW > r.x + 0.001 && P.x < r.x + r.w - 0.001 && P.y + PH > r.y + 0.001 && P.y < r.y + r.h - 0.001;
}

// 幽靈前進一幀; 回傳位移與是否循環
function advanceGhost(G) {
  var len = G.rec.length;
  var a = G.rec[G.idx];
  G.idx = (G.idx + 1) % len;
  var b = G.rec[G.idx];
  return { dx: b.x - a.x, dy: b.y - a.y, wrap: G.idx === 0, topPrev: a.y, topNew: b.y };
}

function ghostPress(G, pl) {
  var f = G.rec[G.idx];
  return f.g && Math.abs(f.y + PH - pl.s) < 0.5 && ox(f.x, PW, pl.x, pl.w);
}

function ghostSeesawTrigger(G) {
  if (G.idx === 0) return false;
  var a = G.rec[G.idx - 1], b = G.rec[G.idx];
  return !a.g && b.g && Math.abs(b.y + PH - SEESAW.surf) < 0.5 && ox(b.x, PW, SEESAW.dropX0, SEESAW.dropX1 - SEESAW.dropX0);
}

function playerPress(P, pl) {
  return P.grounded && Math.abs(P.y + PH - pl.s) < 0.5 && ox(P.x, PW, pl.x, pl.w);
}

// 升降台與門(P 可為 null: 回放時沒有活的角色)
function updateLiftGate(pLift, pGate, P) {
  var old = W.liftY;
  if (pLift) W.liftY = Math.max(LIFT_TOP, W.liftY - LIFT_SPEED * DT);
  else W.liftY = Math.min(LIFT_BOT, W.liftY + LIFT_SPEED * DT);
  W.pressLift = pLift; W.pressGate = pGate;
  if (pGate) { W.gateOpen = true; W.gateTimer = GATE_DELAY; }
  else if (W.gateOpen) {
    W.gateTimer -= DT;
    if (W.gateTimer <= 0 && !(P && rectHit(P, GATE))) W.gateOpen = false;
  }
  if (W.seesawT > 0) W.seesawT--;
  return W.liftY - old;
}

function ghostCenter(G) {
  var f = G.rec[G.idx];
  return { x: f.x + PW / 2, y: f.y + PH / 2 };
}

// ===== 玩法一幀 =====
function stepPlay() {
  var P = W.P, gh = W.ghost;
  var gi = gh ? advanceGhost(gh) : null;

  var pL = playerPress(P, PLATE.lift) || (gh && ghostPress(gh, PLATE.lift));
  var pG = playerPress(P, PLATE.gate) || (gh && ghostPress(gh, PLATE.gate));
  var dyL = updateLiftGate(!!pL, !!pG, P);

  // 載運
  var carried = false;
  if (P.onLift) P.y += dyL;
  if (P.onGhost && gi && !gi.wrap) { P.x += gi.dx; P.y += gi.dy; carried = true; }
  P.onLift = false; P.onGhost = false;
  var wasG = P.grounded;

  // 輸入
  var dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (P.launchLeft > 0) {
    P.launchLeft--;
    if (Math.abs(P.vx) > 1) P.facing = P.vx > 0 ? 1 : -1;
  } else {
    P.vx = dir * WALK;
    if (dir !== 0) P.facing = dir;
  }
  if (jumpReq && P.grounded) { P.vy = -JUMP_V; P.grounded = false; }
  jumpReq = false;

  // 物理: 水平
  P.vy += GRAV * DT;
  P.x += P.vx * DT;
  if (P.x < 0) { P.x = 0; P.vx = 0; }
  if (P.x > CW - PW) { P.x = CW - PW; P.vx = 0; }
  var solids = [GROUND];
  if (!W.gateOpen) solids.push(GATE);
  for (var i = 0; i < solids.length; i++) {
    var r = solids[i];
    if (rectHit(P, r)) {
      if (P.vx > 0) P.x = r.x - PW;
      else if (P.vx < 0) P.x = r.x + r.w;
      else P.x = (P.x + PW / 2 < r.x + r.w / 2) ? r.x - PW : r.x + r.w;
      P.vx = 0;
    }
  }

  // 物理: 垂直(單向落地)
  var prevFeet = P.y + PH;
  P.y += P.vy * DT;
  var newFeet = P.y + PH;
  P.grounded = false;
  if (P.vy >= 0) {
    var best = null;
    var cands = [
      { top: GROUND.y, x: GROUND.x, w: GROUND.w, t: 'g' },
      { top: PLAT1.y, x: PLAT1.x, w: PLAT1.w, t: 'g' },
      { top: PLAT2.y, x: PLAT2.x, w: PLAT2.w, t: 'g' },
      { top: W.liftY, x: LIFT.x, w: LIFT.w, t: 'lift' }
    ];
    if (!W.gateOpen) cands.push({ top: GATE.y, x: GATE.x, w: GATE.w, t: 'g' });
    for (var k = 0; k < cands.length; k++) {
      var c = cands[k];
      if (ox(P.x, PW, c.x, c.w) && prevFeet <= c.top + 0.01 && newFeet >= c.top) {
        if (!best || c.top < best.top) best = c;
      }
    }
    if (gh) {
      var gf = gh.rec[gh.idx];
      var gPrev = carried ? gi.topNew : gi.topPrev;
      if (ox(P.x, PW, gf.x, PW) && prevFeet <= gPrev + 0.01 && newFeet >= gf.y) {
        if (!best || gf.y < best.top) best = { top: gf.y, t: 'ghost' };
      }
    }
    if (best) {
      P.y = best.top - PH; P.vy = 0; P.grounded = true;
      if (best.t === 'lift') P.onLift = true;
      if (best.t === 'ghost') P.onGhost = true;
    }
  }

  // 翹翹板
  var trig = false;
  if (P.grounded && !wasG && Math.abs(P.y + PH - SEESAW.surf) < 0.5 &&
      ox(P.x, PW, SEESAW.dropX0, SEESAW.dropX1 - SEESAW.dropX0)) trig = true;
  if (gh && ghostSeesawTrigger(gh)) trig = true;
  if (trig) {
    W.seesawT = SEESAW_FRAMES;
    if (P.grounded && Math.abs(P.y + PH - SEESAW.surf) < 0.5 &&
        ox(P.x, PW, SEESAW.launchX0, SEESAW.launchX1 - SEESAW.launchX0)) {
      P.vy = -SEESAW_V; P.vx = 0; P.grounded = false; P.onLift = false; P.onGhost = false; P.launchLeft = 0;
    }
  }

  // 鉤索顯示
  var h = null;
  P.hook = null;
  if (P.hookFrames > 0) {
    P.hookFrames--;
    if (P.target) {
      var gc = ghostCenter(P.target);
      h = [P.x + PW / 2, P.y + PH / 2, gc.x, gc.y];
      P.hook = h;
    }
  }

  // 狀態
  if (P.launchLeft > 0) P.state = 'launch';
  else if (!P.grounded) P.state = 'air';
  else if (Math.abs(P.vx) > 0.1) P.state = 'run';
  else P.state = 'idle';
  pushRec(h);

  // 結束判定(批次最尾端)
  if (rectHit(P, GOAL)) { startWin(); return; }
  if (P.y >= CH || rectHit(P, SPIKE) || W.rec.length - 1 >= REC_LIMIT) die();
}

function die() {
  W.P.state = 'dead';
  W.P.hook = null;
  W.records[W.gen - 1] = W.rec;
  W.phase = 'dying';
  W.dyingT = DYING_FRAMES;
}

function startWin() {
  W.records[W.gen - 1] = W.rec;
  W.phase = 'win';
  W.aim = null;
  W.replay = [];
  for (var i = 0; i < W.gen; i++) W.replay.push({ rec: W.records[i], idx: 0, gen: i + 1 });
  W.liftY = LIFT_BOT; W.gateOpen = false; W.gateTimer = 0; W.seesawT = 0;
}

function stepDying() {
  W.dyingT--;
  if (W.dyingT <= 0) {
    if (W.gen >= MAX_GEN) { W.phase = 'lose'; return; }
    W.gen++;
    spawn();
  }
}

function stepReplay() {
  var pL = false, pG = false, trig = false;
  for (var i = 0; i < W.replay.length; i++) {
    var G = W.replay[i];
    advanceGhost(G);
    if (ghostPress(G, PLATE.lift)) pL = true;
    if (ghostPress(G, PLATE.gate)) pG = true;
    if (ghostSeesawTrigger(G)) trig = true;
  }
  updateLiftGate(pL, pG, null);
  if (trig) W.seesawT = SEESAW_FRAMES;
}

function tick() {
  if (W.phase === 'play') stepPlay();
  else if (W.phase === 'dying') stepDying();
  else if (W.phase === 'win') stepReplay();
}

// ===== 瞄準 =====
function hookTarget() {
  var P = W.P, gh = W.ghost;
  if (W.phase !== 'play' || !gh || P.hookLeft <= 0) return false;
  var gc = ghostCenter(gh);
  var dx = gc.x - (P.x + PW / 2), dy = gc.y - (P.y + PH / 2);
  return dx * dx + dy * dy <= HOOK_RANGE * HOOK_RANGE;
}

function aimInfo() {
  var P = W.P, gh = W.ghost;
  var gc = ghostCenter(gh);
  var px = P.x + PW / 2, py = P.y + PH / 2;
  var dx = gc.x - px, dy = gc.y - py;
  var d = Math.sqrt(dx * dx + dy * dy);
  var ux = 0, uy = -1;
  if (d > 1e-6) { ux = dx / d; uy = dy / d; }
  var cap = gh.rec[gh.idx].g ? GROUND_CAP : AIR_CAP;
  var speed = cap * (0.3 + 0.7 * W.aim.charge);
  return { px: px, py: py, gx: gc.x, gy: gc.y, ux: ux, uy: uy, speed: speed,
           ax: px + ux * speed * 0.3, ay: py + uy * speed * 0.3 };
}

function startAim() { W.aim = { charge: 0 }; W.P.state = 'aim'; jumpReq = false; }

function fireAim() {
  var P = W.P, a = aimInfo();
  P.vx = a.ux * a.speed; P.vy = a.uy * a.speed;
  P.grounded = false; P.onLift = false; P.onGhost = false;
  P.launchLeft = LAUNCH_FRAMES; P.hookFrames = HOOK_SHOW_FRAMES;
  P.target = W.ghost; P.hookLeft--;
  P.state = 'launch';
  W.aim = null;
}

function cancelAim() { W.aim = null; W.P.state = W.P.grounded ? 'idle' : 'air'; }

// ===== 輸入(只有鍵盤) =====
var GAME_CODES = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, Space: 1, KeyZ: 1, KeyX: 1, KeyR: 1, KeyH: 1 };

window.addEventListener('keydown', function (e) {
  if (GAME_CODES[e.code]) e.preventDefault();
  if (e.repeat) return;
  var c = e.code;

  if (guideOpen) {
    if (c === 'Space') {
      guidePage++;
      if (guidePage >= Placeholder.guideTexts.length) { guideOpen = false; guidePage = 0; guideMid = false; }
    } else if (c === 'KeyH' && guideMid) { guideOpen = false; guidePage = 0; guideMid = false; }
    return;
  }

  if (c === 'KeyR') { newGame(); jumpReq = false; return; }

  if (W.aim) {                       // 瞄準中只有 Z X R
    if (c === 'KeyZ') fireAim();
    else if (c === 'KeyX') cancelAim();
    return;
  }

  if (W.phase === 'win' || W.phase === 'lose') {
    if (c === 'Space') { newGame(); jumpReq = false; }
    return;
  }
  if (W.phase !== 'play') {
    return;
  }

  if (c === 'ArrowLeft') keys.left = true;
  else if (c === 'ArrowRight') keys.right = true;
  else if (c === 'Space' || c === 'ArrowUp') jumpReq = true;
  else if (c === 'KeyZ') { if (hookTarget()) startAim(); }
  else if (c === 'KeyH') { guideOpen = true; guidePage = 0; guideMid = true; keys.left = keys.right = false; }
});

window.addEventListener('keyup', function (e) {
  if (GAME_CODES[e.code]) e.preventDefault();
  if (e.code === 'ArrowLeft') keys.left = false;
  else if (e.code === 'ArrowRight') keys.right = false;
});
window.addEventListener('blur', function () { keys.left = keys.right = false; jumpReq = false; });

// ===== 繪製 =====
var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
var dpr = window.devicePixelRatio || 1;
canvas.width = Math.round(CW * dpr);
canvas.height = Math.round(CH * dpr);
canvas.style.aspectRatio = CW + ' / ' + CH;

function A(name, st) {
  if (window.Art && typeof Art[name] === 'function') Art[name](ctx, st);
}

function ghostState(G, hookable) {
  var f = G.rec[G.idx];
  return { x: f.x, y: f.y, facing: f.f, state: f.s, gen: G.gen, hookable: !!hookable };
}

function pathSegments(G) {
  var len = G.rec.length, i = G.idx;
  var total = Math.min(PATH_FRAMES, len);
  var segs = [], seg = [], n = 0, j;
  var first = Math.min(total, len - i);
  for (j = 0; j < first; j++) { var f = G.rec[i + j]; seg.push({ x: f.x + PW / 2, y: f.y + PH / 2 }); }
  segs.push(seg);
  var rest = total - first;
  if (rest > 0) {
    seg = [];
    for (j = 0; j < rest; j++) { var g = G.rec[j]; seg.push({ x: g.x + PW / 2, y: g.y + PH / 2 }); }
    segs.push(seg);
  }
  return segs;
}

function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (guideOpen) {
    Placeholder.guideBg(ctx);
    A('drawGuidePage', { page: guidePage + 1 });
    Placeholder.guideText(ctx, guidePage, guideMid);
    return;
  }
  var P = W.P, i;
  A('drawBackground', {});
  A('drawPlatform', { x: GROUND.x, y: GROUND.y, w: GROUND.w, h: GROUND.h });
  A('drawPlatform', { x: PLAT1.x, y: PLAT1.y, w: PLAT1.w, h: PLAT1.h });
  A('drawPlatform', { x: PLAT2.x, y: PLAT2.y, w: PLAT2.w, h: PLAT2.h });
  A('drawSpike', { x: SPIKE.x, y: SPIKE.y, w: SPIKE.w });
  A('drawPlate', { x: PLATE.lift.x, y: PLATE.lift.y, pressed: W.pressLift, kind: 'lift' });
  A('drawPlate', { x: PLATE.gate.x, y: PLATE.gate.y, pressed: W.pressGate, kind: 'gate' });
  A('drawLift', { x: LIFT.x, y: W.liftY, active: W.pressLift });
  A('drawGate', { x: GATE.x, y: GATE.y, open: W.gateOpen });
  var tilt = W.seesawT > 0 ? Math.sin((1 - W.seesawT / SEESAW_FRAMES) * Math.PI) : 0;
  A('drawSeesaw', { x: SEESAW.x, y: SEESAW.y, tilt: tilt });
  A('drawGoal', { x: GOAL.x, y: GOAL.y });

  if (W.phase === 'win') {
    for (i = 0; i < W.replay.length; i++) A('drawGhost', ghostState(W.replay[i], false));
    for (i = 0; i < W.replay.length; i++) {
      var h = W.replay[i].rec[W.replay[i].idx].h;
      if (h) A('drawHook', { x1: h[0], y1: h[1], x2: h[2], y2: h[3] });
    }
  } else {
    var gh = W.ghost;
    var hk = hookTarget();
    if (gh) {
      A('drawGhostPath', { segments: pathSegments(gh) });
      A('drawGhost', ghostState(gh, hk || (W.aim && true)));
      var gHook = gh.rec[gh.idx].h;
      if (gHook) A('drawHook', { x1: gHook[0], y1: gHook[1], x2: gHook[2], y2: gHook[3] });
    }
    if (P.hook) A('drawHook', { x1: P.hook[0], y1: P.hook[1], x2: P.hook[2], y2: P.hook[3] });
    A('drawPlayer', { x: P.x, y: P.y, facing: P.facing, state: W.aim ? 'aim' : P.state, gen: W.gen });
    if (W.aim) {
      var a = aimInfo();
      A('drawAim', { px: a.px, py: a.py, gx: a.gx, gy: a.gy, ax: a.ax, ay: a.ay, charge: W.aim.charge });
    }
  }
  A('drawHud', { gen: W.gen, maxGen: MAX_GEN, phase: W.phase, hookLeft: P.hookLeft, hookMax: HOOK_MAX, aiming: !!W.aim });
  if (W.phase === 'play') Placeholder.helpHint(ctx);
}

// ===== 主迴圈 =====
var last = 0, acc = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  var dt = (ts - last) / 1000;
  last = ts;
  if (!(dt > 0)) dt = 0;
  dt = Math.min(dt, 1 / 30);
  try {
    if (!guideOpen) {
      if (W.aim) {
        W.aim.charge = Math.min(1, W.aim.charge + dt / CHARGE_TIME);
        acc = 0;
      } else {
        acc += dt;
        var n = 0;
        while (acc >= DT - 1e-9 && n < 4) { tick(); acc -= DT; n++; if (W.aim) break; }
        if (n >= 4) acc = 0;
      }
    }
    render();
  } catch (err) { console.error(err); }
}

newGame();
requestAnimationFrame(frame);
})();
