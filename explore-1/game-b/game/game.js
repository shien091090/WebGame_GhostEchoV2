// 鉤影 — 玩法驗證 Demo。邏輯(step)與繪製(render)分離, 繪製只呼叫 Art 介面內的 draw 函式。
var CW = Art.canvas ? Art.canvas.width : 720;
var CH = Art.canvas ? Art.canvas.height : 1280;

var DT = 1 / 60;
var GRAVITY = 2400, JUMP_V = 900, WALK = 260;
var PW = 40, PH = 56;
var HOOK_RANGE = 260, HOOK_TIME = 0.12, STRONG_V = 1000, WEAK_V = 650;
var MAX_GEN = 3, DYING_TIME = 0.6, MAX_REC = 60 * 60;
var EPS = 0.01;

var LEVEL = {
  ground: { x: 0, y: 1200, w: 600, h: 80 },          // 實心
  oneway: [
    { x: 0, y: 860, w: 480, h: 24 },
    { x: 260, y: 540, w: 460, h: 24 }
  ],
  spike: { x: 0, y: 836, w: 80, h: 24 },
  goal: { x: 640, y: 460, w: 48, h: 80 },
  spawn: { x: 60, y: 1144 }
};

// ---- 佔位(style.md / interface.json 沒有的圖形)集中在這 ----
var Placeholder = {
  // 說明頁文字(底圖用 Art.drawBackground, 文字與色塊由此疊上)
  guideText: function (ctx, title, text, page, total, lastPage, fromGame) {
    ctx.save();
    ctx.fillStyle = 'rgba(10,12,24,0.78)';
    ctx.fillRect(0, 0, CW, 150);
    ctx.fillRect(0, CH - 230, CW, 230);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd86b';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText(title, CW / 2, 95);
    ctx.fillStyle = '#ffffff';
    ctx.font = '36px sans-serif';
    ctx.fillText(text, CW / 2, CH - 150);
    ctx.fillStyle = '#9ad';
    ctx.font = '28px sans-serif';
    ctx.fillText(page + ' / ' + total, CW / 2, CH - 95);
    ctx.fillText(lastPage ? (fromGame ? '按空白鍵 繼續遊戲' : '按空白鍵 開始遊戲') : '按空白鍵 下一頁', CW / 2, CH - 50);
    ctx.restore();
  }
};

var GUIDE = [
  { t: '走到旗子', s: '←→ 走、空白鍵跳、R 整關重來' },
  { t: '死了會變幽靈', s: '死掉的你會一直重演剛才的動作' },
  { t: '踩幽靈', s: '幽靈的頭可以踩' },
  { t: '鉤幽靈', s: 'Z 鉤幽靈, 它在空中時甩得最高' },
  { t: '只有三個人', s: '共三人, 只看得到上一個人的幽靈' }
];

// ---- 狀態 ----
var Game = {
  screen: 'guide',      // guide | game
  guidePage: 1,
  guideFromGame: false,
  phase: 'play',        // play | dying | win | lose
  gen: 1,
  player: null,
  rec: [],
  ghostRec: null,       // 上一代的紀錄
  gIdx: 0, gPrev: null, gCur: null, gWrapped: false,
  dyingT: 0,
  hookUsed: false, hookT: 0, hookSX: 0, hookSY: 0,
  keys: { left: false, right: false },
  jumpPressed: false, hookPressed: false
};

function newPlayer() {
  return { x: LEVEL.spawn.x, y: LEVEL.spawn.y, vx: 0, vy: 0, facing: 1, state: 'idle', onGround: true, onGhost: false };
}

function frameOf(p, dir) {
  var s = p.state === 'hook' || !p.onGround ? 'air' : (dir !== 0 ? 'run' : 'idle');
  return { x: p.x, y: p.y, f: p.facing, s: s, g: p.onGround };
}

function resetLevel() {
  Game.gen = 1;
  Game.ghostRec = null;
  Game.phase = 'play';
  spawnGen();
}

