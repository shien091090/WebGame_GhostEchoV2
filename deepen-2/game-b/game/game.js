(function () {
'use strict';

// ===== 常數(照 spec 數值參數表) =====
var DT = 1 / 60, G = 2400, JUMP_V = 900, SPEED = 260, PW = 40, PH = 56;
var HOOK_RANGE = 160, HOOK_MAX = 2, CHARGE_TIME = 1;
var CAP_AIR = 1700, CAP_GROUND = 800, ARROW_SEC = 0.3;
var LAUNCH_F = 18, HOOK_SHOW_F = 9;        // 0.3 秒 / 0.15 秒
var LIFT_SPEED = 200 * DT, GATE_DELAY_F = 18;
var MAX_GEN = 3, DYING_F = 36, REC_MAX = 3600, PATH_F = 300;

var LV = {
  ground: { x: 0, y: 1200, w: 600, h: 80 },
  p1: { x: 0, y: 780, w: 480, h: 24 },
  p2: { x: 240, y: 360, w: 480, h: 24 },
  spike: { x: 0, y: 756, w: 60, h: 24 },
  plateLift: { x: 160, y: 1188, w: 80, h: 12 },
  plateGate: { x: 80, y: 768, w: 80, h: 12 },
  key: { x: 300, y: 1150, w: 32, h: 32 },
  liftX: 480, liftW: 120, liftMin: 780, liftMax: 1200,
  gate: { x: 540, y: 140, w: 24, h: 220 },
  lock: { x: 600, y: 140, w: 24, h: 220 },
  goal: { x: 656, y: 280, w: 48, h: 80 },
  spawn: { x: 60, y: 1144 }
};

var GUIDE = [
  { t: '走到旗子', s: '←→ 走、空白鍵跳、R 整關重來' },
  { t: '先死一次', s: '一個人到不了, 要先死一次' },
  { t: '死了變幽靈', s: '死掉的你會一直重演' },
  { t: '踩幽靈', s: '幽靈的頭能站, 還會載你走' },
  { t: '鉤幽靈', s: '幽靈發光時按 Z 瞄準, 每人 2 次' },
  { t: '開關', s: '有人踩住, 同色的東西才會動' },
  { t: '接力鑰匙', s: '鑰匙只有一把, 碰幽靈就能接過來' },
  { t: '只看得見上一個人', s: '共三人, 只看得見上一個的幽靈' }
];

// ===== 佔位(style 沒有的圖形) =====
var Placeholder = {
  // 說明頁文字與操作提示(Art 沒有文字函式)
  guideText: function (ctx, page, W) {
    var g = GUIDE[page - 1];
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 1110, W, 170);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(g.t, W / 2, 1160);
    ctx.font = '28px sans-serif';
    ctx.fillText(g.s, W / 2, 1210);
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#ccc';
    ctx.fillText((page < GUIDE.length ? '空白鍵 下一頁' : '空白鍵 開始') + '  (' + page + '/' + GUIDE.length + ')', W / 2, 1255);
    ctx.restore();
  },
  hint: function (ctx, W) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'right';
    ctx.font = '18px sans-serif';
    ctx.fillText('H 說明', W - 10, 124);
    ctx.restore();
  }
};

// ===== 畫布 =====
var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
var CW = Art.canvas.width, CH = Art.canvas.height;
var viewK = 1;
function resize() {
  var dpr = window.devicePixelRatio || 1;
  var s = Math.min(1, window.innerWidth / CW, window.innerHeight / CH);
  if (!(s > 0)) s = 1;
  canvas.style.width = Math.floor(CW * s) + 'px';
  canvas.style.height = Math.floor(CH * s) + 'px';
  canvas.width = Math.floor(CW * s * dpr);
  canvas.height = Math.floor(CH * s * dpr);
  viewK = canvas.width / CW;
}
window.addEventListener('resize', resize);
resize();

// ===== 狀態 =====
var screen = 'guide', guidePage = 1, guideStarted = false;
var phase = 'play';
var gen, records, keyPicked, rec, ghostRec, ghostIdx, ghostPrev, ghostWrapped;
var p, aiming, aimT, aimGhost;
var lift, gate, lockOpen, platesPressed;
var dyingF, repT, repRecs;
var keys = { left: false, right: false, jump: false };

