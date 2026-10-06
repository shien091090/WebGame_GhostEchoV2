/* 三代接力 — 玩法驗證 Demo。邏輯與繪製分離: tick 只改狀態, render 只呼叫 Art。 */
var CW = Art.canvas.width, CH = Art.canvas.height;

// ---- 數值 (spec 數值參數表) ----
var DT = 1 / 60;
var GRAV = 2400, JUMP_V = 900, WALK = 260;
var PW = 40, PH = 56;
var MAXGEN = 3, MAXREC = 3600;       // 單代錄製上限 60 秒 * 60 幀
var DYING_FRAMES = 36;               // 死亡演出 0.6 秒
var CLOSE_DELAY = 0.3;               // 關門延遲
var GUIDE_PAGES = 5;

// ---- 關卡配置 (spec 關卡配置) ----
var LV = {
  ground: { x: 0, y: 1200, w: 600, h: 80 },
  p1: { x: 0, y: 1000, w: 480, h: 24 },
  p2: { x: 360, y: 880, w: 360, h: 24 },
  spike: { x: 0, y: 976, w: 80, h: 24 },
  plate: { x: 160, y: 988, w: 80, h: 12 },
  gate: { x: 560, y: 560, w: 24, h: 320 },
  goal: { x: 640, y: 800, w: 48, h: 80 },
  spawn: { x: 60, y: 1144 }
};
var PLATE_SURFACE_Y = 1000; // 開關頂面視為平台一表面
// 可站的表面 (地面實心頂面 + 兩個單向平台頂面)
var SURFACES = [
  { x: LV.ground.x, w: LV.ground.w, y: LV.ground.y },
  { x: LV.p1.x, w: LV.p1.w, y: LV.p1.y },
  { x: LV.p2.x, w: LV.p2.w, y: LV.p2.y }
];

// ---- 狀態 ----
var G = {
  screen: 'guide',      // guide | game
  guidePage: 1,
  guideInGame: false,   // 遊戲中叫出的說明: 看完回到遊戲而非重開
  phase: 'play',        // play | dying | win | lose
  gen: 1,
  recs: [null, [], [], []],
  player: null,
  ghost: null,          // 上一代幽靈(遊玩中)
  pb: [],               // 過關回放的幽靈們
  gate: { open: false, timer: 0 },
  plateDown: false,
  dyingLeft: 0
};
var keys = { left: false, right: false };
var jumpQ = false;

function overlapX(ax, aw, bx, bw) { return ax + aw > bx && ax < bx + bw; }
function overlapRect(ax, ay, aw, ah, r) {
  return ax + aw > r.x && ax < r.x + r.w && ay + ah > r.y && ay < r.y + r.h;
}

// ---- 幽靈 ----
function makeGhost(rec, gen) {
  var f = rec[0];
  return { rec: rec, idx: 0, gen: gen, wrapped: false,
    x: f.x, y: f.y, px: f.x, py: f.y, facing: f.f, state: f.s, grounded: f.g };
}
function ghostStep(g) {
  g.px = g.x; g.py = g.y;
  g.idx++;
  g.wrapped = false;
  if (g.idx >= g.rec.length) { g.idx = 0; g.wrapped = true; }
  var f = g.rec[g.idx];
  g.x = f.x; g.y = f.y; g.facing = f.f; g.state = f.s; g.grounded = f.g;
}

// ---- 世代 ----
function newGame() {
  G.recs = [null, [], [], []];
  startGen(1);
}
function startGen(n) {
  G.gen = n;
  G.phase = 'play';
  var p = {
    x: LV.spawn.x, y: LV.spawn.y, vy: 0, facing: 1, state: 'idle',
    grounded: true, standingOn: null, dead: false
  };
  G.player = p;
  G.recs[n] = [recFrame(p)];
  G.ghost = n > 1 ? makeGhost(G.recs[n - 1], n - 1) : null;
  G.pb = [];
  G.gate = { open: false, timer: 0 };
  G.plateDown = false;
  jumpQ = false;
}
function recFrame(p) {
  return { x: p.x, y: p.y, f: p.facing, s: p.state, g: p.grounded };
}
function killPlayer() {
  G.player.dead = true;
  G.player.state = 'dead';
  G.phase = 'dying';
  G.dyingLeft = DYING_FRAMES;
}
function winGame() {
  G.phase = 'win';
  G.pb = [];
  for (var n = 1; n <= G.gen; n++) G.pb.push(makeGhost(G.recs[n], n));
  G.ghost = null;
  G.gate = { open: false, timer: 0 };
  jumpQ = false;
}