function spawnGen() {
  Game.player = newPlayer();
  Game.rec = [frameOf(Game.player, 0)];
  Game.hookUsed = false;
  Game.hookT = 0;
  Game.jumpPressed = false;
  Game.hookPressed = false;
  Game.gIdx = 0;
  Game.gWrapped = false;
  if (Game.ghostRec) {
    Game.gCur = Game.ghostRec[0];
    Game.gPrev = Game.ghostRec[0];
  } else {
    Game.gCur = null;
    Game.gPrev = null;
  }
}

function advanceGhost() {
  Game.gWrapped = false;
  if (!Game.ghostRec) return;
  var n = Game.ghostRec.length;
  Game.gPrev = Game.gCur;
  Game.gIdx = (Game.gIdx + 1) % n;
  if (Game.gIdx === 0) Game.gWrapped = true;
  Game.gCur = Game.ghostRec[Game.gIdx];
}

function overlapX(ax, aw, bx, bw) { return ax < bx + bw && ax + aw > bx; }
function overlapRect(a, w, h, r) {
  return a.x < r.x + r.w && a.x + w > r.x && a.y < r.y + r.h && a.y + h > r.y;
}

function canHook() {
  var p = Game.player, g = Game.gCur;
  if (!g || Game.hookUsed) return false;
  var dx = (p.x + PW / 2) - (g.x + PW / 2), dy = (p.y + PH / 2) - (g.y + PH / 2);
  return Math.sqrt(dx * dx + dy * dy) <= HOOK_RANGE;
}

function killPlayer() {
  Game.player.state = 'dead';
  Game.phase = 'dying';
  Game.dyingT = DYING_TIME;
}

function checkHazards() {
  var p = Game.player;
  if (p.y >= CH || overlapRect(p, PW, PH, LEVEL.spike)) { killPlayer(); return true; }
  if (overlapRect(p, PW, PH, LEVEL.goal)) { Game.phase = 'win'; return true; }
  return false;
}