function ov(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function resetAll() {
  gen = 1; records = []; keyPicked = false; phase = 'play';
  spawn();
}

function spawn() {
  phase = 'play';
  p = { x: LV.spawn.x, y: LV.spawn.y, vx: 0, vy: 0, facing: 1, onGround: true, support: null,
        hasKey: false, hookLeft: HOOK_MAX, launchF: 0, hookF: 0, moving: false, dead: false };
  aiming = false; aimT = 0; aimGhost = null;
  lift = { top: LV.liftMax, active: false };
  gate = { open: false, delay: 0 };
  lockOpen = false;
  platesPressed = { lift: false, gate: false };
  rec = [];
  ghostRec = gen >= 2 ? records[gen - 2] : null;
  ghostIdx = 0; ghostPrev = ghostRec ? ghostRec[0] : null; ghostWrapped = false;
  snap();
}

function pState() {
  if (p.dead) return 'dead';
  if (aiming) return 'aim';
  if (p.launchF > 0) return 'launch';
  if (!p.onGround) return 'air';
  if (p.moving) return 'run';
  return 'idle';
}

function curGhost() { return ghostRec ? ghostRec[ghostIdx] : null; }

function snap() {
  var g = curGhost(), h = null;
  if (p.hookF > 0 && g) h = [p.x + PW / 2, p.y + PH / 2, g.x + PW / 2, g.y + PH / 2];
  var s = pState();
  if (s === 'dead' || s === 'aim') s = 'air';
  rec.push({ x: p.x, y: p.y, f: p.facing, s: s, g: p.onGround, k: p.hasKey, h: h });
}

function hookableNow() {
  if (phase !== 'play' || aiming || p.hookLeft <= 0) return false;
  var g = curGhost();
  if (!g) return false;
  var dx = (g.x + PW / 2) - (p.x + PW / 2), dy = (g.y + PH / 2) - (p.y + PH / 2);
  return Math.sqrt(dx * dx + dy * dy) <= HOOK_RANGE;
}

// ===== 機關(升降台 / 門), 玩家與回放共用 =====
function pressedBy(plate, surfaceY, px, py, pgrounded, pw) {
  return pgrounded && Math.abs(py + PH - surfaceY) < 1 && px < plate.x + plate.w && px + PW > plate.x;
}
function updateMech(pl, pg, playerBox) {
  lift.active = pl;
  if (pl) lift.top = Math.max(LV.liftMin, lift.top - LIFT_SPEED);
  else lift.top = Math.min(LV.liftMax, lift.top + LIFT_SPEED);
  if (pg) { gate.open = true; gate.delay = GATE_DELAY_F; }
  else if (gate.open) {
    if (gate.delay > 0) gate.delay--;
    if (gate.delay <= 0) {
      var gt = LV.gate;
      if (!(playerBox && ov(playerBox.x, playerBox.y, PW, PH, gt.x, gt.y, gt.w, gt.h))) gate.open = false;
    }
  }
}

// ===== 單幀更新(遊玩) =====
function tick() {
  var g = null, i;
  // 1. 幽靈前進
  ghostWrapped = false;
  if (ghostRec) {
    ghostPrev = ghostRec[ghostIdx];
    ghostIdx++;
    if (ghostIdx >= ghostRec.length) { ghostIdx = 0; ghostWrapped = true; }
    g = ghostRec[ghostIdx];
  }
  // 2. 開關 / 升降台 / 門
  var plLift = pressedBy(LV.plateLift, 1200, p.x, p.y, p.onGround), plGate = pressedBy(LV.plateGate, 780, p.x, p.y, p.onGround);
  if (g) {
    plLift = plLift || (g.g && pressedBy(LV.plateLift, 1200, g.x, g.y, true));
    plGate = plGate || (g.g && pressedBy(LV.plateGate, 780, g.x, g.y, true));
  }
  platesPressed.lift = plLift; platesPressed.gate = plGate;
  updateMech(plLift, plGate, p);
  // 3. 載運
  var carried = null;
  if (p.support === 'lift') { p.y = lift.top - PH; carried = 'lift'; }
  else if (p.support === 'ghost') {
    if (ghostWrapped || !g) { p.support = null; p.onGround = false; }
    else { p.x += g.x - ghostPrev.x; p.y = g.y - PH; carried = 'ghost'; }
  }
  // 4. 輸入與水平速度
  var dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (p.launchF > 0) { p.moving = false; }
  else {
    p.vx = dir * SPEED; p.moving = dir !== 0;
    if (dir !== 0) p.facing = dir;
  }
  if (keys.jump && p.onGround) { p.vy = -JUMP_V; p.onGround = false; p.support = null; carried = null; }
  // 5. 物理: 水平
  var ox = p.x, oy = p.y;
  p.x += p.vx * DT;
  var solids = [LV.ground];
  if (!gate.open) solids.push(LV.gate);
  if (!lockOpen) solids.push(LV.lock);
  var dx = p.x - ox;
  for (i = 0; i < solids.length; i++) {
    var s = solids[i];
    if (!(oy < s.y + s.h && oy + PH > s.y)) continue;
    if (dx > 0 && ox + PW <= s.x + 0.001 && p.x + PW > s.x) { p.x = s.x - PW; p.vx = 0; }
    else if (dx < 0 && ox >= s.x + s.w - 0.001 && p.x < s.x + s.w) { p.x = s.x + s.w; p.vx = 0; }
  }
  if (p.x < 0) { p.x = 0; if (p.vx < 0) p.vx = 0; }
  if (p.x > CW - PW) { p.x = CW - PW; if (p.vx > 0) p.vx = 0; }
  // 垂直
  p.vy += G * DT;
  var prevBottom = p.y + PH;
  p.y += p.vy * DT;
  var newBottom = p.y + PH;
  p.onGround = false;
  var best = null, bestTop = 1e9;
  var surf = [
    { id: 'lift', x0: LV.liftX, x1: LV.liftX + LV.liftW, top: lift.top },
    { id: 'ground', x0: LV.ground.x, x1: LV.ground.x + LV.ground.w, top: 1200 },
    { id: 'p1', x0: LV.p1.x, x1: LV.p1.x + LV.p1.w, top: LV.p1.y },
    { id: 'p2', x0: LV.p2.x, x1: LV.p2.x + LV.p2.w, top: LV.p2.y }
  ];
  var ghostSurf = null;
  if (g && !ghostWrapped) ghostSurf = { id: 'ghost', x0: g.x, x1: g.x + PW, top: g.y, prev: ghostPrev.y };
  if (ghostSurf) surf.push(ghostSurf);
  if (p.vy >= 0) {
    for (i = 0; i < surf.length; i++) {
      var f = surf[i];
      var prevTop = (f.id === carried) ? f.top : (f.prev !== undefined ? f.prev : f.top);
      if (!(p.x < f.x1 && p.x + PW > f.x0)) continue;
      if (prevBottom <= prevTop + 0.5 && newBottom >= f.top && f.top < bestTop) { best = f; bestTop = f.top; }
    }
  }
  if (best) {
    p.y = best.top - PH; p.vy = 0; p.onGround = true; p.support = best.id;
  } else p.support = null;
  // 6. 撿鑰匙 / 接鑰匙 / 開鎖
  if (!p.hasKey) {
    if (!keyPicked && ov(p.x, p.y, PW, PH, LV.key.x, LV.key.y, LV.key.w, LV.key.h)) { keyPicked = true; p.hasKey = true; }
    else if (g && g.k && (p.support === 'ghost' || ov(p.x - 0.5, p.y - 0.5, PW + 1, PH + 1, g.x, g.y, PW, PH))) p.hasKey = true;
  }
  if (p.hasKey && !lockOpen && ov(p.x - 1, p.y - 1, PW + 2, PH + 2, LV.lock.x, LV.lock.y, LV.lock.w, LV.lock.h)) lockOpen = true;
  // 7. 結束判定與紀錄
  var sp = LV.spike, gl = LV.goal;
  var died = p.y > CH || ov(p.x, p.y, PW, PH, sp.x, sp.y, sp.w, sp.h);
  var won = !died && ov(p.x, p.y, PW, PH, gl.x, gl.y, gl.w, gl.h);
  snap();
  if (p.launchF > 0) p.launchF--;
  if (p.hookF > 0) p.hookF--;
  if (won) { startWin(); return; }
  if (died || rec.length >= REC_MAX) { p.dead = true; phase = 'dying'; dyingF = DYING_F; }
}

function dyingTick() {
  dyingF--;
  if (dyingF > 0) return;
  records[gen - 1] = rec;
  if (gen >= MAX_GEN) { phase = 'lose'; return; }
  gen++;
  spawn();
}

// ===== 過關回放 =====
function startWin() {
  records[gen - 1] = rec;
  repRecs = records.slice();
  repT = 0;
  lift = { top: LV.liftMax, active: false };
  gate = { open: false, delay: 0 };
  phase = 'win';
}
function replayTick() {
  var pl = false, pg = false;
  for (var i = 0; i < repRecs.length; i++) {
    var r = repRecs[i], f = r[repT % r.length];
    if (f.g) {
      pl = pl || pressedBy(LV.plateLift, 1200, f.x, f.y, true);
      pg = pg || pressedBy(LV.plateGate, 780, f.x, f.y, true);
    }
  }
  platesPressed.lift = pl; platesPressed.gate = pg;
  updateMech(pl, pg, null);
  repT++;
}

// ===== 瞄準 / 彈出 =====
function enterAim() {
  aiming = true; aimT = 0;
  aimGhost = curGhost();
}
function aimVec() {
  var g = aimGhost;
  var pcx = p.x + PW / 2, pcy = p.y + PH / 2, gcx = g.x + PW / 2, gcy = g.y + PH / 2;
  var dx = gcx - pcx, dy = gcy - pcy, d = Math.sqrt(dx * dx + dy * dy);
  if (d < 1e-6) { dx = 0; dy = -1; d = 1; }
  var charge = Math.min(1, aimT / CHARGE_TIME);
  var cap = g.g ? CAP_GROUND : CAP_AIR;
  var speed = cap * (0.3 + 0.7 * charge);
  return { px: pcx, py: pcy, gx: gcx, gy: gcy, dx: dx / d, dy: dy / d, speed: speed, charge: charge,
           ax: pcx + dx / d * speed * ARROW_SEC, ay: pcy + dy / d * speed * ARROW_SEC };
}
function fireHook() {
  var a = aimVec();
  p.hookLeft--;
  p.vx = a.dx * a.speed; p.vy = a.dy * a.speed;
  p.onGround = false; p.support = null;
  p.launchF = LAUNCH_F; p.hookF = HOOK_SHOW_F;
  if (Math.abs(a.dx) > 0.01) p.facing = a.dx > 0 ? 1 : -1;
  aiming = false; aimGhost = null;
}

// ===== 輸入(只有鍵盤) =====
var GAME_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, ' ': 1, Spacebar: 1, z: 1, x: 1, r: 1, h: 1 };
window.addEventListener('keydown', function (e) {
  var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (GAME_KEYS[k]) e.preventDefault();
  if (e.repeat) return;
  if (screen === 'guide') {
    if (k === ' ' || k === 'Spacebar') {
      if (guidePage < GUIDE.length) guidePage++;
      else { screen = 'game'; if (!guideStarted) { guideStarted = true; resetAll(); } }
    }
    return;
  }
  if (k === 'r') { resetAll(); return; }
  if (k === 'h') { screen = 'guide'; guidePage = 1; keys.left = keys.right = keys.jump = false; return; }
  if (phase === 'win' || phase === 'lose') {
    if (k === ' ' || k === 'Spacebar') resetAll();
    return;
  }
  if (aiming) {
    if (k === 'z') fireHook();
    else if (k === 'x') aiming = false, aimGhost = null;
    return;
  }
  if (k === 'ArrowLeft') keys.left = true;
  else if (k === 'ArrowRight') keys.right = true;
  else if (k === ' ' || k === 'Spacebar' || k === 'ArrowUp') keys.jump = true;
  else if (k === 'z' && phase === 'play' && hookableNow()) enterAim();
});
window.addEventListener('keyup', function (e) {
  var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (GAME_KEYS[k]) e.preventDefault();
  if (k === 'ArrowLeft') keys.left = false;
  else if (k === 'ArrowRight') keys.right = false;
  else if (k === ' ' || k === 'Spacebar' || k === 'ArrowUp') keys.jump = false;
});
window.addEventListener('blur', function () { keys.left = keys.right = keys.jump = false; });

