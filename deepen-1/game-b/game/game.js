// 共鉤 — 玩法驗證 Demo。邏輯固定步長 1/60, 繪製只呼叫 Art 的繪圖介面
(function () {
  'use strict';

  // ---------- 參數 ----------
  var CW = Art.canvas.width, CH = Art.canvas.height;
  var DT = 1 / 60;
  var GRAV = 2400, JUMP_V = 900, WALK = 260;
  var PW = 40, PH = 56;
  var HOOK_RANGE = 160, HOOK_TIME = 0.12, STRONG = 1200, WEAK = 650;
  var HOOK_MAX = 2, MAX_GEN = 3;
  var GATE_DELAY = 0.3, DYING_TIME = 0.6, MAX_FRAMES = 60 * 60;
  var SPAWN = { x: 60, y: 1144 };

  // ---------- 關卡 ----------
  var GROUND = { x: 0, y: 1200, w: 600, h: 80 };
  var PLAT1 = { x: 0, y: 780, w: 480, h: 24 };
  var PLAT2 = { x: 240, y: 360, w: 480, h: 24 };
  var SPIKE = { x: 0, y: 756, w: 60, h: 24 };
  var PLATE = { x: 80, y: 768, w: 80, h: 12, feetY: 780 };
  var GATE = { x: 560, y: 140, w: 24, h: 220 };
  var GOAL = { x: 640, y: 280, w: 48, h: 80 };
  var SURFACES = [
    { top: GROUND.y, x: GROUND.x, w: GROUND.w },
    { top: PLAT1.y, x: PLAT1.x, w: PLAT1.w },
    { top: PLAT2.y, x: PLAT2.x, w: PLAT2.w }
  ];

  function ov(a, aw, b, bw) { return a < b + bw && a + aw > b; }
  function boxOv(ax, ay, aw, ah, b) { return ov(ax, aw, b.x, b.w) && ov(ay, ah, b.y, b.h); }

  // ---------- 狀態 ----------
  var G = {};
  var keys = {};
  var jumpReq = false, hookReq = false;
  var guide = { open: true, page: 0 };

  function spawnPlayer() {
    G.p = { x: SPAWN.x, y: SPAWN.y, vx: 0, vy: 0, facing: 1, state: 'idle',
            onGround: true, onGhost: false, hookT: 0, sx: 0, sy: 0, hook: null };
    G.rec = [];
    pushRec();
  }

  function pushRec() {
    var p = G.p;
    G.rec.push({ x: p.x, y: p.y, f: p.facing, s: p.state, g: p.onGround || p.onGhost,
                 h: p.hook ? p.hook.slice() : null });
  }

  function restart() {
    G.gen = 1;
    G.records = [];
    G.ghost = null;
    G.hookLeft = HOOK_MAX;
    G.phase = 'play';
    G.dyingT = 0;
    G.gateOpen = false;
    G.closeT = 0;
    G.plateOn = false;
    G.replay = null;
    G.wrapped = false;
    G.pathPts = null;
    jumpReq = hookReq = false;
    spawnPlayer();
  }

  function ghostCur() { return G.ghost ? G.ghost.rec[G.ghost.i] : null; }

  function canHook() {
    var g = ghostCur(), p = G.p;
    if (!g || G.phase !== 'play' || p.state === 'hook' || G.hookLeft <= 0) return false;
    var dx = (p.x + PW / 2) - (g.x + PW / 2), dy = (p.y + PH / 2) - (g.y + PH / 2);
    return dx * dx + dy * dy <= HOOK_RANGE * HOOK_RANGE;
  }

  // ---------- 每步更新 ----------
  function step() {
    if (guide.open) return;
    if (G.phase === 'win') {
      for (var r = 0; r < G.replay.length; r++) {
        var e = G.replay[r];
        e.i = (e.i + 1) % e.rec.length;
      }
      updateMech();
      return;
    }
    if (G.phase === 'lose') return;

    // 幽靈前進
    var prevFrame = null;
    G.wrapped = false;
    if (G.ghost) {
      prevFrame = G.ghost.rec[G.ghost.i];
      G.ghost.i++;
      if (G.ghost.i >= G.ghost.rec.length) { G.ghost.i = 0; G.wrapped = true; }
    }

    if (G.phase === 'play') updatePlayer(prevFrame);
    else if (G.phase === 'dying') {
      G.dyingT -= DT;
      if (G.dyingT <= 0) afterDying();
    }
    updateMech();
    jumpReq = hookReq = false;
  }

  function killPlayer() {
    G.p.state = 'dead';
    G.p.hook = null;
    G.phase = 'dying';
    G.dyingT = DYING_TIME;
  }

  function afterDying() {
    if (G.gen >= MAX_GEN) { G.phase = 'lose'; return; }
    G.records.push(G.rec);
    G.gen++;
    G.ghost = { rec: G.records[G.gen - 2], i: 0 };
    G.pathPts = null;
    G.phase = 'play';
    spawnPlayer();
  }

  function updatePlayer(prevFrame) {
    var p = G.p, cur = ghostCur();
    var wrapped = G.wrapped;
    p.hook = null;

    if (p.state === 'hook') {
      p.hookT += DT;
      if (wrapped || !cur) {            // 規則 19: 鉤爪中斷
        p.state = 'air'; p.vx = 0; p.vy = 0; p.onGround = false; p.onGhost = false;
      } else {
        var tx = cur.x, ty = cur.y - PH;
        var t = Math.min(1, p.hookT / HOOK_TIME);
        p.x = p.sx + (tx - p.sx) * t;
        p.y = p.sy + (ty - p.sy) * t;
        if (p.hookT >= HOOK_TIME) {
          p.x = tx; p.y = ty;
          p.vy = cur.g ? -WEAK : -STRONG;
          p.vx = 0; p.state = 'air'; p.onGround = false; p.onGhost = false;
        } else {
          p.hook = [p.x + PW / 2, p.y + PH / 2, cur.x + PW / 2, cur.y];
        }
      }
      if (p.state === 'hook') { finishStep(); return; }
      // 剛結束拉動: 本步不再操作
      p.hook = null;
      finishStep();
      return;
    }

    // 站在幽靈頭上: 跟著走
    if (p.onGhost) {
      if (wrapped || !cur || !prevFrame) p.onGhost = false;
      else { p.x += cur.x - prevFrame.x; p.y = cur.y - PH; }
    }

    // 輸入
    var dir = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
    p.vx = dir * WALK;
    if (dir) p.facing = dir;
    if (jumpReq && (p.onGround || p.onGhost)) {
      p.vy = -JUMP_V; p.onGround = false; p.onGhost = false;
    }
    if (hookReq && canHook()) {
      G.hookLeft--;
      p.state = 'hook'; p.hookT = 0; p.sx = p.x; p.sy = p.y; p.vx = 0; p.vy = 0;
      p.onGround = false; p.onGhost = false;
      p.hook = [p.x + PW / 2, p.y + PH / 2, cur.x + PW / 2, cur.y];
      finishStep();
      return;
    }

    // 水平移動
    var prevX = p.x, prevY = p.y;
    p.x += p.vx * DT;
    if (p.x < 0) p.x = 0;
    if (p.x > CW - PW) p.x = CW - PW;
    if (!G.gateOpen && ov(p.y, PH, GATE.y, GATE.h) && ov(p.x, PW, GATE.x, GATE.w)) {
      if (prevX + PW <= GATE.x + 0.01) p.x = GATE.x - PW;
      else if (prevX >= GATE.x + GATE.w - 0.01) p.x = GATE.x + GATE.w;
    }

    // 垂直移動
    if (p.onGhost && cur && ov(p.x, PW, cur.x, PW)) {
      p.vy = 0;
    } else {
      p.onGhost = false;
      var preY = p.y;
      p.vy += GRAV * DT;
      p.y += p.vy * DT;
      p.onGround = false;
      if (p.vy >= 0) {
        var prevFeet = preY + PH, newFeet = p.y + PH, best = null, onG = false, i;
        for (i = 0; i < SURFACES.length; i++) {
          var s = SURFACES[i];
          if (ov(p.x, PW, s.x, s.w) && prevFeet <= s.top + 0.01 && newFeet >= s.top) {
            if (best === null || s.top < best) best = s.top;
          }
        }
        if (!G.gateOpen && ov(p.x, PW, GATE.x, GATE.w) && prevFeet <= GATE.y + 0.01 && newFeet >= GATE.y) {
          if (best === null || GATE.y < best) best = GATE.y;
        }
        if (cur && ov(p.x, PW, cur.x, PW)) {
          var gTop = cur.y;
          var gPrevTop = prevFrame ? prevFrame.y : gTop;
          if ((prevFeet <= gTop + 0.01 || (!wrapped && prevFeet <= gPrevTop + 0.01)) && newFeet >= gTop) {
            if (best === null || gTop <= best) { best = gTop; onG = true; }
          }
        }
        if (best !== null) {
          p.y = best - PH; p.vy = 0;
          if (onG) p.onGhost = true; else p.onGround = true;
        }
      } else if (!G.gateOpen && ov(p.x, PW, GATE.x, GATE.w) && preY >= GATE.y + GATE.h - 0.01 && p.y < GATE.y + GATE.h) {
        p.y = GATE.y + GATE.h; p.vy = 0;   // 門底擋頭
      }
    }
    finishStep();
  }

  // 狀態判定、死亡/過關、錄製
  function finishStep() {
    var p = G.p;
    if (p.state !== 'hook') {
      if (p.onGround || p.onGhost) p.state = p.vx !== 0 ? 'run' : 'idle';
      else p.state = 'air';
    }
    pushRec();
    if (G.rec.length >= MAX_FRAMES) { killPlayer(); return; }
    if (p.y > CH || boxOv(p.x, p.y, PW, PH, SPIKE)) { killPlayer(); return; }
    if (boxOv(p.x, p.y, PW, PH, GOAL)) { startWin(); }
  }

  function startWin() {
    G.replay = [];
    var recs = G.records.concat([G.rec]);
    for (var i = 0; i < recs.length; i++) G.replay.push({ rec: recs[i], i: 0, gen: i + 1 });
    G.phase = 'win';
    G.gateOpen = false; G.closeT = 0; G.plateOn = false;
  }

  // 開關與門
  function frameOnPlate(f) {
    return f.g && Math.abs(f.y + PH - PLATE.feetY) < 0.5 && ov(f.x, PW, PLATE.x, PLATE.w);
  }
  function updateMech() {
    var held = false, overlapGate = false, i, f;
    if (G.phase === 'win') {
      for (i = 0; i < G.replay.length; i++) {
        f = G.replay[i].rec[G.replay[i].i];
        if (frameOnPlate(f)) held = true;
        if (boxOv(f.x, f.y, PW, PH, GATE)) overlapGate = true;
      }
    } else {
      var p = G.p;
      if (G.phase === 'play' && p.onGround && frameOnPlate({ x: p.x, y: p.y, g: true })) held = true;
      f = ghostCur();
      if (f && frameOnPlate(f)) held = true;
      if (G.phase === 'play' && boxOv(p.x, p.y, PW, PH, GATE)) overlapGate = true;
    }
    G.plateOn = held;
    if (held) { G.gateOpen = true; G.closeT = GATE_DELAY; }
    else if (G.gateOpen) {
      G.closeT -= DT;
      if (G.closeT <= 0 && !overlapGate) G.gateOpen = false;   // 規則 22
    }
  }

  // ---------- 繪製 ----------
  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');
  function resize() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(CW * dpr);
    canvas.height = Math.round(CH * dpr);
    var scale = Math.min(window.innerWidth / CW, window.innerHeight / CH);
    canvas.style.width = Math.floor(CW * scale) + 'px';
    canvas.style.height = Math.floor(CH * scale) + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  function drawGhostFrame(f, gen, hookable) {
    Art.drawGhost(ctx, { x: f.x, y: f.y, facing: f.f, state: f.s, gen: gen, hookable: hookable });
  }
  function drawHookArr(h) {
    if (h) Art.drawHook(ctx, { x1: h[0], y1: h[1], x2: h[2], y2: h[3] });
  }

  function render() {
    var dpr = canvas.width / CW;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (guide.open) { Art.drawGuidePage(ctx, { page: guide.page }); return; }

    Art.drawBackground(ctx);
    Art.drawPlatform(ctx, GROUND);
    Art.drawPlatform(ctx, PLAT1);
    Art.drawPlatform(ctx, PLAT2);
    Art.drawSpike(ctx, { x: SPIKE.x, y: SPIKE.y, w: SPIKE.w });
    Art.drawPlate(ctx, { x: PLATE.x, y: PLATE.y, pressed: G.plateOn });
    Art.drawGate(ctx, { x: GATE.x, y: GATE.y, open: G.gateOpen });
    Art.drawGoal(ctx, { x: GOAL.x, y: GOAL.y });

    var i;
    if (G.phase === 'win') {
      for (i = 0; i < G.replay.length; i++) drawGhostFrame(G.replay[i].rec[G.replay[i].i], G.replay[i].gen, false);
      for (i = 0; i < G.replay.length; i++) drawHookArr(G.replay[i].rec[G.replay[i].i].h);
    } else {
      var cur = ghostCur();
      if (cur) {
        if (!G.pathPts) {
          G.pathPts = G.ghost.rec.map(function (f) { return { x: f.x + PW / 2, y: f.y + PH / 2 }; });
        }
        Art.drawGhostPath(ctx, { points: G.pathPts, progress: G.ghost.i });
        drawGhostFrame(cur, G.gen - 1, canHook());
        drawHookArr(cur.h);
      }
      drawHookArr(G.p.hook);
      Art.drawPlayer(ctx, { x: G.p.x, y: G.p.y, facing: G.p.facing, state: G.p.state, gen: G.gen });
    }
    Art.drawHud(ctx, { gen: G.gen, maxGen: MAX_GEN, phase: G.phase, hookLeft: G.hookLeft, hookMax: HOOK_MAX });
  }

  // ---------- 輸入(只有鍵盤) ----------
  var GAME_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, Space: 1, KeyZ: 1, KeyR: 1, KeyH: 1 };
  window.addEventListener('keydown', function (e) {
    if (GAME_KEYS[e.code]) e.preventDefault();
    if (e.repeat) return;
    keys[e.code] = true;
    if (guide.open) {
      if (e.code === 'Space') {
        if (guide.page >= 7) guide.open = false;
        else guide.page++;
      }
      return;
    }
    if (e.code === 'KeyH') { guide.open = true; guide.page = 0; return; }
    if (e.code === 'KeyR') { restart(); return; }
    if (e.code === 'Space' && (G.phase === 'win' || G.phase === 'lose')) { restart(); return; }
    if (G.phase !== 'play') return;
    if (e.code === 'Space' || e.code === 'ArrowUp') jumpReq = true;
    else if (e.code === 'KeyZ') hookReq = true;
  });
  window.addEventListener('keyup', function (e) {
    if (GAME_KEYS[e.code]) e.preventDefault();
    keys[e.code] = false;
  });
  window.addEventListener('blur', function () { keys = {}; });

  // ---------- 主迴圈 ----------
  var last = null, acc = 0;
  function frame(t) {
    if (last === null) last = t;
    var dt = Math.min((t - last) / 1000, 1 / 30);
    last = t;
    acc += dt;
    while (acc >= DT) { step(); acc -= DT; }
    render();
    requestAnimationFrame(frame);
  }

  restart();
  requestAnimationFrame(frame);
})();