function updatePlayer() {
  var p = Game.player, g = Game.gCur, gp = Game.gPrev;
  var dir = (Game.keys.right ? 1 : 0) - (Game.keys.left ? 1 : 0);
  var jumpReq = Game.jumpPressed, hookReq = Game.hookPressed;
  Game.jumpPressed = false;
  Game.hookPressed = false;
  if (dir !== 0) p.facing = dir;

  // --- 被鉤爪拉動中 ---
  if (p.state === 'hook') {
    if (Game.gWrapped || !g) {          // 規則 19: 幽靈循環重來, 鉤爪中斷
      p.state = 'air'; p.vx = 0; p.vy = 0;
    } else {
      Game.hookT += DT;
      var prog = Math.min(1, Game.hookT / HOOK_TIME);
      var tx = g.x, ty = g.y - PH;
      p.x = Game.hookSX + (tx - Game.hookSX) * prog;
      p.y = Game.hookSY + (ty - Game.hookSY) * prog;
      if (Game.hookT >= HOOK_TIME - 1e-9) {
        p.x = tx; p.y = ty;
        p.vx = 0;
        p.vy = g.g ? -WEAK_V : -STRONG_V;   // 規則 16
        p.state = 'air';
        p.onGround = false;
      }
    }
    return;
  }

  // --- 出鉤(規則 15、17) ---
  if (hookReq && canHook()) {
    Game.hookUsed = true;
    Game.hookT = 0;
    Game.hookSX = p.x; Game.hookSY = p.y;
    p.state = 'hook';
    p.onGround = false; p.onGhost = false;
    p.vx = 0; p.vy = 0;
    return;
  }

  // --- 起跳 ---
  var jumped = false;
  if (jumpReq && p.onGround) {
    p.vy = -JUMP_V; p.onGround = false; p.onGhost = false; jumped = true;
  }

  // --- 站在幽靈頭上: 跟著走(規則 11、12) ---
  if (p.onGhost && !jumped) {
    if (Game.gWrapped || !g) {
      p.onGhost = false; p.onGround = false; p.vy = 0;
    } else {
      var nx = p.x + dir * WALK * DT + (g.x - gp.x);
      nx = Math.max(0, Math.min(CW - PW, nx));
      p.x = nx;
      if (!overlapX(nx, PW, g.x, PW)) {
        p.onGhost = false; p.onGround = false; p.vy = 0;
      } else {
        p.y = g.y - PH;
      }
    }
    p.state = p.onGround ? (dir !== 0 ? 'run' : 'idle') : 'air';
    return;
  }

  // --- 一般移動 ---
  var prevX = p.x;
  p.x += dir * WALK * DT;
  p.x = Math.max(0, Math.min(CW - PW, p.x));
  var gr = LEVEL.ground;   // 實心地面側面擋人
  if (p.y + PH > gr.y + EPS && p.y < gr.y + gr.h && overlapX(p.x, PW, gr.x, gr.w)) {
    p.x = prevX < gr.x + gr.w ? gr.x + gr.w - PW : gr.x + gr.w;
  }

  var prevBottom = p.y + PH;
  p.vy += GRAVITY * DT;
  p.y += (p.vy - GRAVITY * DT / 2) * DT;   // 梯形積分, 跳高貼近理論值 168
  var newBottom = p.y + PH;
  var landTop = null, onGhost = false;
  if (p.vy >= 0) {
    var cands = [];
    if (overlapX(p.x, PW, gr.x, gr.w)) cands.push(gr.y);
    for (var i = 0; i < LEVEL.oneway.length; i++) {
      var pf = LEVEL.oneway[i];
      if (overlapX(p.x, PW, pf.x, pf.w)) cands.push(pf.y);
    }
    for (var j = 0; j < cands.length; j++) {
      var top = cands[j];
      if (prevBottom <= top + EPS && newBottom >= top && (landTop === null || top < landTop)) { landTop = top; onGhost = false; }
    }
    if (g && gp && !Game.gWrapped && overlapX(p.x, PW, g.x, PW)) {   // 規則 10
      if (prevBottom <= gp.y + EPS && newBottom >= g.y && (landTop === null || g.y < landTop)) { landTop = g.y; onGhost = true; }
    }
  }
  if (landTop !== null) {
    p.y = landTop - PH; p.vy = 0; p.onGround = true; p.onGhost = onGhost;
    Game.hookUsed = false;               // 規則 18
  } else {
    p.onGround = false; p.onGhost = false;
  }
  p.state = p.onGround ? (dir !== 0 ? 'run' : 'idle') : 'air';
}

function nextGen() {
  if (Game.gen >= MAX_GEN) { Game.phase = 'lose'; return; }
  Game.ghostRec = Game.rec;     // 規則 9: 只留上一代
  Game.gen++;
  Game.phase = 'play';
  spawnGen();
}

function step() {
  if (Game.screen !== 'game') return;
  if (Game.phase === 'dying') {
    advanceGhost();
    Game.dyingT -= DT;
    Game.jumpPressed = false; Game.hookPressed = false;
    if (Game.dyingT <= 0) nextGen();
    return;
  }
  if (Game.phase !== 'play') return;
  advanceGhost();
  updatePlayer();
  if (Game.phase !== 'play') return;
  if (checkHazards()) return;
  var dir = (Game.keys.right ? 1 : 0) - (Game.keys.left ? 1 : 0);
  Game.rec.push(frameOf(Game.player, dir));
  if (Game.rec.length >= MAX_REC) killPlayer();   // 規則 6
}