// ===== 繪製 =====
function drawHud(a) {
  Art.drawHud(ctx, { gen: gen, maxGen: MAX_GEN, phase: phase, hookLeft: p ? p.hookLeft : 0, hookMax: HOOK_MAX,
                     aiming: !!a, hasKey: p ? p.hasKey : false });
}
function drawWorld(isWin) {
  Art.drawBackground(ctx, {});
  var gr = LV.ground;
  Art.drawPlatform(ctx, { x: gr.x, y: gr.y, w: gr.w, h: gr.h });
  Art.drawPlatform(ctx, { x: LV.p1.x, y: LV.p1.y, w: LV.p1.w, h: LV.p1.h });
  Art.drawPlatform(ctx, { x: LV.p2.x, y: LV.p2.y, w: LV.p2.w, h: LV.p2.h });
  Art.drawSpike(ctx, { x: LV.spike.x, y: LV.spike.y, w: LV.spike.w });
  Art.drawPlate(ctx, { x: LV.plateLift.x, y: LV.plateLift.y, pressed: platesPressed.lift, kind: 'lift' });
  Art.drawPlate(ctx, { x: LV.plateGate.x, y: LV.plateGate.y, pressed: platesPressed.gate, kind: 'gate' });
  Art.drawLift(ctx, { x: LV.liftX, y: lift.top, active: lift.active });
  Art.drawGate(ctx, { x: LV.gate.x, y: LV.gate.y, open: gate.open });
  Art.drawLock(ctx, { x: LV.lock.x, y: LV.lock.y, open: isWin ? true : lockOpen });
  if (!isWin && !keyPicked) Art.drawKey(ctx, { x: LV.key.x, y: LV.key.y });
  Art.drawGoal(ctx, { x: LV.goal.x, y: LV.goal.y });
}
function drawGhostRec(r, f, gen_, hookable) {
  Art.drawGhost(ctx, { x: f.x, y: f.y, facing: f.f, state: f.s, gen: gen_, hookable: hookable, hasKey: f.k });
}
function drawHookRec(f) {
  if (f.h) Art.drawHook(ctx, { x1: f.h[0], y1: f.h[1], x2: f.h[2], y2: f.h[3] });
}