// ---- 玩家一幀 ----
function playerStep() {
  var p = G.player, g = G.ghost;
  var x0 = p.x, feet0 = p.y + PH;
  var rider = p.standingOn;
  if (rider && rider.wrapped) { // 規則 12: 幽靈循環回頭, 不跟著瞬移, 進入空中
    p.standingOn = null; p.grounded = false; rider = null;
  }
  if (jumpQ && p.grounded) {
    p.vy = -JUMP_V; p.grounded = false; p.standingOn = null; rider = null;
  }
  // 水平
  if (rider) p.x += rider.x - rider.px;
  var dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (dir !== 0) p.facing = dir;
  p.x += dir * WALK * DT;
  if (p.x < 0) p.x = 0;
  if (p.x > CW - PW) p.x = CW - PW;
  // 門(關著時為實心牆)
  var gt = LV.gate;
  if (!G.gate.open && overlapRect(p.x, p.y, PW, PH, gt)) {
    if (x0 + PW <= gt.x + 0.001) p.x = gt.x - PW;
    else if (x0 >= gt.x + gt.w - 0.001) p.x = gt.x + gt.w;
  }
  // 地面實心側牆(坑壁)
  var gr = LV.ground;
  if (overlapRect(p.x, p.y, PW, PH, gr)) {
    if (x0 >= gr.x + gr.w - 0.001) p.x = gr.x + gr.w;
    else if (x0 + PW <= gr.x + 0.001) p.x = gr.x - PW;
  }
  // 垂直
  var snapped = false;
  if (rider) {
    if (overlapX(p.x, PW, rider.x, PW)) {
      p.y = rider.y - PH; p.vy = 0; p.grounded = true; snapped = true;
    } else {
      p.standingOn = null;
    }
  }
  if (!snapped) {
    p.vy += GRAV * DT;
    p.y += p.vy * DT;
    p.grounded = false;
    p.standingOn = null;
    if (p.vy >= 0) {
      var feet = p.y + PH, bestY = null, bestGhost = null, i;
      for (i = 0; i < SURFACES.length; i++) {
        var s = SURFACES[i];
        if (overlapX(p.x, PW, s.x, s.w) && feet0 <= s.y + 0.001 && feet >= s.y) {
          if (bestY === null || s.y < bestY) { bestY = s.y; bestGhost = null; }
        }
      }
      if (g && !g.wrapped && overlapX(p.x, PW, g.x, PW) &&
          feet0 <= g.py + 0.001 && feet >= g.y) {
        if (bestY === null || g.y < bestY) { bestY = g.y; bestGhost = g; }
      }
      if (bestY !== null) {
        p.y = bestY - PH; p.vy = 0; p.grounded = true; p.standingOn = bestGhost;
      }
    }
  }
  p.state = !p.grounded ? 'air' : (dir !== 0 ? 'run' : 'idle');
}

function pressing(e) {
  return e.grounded && Math.abs(e.y + PH - PLATE_SURFACE_Y) < 0.01 &&
    overlapX(e.x, PW, LV.plate.x, LV.plate.w);
}
function updateGate(pressed, playerRect) {
  var gate = G.gate;
  G.plateDown = pressed;
  if (pressed) { gate.open = true; gate.timer = CLOSE_DELAY; return; }
  if (gate.open) {
    gate.timer -= DT;
    if (gate.timer <= 0) {
      // 規則 17: 關門當下角色與門重疊 → 延後到離開
      if (playerRect && overlapRect(playerRect.x, playerRect.y, PW, PH, LV.gate)) gate.timer = 0;
      else gate.open = false;
    }
  }
}

// ---- 一個固定步長 ----
function tick() {
  if (G.screen !== 'game') return;
  var p = G.player, i;
  if (G.phase === 'play') {
    if (G.ghost) ghostStep(G.ghost);
    playerStep();
    jumpQ = false;
    // 死亡: 尖刺 / 掉出下緣
    if (overlapRect(p.x, p.y, PW, PH, LV.spike) || p.y > CH) {
      killPlayer();
      updateGate(G.ghost ? pressing(G.ghost) : false, null);
      return;
    }
    G.recs[G.gen].push(recFrame(p));
    var pressed = pressing(p) || (G.ghost ? pressing(G.ghost) : false);
    updateGate(pressed, p);
    if (overlapRect(p.x, p.y, PW, PH, LV.goal)) { winGame(); return; }
    if (G.recs[G.gen].length >= MAXREC) killPlayer(); // 規則 6: 錄滿 60 秒自動死亡
  } else if (G.phase === 'dying') {
    if (G.ghost) ghostStep(G.ghost);
    updateGate(G.ghost ? pressing(G.ghost) : false, null);
    G.dyingLeft--;
    if (G.dyingLeft <= 0) {
      if (G.gen < MAXGEN) startGen(G.gen + 1);
      else G.phase = 'lose';
    }
  } else if (G.phase === 'win') {
    var any = false;
    for (i = 0; i < G.pb.length; i++) { ghostStep(G.pb[i]); if (pressing(G.pb[i])) any = true; }
    updateGate(any, null);
  } else if (G.phase === 'lose') {
    if (G.ghost) ghostStep(G.ghost);
    updateGate(G.ghost ? pressing(G.ghost) : false, null);
  }
}