// ---- 繪製 ----
function render(ctx) {
  if (Game.screen === 'guide') {
    var gp = GUIDE[Game.guidePage - 1];
    Art.drawBackground(ctx, {});
    Placeholder.guideText(ctx, gp.t, gp.s, Game.guidePage, GUIDE.length, Game.guidePage === GUIDE.length, Game.guideFromGame);
    return;
  }
  var p = Game.player, g = Game.gCur;
  Art.drawBackground(ctx, {});
  Art.drawPlatform(ctx, LEVEL.ground);
  for (var i = 0; i < LEVEL.oneway.length; i++) Art.drawPlatform(ctx, LEVEL.oneway[i]);
  Art.drawSpike(ctx, { x: LEVEL.spike.x, y: LEVEL.spike.y, w: LEVEL.spike.w });
  Art.drawGoal(ctx, { x: LEVEL.goal.x, y: LEVEL.goal.y });
  if (g) {
    var hookable = Game.phase === 'play' && p.state !== 'hook' && canHook();
    Art.drawGhost(ctx, { x: g.x, y: g.y, facing: g.f, state: g.s, gen: Game.gen - 1, hookable: hookable });
  }
  if (p.state === 'hook' && g) {
    Art.drawHook(ctx, { x1: p.x + PW / 2, y1: p.y + PH / 2, x2: g.x + PW / 2, y2: g.y });
  }
  Art.drawPlayer(ctx, { x: p.x, y: p.y, facing: p.facing, state: p.state, gen: Game.gen });
  Art.drawHud(ctx, { gen: Game.gen, maxGen: MAX_GEN, phase: Game.phase, hookReady: !Game.hookUsed });
}

// ---- 輸入(只有鍵盤) ----
var GAME_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, Space: 1, KeyZ: 1, KeyR: 1, KeyH: 1 };

function onKeyDown(e) {
  if (e.repeat) { if (GAME_KEYS[e.code]) e.preventDefault(); return; }
  if (!GAME_KEYS[e.code]) return;
  e.preventDefault();
  var code = e.code;
  if (Game.screen === 'guide') {
    if (code === 'Space') {
      if (Game.guidePage < GUIDE.length) Game.guidePage++;
      else {
        Game.screen = 'game';
        if (!Game.player) resetLevel();
        Game.jumpPressed = false; Game.hookPressed = false;
      }
    }
    return;
  }
  if (code === 'KeyH' && Game.phase === 'play') {      // 遊戲中叫出說明(暫停)
    Game.screen = 'guide'; Game.guidePage = 1; Game.guideFromGame = true;
    return;
  }
  if (Game.phase === 'win' || Game.phase === 'lose') {
    if (code === 'Space') resetLevel();
    return;
  }
  if (code === 'KeyR') { resetLevel(); return; }
  if (Game.phase !== 'play') return;
  if (code === 'ArrowLeft') Game.keys.left = true;
  else if (code === 'ArrowRight') Game.keys.right = true;
  else if (code === 'Space' || code === 'ArrowUp') Game.jumpPressed = true;
  else if (code === 'KeyZ') Game.hookPressed = true;
}

function onKeyUp(e) {
  if (GAME_KEYS[e.code]) e.preventDefault();
  if (e.code === 'ArrowLeft') Game.keys.left = false;
  else if (e.code === 'ArrowRight') Game.keys.right = false;
}

// ---- 啟動 ----
var canvas, ctx2d, lastT = 0, acc = 0;

function fitCanvas() {
  var dpr = window.devicePixelRatio || 1;
  var fit = Math.min(window.innerWidth / CW, window.innerHeight / CH);
  if (!(fit > 0)) fit = 1;
  var cssW = CW * fit, cssH = CH * fit;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx2d.setTransform(canvas.width / CW, 0, 0, canvas.height / CH, 0, 0);
}

function frame(t) {
  var dt = (t - lastT) / 1000;
  lastT = t;
  if (!(dt > 0)) dt = 0;
  dt = Math.min(dt, 1 / 30);
  acc += dt;
  while (acc >= DT) { step(); acc -= DT; }
  render(ctx2d);
  requestAnimationFrame(frame);
}

function boot() {
  canvas = document.getElementById('c');
  ctx2d = canvas.getContext('2d');
  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', function () { Game.keys.left = false; Game.keys.right = false; });
  resetLevel();
  requestAnimationFrame(function (t) { lastT = t; requestAnimationFrame(frame); });
}

boot();