function buildPath() {
  var len = ghostRec.length, segs = [], total = Math.min(PATH_F, len), n1 = Math.min(len - ghostIdx, total), i, seg = [];
  for (i = 0; i < n1; i++) { var f = ghostRec[ghostIdx + i]; seg.push({ x: f.x + PW / 2, y: f.y + PH / 2 }); }
  segs.push(seg);
  if (n1 < total) {
    seg = [];
    for (i = 0; i < total - n1; i++) { var f2 = ghostRec[i]; seg.push({ x: f2.x + PW / 2, y: f2.y + PH / 2 }); }
    segs.push(seg);
  }
  return segs;
}

function render() {
  ctx.setTransform(viewK, 0, 0, viewK, 0, 0);
  ctx.clearRect(0, 0, CW, CH);
  if (screen === 'guide') {
    Art.drawBackground(ctx, {});
    Art.drawGuidePage(ctx, { page: guidePage });
    Placeholder.guideText(ctx, guidePage, CW);
    return;
  }
  var i;
  if (phase === 'win') {
    drawWorld(true);
    for (i = 0; i < repRecs.length; i++) {
      var r = repRecs[i], f = r[repT % r.length];
      drawHookRec(f);
      drawGhostRec(r, f, i + 1, false);
    }
    drawHud(false);
    return;
  }
  drawWorld(false);
  var g = curGhost();
  if (g) {
    Art.drawGhostPath(ctx, { segments: buildPath() });
    drawHookRec(g);
    drawGhostRec(ghostRec, g, gen - 1, hookableNow());
  }
  if (p.hookF > 0 && g) {
    Art.drawHook(ctx, { x1: p.x + PW / 2, y1: p.y + PH / 2, x2: g.x + PW / 2, y2: g.y + PH / 2 });
  }
  Art.drawPlayer(ctx, { x: p.x, y: p.y, facing: p.facing, state: pState(), gen: gen, hasKey: p.hasKey });
  if (aiming) {
    var a = aimVec();
    Art.drawAim(ctx, { px: a.px, py: a.py, gx: a.gx, gy: a.gy, ax: a.ax, ay: a.ay, charge: a.charge });
  }
  drawHud(aiming);
  Placeholder.hint(ctx, CW);
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
    if (screen === 'game') {
      if (aiming) { aimT += dt; acc = 0; }
      else {
        acc += dt;
        while (acc >= DT) {
          acc -= DT;
          if (phase === 'play') tick();
          else if (phase === 'dying') dyingTick();
          else if (phase === 'win') replayTick();
        }
      }
    } else acc = 0;
    render();
  } catch (err) { console.error(err); }
}
resetAll();
requestAnimationFrame(frame);

})();