// ---- 繪製 (只呼叫 Art) ----
var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
var dpr = 1;
function resize() {
  dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(CW * dpr);
  canvas.height = Math.round(CH * dpr);
  var s = Math.min(window.innerWidth / CW, window.innerHeight / CH);
  canvas.style.width = Math.floor(CW * s) + 'px';
  canvas.style.height = Math.floor(CH * s) + 'px';
}
function drawGhostObj(g) {
  Art.drawGhost(ctx, { x: g.x, y: g.y, facing: g.facing, state: g.state, gen: g.gen });
}
function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, CW, CH);
  if (G.screen === 'guide') {
    Art.drawGuidePage(ctx, { page: G.guidePage });
    return;
  }
  var i;
  Art.drawBackground(ctx, {});
  Art.drawPlatform(ctx, { x: LV.ground.x, y: LV.ground.y, w: LV.ground.w, h: LV.ground.h });
  Art.drawPlatform(ctx, { x: LV.p1.x, y: LV.p1.y, w: LV.p1.w, h: LV.p1.h });
  Art.drawPlatform(ctx, { x: LV.p2.x, y: LV.p2.y, w: LV.p2.w, h: LV.p2.h });
  Art.drawPlate(ctx, { x: LV.plate.x, y: LV.plate.y, pressed: G.plateDown });
  Art.drawSpike(ctx, { x: LV.spike.x, y: LV.spike.y, w: LV.spike.w });
  Art.drawGoal(ctx, { x: LV.goal.x, y: LV.goal.y });
  Art.drawGate(ctx, { x: LV.gate.x, y: LV.gate.y, open: G.gate.open });
  if (G.phase === 'win') {
    for (i = 0; i < G.pb.length; i++) drawGhostObj(G.pb[i]);
  } else {
    if (G.ghost) drawGhostObj(G.ghost);
    var p = G.player;
    Art.drawPlayer(ctx, { x: p.x, y: p.y, facing: p.facing, state: p.state, gen: G.gen });
  }
  Art.drawHud(ctx, { gen: G.gen, maxGen: MAXGEN, phase: G.phase });
}

// ---- 輸入(只有鍵盤) ----
var GAME_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, Space: 1, KeyR: 1, KeyH: 1 };
function onKeyDown(e) {
  var c = e.code;
  if (GAME_KEYS[c]) e.preventDefault();
  if (e.repeat) return;
  if (G.screen === 'guide') {
    if (c === 'Space') {
      if (G.guidePage < GUIDE_PAGES) G.guidePage++;
      else {
        G.screen = 'game';
        if (!G.guideInGame) newGame();
        G.guideInGame = false;
      }
    }
    return;
  }
  if (c === 'ArrowLeft') keys.left = true;
  else if (c === 'ArrowRight') keys.right = true;
  else if (c === 'KeyH') { G.screen = 'guide'; G.guidePage = 1; G.guideInGame = true; }
  else if (c === 'KeyR') newGame();
  else if (c === 'Space' || c === 'ArrowUp') {
    if (c === 'Space' && (G.phase === 'win' || G.phase === 'lose')) newGame();
    else if (G.phase === 'play') jumpQ = true;
  }
}
function onKeyUp(e) {
  if (GAME_KEYS[e.code]) e.preventDefault();
  if (e.code === 'ArrowLeft') keys.left = false;
  else if (e.code === 'ArrowRight') keys.right = false;
}
window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);
window.addEventListener('blur', function () { keys.left = false; keys.right = false; jumpQ = false; });
window.addEventListener('resize', resize);

// ---- 主迴圈 ----
var lastT = null, acc = 0;
function frame(t) {
  if (lastT === null) lastT = t;
  var dt = Math.min((t - lastT) / 1000, 1 / 30);
  lastT = t;
  acc += dt;
  while (acc >= DT) { tick(); acc -= DT; }
  render();
  requestAnimationFrame(frame);
}
resize();
requestAnimationFrame(frame);
