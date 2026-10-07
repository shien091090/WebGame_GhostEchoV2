(function () {
'use strict';

// ===== 常數(照 spec 數值參數表) =====
var STEP = 1 / 60;
var GRAV = 2400, JUMP_V = 900, WALK = 260;
var PW = 40, PH = 56;
var PATH_LEN = 300, RING_F = 24;
var HOOK_RANGE = 160, HOOK_MAX = 2, CHARGE_T = 1;
var CAP_MIN = 0.3, CAP_AIR = 1700, CAP_GND = 800, ARROW_T = 0.3;
var LAUNCH_F = 18, HOOKSHOW_F = 9;
var LIFT_SPEED = 200 * STEP, CLOSE_F = 18;
var MAX_GEN = 3, DYING_F = 36, MAX_REC = 3600;

var CW = Art.canvas.width, CH = Art.canvas.height;

// ===== 關卡(spec 關卡配置) =====
var SURF = [
  { x: 0, y: 1200, w: 600, h: 80, top: 1200 },   // 地面(實心, 但只需要頂面站立)
  { x: 0, y: 780, w: 480, h: 24, top: 780 },     // 平台一
  { x: 240, y: 360, w: 480, h: 24, top: 360 }    // 平台二
];
var GROUND = SURF[0];
var LIFT = { x: 480, w: 120, h: 24, min: 780, max: 1200 };
var PLATES = {
  lift: { x: 160, y: 1188, w: 80, h: 12, kind: 'lift' },
  gate: { x: 80, y: 768, w: 80, h: 12, kind: 'gate' }
};
var GATE = { x: 560, y: 140, w: 24, h: 220 };
var SPIKE = { x: 0, y: 756, w: 60, h: 24 };
var GOAL = { x: 640, y: 280, w: 48, h: 80 };
var SPAWN = { x: 60, y: 1144 };

// ===== 說明頁文字(guide.md) =====
var PAGES = [
  ['走到旗子', '←→ 走、空白鍵跳、R 整關重來'],
  ['先死一次', '一個人到不了, 要先死一次'],
  ['死了變幽靈', '死掉的你會一直重演'],
  ['吹哨', '按 C, 幽靈立刻從頭出發'],
  ['踩幽靈', '幽靈的頭能站, 還會載你走'],
  ['鉤幽靈', '幽靈發光時按 Z 瞄準, 每人 2 次'],
  ['開關', '有人踩住, 同色的東西才會動'],
  ['只看得見上一個人', '共三人, 只看得見上一個的幽靈']
];

// ===== canvas =====
var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
function resize() {
  var dpr = window.devicePixelRatio || 1;
  var fit = Math.min(window.innerWidth / CW, window.innerHeight / CH);
  if (!(fit > 0)) fit = 1;
  canvas.style.width = Math.floor(CW * fit) + 'px';
  canvas.style.height = Math.floor(CH * fit) + 'px';
  canvas.width = Math.floor(CW * fit * dpr);
  canvas.height = Math.floor(CH * fit * dpr);
  ctx.setTransform(canvas.width / CW, 0, 0, canvas.height / CH, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// ===== 狀態 =====
var S = {
  screen: 'guide', page: 0,
  phase: 'play',
  gen: 1, recs: [], rec: [],
  P: null, ghost: null,
  W: null,            // 升降台 / 門狀態
  hookLeft: HOOK_MAX, aiming: false, charge: 0,
  ring: null, dyingT: 0, hookT: 0,
  queue: [], keys: { left: false, right: false },
  replay: null
};

function newWorld() { return { liftTop: LIFT.max, gateOpen: false, closeCnt: 0, liftP: false, gateP: false }; }

function startGeneration(n) {
  S.gen = n;
  S.rec = [];
  S.P = { x: SPAWN.x, y: SPAWN.y, vx: 0, vy: 0, sup: 's0', facing: 1, state: 'idle', launchT: 0, dead: false };
  S.ghost = n > 1 ? { rec: S.recs[n - 2], frame: 0, prev: 0, jump: false } : null;
  S.W = newWorld();
  S.hookLeft = HOOK_MAX;
  S.aiming = false; S.charge = 0;
  S.ring = null; S.hookT = 0;
  S.phase = 'play';
  S.queue = [];
  S.replay = null;
  applyWorld(); // 出生當下依開關狀態運作
}
function restartAll() {
  S.recs = [];
  startGeneration(1);
}

// ===== 幾何工具 =====
function overlapX(P, x0, x1) { return P.x + PW > x0 && P.x < x1; }
function boxHit(P, r) {
  return P.x < r.x + r.w && P.x + PW > r.x && P.y < r.y + r.h && P.y + PH > r.y + 0.01;
}
function supRange(sup, gh) {
  if (sup === 'lift') return [LIFT.x, LIFT.x + LIFT.w];
  if (sup === 'ghost') { var b = gh.rec[gh.frame]; return [b.x, b.x + PW]; }
  var s = SURF[+sup.charAt(1)];
  return [s.x, s.x + s.w];
}

// ===== 開關 / 升降台 / 門(live 與回放共用) =====
function pressesPlate(pl, c) {
  return c.g && Math.abs(c.y + PH - (pl.y + pl.h)) < 0.6 && c.x + PW > pl.x && c.x < pl.x + pl.w;
}
// chars: [{x,y,g}], blocker: 角色框(門要關時若重疊則延後)或 null; 回傳升降台舊頂面
function updateWorld(W, chars, blocker) {
  var lp = false, gp = false, i;
  for (i = 0; i < chars.length; i++) {
    if (pressesPlate(PLATES.lift, chars[i])) lp = true;
    if (pressesPlate(PLATES.gate, chars[i])) gp = true;
  }
  W.liftP = lp; W.gateP = gp;
  var old = W.liftTop;
  if (lp) W.liftTop = Math.max(LIFT.min, W.liftTop - LIFT_SPEED);
  else W.liftTop = Math.min(LIFT.max, W.liftTop + LIFT_SPEED);
  if (gp) { W.gateOpen = true; W.closeCnt = 0; }
  else if (W.gateOpen) {
    W.closeCnt++;
    if (W.closeCnt >= CLOSE_F) {
      var hit = blocker && blocker.x < GATE.x + GATE.w && blocker.x + PW > GATE.x &&
        blocker.y < GATE.y + GATE.h && blocker.y + PH > GATE.y;
      if (!hit) { W.gateOpen = false; W.closeCnt = 0; }
    }
  }
  return old;
}
function playerChar(P) { return { x: P.x, y: P.y, g: P.sup !== null }; }
function ghostChar(gh) { var b = gh.rec[gh.frame]; return { x: b.x, y: b.y, g: b.g }; }

// 出生當下(或死亡演出中)的世界更新; 不含玩家
function applyWorld() {
  var chars = [];
  if (S.ghost) chars.push(ghostChar(S.ghost));
  updateWorld(S.W, chars, null);
}

// ===== 輸入 =====
var GAME_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, Space: 1, KeyC: 1, KeyZ: 1, KeyX: 1, KeyR: 1, KeyH: 1 };
window.addEventListener('keydown', function (e) {
  var code = e.code;
  if (!GAME_KEYS[code]) return;
  e.preventDefault();
  if (e.repeat) return;
  if (S.screen === 'guide') {
    if (code === 'Space') {
      S.page++;
      if (S.page >= PAGES.length) { S.screen = 'game'; S.page = 0; S.queue = []; }
    }
    return;
  }
  if (code === 'ArrowLeft') { S.keys.left = true; return; }
  if (code === 'ArrowRight') { S.keys.right = true; return; }
  if (code === 'KeyH') { S.screen = 'guide'; S.page = 0; return; }
  if (code === 'KeyR') {
    if (S.phase === 'play' || S.phase === 'dying') restartAll();
    return;
  }
  if (code === 'Space' && (S.phase === 'win' || S.phase === 'lose')) { restartAll(); return; }
  if (S.phase !== 'play') return;
  if (code === 'Space' || code === 'ArrowUp') S.queue.push('jump');
  else if (code === 'KeyC') S.queue.push('C');
  else if (code === 'KeyZ') S.queue.push('Z');
  else if (code === 'KeyX') S.queue.push('X');
});
window.addEventListener('keyup', function (e) {
  if (e.code === 'ArrowLeft') S.keys.left = false;
  else if (e.code === 'ArrowRight') S.keys.right = false;
});
window.addEventListener('blur', function () { S.keys.left = false; S.keys.right = false; });

// ===== 鉤爪 / 吹哨 =====
function centerOf(o) { return { x: o.x + PW / 2, y: o.y + PH / 2 }; }
function canHook() {
  var P = S.P, gh = S.ghost;
  if (!gh || S.phase !== 'play' || S.hookLeft <= 0) return false;
  var a = centerOf(P), b = centerOf(gh.rec[gh.frame]);
  return Math.hypot(a.x - b.x, a.y - b.y) <= HOOK_RANGE;
}
function aimInfo() {
  var P = S.P, gh = S.ghost, pose = gh.rec[gh.frame];
  var a = centerOf(P), b = centerOf(pose);
  var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
  if (d < 1e-6) { dx = 0; dy = -1; d = 1; }
  var cap = pose.g ? CAP_GND : CAP_AIR;
  var v = cap * (CAP_MIN + (1 - CAP_MIN) * S.charge);
  return { px: a.x, py: a.y, gx: b.x, gy: b.y, nx: dx / d, ny: dy / d, v: v };
}
function launch() {
  var P = S.P, info = aimInfo();
  P.vx = info.nx * info.v; P.vy = info.ny * info.v;
  P.sup = null; P.launchT = LAUNCH_F;
  S.hookLeft--; S.aiming = false; S.hookT = HOOKSHOW_F;
}
function whistle() {
  var gh = S.ghost;
  if (!gh) return;
  gh.frame = 0; gh.jump = true;
  var c = centerOf(gh.rec[0]);
  S.ring = { cx: c.x, cy: c.y, age: 0 };
  if (S.P.sup === 'ghost') S.P.sup = null;
}

// ===== 玩家物理 =====
function movePlayer(P, dir, jump, gh) {
  var launching = P.launchT > 0;
  if (launching) {
    P.launchT--;
    if (Math.abs(P.vx) > 1) P.facing = P.vx > 0 ? 1 : -1;
  } else {
    P.vx = dir * WALK;
    if (dir) P.facing = dir;
  }
  P.launching = launching;
  if (jump && P.sup !== null) { P.vy = -JUMP_V; P.sup = null; }

  // 水平
  var px = P.x;
  P.x += P.vx * STEP;
  if (P.x < 0) { P.x = 0; P.vx = 0; }
  if (P.x > CW - PW) { P.x = CW - PW; P.vx = 0; }
  var solids = [GROUND];
  if (!S.W.gateOpen) solids.push(GATE);
  for (var i = 0; i < solids.length; i++) {
    var s = solids[i];
    if (boxHit(P, s)) {
      if (px + PW <= s.x + 0.01) { P.x = s.x - PW; P.vx = 0; }
      else if (px >= s.x + s.w - 0.01) { P.x = s.x + s.w; P.vx = 0; }
    }
  }
  if (P.sup !== null) {
    var r = supRange(P.sup, gh);
    if (!(P.x + PW > r[0] && P.x < r[1])) P.sup = null;
  }

  // 垂直
  if (P.sup !== null) { P.vy = 0; return; }
  var ny = P.y + P.vy * STEP + 0.5 * GRAV * STEP * STEP;
  P.vy += GRAV * STEP;
  if (ny >= P.y) {
    var b0 = P.y + PH, b1 = ny + PH, bestTop = Infinity, bestId = null;
    // 升降台先評(同高時優先站升降台)
    if (overlapX(P, LIFT.x, LIFT.x + LIFT.w) && b0 <= S.W.liftTop + 0.01 && b1 >= S.W.liftTop) {
      bestTop = S.W.liftTop; bestId = 'lift';
    }
    for (var k = 0; k < SURF.length; k++) {
      var sf = SURF[k];
      if (overlapX(P, sf.x, sf.x + sf.w) && b0 <= sf.top + 0.01 && b1 >= sf.top && sf.top < bestTop) {
        bestTop = sf.top; bestId = 's' + k;
      }
    }
    if (gh) {
      var gb = gh.rec[gh.frame], ga = gh.rec[gh.prev];
      if (overlapX(P, gb.x, gb.x + PW) && b0 <= ga.y + 0.01 && b1 >= gb.y && gb.y < bestTop) {
        bestTop = gb.y; bestId = 'ghost';
      }
    }
    if (!S.W.gateOpen && overlapX(P, GATE.x, GATE.x + GATE.w) && b0 <= GATE.y + 0.01 && b1 >= GATE.y && GATE.y < bestTop) {
      bestTop = GATE.y; bestId = 'gate';
    }
    if (bestId !== null && bestId !== 'gate') {
      P.y = bestTop - PH; P.vy = 0; P.sup = bestId;
      return;
    }
    if (bestId === 'gate') { P.y = bestTop - PH; P.vy = 0; return; }
  }
  P.y = ny;
  if (!S.W.gateOpen && P.vy < 0 && boxHit(P, GATE)) { P.y = GATE.y + GATE.h; P.vy = 0; }
}

// ===== 每一幀(遊戲中) =====
function tickPlay() {
  var P = S.P, gh = S.ghost, jump = false;
  var q = S.queue; S.queue = [];
  for (var i = 0; i < q.length; i++) {
    var k = q[i];
    if (S.aiming) {
      if (k === 'Z') launch();
      else if (k === 'X') { S.aiming = false; }
    } else if (k === 'jump') jump = true;
    else if (k === 'C') whistle();
    else if (k === 'Z') { if (canHook()) { S.aiming = true; S.charge = 0; } }
  }
  if (S.aiming) { // 時間暫停: 只累積蓄力(真實時間)
    S.charge = Math.min(1, S.charge + STEP / CHARGE_T);
    P.state = 'aim';
    return;
  }

  // 幽靈跳幀(吹哨 / 循環接回)當幀: 站在頭上的角色改進入空中
  if (gh && gh.jump) {
    if (P.sup === 'ghost') P.sup = null;
    gh.prev = gh.frame; gh.jump = false;
  }
  if (P.sup === 'ghost') { // 跟著幽靈走
    var a = gh.rec[gh.prev], b = gh.rec[gh.frame];
    P.x += b.x - a.x; P.y = b.y - PH;
  }

  var dir = (S.keys.right ? 1 : 0) - (S.keys.left ? 1 : 0);
  movePlayer(P, dir, jump, gh);

  // 世界: 開關 → 升降台 / 門
  var chars = [playerChar(P)];
  if (gh) chars.push(ghostChar(gh));
  var oldTop = updateWorld(S.W, chars, P);
  var nt = S.W.liftTop, feet = P.y + PH;
  if (nt < oldTop && overlapX(P, LIFT.x, LIFT.x + LIFT.w) &&
      ((P.sup === null && P.vy >= 0) || P.sup === 's0') && feet <= oldTop + 0.01 && feet >= nt - 0.01) {
    P.sup = 'lift';
  }
  if (P.sup === 'lift') P.y = nt - PH;

  // 鉤索
  var hook = null;
  if (S.hookT > 0) {
    var pc = centerOf(P), gc = centerOf(gh.rec[gh.frame]);
    hook = { x1: pc.x, y1: pc.y, x2: gc.x, y2: gc.y };
    S.hookT--;
  }

  // 紀錄
  var grounded = P.sup !== null;
  var st = P.launching ? 'launch' : (!grounded ? 'air' : (P.vx !== 0 ? 'run' : 'idle'));
  P.state = st;
  S.rec.push({ x: P.x, y: P.y, f: P.facing, s: st, g: grounded, h: hook, gp: gh ? gh.frame : -1 });

  // 幽靈前進
  if (gh) {
    gh.prev = gh.frame; gh.frame++;
    if (gh.frame >= gh.rec.length) { gh.frame = 0; gh.jump = true; }
  }
  if (S.ring) { S.ring.age++; if (S.ring.age >= RING_F) S.ring = null; }

  // 結束判定
  var win = P.x < GOAL.x + GOAL.w && P.x + PW > GOAL.x && P.y < GOAL.y + GOAL.h && P.y + PH > GOAL.y;
  var die = P.y >= CH || (P.x < SPIKE.x + SPIKE.w && P.x + PW > SPIKE.x && P.y < SPIKE.y + SPIKE.h && P.y + PH > SPIKE.y) ||
    S.rec.length >= MAX_REC;
  if (win) {
    S.recs[S.gen - 1] = S.rec;
    startReplay();
  } else if (die) {
    S.recs[S.gen - 1] = S.rec;
    P.dead = true; P.state = 'dead';
    S.phase = 'dying'; S.dyingT = DYING_F;
    S.hookT = 0; S.aiming = false;
  }
}

function tickDying() {
  var gh = S.ghost;
  if (gh) {
    updateWorld(S.W, [ghostChar(gh)], null);
    gh.prev = gh.frame; gh.frame++;
    if (gh.frame >= gh.rec.length) { gh.frame = 0; gh.jump = true; }
  } else updateWorld(S.W, [], null);
  if (S.ring) { S.ring.age++; if (S.ring.age >= RING_F) S.ring = null; }
  S.dyingT--;
  if (S.dyingT <= 0) {
    if (S.gen >= MAX_GEN) S.phase = 'lose';
    else startGeneration(S.gen + 1);
  }
}

// ===== 過關回放(規格 34) =====
function replayChars(f) {
  var R = S.replay, out = [], gen = R.main, fr = f;
  while (gen >= 1 && fr >= 0) {
    var pose = S.recs[gen - 1][fr];
    out.push({ gen: gen, pose: pose });
    fr = pose.gp; gen--;
  }
  return out; // 主軸在前, 越舊的越後面
}
function replayApply() {
  var R = S.replay;
  if (R.f === 0) R.W = newWorld();
  var chars = replayChars(R.f), cs = [];
  for (var i = 0; i < chars.length; i++) cs.push({ x: chars[i].pose.x, y: chars[i].pose.y, g: chars[i].pose.g });
  updateWorld(R.W, cs, chars[0].pose);
}
function startReplay() {
  S.phase = 'win';
  S.aiming = false; S.ring = null;
  S.replay = { main: S.gen, f: 0, W: newWorld() };
  replayApply();
}
function tickReplay() {
  var R = S.replay;
  R.f++;
  if (R.f >= S.recs[R.main - 1].length) R.f = 0;
  replayApply();
}

function update() {
  if (S.screen !== 'game') return;
  if (S.phase === 'play') tickPlay();
  else if (S.phase === 'dying') tickDying();
  else if (S.phase === 'win') tickReplay();
}

// ===== 繪製(依狀態呼叫 Art) =====
function buildPath(gh) {
  var rec = gh.rec, n = rec.length, total = Math.min(PATH_LEN, n);
  var segs = [], seg = [];
  for (var i = 0; i < total; i++) {
    var fi = gh.frame + i;
    if (fi >= n) {
      if (fi === n) { segs.push(seg); seg = []; }
      fi -= n;
    }
    seg.push({ x: rec[fi].x + PW / 2, y: rec[fi].y + PH / 2 });
  }
  segs.push(seg);
  return segs;
}
function drawGhostPose(pose, gen, hookable) {
  Art.drawGhost(ctx, { x: pose.x, y: pose.y, facing: pose.f, state: pose.s, gen: gen, hookable: hookable });
  if (pose.h) Art.drawHook(ctx, { x1: pose.h.x1, y1: pose.h.y1, x2: pose.h.x2, y2: pose.h.y2 });
}

function drawScene(W) {
  Art.drawBackground(ctx, {});
  for (var i = 0; i < SURF.length; i++) {
    var s = SURF[i];
    Art.drawPlatform(ctx, { x: s.x, y: s.y, w: s.w, h: s.h });
  }
  Art.drawSpike(ctx, { x: SPIKE.x, y: SPIKE.y, w: SPIKE.w });
  Art.drawPlate(ctx, { x: PLATES.lift.x, y: PLATES.lift.y, pressed: W.liftP, kind: 'lift' });
  Art.drawPlate(ctx, { x: PLATES.gate.x, y: PLATES.gate.y, pressed: W.gateP, kind: 'gate' });
  Art.drawLift(ctx, { x: LIFT.x, y: W.liftTop, active: W.liftP });
  Art.drawGate(ctx, { x: GATE.x, y: GATE.y, open: W.gateOpen });
  Art.drawGoal(ctx, { x: GOAL.x, y: GOAL.y });
}

function render() {
  if (S.screen === 'guide') { renderGuide(); return; }
  var hud = { gen: S.gen, maxGen: MAX_GEN, phase: S.phase, hookLeft: S.hookLeft, hookMax: HOOK_MAX, aiming: S.aiming };
  if (S.phase === 'win') {
    var R = S.replay;
    drawScene(R.W);
    var chars = replayChars(R.f);
    for (var i = chars.length - 1; i >= 0; i--) drawGhostPose(chars[i].pose, chars[i].gen, false);
    hud.gen = R.main; hud.hookLeft = S.hookLeft;
    Art.drawHud(ctx, hud);
    return;
  }
  var P = S.P, gh = S.ghost;
  drawScene(S.W);
  if (gh && S.phase !== 'lose') Art.drawGhostPath(ctx, { segments: buildPath(gh) });
  if (S.ring) Art.drawWhistleRing(ctx, { cx: S.ring.cx, cy: S.ring.cy, t: S.ring.age / RING_F });
  if (gh) drawGhostPose(gh.rec[gh.frame], S.gen - 1, canHook());
  var last = S.rec.length ? S.rec[S.rec.length - 1] : null;
  if (last && last.h && !P.dead) Art.drawHook(ctx, { x1: last.h.x1, y1: last.h.y1, x2: last.h.x2, y2: last.h.y2 });
  Art.drawPlayer(ctx, { x: P.x, y: P.y, facing: P.facing, state: S.aiming ? 'aim' : P.state, gen: S.gen });
  if (S.aiming) {
    var info = aimInfo();
    Art.drawAim(ctx, {
      px: info.px, py: info.py, gx: info.gx, gy: info.gy,
      ax: info.px + info.nx * info.v * ARROW_T, ay: info.py + info.ny * info.v * ARROW_T,
      charge: S.charge
    });
  }
  Art.drawHud(ctx, hud);
}

function renderGuide() {
  ctx.fillStyle = '#10101a';
  ctx.fillRect(0, 0, CW, CH);
  Art.drawGuidePage(ctx, { page: S.page });
  var p = PAGES[S.page];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  function label(t, y, size) {
    ctx.font = 'bold ' + size + 'px sans-serif';
    ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.strokeText(t, CW / 2, y);
    ctx.fillStyle = '#fff'; ctx.fillText(t, CW / 2, y);
  }
  label('第 ' + (S.page + 1) + ' 頁  ' + p[0], 56, 40);
  label(p[1], 112, 28);
  label(S.page === PAGES.length - 1 ? '空白鍵 開始遊戲(遊戲中按 H 可再看說明)' : '空白鍵 下一頁  (' + (S.page + 1) + '/' + PAGES.length + ')', CH - 50, 26);
}

// ===== 主迴圈 =====
var lastTs = 0, acc = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  try {
    if (!lastTs) lastTs = ts;
    var dt = Math.min((ts - lastTs) / 1000, 1 / 30);
    lastTs = ts;
    acc += dt;
    var n = 0;
    while (acc >= STEP && n < 4) { update(); acc -= STEP; n++; }
    if (acc >= STEP) acc = 0;
    render();
  } catch (err) { console.error(err); }
}

restartAll();
requestAnimationFrame(frame);
/*DBG*/
})();
