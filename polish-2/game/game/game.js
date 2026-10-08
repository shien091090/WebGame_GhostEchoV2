/* 幽影接力 打磨版第 2 輪 — 邏輯 + 呼叫 Art / Sound */
(function () {
  'use strict';

  // ===== 常數 =====
  var DT = 1 / 60;
  var G = 2400, JUMP_V = 900, WALK = 260;
  var PW = 40, PH = 56;
  var GROUND = { x: 0, y: 1200, w: 600, h: 80, solid: true };
  var SPAWN = { x: 60, y: 1144 };
  var HOOK_RANGE = 220, HOOK_AIR = 1700, HOOK_GND = 800, CHARGE_T = 1;
  var LAUNCH_T = 0.3, ROPE_T = 0.15, LIFT_SPD = 200, SEESAW_V = 1550, SEESAW_T = 0.3;
  var DEATH_T = 0.6, REC_MAX = 3600, ROUTE_N = 300, RING_T = 0.4;
  var LEVEL_COUNT = 6, MAX_GEN = 3, HOOK_MAX = 2;
  var CR_UP_F = 72, CR_WARN_F = 18, CR_SPD = 600, CR_TOP = 100, CR_UPPOS = 270, CR_DOWNPOS = 360;
  var CW = (window.Art && Art.canvas && Art.canvas.width) || 720;
  var CH = (window.Art && Art.canvas && Art.canvas.height) || 1280;

  // ===== 佔位(Art 沒有的圖形集中在這) =====
  var Placeholder = {
    // 說明頁的底(畫在示意圖框之外的整張背景)
    guideBg: function (ctx) {
      var g = ctx.createLinearGradient(0, 0, 0, CH);
      g.addColorStop(0, '#1b2440');
      g.addColorStop(1, '#121826');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CW, CH);
    },
    // 帶描邊的文字(說明頁標題、說明文字、頁碼、翻頁提示)
    text: function (ctx, s, x, y, size, color, align) {
      ctx.save();
      ctx.font = 'bold ' + size + 'px "Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';
      ctx.textAlign = align || 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, size / 6);
      ctx.strokeStyle = '#0a0e18';
      ctx.strokeText(s, x, y);
      ctx.fillStyle = color || '#eef1f8';
      ctx.fillText(s, x, y);
      ctx.restore();
    }
  };

  // ===== 關卡資料 =====
  function P_(x, y, w, solid) { return { x: x, y: y, w: w, h: 24, solid: !!solid }; }
  var CRUSHER = { x: 140, w: 360 };
  var LEVELS = [
    null,
    { // 1
      title: '踩著上去', hint: '一個人到不了, 先死一次', newThing: 'relay',
      platforms: [P_(280, 990, 340), P_(0, 780, 400)], spikes: [], walls: [],
      goal: { x: 40, y: 700 }
    },
    { // 2
      title: '一鉤飛天', hint: '鉤住跳起來的幽靈', newThing: 'hook',
      platforms: [P_(160, 780, 560), P_(0, 360, 440)], spikes: [{ x: 660, y: 756, w: 60 }], walls: [],
      goal: { x: 40, y: 280 }
    },
    { // 3
      title: '守門的人', hint: '有人踩住, 同色的門才會開', newThing: 'gate',
      platforms: [P_(0, 780, 460), P_(120, 360, 600)], spikes: [{ x: 0, y: 756, w: 60 }],
      walls: [{ x: 520, y: 384, w: 24, h: 316 }],
      plateGate: { x: 340, y: 768 }, gate: { x: 520, y: 140, delay: 0.6 },
      goal: { x: 640, y: 280 }
    },
    { // 4
      title: '升降接力', hint: '電梯也要有人踩住', newThing: 'lift',
      platforms: [P_(0, 780, 480), P_(240, 360, 480)], spikes: [{ x: 0, y: 756, w: 60 }],
      walls: [{ x: 560, y: 384, w: 24, h: 316 }],
      plateLift: { x: 160, y: 1188 }, lift: { x: 480 },
      plateGate: { x: 80, y: 768 }, gate: { x: 560, y: 140, delay: 0.3 },
      goal: { x: 640, y: 280 }
    },
    { // 5
      title: '翹翹板', hint: '落在板子一頭, 另一頭會彈起', newThing: 'seesaw',
      platforms: [P_(200, 780, 460), P_(440, 360, 280)], spikes: [],
      walls: [{ x: 600, y: 384, w: 24, h: 316 }],
      seesaws: [{ x: 100, y: 1188 }, { x: 340, y: 768 }],
      plateGate: { x: 560, y: 768 }, gate: { x: 600, y: 140, delay: 0.3 },
      goal: { x: 656, y: 280 }
    },
    { // 6
      title: '撐住壓板', hint: '吹哨, 讓他再踩一次按鈕', newThing: 'button',
      platforms: [P_(340, 780, 320), P_(0, 360, 500, true), P_(500, 360, 220)], spikes: [], walls: [],
      seesaws: [{ x: 300, y: 1188 }],
      button: { x: 160, y: 1188 }, crusher: CRUSHER,
      goal: { x: 40, y: 280 }
    }
  ];

  // ===== 全域狀態 =====
  var S = {
    screen: 'guide',     // guide | intro | play | unlock | ending
    guidePage: 0, guideBacks: 0,
    level: 1,
    unlockAbility: null,
    shown: { hook: false, whistle: false },
    muted: false,
    // 關內
    phase: 'play',       // play | dying | win | lose
    attempt: 0, fails: 0, restarts: 0, levelStartT: 0, attemptT0: 0,
    gen: 1, recs: [], rec: null, ghost: null, gf: 0,
    W: null, P: null, aiming: false, charge: 0, aimFullDone: false,
    hookLeft: HOOK_MAX, hooksUsed: 0, whistles: 0, minFeetY: 0,
    ghostMoved: false, btnPlayerDone: false, btnGhostDone: false,
    rings: [], dyingT: 0, replay: null,
    guideT0: 0
  };
  var cmd = { z: false, x: false, c: false, r: false, jump: false };
  var keys = { left: false, right: false, jump: false };
  var jumpDown = { Space: false, ArrowUp: false };
  var events = [];
  var t0 = nowMs(), sessionStartISO = isoNow();
  var firstInput = false;
  var curMusic = null;

  function clearJump() { jumpDown.Space = false; jumpDown.ArrowUp = false; keys.jump = false; cmd.jump = false; }
  function nowMs() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
  function isoNow() {
    var d = new Date(), tz = -d.getTimezoneOffset(), a = Math.abs(tz);
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) +
      (tz >= 0 ? '+' : '-') + p(Math.floor(a / 60)) + ':' + p(a % 60);
  }

  // ===== 聲音(Sound 不存在也能玩) =====
  function snd(name, arg) {
    try { if (window.Sound && Sound.play) Sound.play(name, arg); } catch (e) { console.error(e); }
  }
  function music(name) {
    if (curMusic === name) return;
    curMusic = name;
    try { if (window.Sound && Sound.playMusic) Sound.playMusic(name); } catch (e) { console.error(e); }
  }

  // ===== 埋點 =====
  function emit(type, extra) {
    var ev = { type: type, t: Math.round(nowMs() - t0), level: (S.screen === 'guide' || S.screen === 'ending') ? null : S.level };
    if (extra) for (var k in extra) ev[k] = extra[k];
    events.push(ev);
    return ev;
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function download(reason) {
    try {
      var data = { project: 'WebGame_GhostEchoV2', build: 'polish-2', sessionStart: sessionStartISO, downloadedAt: isoNow(), reason: reason, events: events };
      events = [];
      var d = new Date();
      var name = 'gamelog-WebGame_GhostEchoV2-' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '-' + pad2(d.getHours()) + pad2(d.getMinutes()) + pad2(d.getSeconds()) + '.json';
      var blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} }, 2000);
    } catch (e) { console.error(e); }
  }

  // ===== 工具 =====
  function ov(a0, a1, b0, b1) { return a0 < b1 - 0.001 && a1 > b0 + 0.001; }
  function rectOv(ax, ay, aw, ah, bx, by, bw, bh) { return ov(ax, ax + aw, bx, bx + bw) && ov(ay, ay + ah, by, by + bh); }
  function hookUnlocked(lv) { return lv >= 2; }
  function whistleUnlocked(lv) { return lv >= 6; }

  // ===== 世界(機關狀態) =====
  function newCrusher() { return { cdF: 0, bottom: CR_DOWNPOS, falling: false, warned: false, upF: 0 }; }
  function newWorld(lv) {
    var L = LEVELS[lv];
    return {
      lv: lv, L: L,
      liftY: 1200, liftDir: 0, liftActive: false,
      gateOpen: false, gateT: 0,
      seesaws: (L.seesaws || []).map(function (s) { return { x: s.x, y: s.y, age: -1, tilt: 0 }; }),
      plateGate: false, plateLift: false, buttonPressed: false,
      cr: L.crusher ? newCrusher() : null
    };
  }
  function resetWorldForGen(W) {
    W.liftY = 1200; W.liftDir = 0; W.liftActive = false;
    W.gateOpen = false; W.gateT = 0;
    W.plateGate = false; W.plateLift = false; W.buttonPressed = false;
    W.seesaws.forEach(function (s) { s.age = -1; s.tilt = 0; });
    if (W.cr) { W.cr.cdF = 0; W.cr.bottom = CR_DOWNPOS; W.cr.falling = false; W.cr.warned = false; W.cr.upF = 0; }
  }
  // 實心物(地面、牆、關著的門、實心平台); 壓板另外處理
  function solidsOf(W) {
    var L = W.L, a = [GROUND];
    L.platforms.forEach(function (p) { if (p.solid) a.push(p); });
    L.walls.forEach(function (w) { a.push(w); });
    if (L.gate && !W.gateOpen) a.push({ x: L.gate.x, y: L.gate.y, w: 24, h: 220 });
    return a;
  }
  // 升降台: 回傳位移
  function updateLift(W, dt, pressed) {
    if (!W.L.lift) return 0;
    var old = W.liftY, dir = 0;
    W.liftActive = pressed;
    if (pressed && W.liftY > 780) { W.liftY = Math.max(780, W.liftY - LIFT_SPD * dt); dir = -1; }
    else if (!pressed && W.liftY < 1200) { W.liftY = Math.min(1200, W.liftY + LIFT_SPD * dt); dir = 1; }
    if (dir !== 0 && dir !== W.liftDir) snd('liftMove', { dir: dir < 0 ? 'up' : 'down' });
    W.liftDir = dir;
    return W.liftY - old;
  }
  function updateGate(W, dt, pressed, playerRect) {
    var L = W.L; if (!L.gate) return;
    if (pressed) {
      if (!W.gateOpen) { W.gateOpen = true; snd('gateOpen'); }
      W.gateT = 0;
    } else if (W.gateOpen) {
      W.gateT += dt;
      if (W.gateT >= L.gate.delay) {
        var blocked = playerRect && rectOv(playerRect.x, playerRect.y, PW, PH, L.gate.x, L.gate.y, 24, 220);
        if (!blocked) { W.gateOpen = false; W.gateT = 0; snd('gateClose'); }
      }
    }
  }
  function updateSeesaws(W, dt) {
    W.seesaws.forEach(function (s) {
      if (s.age >= 0) {
        s.age += dt;
        if (s.age >= SEESAW_T) { s.age = -1; s.tilt = 0; }
        else s.tilt = Math.sin(Math.PI * s.age / SEESAW_T);
      }
    });
  }
  function triggerSeesaw(W, i) {
    W.seesaws[i].age = 0; W.seesaws[i].tilt = 0;
    snd('seesaw');
  }
  // 壓板: 倒數(幀)>0 往上收, 否則往下落
  function updateCrusher(W) {
    var C = W.cr; if (!C) return;
    if (C.cdF > 0) {
      C.cdF--; C.upF++;
      if (!C.warned && C.cdF <= CR_WARN_F && C.cdF > 0) { C.warned = true; snd('crusherWarn'); }
      if (C.cdF <= 0) {
        C.cdF = 0;
        emit('crusher_fall', { attempt: S.attempt, gen: S.gen, upTime: Math.round(C.upF * 1000 / 60), playerX: S.P ? Math.round(S.P.x) : null });
        C.upF = 0;
      }
    }
    if (C.cdF > 0) {
      C.falling = false;
      C.bottom = Math.max(CR_UPPOS, C.bottom - CR_SPD * DT);
    } else if (C.bottom < CR_DOWNPOS) {
      C.falling = true;
      C.bottom = Math.min(CR_DOWNPOS, C.bottom + CR_SPD * DT);
      if (C.bottom >= CR_DOWNPOS) { C.falling = false; snd('crusherSlam'); }
    }
  }
  function crusherHold(C) { return C && C.cdF > 0 ? C.cdF / CR_UP_F : 0; }
  function crusherWarn(C) { return !!(C && C.cdF > 0 && C.cdF <= CR_WARN_F); }
  // 實體: {x, y, g(著地)}
  function platePressed(plate, ents) {
    if (!plate) return false;
    var plane = plate.y + 12;
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (e.g && Math.abs(e.y + PH - plane) < 0.5 && ov(e.x, e.x + PW, plate.x, plate.x + 80)) return true;
    }
    return false;
  }
  // 翹翹板落點端觸發判斷: 回傳 index 或 -1
  function seesawLandIndex(W, e) {
    for (var i = 0; i < W.seesaws.length; i++) {
      var s = W.seesaws[i];
      if (Math.abs(e.y + PH - (s.y + 12)) < 0.5 && ov(e.x, e.x + PW, s.x, s.x + 80)) return i;
    }
    return -1;
  }

  // ===== 關卡流程 =====
  function setScreen(sc) {
    S.screen = sc;
    cmd.z = cmd.x = cmd.c = cmd.r = false;
    clearJump();
  }
  function gotoIntro() {
    setScreen('intro');
    music('title');
  }
  function startLevel(cause) {
    var first = (cause === 'first');
    setScreen('play');
    S.phase = 'play';
    if (first) { S.attempt = 1; S.fails = 0; S.restarts = 0; S.levelStartT = nowMs(); }
    else S.attempt++;
    S.attemptT0 = nowMs();
    S.recs = [];
    S.W = newWorld(S.level);
    S.gen = 1;
    S.replay = null;
    music('play');
    emit('level_start', { attempt: S.attempt, cause: cause });
    startGen(1);
  }
  function startGen(g) {
    var W = S.W;
    resetWorldForGen(W);
    S.gen = g; S.phase = 'play';
    S.P = { x: SPAWN.x, y: SPAWN.y, vx: 0, vy: 0, facing: 1, state: 'idle', grounded: true, src: 'ground',
            launchT: 0, ropeT: 0, rope: null, dead: false };
    S.aiming = false; S.charge = 0; S.aimFullDone = false;
    S.hookLeft = HOOK_MAX; S.hooksUsed = 0; S.whistles = 0; S.minFeetY = SPAWN.y + PH;
    S.rec = []; S.recs[g - 1] = S.rec;
    S.ghost = g >= 2 ? S.recs[g - 2] : null;
    S.gf = 0; S.ghostMoved = false;
    S.btnPlayerDone = false; S.btnGhostDone = false;
    S.rings = [];
    cmd.z = cmd.x = cmd.c = cmd.r = false;
    clearJump();
    evalPlates(true);
    pushRec();
    snd('spawn');
    emit('gen_start', { attempt: S.attempt, gen: g });
  }
  function ghostRec() { return S.ghost ? S.ghost[S.gf] : null; }
  function pushRec() {
    var P = S.P, gr = ghostRec(), C = S.W.cr;
    S.rec.push({ x: P.x, y: P.y, f: P.facing, s: P.state === 'aim' ? 'idle' : P.state, g: P.grounded,
      h: P.ropeT > 0 && P.rope ? P.rope : null, gf: S.ghost ? S.gf : -1,
      cb: C ? C.bottom : null, cd: C ? C.cdF : 0 });
    if (P.y + PH < S.minFeetY) S.minFeetY = P.y + PH;
  }
  function gen_end(cause) {
    var P = S.P;
    emit('gen_end', { attempt: S.attempt, gen: S.gen, cause: cause, x: Math.round(P.x), y: Math.round(P.y), duration: S.rec.length,
      minFeetY: Math.round(S.minFeetY), hooksUsed: S.hooksUsed, whistles: S.whistles });
  }
  function die(cause) {
    var P = S.P;
    P.state = 'dead'; P.dead = true;
    gen_end(cause);
    snd(cause === 'crush' ? 'crush' : 'death');
    S.phase = 'dying'; S.dyingT = DEATH_T;
    if (S.gen >= MAX_GEN) {
      S.fails++;
      emit('level_lose', { attempt: S.attempt, attemptTime: Math.round(nowMs() - S.attemptT0), fails: S.fails });
      download('lose');
    }
  }
  function doRestart() {
    if (S.phase === 'play' && S.P && !S.P.dead) gen_end('restart');
    S.restarts++;
    emit('restart', { attempt: S.attempt, gen: S.gen, x: Math.round(S.P.x), y: Math.round(S.P.y), attemptTime: Math.round(nowMs() - S.attemptT0) });
    snd('restart');
    S.aiming = false;
    startLevel('restart');
  }
  function win() {
    gen_end('win');
    S.phase = 'win';
    snd('levelClear');
    emit('level_win', { attempt: S.attempt, gen: S.gen, attemptTime: Math.round(nowMs() - S.attemptT0),
      levelTime: Math.round(nowMs() - S.levelStartT), fails: S.fails, restarts: S.restarts });
    download('win');
    var recs = S.recs.slice(0, S.gen);
    S.replay = { recs: recs, G: S.gen, f: 0, prev: [], W: newWorld(S.level), L: recs[S.gen - 1].length };
    music('replay');
    S.aiming = false;
  }

  // ===== 每幀更新 =====
  function evalPlates(silent) {
    var W = S.W, L = W.L, ents = [];
    if (S.P && !S.P.dead) ents.push({ x: S.P.x, y: S.P.y, g: S.P.grounded });
    var gr = ghostRec();
    if (gr) ents.push({ x: gr.x, y: gr.y, g: gr.g });
    var pg = platePressed(L.plateGate, ents), pl = platePressed(L.plateLift, ents);
    if (!silent) {
      if (pg !== W.plateGate) snd(pg ? 'plateOn' : 'plateOff');
      if (pl !== W.plateLift) snd(pl ? 'plateOn' : 'plateOff');
    }
    W.plateGate = pg; W.plateLift = pl;
    if (L.button) {
      var P = S.P, bp = L.button;
      var pp = !!(P && !P.dead && platePressed(bp, [{ x: P.x, y: P.y, g: P.grounded }]));
      var gp = !!(gr && platePressed(bp, [{ x: gr.x, y: gr.y, g: gr.g }]));
      W.buttonPressed = pp || gp;
      // 每一輪只觸發一次: 玩家每代一次, 幽靈每輪一次
      if (!silent) {
        if (pp && !S.btnPlayerDone) { S.btnPlayerDone = true; fireButton('player'); }
        if (gp && !S.btnGhostDone) { S.btnGhostDone = true; fireButton('ghost'); }
      }
    }
  }
  function fireButton(by) {
    var C = S.W.cr; if (!C) return;
    if (C.cdF <= 0) snd('crusherRise');
    C.cdF = CR_UP_F; C.warned = false;
    snd('buttonPress');
    emit('button', { attempt: S.attempt, gen: S.gen, by: by });
  }
  function hookableNow() {
    if (!hookUnlocked(S.level) || !S.ghost || S.hookLeft <= 0) return false;
    var gr = ghostRec(), P = S.P;
    var dx = (gr.x + PW / 2) - (P.x + PW / 2), dy = (gr.y + PH / 2) - (P.y + PH / 2);
    return Math.sqrt(dx * dx + dy * dy) <= HOOK_RANGE;
  }

  function step() {
    if (S.screen !== 'play') return;
    var W = S.W, P = S.P, L = W.L;

    if (cmd.r) { cmd.r = false; if (S.phase === 'play' || S.phase === 'dying') { doRestart(); return; } }
    cmd.r = false;

    if (S.phase === 'win') { stepReplay(); return; }
    if (S.phase === 'lose') { return; }
    if (S.phase === 'dying') {
      S.dyingT -= DT;
      if (S.dyingT <= 0) {
        if (S.gen < MAX_GEN) startGen(S.gen + 1);
        else { S.phase = 'lose'; snd('levelFail'); }
      }
      cmd.z = cmd.x = cmd.c = false;
      return;
    }

    // --- 瞄準中(時間暫停: 只有 Z X 有作用) ---
    if (S.aiming) {
      var zz = cmd.z, xx = cmd.x; cmd.z = cmd.x = cmd.c = false;
      if (zz) { launchHook(); }
      else if (xx) { cancelAim(); return; }
      else {
        if (S.charge < 1) {
          S.charge = Math.min(1, S.charge + DT / CHARGE_T);
          if (S.charge >= 1 && !S.aimFullDone) { S.aimFullDone = true; snd('aimFull'); }
          else if (S.charge < 1) snd('aimCharge', { charge: S.charge });
        }
        return;
      }
    } else {
      // --- 一般指令 ---
      if (cmd.z) {
        cmd.z = false;
        if (hookUnlocked(S.level) && hookableNow()) {
          S.aiming = true; S.charge = 0; S.aimFullDone = false; P.state = 'aim';
          snd('aimStart'); snd('aimCharge', { charge: 0 });
          cmd.x = cmd.c = false;
          return;
        }
      }
      cmd.x = false;
      if (cmd.c) {
        cmd.c = false;
        if (whistleUnlocked(S.level) && S.ghost) {
          S.whistles++;
          emit('whistle', { attempt: S.attempt, gen: S.gen, x: Math.round(P.x), y: Math.round(P.y), ghostFrame: S.gf,
            crusherLeft: W.cr ? Math.round(W.cr.cdF * 1000 / 60) : null });
          snd('whistle');
          S.gf = 0; S.ghostMoved = 'jump';
          var ng = ghostRec();
          S.rings.push({ cx: ng.x + PW / 2, cy: ng.y + PH / 2, age: 0 });
        }
      }
    }

    // --- 幽靈前進 ---
    var gOldY = null, gDx = 0, gNewY = null, disc = false;
    if (S.ghost) {
      if (S.ghostMoved === 'jump') { disc = true; S.ghostMoved = false; }
      else if (S.rec.length > 0) {
        var old = ghostRec();
        S.gf++;
        if (S.gf >= S.ghost.length) { S.gf = 0; disc = true; }
        var nw = ghostRec();
        gOldY = old.y; gDx = nw.x - old.x; gNewY = nw.y;
        // 翹翹板落點端(幽靈): 只算正常前進的相鄰兩幀
        if (!disc && !old.g && nw.g) {
          var si = seesawLandIndex(W, nw);
          if (si >= 0) { seesawTrigger(si); }
        }
      }
      if (disc) S.btnGhostDone = false;   // 新的一輪
    }

    // --- 機關 ---
    // 升降台搭乘判定: 在升降台移動之前, 包含升降台與地面齊平時
    var onLift = false;
    if (L.lift && P.grounded) {
      onLift = Math.abs(P.y + PH - W.liftY) <= 1 && ov(P.x, P.x + PW, L.lift.x, L.lift.x + 120);
    }
    if (L.lift) updateLift(W, DT, W.plateLift);
    updateGate(W, DT, W.plateGate, P);
    updateSeesaws(W, DT);
    updateCrusher(W);
    for (var rI = S.rings.length - 1; rI >= 0; rI--) { S.rings[rI].age += DT; if (S.rings[rI].age >= RING_T) S.rings.splice(rI, 1); }

    // --- 搭乘 ---
    if (onLift) { P.y = W.liftY - PH; }
    else if (P.grounded && P.src === 'ghost' && S.ghost) {
      if (disc) { P.grounded = false; P.src = null; P.vy = 0; }
      else if (gNewY !== null) { P.x += gDx; P.y = gNewY - PH; }
    }
    if (disc && P.src === 'ghost' && P.grounded) { P.grounded = false; P.src = null; P.vy = 0; }

    // --- 玩家水平 ---
    var dirx = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
    if (P.launchT > 0) { P.launchT -= DT; if (P.launchT <= 0) { P.launchT = 0; } }
    if (P.launchT <= 0) { P.vx = dirx * WALK; if (dirx !== 0) P.facing = dirx; }
    else if (P.vx !== 0) P.facing = P.vx > 0 ? 1 : -1;

    // 跳躍
    if ((keys.jump || cmd.jump) && P.grounded) {
      P.vy = -JUMP_V; P.grounded = false; P.src = null; snd('jump');
    }
    cmd.jump = false;

    // 水平移動 + 實心碰撞
    var sol = solidsOf(W);
    var oldPx = P.x;
    P.x += P.vx * DT;
    if (P.x < 0) { P.x = 0; P.vx = 0; }
    if (P.x > CW - PW) { P.x = CW - PW; P.vx = 0; }
    for (var si2 = 0; si2 < sol.length; si2++) {
      var s = sol[si2];
      if (rectOv(P.x, P.y, PW, PH, s.x, s.y, s.w, s.h)) {
        if (P.vx > 0) P.x = s.x - PW; else if (P.vx < 0) P.x = s.x + s.w;
        else P.x = (P.x + PW / 2 < s.x + s.w / 2) ? s.x - PW : s.x + s.w;
        P.vx = 0;
      }
    }
    // 壓板側面: 從側邊走進來當牆擋住; 本來就在壓板下方的由結尾判斷壓死
    if (W.cr) {
      var cbm = W.cr.bottom;
      if (rectOv(P.x, P.y, PW, PH, CRUSHER.x, CR_TOP, CRUSHER.w, cbm - CR_TOP) && !ov(oldPx, oldPx + PW, CRUSHER.x, CRUSHER.x + CRUSHER.w)) {
        if (P.vx > 0) P.x = CRUSHER.x - PW; else if (P.vx < 0) P.x = CRUSHER.x + CRUSHER.w;
        else P.x = (P.x + PW / 2 < CRUSHER.x + CRUSHER.w / 2) ? CRUSHER.x - PW : CRUSHER.x + CRUSHER.w;
        P.vx = 0;
      }
    }

    // 垂直移動
    var wasG = P.grounded;
    var oldFeet = P.y + PH, oldTop = P.y;
    var newY = P.y + P.vy * DT + 0.5 * G * DT * DT;
    P.vy += G * DT;
    var newFeet = newY + PH;
    P.grounded = false; P.src = null;
    if (P.vy >= 0) {
      var best = null;
      var consider = function (top, x0, x1, src, prevTop) {
        if (!ov(P.x, P.x + PW, x0, x1)) return;
        var chk = (prevTop === undefined) ? top : Math.max(top, prevTop);
        if (oldFeet <= chk + 0.01 && newFeet >= top) { if (!best || top < best.top) best = { top: top, src: src }; }
      };
      consider(GROUND.y, GROUND.x, GROUND.x + GROUND.w, 'ground');
      L.platforms.forEach(function (p) { consider(p.y, p.x, p.x + p.w, 'plat'); });
      if (L.lift) consider(W.liftY, L.lift.x, L.lift.x + 120, 'lift');
      L.walls.forEach(function (w) { consider(w.y, w.x, w.x + w.w, 'plat'); });
      if (L.gate && !W.gateOpen) consider(L.gate.y, L.gate.x, L.gate.x + 24, 'plat');
      if (S.ghost) { var gg = ghostRec(); consider(gg.y, gg.x, gg.x + PW, 'ghost', gOldY === null ? gg.y : gOldY); }
      if (best) { P.y = best.top - PH; P.vy = 0; P.grounded = true; P.src = best.src; }
      else P.y = newY;
    } else {
      // 上升: 頭頂撞實心底(含實心平台)
      var ny = newY;
      for (var k = 0; k < sol.length; k++) {
        var q = sol[k], bot = q.y + q.h;
        if (ov(P.x, P.x + PW, q.x, q.x + q.w) && oldTop >= bot - 0.01 && ny < bot) { ny = bot; P.vy = 0; }
      }
      P.y = ny;
    }
    if (P.grounded && !wasG) {
      if (P.src === 'ghost') snd('headStand'); else snd('land');
      var li = seesawLandIndex(W, { x: P.x, y: P.y });
      if (li >= 0 && P.src !== 'lift') seesawTrigger(li);
    }

    // --- 鉤索顯示 ---
    if (P.ropeT > 0) {
      var gr = ghostRec();
      if (gr) P.rope = { x1: P.x + PW / 2, y1: P.y + PH / 2, x2: gr.x + PW / 2, y2: gr.y + PH / 2 };
      P.ropeT -= DT;
      if (P.ropeT <= 0) { P.ropeT = 0; P.rope = null; }
    }

    // --- 狀態 ---
    if (P.launchT > 0) P.state = 'launch';
    else if (!P.grounded) P.state = 'air';
    else if (dirx !== 0) P.state = 'run';
    else P.state = 'idle';

    // --- 開關、按鈕 ---
    evalPlates(false);

    // --- 錄製 ---
    pushRec();

    // --- 結束條件(批次尾端判一次) ---
    var cause = null, won = false;
    if (rectOv(P.x, P.y, PW, PH, L.goal.x, L.goal.y, 48, 80)) won = true;
    else {
      if (P.y >= CH) cause = 'pit';
      for (var sp = 0; !cause && sp < L.spikes.length; sp++) {
        var sk = L.spikes[sp];
        if (rectOv(P.x, P.y, PW, PH, sk.x, sk.y, sk.w, 24)) cause = 'spike';
      }
      if (!cause && W.cr && rectOv(P.x, P.y, PW, PH, CRUSHER.x, CR_TOP, CRUSHER.w, W.cr.bottom - CR_TOP)) cause = 'crush';
      if (!cause && S.rec.length >= REC_MAX) cause = 'timeout';
    }
    if (won) win();
    else if (cause) die(cause);
  }

  function seesawTrigger(i) {
    var W = S.W, P = S.P, s = W.seesaws[i];
    triggerSeesaw(W, i);
    // 著地站在發射端的玩家被彈起
    if (P && !P.dead && P.grounded && Math.abs(P.y + PH - (s.y + 12)) < 0.5 && ov(P.x, P.x + PW, s.x + 120, s.x + 200)) {
      P.vy = -SEESAW_V; P.vx = 0; P.launchT = 0; P.grounded = false; P.src = null;
      snd('seesawLaunch');
      emit('seesaw_launch', { attempt: S.attempt, gen: S.gen, which: i + 1 });
    }
  }

  function aimInfo() {
    var P = S.P, gr = ghostRec();
    var px = P.x + PW / 2, py = P.y + PH / 2, gx = gr.x + PW / 2, gy = gr.y + PH / 2;
    var dx = gx - px, dy = gy - py, d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1e-6) { dx = 0; dy = -1; d = 1; }
    dx /= d; dy /= d;
    var air = !gr.g;
    var v = (air ? HOOK_AIR : HOOK_GND) * (0.3 + 0.7 * S.charge);
    return { px: px, py: py, gx: gx, gy: gy, dx: dx, dy: dy, v: v, air: air,
             ax: px + dx * v * 0.3, ay: py + dy * v * 0.3 };
  }
  function cancelAim() {
    var ai = aimInfo(), P = S.P;
    emit('hook', { attempt: S.attempt, gen: S.gen, result: 'cancel', ghostAir: ai.air, charge: Math.round(S.charge * 100) / 100, x: Math.round(P.x), y: Math.round(P.y) });
    S.aiming = false; snd('hookCancel');
    P.state = P.grounded ? 'idle' : 'air';
  }
  function launchHook() {
    var ai = aimInfo(), P = S.P;
    emit('hook', { attempt: S.attempt, gen: S.gen, result: 'launch', ghostAir: ai.air, charge: Math.round(S.charge * 100) / 100, x: Math.round(P.x), y: Math.round(P.y) });
    S.aiming = false; snd('hookLaunch');
    S.hookLeft--; S.hooksUsed++;
    P.vx = ai.dx * ai.v; P.vy = ai.dy * ai.v;
    P.grounded = false; P.src = null;
    P.launchT = LAUNCH_T; P.ropeT = ROPE_T;
    P.rope = { x1: ai.px, y1: ai.py, x2: ai.gx, y2: ai.gy };
    P.state = 'launch';
  }

  // ===== 過關回放 =====
  function replayIdx(R, f) {
    var idx = new Array(R.G + 1), cur = f;
    for (var g = R.G; g >= 1; g--) {
      idx[g] = cur;
      var r = R.recs[g - 1][Math.min(cur, R.recs[g - 1].length - 1)];
      cur = r.gf >= 0 ? r.gf : 0;
    }
    return idx;
  }
  function stepReplay() {
    var R = S.replay, W = R.W, L = W.L;
    R.f++;
    if (R.f >= R.L) { R.f = 0; resetWorldForGen(W); R.prev = []; }
    var idx = replayIdx(R, R.f), ents = [];
    for (var g = 1; g <= R.G; g++) {
      var rec = R.recs[g - 1], i = Math.min(idx[g], rec.length - 1), r = rec[i];
      ents.push({ x: r.x, y: r.y, g: r.g });
      var pv = R.prev[g];
      if (pv !== undefined && i === pv + 1 && i > 0) {
        var pr = rec[i - 1];
        if (!pr.g && r.g) { var si = seesawLandIndex(W, r); if (si >= 0) triggerSeesaw(W, si); }
      }
      R.prev[g] = i;
    }
    var pg = platePressed(L.plateGate, ents), pl = platePressed(L.plateLift, ents);
    updateLift(W, DT, pl);
    updateGate(W, DT, pg, null);
    updateSeesaws(W, DT);
    W.plateGate = pg; W.plateLift = pl;
    if (L.button) W.buttonPressed = platePressed(L.button, ents);
    if (W.cr) {   // 壓板照主軸紀錄
      var ar = R.recs[R.G - 1][Math.min(R.f, R.L - 1)];
      if (ar.cb !== null && ar.cb !== undefined) { W.cr.bottom = ar.cb; W.cr.cdF = ar.cd || 0; }
    }
  }

  // ===== 繪製 =====
  function drawWorld(ctx, W) {
    var L = W.L;
    Art.drawBackground(ctx, { level: W.lv });
    Art.drawPlatform(ctx, { x: GROUND.x, y: GROUND.y, w: GROUND.w, h: GROUND.h, solid: true });
    L.platforms.forEach(function (p) { Art.drawPlatform(ctx, { x: p.x, y: p.y, w: p.w, h: p.h, solid: !!p.solid }); });
    L.walls.forEach(function (w) { Art.drawWall(ctx, { x: w.x, y: w.y, w: w.w, h: w.h }); });
    L.spikes.forEach(function (s) { Art.drawSpike(ctx, { x: s.x, y: s.y, w: s.w }); });
    W.seesaws.forEach(function (s) { Art.drawSeesaw(ctx, { x: s.x, y: s.y, tilt: s.tilt }); });
    if (L.plateLift) Art.drawPlate(ctx, { x: L.plateLift.x, y: L.plateLift.y, pressed: W.plateLift, kind: 'lift' });
    if (L.plateGate) Art.drawPlate(ctx, { x: L.plateGate.x, y: L.plateGate.y, pressed: W.plateGate, kind: 'gate' });
    if (L.button) Art.drawButton(ctx, { x: L.button.x, y: L.button.y, pressed: W.buttonPressed });
    if (L.lift) Art.drawLift(ctx, { x: L.lift.x, y: W.liftY, active: W.liftActive || W.plateLift });
    if (L.gate) Art.drawGate(ctx, { x: L.gate.x, y: L.gate.y, open: W.gateOpen });
    if (W.cr) Art.drawCrusher(ctx, { x: CRUSHER.x, w: CRUSHER.w, top: CR_TOP, bottom: W.cr.bottom, hold: crusherHold(W.cr), warn: crusherWarn(W.cr) });
    Art.drawGoal(ctx, { x: L.goal.x, y: L.goal.y });
  }
  function hudState(phase) {
    var lv = S.level;
    return { level: lv, levelCount: LEVEL_COUNT, gen: S.gen, maxGen: MAX_GEN, phase: phase,
      hookUnlocked: hookUnlocked(lv), hookLeft: S.hookLeft, hookMax: HOOK_MAX,
      whistleUnlocked: whistleUnlocked(lv), aiming: S.aiming, muted: S.muted };
  }
  function routeSegments() {
    var gh = S.ghost, n = gh.length, total = Math.min(ROUTE_N, n), a = S.gf, segs = [];
    var end1 = Math.min(a + total, n), s1 = [];
    for (var i = a; i < end1; i++) s1.push({ x: gh[i].x + PW / 2, y: gh[i].y + PH / 2 });
    segs.push(s1);
    var rem = total - (end1 - a);
    if (rem > 0) {
      var s2 = [];
      for (var j = 0; j < rem; j++) s2.push({ x: gh[j].x + PW / 2, y: gh[j].y + PH / 2 });
      segs.push(s2);
    }
    return segs;
  }
  function drawPlay(ctx) {
    var W = S.W, P = S.P;
    drawWorld(ctx, W);
    if (S.ghost && S.phase !== 'lose') {
      Art.drawGhostPath(ctx, { segments: routeSegments() });
    }
    S.rings.forEach(function (r) { Art.drawWhistleRing(ctx, { cx: r.cx, cy: r.cy, t: r.age / RING_T }); });
    if (S.ghost) {
      var gr = ghostRec();
      Art.drawGhost(ctx, { x: gr.x, y: gr.y, facing: gr.f, state: gr.s, gen: S.gen - 1,
        hookable: S.phase === 'play' && (S.aiming || hookableNow()) });
      if (gr.h) Art.drawHook(ctx, gr.h);
    }
    if (P.rope && P.ropeT > 0) Art.drawHook(ctx, P.rope);
    Art.drawPlayer(ctx, { x: P.x, y: P.y, facing: P.facing, state: P.state, gen: S.gen });
    if (S.aiming) {
      var ai = aimInfo();
      Art.drawAim(ctx, { px: ai.px, py: ai.py, gx: ai.gx, gy: ai.gy, ax: ai.ax, ay: ai.ay, charge: S.charge });
    }
    Art.drawHud(ctx, hudState(S.phase));
  }
  function drawReplay(ctx) {
    var R = S.replay, W = R.W;
    drawWorld(ctx, W);
    var idx = replayIdx(R, R.f), items = [];
    for (var g = R.G; g >= 1; g--) {
      var rec = R.recs[g - 1], r = rec[Math.min(idx[g], rec.length - 1)];
      items.push({ g: g, r: r });
    }
    items.sort(function (a, b) { return a.g - b.g; });
    items.forEach(function (it) {
      Art.drawGhost(ctx, { x: it.r.x, y: it.r.y, facing: it.r.f, state: it.r.s, gen: it.g, hookable: false });
      if (it.r.h) Art.drawHook(ctx, it.r.h);
    });
    var hs = hudState('win'); hs.aiming = false; hs.gen = R.G;
    Art.drawHud(ctx, hs);
  }

  // ===== 說明頁(標題、文字、頁碼、翻頁提示由這裡畫; 示意圖交給 Art.drawGuidePage 的框) =====
  var GUIDE = [
    { t: '走到旗子', s: '走到旗子就過關' },
    { t: '先死一次', s: '一個人到不了, 要先死一次' },
    { t: '死了變幽靈', s: '死掉的你會一直重演' },
    { t: '踩幽靈', s: '幽靈的頭能站, 還會載你走' },
    { t: '只看得見上一個人', s: '共三人, 只看得見上一個' }
  ];
  // 文字區: y 0~230(標題)與 y 1085~1250(頁碼、提示); 示意圖框: y 260~1060
  var GF = { x: 40, y: 260, w: 640, h: 800 };
  function drawGuide(ctx) {
    var pg = S.guidePage, g = GUIDE[pg], last = GUIDE.length - 1;
    Placeholder.guideBg(ctx);
    Art.drawGuidePage(ctx, { page: pg, x: GF.x, y: GF.y, w: GF.w, h: GF.h });
    Placeholder.text(ctx, '幽影接力', CW / 2, 56, 30, '#8a93ad');
    Placeholder.text(ctx, '第 ' + (pg + 1) + ' 頁  ' + g.t, CW / 2, 122, 46, '#eef1f8');
    Placeholder.text(ctx, g.s, CW / 2, 196, 34, '#ffe9a8');
    for (var i = 0; i < GUIDE.length; i++) {
      ctx.beginPath();
      ctx.arc(CW / 2 - (GUIDE.length - 1) * 14 + i * 28, 1100, i === pg ? 8 : 5, 0, Math.PI * 2);
      ctx.fillStyle = i === pg ? '#eef1f8' : 'rgba(138,147,173,0.5)';
      ctx.fill();
    }
    Placeholder.text(ctx, '第 ' + (pg + 1) + ' / ' + GUIDE.length + ' 頁', CW / 2, 1142, 24, '#8a93ad');
    var hint = pg === 0 ? '→ / 空白鍵  下一頁'
      : (pg === last ? '←  上一頁     → / 空白鍵  開始遊戲' : '←  上一頁     → / 空白鍵  下一頁');
    Placeholder.text(ctx, hint, CW / 2, 1210, 32, '#eef1f8');
  }

  function render(ctx) {
    ctx.clearRect(0, 0, CW, CH);
    if (S.screen === 'guide') drawGuide(ctx);
    else if (S.screen === 'intro') {
      var L = LEVELS[S.level];
      Art.drawLevelIntro(ctx, { level: S.level, levelCount: LEVEL_COUNT, title: L.title, hint: L.hint, newThing: L.newThing });
    }
    else if (S.screen === 'unlock') Art.drawUnlockPage(ctx, { ability: S.unlockAbility });
    else if (S.screen === 'ending') Art.drawEnding(ctx, {});
    else if (S.screen === 'play') {
      if (S.phase === 'win' && S.replay) drawReplay(ctx); else drawPlay(ctx);
    }
  }

  // ===== 輸入(只有鍵盤) =====
  function guideGo(dir) {
    var from = S.guidePage, last = GUIDE.length - 1;
    if (dir < 0) {
      if (from === 0) return;
      S.guidePage--; S.guideBacks++;
      emit('guide_page', { from: from, to: S.guidePage, dir: 'prev' });
      snd('uiPage');
    } else if (from < last) {
      S.guidePage++;
      emit('guide_page', { from: from, to: S.guidePage, dir: 'next' });
      snd('uiPage');
    } else {
      emit('guide_done', { pagesTime: Math.round(nowMs() - S.guideT0), backs: S.guideBacks });
      snd('uiPage');
      S.level = 1; gotoIntro();
    }
  }
  function onSpace() {
    if (S.screen === 'guide') {
      guideGo(1);
    } else if (S.screen === 'intro') {
      snd('uiPage');
      startLevel('first');
    } else if (S.screen === 'unlock') {
      snd('uiPage');
      S.level++; gotoIntro();
    } else if (S.screen === 'ending') {
      S.level = 1; gotoIntro();
    } else if (S.screen === 'play') {
      if (S.phase === 'win') {
        var lv = S.level;
        if (lv === 1 && !S.shown.hook) { S.shown.hook = true; showUnlock('hook'); }
        else if (lv === 5 && !S.shown.whistle) { S.shown.whistle = true; showUnlock('whistle'); }
        else if (lv === LEVEL_COUNT) {
          setScreen('ending'); music('ending');
          emit('game_complete', { totalTime: Math.round(nowMs() - t0) });
        } else { S.level++; gotoIntro(); }
      } else if (S.phase === 'lose') {
        startLevel('retry');
      } else if (S.phase === 'play' && !S.aiming) {
        jumpDown.Space = true; refreshJump();
      }
    }
  }
  function showUnlock(ab) {
    S.unlockAbility = ab;
    setScreen('unlock'); music('title');
    emit('unlock', { ability: ab });
    snd('unlock');
  }
  function toggleMute() {
    S.muted = !S.muted;
    try {
      if (window.Sound) {
        if (Sound.setMuted) Sound.setMuted(S.muted);
        else if (Sound.toggleMute) Sound.toggleMute();
        else if (Sound.mute) Sound.mute(S.muted);
      }
    } catch (e) { console.error(e); }
    emit('mute', { muted: S.muted });
  }
  var GAME_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, Space: 1, KeyZ: 1, KeyX: 1, KeyC: 1, KeyR: 1, KeyM: 1 };
  function refreshJump() { keys.jump = jumpDown.Space || jumpDown.ArrowUp; if (keys.jump) cmd.jump = true; }
  function onKeyDown(e) {
    if (e.repeat) { if (GAME_KEYS[e.code]) e.preventDefault(); return; }
    if (GAME_KEYS[e.code]) e.preventDefault();
    if (!firstInput) {
      firstInput = true;
      try { if (window.Sound && Sound.init) Sound.init(); } catch (er) { console.error(er); }
      music('title');
    }
    var c = e.code;
    if (c === 'KeyM') { toggleMute(); return; }
    var playing = S.screen === 'play' && S.phase !== 'win' && S.phase !== 'lose';
    if (c === 'Space') { onSpace(); return; }
    if (c === 'ArrowUp') { if (S.screen === 'play' && S.phase === 'play' && !S.aiming) { jumpDown.ArrowUp = true; refreshJump(); } return; }
    if (c === 'ArrowLeft') {
      keys.left = true;
      if (S.screen === 'guide') guideGo(-1);
      return;
    }
    if (c === 'ArrowRight') {
      keys.right = true;
      if (S.screen === 'guide') guideGo(1);
      return;
    }
    if (S.screen !== 'play') return;
    if (c === 'KeyR') { if (playing) cmd.r = true; }
    else if (c === 'KeyZ') { if (S.phase === 'play') cmd.z = true; }
    else if (c === 'KeyX') { if (S.phase === 'play') cmd.x = true; }
    else if (c === 'KeyC') { if (S.phase === 'play') cmd.c = true; }
  }
  function onKeyUp(e) {
    if (GAME_KEYS[e.code]) e.preventDefault();
    var c = e.code;
    if (c === 'ArrowLeft') keys.left = false;
    else if (c === 'ArrowRight') keys.right = false;
    else if (c === 'Space' || c === 'ArrowUp') { jumpDown[c] = false; refreshJump(); }
  }
  function onBlur() { keys.left = keys.right = false; jumpDown.Space = jumpDown.ArrowUp = false; keys.jump = false; }

  // ===== 啟動 =====
  var canvas, ctx;
  function resize() {
    var s = Math.min(window.innerWidth / CW, window.innerHeight / CH);
    if (!(s > 0)) s = 1;
    var dpr = window.devicePixelRatio || 1;
    canvas.style.width = Math.floor(CW * s) + 'px';
    canvas.style.height = Math.floor(CH * s) + 'px';
    canvas.width = Math.round(CW * s * dpr);
    canvas.height = Math.round(CH * s * dpr);
    ctx.setTransform(canvas.width / CW, 0, 0, canvas.height / CH, 0, 0);
  }
  var last = 0, acc = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    try {
      var dt = last ? (ts - last) / 1000 : DT;
      last = ts;
      if (dt > 1 / 30) dt = 1 / 30;
      if (dt < 0) dt = 0;
      acc += dt;
      var n = 0;
      while (acc >= DT && n < 4) { step(); acc -= DT; n++; }
      if (n === 4) acc = 0;
      render(ctx);
    } catch (e) { console.error(e); }
  }
  function boot() {
    canvas = document.getElementById('c');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', function (e) { onKeyDown(e); });
    window.addEventListener('keyup', function (e) { onKeyUp(e); });
    window.addEventListener('blur', onBlur);
    S.guideT0 = nowMs();
    emit('session_start', { levelCount: LEVEL_COUNT });
    music('title');
    requestAnimationFrame(frame);
  }
  if (typeof document !== 'undefined' && document.getElementById) boot();
})();
