(function () {
  'use strict';

  // ===== 參數(spec 數值參數表) =====
  var W = Art.canvas.width, H = Art.canvas.height;
  var STEP = 1 / 60;
  var GRAVITY = 2400, JUMP_V = 900, WALK = 260;
  var PW = 40, PH = 56;
  var MAX_GEN = 3;
  var DEATH_FRAMES = 36;      // 0.6 秒
  var MAX_REC = 60 * 60;      // 單代錄製上限 60 秒
  var SPAWN = { x: 60, y: 1144 };

  // ===== 關卡 =====
  var GROUND = { x: 0, y: 1200, w: 600, h: 80 };
  var ONEWAY = [
    { x: 0, y: 1000, w: 480, h: 24 },
    { x: 300, y: 800, w: 420, h: 24 }
  ];
  var SPIKE = { x: 0, y: 976, w: 80, h: 24 };
  var GOAL = { x: 640, y: 720, w: 48, h: 80 };

  // ===== 佔位圖形(Art 沒有的東西) =====
  var Placeholder = {
    guideTitles: ['走到旗子', '死了會變幽靈', '踩幽靈', '只有三個人', '重來'],
    guideTexts: [
      '←→ 走、空白鍵跳, 摸到旗子過關',
      '死掉的你會一直重演剛才的動作',
      '幽靈的頭可以踩',
      '共三人, 只看得到上一個人的幽靈',
      'R 這一代重來, Backspace 整關重來'
    ],
    // 說明頁文字: 圖由 Art.drawGuidePage 畫, 這裡只疊標題、文字、頁碼與提示
    drawGuideText: function (ctx, page, pages) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, 190);
      ctx.fillRect(0, H - 110, W, 110);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText('第 ' + (page + 1) + ' 頁  ' + this.guideTitles[page], W / 2, 60);
      ctx.font = '30px sans-serif';
      ctx.fillText(this.guideTexts[page], W / 2, 130);
      ctx.font = '28px sans-serif';
      ctx.fillText((page + 1) + ' / ' + pages, W / 2, H - 70);
      ctx.fillText(page === pages - 1 ? '按空白鍵開始' : '按空白鍵下一頁', W / 2, H - 30);
      ctx.restore();
    }
  };
  var GUIDE_PAGES = 5;

  // ===== 狀態 =====
  var S = {
    screen: 'guide',     // guide | game
    guidePage: 0,
    guideFromGame: false,
    phase: 'play',       // play | dying | win | lose
    gen: 1,
    dyingFrames: 0,
    p: null,             // 玩家
    rec: null,           // 本代紀錄
    ghost: null          // { rec, f, x, y, px, py, facing, state, wrapped }
  };

  var keys = {};
  var jumpPressed = false;

  function newRec() { return { x: [], y: [], f: [], s: [] }; }

  function spawnPlayer() {
    S.p = { x: SPAWN.x, y: SPAWN.y, vy: 0, facing: 1, onGround: true, onGhost: false, state: 'idle' };
    S.rec = newRec();
    pushRec();
    jumpPressed = false;
  }

  function pushRec() {
    var p = S.p, r = S.rec;
    r.x.push(p.x); r.y.push(p.y); r.f.push(p.facing);
    r.s.push(p.state === 'run' ? 1 : (p.state === 'idle' ? 0 : 2)); // dead 當作 air
  }

  function setGhostFrame(g, f) {
    var r = g.rec;
    g.f = f;
    g.x = r.x[f]; g.y = r.y[f];
    g.facing = r.f[f];
    g.state = ['idle', 'run', 'air'][r.s[f]];
  }

  function makeGhost(rec) {
    var g = { rec: rec, f: 0, x: 0, y: 0, px: 0, py: 0, facing: 1, state: 'idle', wrapped: false };
    setGhostFrame(g, 0);
    g.px = g.x; g.py = g.y;
    return g;
  }

  function resetGhostToStart() {
    if (!S.ghost) return;
    setGhostFrame(S.ghost, 0);
    S.ghost.px = S.ghost.x; S.ghost.py = S.ghost.y;
    S.ghost.wrapped = false;
  }

  function fullReset() {
    S.gen = 1;
    S.phase = 'play';
    S.ghost = null;
    spawnPlayer();
  }

  function retryGeneration() {
    spawnPlayer();
    resetGhostToStart();
  }

  function advanceGhost() {
    var g = S.ghost;
    if (!g) return;
    g.px = g.x; g.py = g.y;
    var n = g.f + 1;
    g.wrapped = false;
    if (n >= g.rec.x.length) { n = 0; g.wrapped = true; }
    setGhostFrame(g, n);
    // 循環跳回第 0 幀是瞬移, 不算「頭頂掃過」: 上一幀位置對齊, 避免角色被瞬移的頭頂誤載
    if (g.wrapped) { g.px = g.x; g.py = g.y; }
  }

  function overlapX(ax, aw, bx, bw) { return ax < bx + bw && ax + aw > bx; }

  function killPlayer() {
    S.p.state = 'dead';
    S.phase = 'dying';
    S.dyingFrames = 0;
  }

  // ===== 玩家更新 =====
  function updatePlayer() {
    var p = S.p, g = S.ghost;
    var ax = 0;
    if (keys.ArrowLeft) ax -= 1;
    if (keys.ArrowRight) ax += 1;
    if (ax !== 0) p.facing = ax;

    // 站在幽靈頭上: 跟著幽靈走; 幽靈循環重頭則進入空中
    if (p.onGhost) {
      if (!g || g.wrapped) {
        p.onGhost = false; p.vy = 0;
      } else {
        p.x += g.x - g.px;
      }
    }

    // 水平
    p.x += ax * WALK * STEP;
    if (p.x < 0) p.x = 0;
    if (p.x > W - PW) p.x = W - PW;
    if (p.y + PH > GROUND.y + 0.01 && overlapX(p.x, PW, GROUND.x, GROUND.w)) {
      // 坑裡撞到地面側面
      if (ax > 0) p.x = GROUND.x - PW; else if (ax < 0) p.x = GROUND.x + GROUND.w;
    }

    if (p.onGhost) {
      if (!overlapX(p.x, PW, g.x, PW)) { p.onGhost = false; p.vy = 0; }
      else p.y = g.y - PH;
    }

    // 跳躍
    if (jumpPressed && (p.onGround || p.onGhost)) {
      p.vy = -JUMP_V; p.onGround = false; p.onGhost = false;
    }
    jumpPressed = false;

    if (!p.onGhost) {
      var prevFeet = p.y + PH;
      p.y += p.vy * STEP + 0.5 * GRAVITY * STEP * STEP;
      p.vy += GRAVITY * STEP;
      p.onGround = false;
      if (p.vy >= 0) {
        var feet = p.y + PH;
        var best = null, bestType = '';
        var tops = [GROUND].concat(ONEWAY);
        for (var i = 0; i < tops.length; i++) {
          var t = tops[i];
          if (overlapX(p.x, PW, t.x, t.w) && prevFeet <= t.y + 0.001 && feet >= t.y) {
            if (best === null || t.y < best) { best = t.y; bestType = 'static'; }
          }
        }
        if (g && overlapX(p.x, PW, g.x, PW) && prevFeet <= g.py + 0.001 && feet >= g.y) {
          if (best === null || g.y < best) { best = g.y; bestType = 'ghost'; }
        }
        if (best !== null) {
          p.y = best - PH; p.vy = 0;
          if (bestType === 'ghost') p.onGhost = true; else p.onGround = true;
        }
      }
    } else {
      p.vy = 0;
    }

    // 狀態
    if (!p.onGround && !p.onGhost) p.state = 'air';
    else p.state = ax !== 0 ? 'run' : 'idle';

    // 死亡 / 過關
    var hitSpike = overlapX(p.x, PW, SPIKE.x, SPIKE.w) && p.y < SPIKE.y + SPIKE.h && p.y + PH > SPIKE.y;
    var hitGoal = overlapX(p.x, PW, GOAL.x, GOAL.w) && p.y < GOAL.y + GOAL.h && p.y + PH > GOAL.y;
    if (hitGoal) {
      S.phase = 'win';
    } else if (hitSpike || p.y > H) {
      killPlayer();
    }
    pushRec();
    if (S.phase === 'play' && S.rec.x.length >= MAX_REC) {
      killPlayer();
      S.rec.s[S.rec.s.length - 1] = 2;
    }
  }

  function step() {
    if (S.screen !== 'game') return;
    if (S.phase === 'win' || S.phase === 'lose') return;
    advanceGhost();
    if (S.phase === 'play') {
      updatePlayer();
    } else if (S.phase === 'dying') {
      S.dyingFrames++;
      if (S.dyingFrames >= DEATH_FRAMES) {
        if (S.gen >= MAX_GEN) {
          S.phase = 'lose';
        } else {
          S.ghost = makeGhost(S.rec);
          S.gen++;
          S.phase = 'play';
          spawnPlayer();
        }
      }
    }
  }

  // ===== 繪製 =====
  function pathPoints(rec) {
    var pts = [], n = rec.x.length;
    for (var i = 0; i < n; i += 4) pts.push({ x: rec.x[i] + PW / 2, y: rec.y[i] + PH });
    if ((n - 1) % 4 !== 0) pts.push({ x: rec.x[n - 1] + PW / 2, y: rec.y[n - 1] + PH });
    return pts;
  }
  var pathCache = { rec: null, pts: null };

  function render(ctx) {
    if (S.screen === 'guide') {
      Art.drawGuidePage(ctx, { page: S.guidePage });
      Placeholder.drawGuideText(ctx, S.guidePage, GUIDE_PAGES);
      return;
    }
    Art.drawBackground(ctx, {});
    Art.drawPlatform(ctx, { x: GROUND.x, y: GROUND.y, w: GROUND.w, h: GROUND.h });
    for (var i = 0; i < ONEWAY.length; i++) {
      var o = ONEWAY[i];
      Art.drawPlatform(ctx, { x: o.x, y: o.y, w: o.w, h: o.h });
    }
    Art.drawSpike(ctx, { x: SPIKE.x, y: SPIKE.y, w: SPIKE.w });
    Art.drawGoal(ctx, { x: GOAL.x, y: GOAL.y });
    var g = S.ghost;
    if (g) {
      if (pathCache.rec !== g.rec) { pathCache.rec = g.rec; pathCache.pts = pathPoints(g.rec); }
      Art.drawGhostPath(ctx, { points: pathCache.pts, progress: g.f / Math.max(1, g.rec.x.length - 1) });
      Art.drawGhost(ctx, { x: g.x, y: g.y, facing: g.facing, state: g.state, gen: S.gen - 1 });
    }
    Art.drawPlayer(ctx, { x: S.p.x, y: S.p.y, facing: S.p.facing, state: S.p.state, gen: S.gen });
    Art.drawHud(ctx, { gen: S.gen, maxGen: MAX_GEN, phase: S.phase });
  }

  // ===== 輸入(只有鍵盤) =====
  var GAME_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ' ': 1, Backspace: 1, r: 1, R: 1, h: 1, H: 1 };

  function onKeyDown(e) {
    var k = e.key;
    if (GAME_KEYS[k]) e.preventDefault();
    if (e.repeat) return;
    if (k === 'ArrowLeft' || k === 'ArrowRight') { keys[k] = true; return; }

    if (S.screen === 'guide') {
      if (k === ' ') {
        if (S.guidePage < GUIDE_PAGES - 1) S.guidePage++;
        else closeGuide();
      } else if ((k === 'h' || k === 'H') && S.guideFromGame) {
        closeGuide();
      }
      return;
    }
    if (S.phase === 'win' || S.phase === 'lose') {
      if (k === ' ') fullReset();
      return;
    }
    if (k === 'h' || k === 'H') { openGuide(true); return; }
    if (S.phase !== 'play') return;
    if (k === ' ' || k === 'ArrowUp') jumpPressed = true;
    else if (k === 'r' || k === 'R') retryGeneration();
    else if (k === 'Backspace') fullReset();
  }

  function onKeyUp(e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') keys[e.key] = false;
  }

  function openGuide(fromGame) {
    S.screen = 'guide'; S.guidePage = 0; S.guideFromGame = fromGame;
  }
  function closeGuide() {
    S.screen = 'game'; S.guideFromGame = false; jumpPressed = false;
  }

  // ===== 啟動 =====
  function boot() {
    var canvas = document.getElementById('game');
    var ctx = canvas.getContext('2d');
    function fit() {
      var dpr = window.devicePixelRatio || 1;
      var scale = Math.min(window.innerWidth / W, window.innerHeight / H);
      canvas.style.width = (W * scale) + 'px';
      canvas.style.height = (H * scale) + 'px';
      canvas.width = Math.round(W * scale * dpr);
      canvas.height = Math.round(H * scale * dpr);
      ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    }
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', function () { keys = {}; jumpPressed = false; });

    fullReset();
    openGuide(false);

    var last = null, acc = 0;
    function frame(t) {
      if (last === null) last = t;
      var dt = Math.min((t - last) / 1000, 1 / 30);
      last = t;
      acc += dt;
      while (acc >= STEP) { step(); acc -= STEP; }
      render(ctx);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (typeof document !== 'undefined') boot();
})();
