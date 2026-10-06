// 鉤影 — 美術層。全部 Canvas 2D 幾何繪製, 無外部資源。
// 只負責「給狀態 → 畫出來」, 不含任何遊戲邏輯。
(function () {
  'use strict';

  var W = 720, H = 1280, HUD_H = 100;

  var C = {
    bg: '#161c33',
    bgBottom: '#0b0f1c',
    hudBg: '#0a0d18',
    hudLine: '#2a3352',
    ground: '#2b3249',
    groundTop: '#7d8cb4',
    groundLine: '#222839',
    platform: '#38425f',
    platformTop: '#a9b8e0',
    player: '#ff9a3c',
    playerDark: '#b5561a',
    playerDead: '#6c6f7a',
    ghost: '#6fd8ff',
    ghostHead: '#c8f2ff',
    hook: '#c77dff',
    hookDark: '#3a1660',
    spike: '#ff3b4e',
    spikeDark: '#8a1424',
    goal: '#3ee07a',
    goalPole: '#e9eefc',
    text: '#eef2ff',
    textDim: '#8a93b2',
    win: '#3ee07a',
    lose: '#ff3b4e',
    eye: '#1a1420'
  };

  var FONT = '"Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif';
  function font(px, bold) { return (bold ? 'bold ' : '') + px + 'px ' + FONT; }

  // ---------- 小工具 ----------
  function rr(ctx, x, y, w, h, r) {
    var tl, tr, br, bl;
    if (typeof r === 'number') { tl = tr = br = bl = r; } else { tl = r[0]; tr = r[1]; br = r[2]; bl = r[3]; }
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl);
    ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
  }

  function outlinedText(ctx, str, x, y, px, color, align, bold) {
    ctx.font = font(px, bold !== false);
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, px / 6);
    ctx.strokeStyle = 'rgba(5,7,14,0.9)';
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  // 角色 / 幽靈共用輪廓的腳位(依 state)
  function legPose(state) {
    // 回傳兩隻腳的 [x偏移, y頂, 高]
    if (state === 'run') return [[6, 44, 12], [24, 40, 12]];
    if (state === 'air' || state === 'hook') return [[9, 42, 8], [21, 42, 8]];
    return [[8, 44, 12], [22, 44, 12]];
  }

  function drawEyes(ctx, x, y, facing, dead, color) {
    var f = facing === -1 ? -1 : 1;
    var cx = x + 20 + f * 5;
    var ey = y + 16;
    ctx.save();
    if (dead) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      [cx - 6, cx + 6].forEach(function (ex) {
        ctx.beginPath();
        ctx.moveTo(ex - 3, ey - 3); ctx.lineTo(ex + 3, ey + 3);
        ctx.moveTo(ex + 3, ey - 3); ctx.lineTo(ex - 3, ey + 3);
        ctx.stroke();
      });
    } else {
      ctx.fillStyle = color;
      [cx - 6, cx + 6].forEach(function (ex) {
        ctx.beginPath();
        ctx.ellipse(ex + f * 1, ey, 2.6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore();
  }

  // ---------- 背景 ----------
  function drawBackground(ctx) {
    ctx.save();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.bg);
    g.addColorStop(1, C.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // 淡點陣: 只給空間感, 權重最低
    ctx.fillStyle = 'rgba(160,180,255,0.06)';
    for (var yy = HUD_H + 40; yy < H; yy += 80) {
      for (var xx = 40; xx < W; xx += 80) {
        ctx.fillRect(xx - 1, yy - 1, 2, 2);
      }
    }
    // 畫面下緣 = 掉出去就死: 一條很淡的危險紅漸層
    var d = ctx.createLinearGradient(0, H - 40, 0, H);
    d.addColorStop(0, 'rgba(255,59,78,0)');
    d.addColorStop(1, 'rgba(255,59,78,0.28)');
    ctx.fillStyle = d;
    ctx.fillRect(0, H - 40, W, 40);
    ctx.restore();
  }

  // ---------- 平台 ----------
  // h >= 40 視為實心地面; 其餘為單向平台
  function drawPlatform(ctx, s) {
    var x = s.x, y = s.y, w = s.w, h = s.h;
    ctx.save();
    if (h >= 40) {
      ctx.fillStyle = C.ground;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = C.groundTop;
      ctx.fillRect(x, y, w, 6);
      // 磚縫
      ctx.strokeStyle = C.groundLine;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var row = 0; y + 6 + row * 24 < y + h; row++) {
        var ry = y + 6 + row * 24;
        ctx.moveTo(x, ry + 24); ctx.lineTo(x + w, ry + 24);
        for (var bx = x + (row % 2 ? 30 : 0); bx < x + w; bx += 60) {
          if (bx > x) { ctx.moveTo(bx, ry); ctx.lineTo(bx, Math.min(ry + 24, y + h)); }
        }
      }
      ctx.stroke();
    } else {
      // 上緣 8px 實心亮條 = 可站; 下半格柵半透明 = 從下方可穿過
      ctx.fillStyle = C.platformTop;
      ctx.fillRect(x, y, w, 8);
      ctx.fillStyle = 'rgba(56,66,95,0.55)';
      ctx.fillRect(x, y + 8, w, h - 8);
      ctx.strokeStyle = 'rgba(169,184,224,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var sx = x + 10; sx < x + w; sx += 20) {
        ctx.moveTo(sx, y + 8); ctx.lineTo(sx, y + h);
      }
      ctx.stroke();
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(x, y + h - 1); ctx.lineTo(x + w, y + h - 1);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  // ---------- 尖刺 ----------
  function drawSpike(ctx, s) {
    var x = s.x, y = s.y, w = s.w, h = 24;
    ctx.save();
    ctx.fillStyle = C.spikeDark;
    ctx.fillRect(x, y + h - 4, w, 4);
    var n = Math.max(1, Math.round(w / 16));
    var tw = w / n;
    for (var i = 0; i < n; i++) {
      var tx = x + i * tw;
      ctx.fillStyle = C.spike;
      ctx.beginPath();
      ctx.moveTo(tx, y + h - 2);
      ctx.lineTo(tx + tw / 2, y);
      ctx.lineTo(tx + tw, y + h - 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,220,225,0.85)';
      ctx.beginPath();
      ctx.moveTo(tx + tw / 2, y);
      ctx.lineTo(tx + tw / 2 - 2.5, y + 6);
      ctx.lineTo(tx + tw / 2 + 2.5, y + 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 終點旗 ----------
  function drawGoal(ctx, s) {
    var x = s.x, y = s.y;
    ctx.save();
    // 底座
    ctx.fillStyle = C.goalPole;
    rr(ctx, x + 2, y + 72, 20, 8, 3);
    ctx.fill();
    // 旗桿
    ctx.fillRect(x + 10, y + 2, 4, 72);
    ctx.beginPath();
    ctx.arc(x + 12, y + 4, 4, 0, Math.PI * 2);
    ctx.fill();
    // 旗面
    ctx.fillStyle = C.goal;
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 8);
    ctx.lineTo(x + 48, y + 22);
    ctx.lineTo(x + 14, y + 38);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 8);
    ctx.lineTo(x + 30, y + 15);
    ctx.lineTo(x + 14, y + 20);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ---------- 玩家 ----------
  function drawPlayer(ctx, s) {
    var x = s.x, y = s.y, st = s.state || 'idle';
    var dead = st === 'dead';
    var body = dead ? C.playerDead : C.player;
    var dark = dead ? '#3d3f48' : C.playerDark;
    var lean = st === 'run' ? (s.facing === -1 ? -2 : 2) : 0;
    ctx.save();
    // 腳
    ctx.fillStyle = dark;
    legPose(st).forEach(function (l) {
      rr(ctx, x + l[0], y + l[1], 10, l[2], 3);
      ctx.fill();
    });
    // 身體(圓頂)
    ctx.fillStyle = body;
    rr(ctx, x + 2 + lean, y, 36, 46, [16, 16, 8, 8]);
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    rr(ctx, x + 3 + lean, y + 1, 34, 44, [15, 15, 7, 7]);
    ctx.stroke();
    // 腰帶
    ctx.fillStyle = dark;
    ctx.fillRect(x + 3 + lean, y + 32, 34, 4);
    drawEyes(ctx, x + lean, y, s.facing, dead, C.eye);
    if (st === 'hook') {
      // 被拉動中: 紫色外框 = 和鉤索同一個字典色
      ctx.strokeStyle = C.hook;
      ctx.lineWidth = 3;
      rr(ctx, x + 1.5, y + 1.5, 37, 53, [16, 16, 6, 6]);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 幽靈 ----------
  function drawGhost(ctx, s) {
    var x = s.x, y = s.y, st = s.state || 'idle';
    var air = st === 'air';
    ctx.save();
    var base = ctx.globalAlpha;
    // 半透明身體: 頂部平的(唯一能站的邊), 其餘虛線
    ctx.globalAlpha = base * 0.32;
    ctx.fillStyle = C.ghost;
    legPose(st).forEach(function (l) {
      rr(ctx, x + l[0], y + l[1], 10, l[2], 3);
      ctx.fill();
    });
    rr(ctx, x + 2, y, 36, 46, [0, 0, 8, 8]);
    ctx.fill();
    ctx.globalAlpha = base * 0.75;
    ctx.strokeStyle = C.ghost;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    rr(ctx, x + 3, y + 5, 34, 40, [0, 0, 7, 7]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = base * 0.85;
    drawEyes(ctx, x, y + 2, s.facing, false, C.ghostHead);
    // 頭頂: 實心亮線, 全幽靈唯一不透明的部位
    ctx.globalAlpha = base;
    ctx.fillStyle = C.ghostHead;
    ctx.fillRect(x, y, 40, 4);

    if (s.hookable) {
      // 可鉤: 紫色角框長在幽靈本體四角; 在空中(強甩)角框加粗 + 內部紫光 + 雙箭頭
      var lw = air ? 5 : 3;
      var L = air ? 14 : 10;
      if (air) {
        ctx.globalAlpha = base * 0.3;
        ctx.fillStyle = C.hook;
        ctx.fillRect(x + 4, y + 6, 32, 44);
        ctx.globalAlpha = base;
      }
      ctx.strokeStyle = C.hook;
      ctx.lineWidth = lw;
      ctx.lineCap = 'square';
      var o = lw / 2;
      ctx.beginPath();
      ctx.moveTo(x + o, y + 4 + L); ctx.lineTo(x + o, y + 4 + o); ctx.lineTo(x + L, y + 4 + o);
      ctx.moveTo(x + 40 - L, y + 4 + o); ctx.lineTo(x + 40 - o, y + 4 + o); ctx.lineTo(x + 40 - o, y + 4 + L);
      ctx.moveTo(x + o, y + 56 - L); ctx.lineTo(x + o, y + 56 - o); ctx.lineTo(x + L, y + 56 - o);
      ctx.moveTo(x + 40 - L, y + 56 - o); ctx.lineTo(x + 40 - o, y + 56 - o); ctx.lineTo(x + 40 - o, y + 56 - L);
      ctx.stroke();
      // 箭頭(甩的強度): 著地 1 個, 空中 2 個
      ctx.strokeStyle = '#f3e4ff';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      var n = air ? 2 : 1;
      for (var i = 0; i < n; i++) {
        var cy = y + 34 - i * 8;
        ctx.moveTo(x + 13, cy + 5); ctx.lineTo(x + 20, cy - 2); ctx.lineTo(x + 27, cy + 5);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 鉤索 ----------
  function drawHook(ctx, s) {
    var x1 = s.x1, y1 = s.y1, x2 = s.x2, y2 = s.y2;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.hookDark;
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = C.hook;
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    // 爪頭
    var a = Math.atan2(y2 - y1, x2 - x1);
    ctx.translate(x2, y2);
    ctx.rotate(a);
    ctx.strokeStyle = C.hook;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-2, 0); ctx.lineTo(4, -7); ctx.lineTo(9, -4);
    ctx.moveTo(-2, 0); ctx.lineTo(4, 7); ctx.lineTo(9, 4);
    ctx.stroke();
    ctx.fillStyle = '#f3e4ff';
    ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ---------- HUD ----------
  // kind: player / ghost / gone / wait — 與說明第 5 頁同一套小人
  function figIcon(ctx, x, y, kind, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    if (kind === 'player') {
      drawPlayer(ctx, { x: 0, y: 0, facing: 1, state: 'idle', gen: 0 });
    } else if (kind === 'ghost') {
      drawGhost(ctx, { x: 0, y: 0, facing: 1, state: 'idle', gen: 0, hookable: false });
    } else if (kind === 'gone') {
      ctx.globalAlpha *= 0.18;
      drawGhost(ctx, { x: 0, y: 0, facing: 1, state: 'idle', gen: 0, hookable: false });
    } else {
      ctx.strokeStyle = C.textDim;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      rr(ctx, 3, 1, 34, 44, [15, 15, 7, 7]);
      ctx.stroke();
    }
    ctx.restore();
  }
  function figKind(k, gen) {
    if (k === gen) return 'player';
    if (k === gen - 1) return 'ghost';
    if (k < gen - 1) return 'gone';
    return 'wait';
  }

  function hookIcon(ctx, cx, cy, ready) {
    ctx.save();
    var col = ready ? C.hook : '#4a4f63';
    ctx.strokeStyle = col;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy + 12); ctx.lineTo(cx + 4, cy - 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 4, cy - 8); ctx.lineTo(cx + 4, cy - 18); ctx.lineTo(cx + 12, cy - 16);
    ctx.moveTo(cx + 4, cy - 8); ctx.lineTo(cx + 14, cy - 8); ctx.lineTo(cx + 12, cy);
    ctx.stroke();
    ctx.restore();
  }

  function keyCap(ctx, x, y, label, px) {
    ctx.save();
    ctx.font = font(px, true);
    var w = Math.max(px * 1.6, ctx.measureText(label).width + px * 0.9);
    var h = px * 1.6;
    ctx.fillStyle = '#1f2640';
    rr(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = C.text;
    ctx.lineWidth = 2;
    rr(ctx, x, y, w, h, 6);
    ctx.stroke();
    ctx.fillStyle = C.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    ctx.restore();
    return w;
  }

  function drawHud(ctx, s) {
    var gen = s.gen || 1, maxGen = s.maxGen || 3, phase = s.phase || 'play';
    ctx.save();
    ctx.fillStyle = C.hudBg;
    ctx.fillRect(0, 0, W, HUD_H);
    ctx.fillStyle = C.hudLine;
    ctx.fillRect(0, HUD_H - 2, W, 2);

    // 左: 代數小人列
    for (var k = 1; k <= maxGen; k++) {
      var fx = 20 + (k - 1) * 40;
      figIcon(ctx, fx, 22, figKind(k, gen), 0.62);
      ctx.font = font(16, true);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = k === gen ? C.text : C.textDim;
      ctx.fillText(String(k), fx + 12, 14);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = font(30, true);
    ctx.fillStyle = C.text;
    ctx.fillText(gen + ' / ' + maxGen, 140, 46);
    ctx.font = font(17, false);
    ctx.fillStyle = C.textDim;
    ctx.fillText('第幾人', 140, 78);

    // 中: 鉤爪就緒
    hookIcon(ctx, 268, 46, !!s.hookReady);
    ctx.font = font(22, true);
    ctx.fillStyle = s.hookReady ? C.hook : '#4a4f63';
    ctx.fillText(s.hookReady ? 'Z 鉤爪' : '已用過', 294, 40);
    ctx.font = font(17, false);
    ctx.fillStyle = C.textDim;
    ctx.fillText(s.hookReady ? '可用' : '落地後恢復', 294, 70);

    // 右: 按鍵
    ctx.textAlign = 'right';
    ctx.font = font(18, false);
    ctx.fillStyle = C.textDim;
    ctx.fillText('← → 走   空白 / ↑ 跳', 704, 34);
    ctx.fillText('Z 鉤   R 整關重來', 704, 66);

    if (phase === 'dying') {
      var msg = gen >= maxGen ? '最後一人倒下' : '倒下了 — 下一個你即將出生';
      ctx.font = font(24, true);
      var tw = ctx.measureText(msg).width + 40;
      ctx.fillStyle = 'rgba(10,13,24,0.85)';
      rr(ctx, (W - tw) / 2, 116, tw, 44, 10);
      ctx.fill();
      ctx.strokeStyle = C.lose;
      ctx.lineWidth = 2;
      rr(ctx, (W - tw) / 2, 116, tw, 44, 10);
      ctx.stroke();
      outlinedText(ctx, msg, W / 2, 138, 24, C.text);
    }

    if (phase === 'win' || phase === 'lose') {
      var win = phase === 'win';
      ctx.fillStyle = 'rgba(6,8,16,0.72)';
      ctx.fillRect(0, 0, W, H);
      var pw = 520, ph = 300, px = (W - pw) / 2, py = (H - ph) / 2;
      ctx.fillStyle = '#141a2e';
      rr(ctx, px, py, pw, ph, 18);
      ctx.fill();
      ctx.strokeStyle = win ? C.win : C.lose;
      ctx.lineWidth = 4;
      rr(ctx, px, py, pw, ph, 18);
      ctx.stroke();
      outlinedText(ctx, win ? '過關!' : '失敗', W / 2, py + 90, 64, win ? C.win : C.lose);
      outlinedText(ctx, win ? ('第 ' + gen + ' 人摸到旗子') : '三個人都倒下了', W / 2, py + 160, 26, C.text, 'center', false);
      ctx.font = font(26, true);
      var kw = ctx.measureText('空白鍵').width + 26;
      var total = kw + 12 + ctx.measureText('重來').width;
      var kx = W / 2 - total / 2;
      keyCap(ctx, kx, py + 214, '空白鍵', 22);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = font(26, true);
      ctx.fillStyle = C.text;
      ctx.fillText('重來', kx + kw + 12, py + 232);
    }
    ctx.restore();
  }

  // ---------- 說明頁 ----------
  var LV = {
    ground: { x: 0, y: 1200, w: 600, h: 80 },
    p1: { x: 0, y: 860, w: 480, h: 24 },
    p2: { x: 260, y: 540, w: 460, h: 24 },
    spike: { x: 0, y: 836, w: 80 },
    goal: { x: 640, y: 460 }
  };
  function drawLevel(ctx) {
    drawPlatform(ctx, LV.ground);
    drawPlatform(ctx, LV.p1);
    drawPlatform(ctx, LV.p2);
    drawSpike(ctx, LV.spike);
    drawGoal(ctx, LV.goal);
  }

  // 以世界座標畫一格縮圖
  function panel(ctx, px, py, pw, ph, wx, wy, sc, fn) {
    ctx.save();
    rr(ctx, px, py, pw, ph, 14);
    ctx.clip();
    ctx.fillStyle = C.bgBottom;
    ctx.fillRect(px, py, pw, ph);
    ctx.translate(px, py);
    ctx.scale(sc, sc);
    ctx.translate(-wx, -wy);
    drawBackground(ctx);
    fn(ctx);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = C.hudLine;
    ctx.lineWidth = 3;
    rr(ctx, px, py, pw, ph, 14);
    ctx.stroke();
    ctx.restore();
  }

  function dashedPath(ctx, pts, color, lw) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw || 4;
    ctx.setLineDash([10, 9]);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) {
      var p = pts[i];
      if (p.length === 4) ctx.quadraticCurveTo(p[0], p[1], p[2], p[3]);
      else ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // 箭頭
    var last = pts[pts.length - 1];
    var ex = last.length === 4 ? last[2] : last[0], ey = last.length === 4 ? last[3] : last[1];
    var prev = last.length === 4 ? [last[0], last[1]] : pts[pts.length - 2];
    var a = Math.atan2(ey - prev[1], ex - prev[0]);
    ctx.fillStyle = color;
    ctx.translate(ex, ey); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-12, -9); ctx.lineTo(-12, 9); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function faded(ctx, a, fn) { ctx.save(); ctx.globalAlpha *= a; fn(); ctx.restore(); }

  function markOk(ctx, x, y, ok, r) {
    ctx.save();
    r = r || 22;
    ctx.fillStyle = 'rgba(8,10,20,0.85)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ok ? C.text : C.lose;
    ctx.lineWidth = r / 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (ok) { ctx.moveTo(x - r * 0.45, y); ctx.lineTo(x - r * 0.1, y + r * 0.38); ctx.lineTo(x + r * 0.5, y - r * 0.35); }
    else { ctx.moveTo(x - r * 0.4, y - r * 0.4); ctx.lineTo(x + r * 0.4, y + r * 0.4); ctx.moveTo(x + r * 0.4, y - r * 0.4); ctx.lineTo(x - r * 0.4, y + r * 0.4); }
    ctx.stroke();
    ctx.restore();
  }

  function center(o) { return [o.x + 20, o.y + 28]; }

  var PAGES = [
    { title: '走到旗子', text: '←→ 走、空白鍵跳、R 整關重來', draw: guide1 },
    { title: '死了會變幽靈', text: '死掉的你會一直重演剛才的動作', draw: guide2 },
    { title: '踩幽靈', text: '幽靈的頭可以踩', draw: guide3 },
    { title: '鉤幽靈', text: 'Z 鉤幽靈, 它在空中時甩得最高', draw: guide4 },
    { title: '只有三個人', text: '共三人, 只看得到上一個人的幽靈', draw: guide5 }
  ];

  // 第 1 頁: 全關縮圖, 角色在出生點、旗子在右上; 角色旁標按鍵
  function guide1(ctx) {
    var sc = 0.72, wx = 0, wy = 380, pw = W * sc, ph = (H - wy) * sc;
    var px = (W - pw) / 2, py = 250;
    panel(ctx, px, py, pw, ph, wx, wy, sc, function (c) {
      drawLevel(c);
      drawPlayer(c, { x: 60, y: 1144, facing: 1, state: 'idle', gen: 1 });
      // 旗子圈起來
      c.save();
      c.strokeStyle = C.goal; c.lineWidth = 4; c.setLineDash([10, 8]);
      c.beginPath(); c.arc(664, 500, 66, 0, Math.PI * 2); c.stroke();
      c.restore();
      outlinedText(c, '終點', 664, 400, 40, C.goal);
      // 按鍵貼在角色旁
      var x = keyCap(c, 20, 1050, '←', 34);
      keyCap(c, 20 + x + 10, 1050, '→', 34);
      outlinedText(c, '走', 20 + x * 2 + 40, 1078, 36, C.text);
      keyCap(c, 150, 1130, '空白', 34);
      outlinedText(c, '跳', 290, 1158, 36, C.text);
      keyCap(c, 340, 1050, 'R', 34);
      outlinedText(c, '整關重來', 470, 1078, 34, C.text);
    });
  }

  // 第 2 頁: 左格掉坑; 右格新角色在出生點 + 幽靈照前一代路線
  function guide2(ctx) {
    var sc = 0.75, pw = 320, ph = 520, py = 280;
    var trail = [[80, 1172], [420, 1172], [560, 1172], [640, 1080, 670, 1270]];
    panel(ctx, 30, py, pw, ph, 293, 1280 - ph / sc, sc, function (c) {
      drawLevel(c);
      dashedPath(c, [[360, 1172], [560, 1172], [640, 1080, 668, 1236]], C.player, 5);
      drawPlayer(c, { x: 646, y: 1222, facing: 1, state: 'dead', gen: 1 });
    });
    panel(ctx, 370, py, pw, ph, 0, 1280 - ph / sc, sc, function (c) {
      drawLevel(c);
      dashedPath(c, trail, C.ghost, 5);
      drawGhost(c, { x: 300, y: 1144, facing: 1, state: 'run', gen: 1, hookable: false });
      drawPlayer(c, { x: 60, y: 1144, facing: 1, state: 'idle', gen: 2 });
    });
    outlinedText(ctx, '第 1 人掉進坑', 30 + pw / 2, py + ph + 40, 26, C.text);
    outlinedText(ctx, '第 2 人出生', 370 + pw / 2, py + ph + 40, 26, C.player);
    outlinedText(ctx, '幽靈照著重演', 370 + pw / 2, py + ph + 80, 26, C.ghost);
    // 兩格之間
    ctx.save();
    ctx.fillStyle = C.text;
    ctx.beginPath(); ctx.moveTo(366, py + ph / 2); ctx.lineTo(352, py + ph / 2 - 12); ctx.lineTo(352, py + ph / 2 + 12); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // 第 3 頁: 站在幽靈頭上往上跳
  function guide3(ctx) {
    var sc = 1.1, pw = 560, ph = 640;
    var px = (W - pw) / 2, py = 280;
    panel(ctx, px, py, pw, ph, 30, 1280 - ph / sc, sc, function (c) {
      drawLevel(c);
      var g = { x: 260, y: 1144 };
      drawGhost(c, { x: g.x, y: g.y, facing: 1, state: 'idle', gen: 1, hookable: false });
      faded(c, 0.45, function () { drawPlayer(c, { x: g.x, y: g.y - 56, facing: 1, state: 'idle', gen: 2 }); });
      dashedPath(c, [[280, 1080], [280, 940]], C.player, 4);
      drawPlayer(c, { x: g.x, y: 870, facing: 1, state: 'air', gen: 2 });
      outlinedText(c, '踩頭', 380, 1100, 26, C.ghostHead);
      c.save();
      c.strokeStyle = C.ghostHead; c.lineWidth = 3;
      c.beginPath(); c.moveTo(352, 1104); c.lineTo(304, 1144); c.stroke();
      c.restore();
    });
    outlinedText(ctx, '只有頭頂那條亮線能站', W / 2, py + ph + 44, 26, C.ghostHead);
  }

  // 第 4 頁: 著地幽靈只甩一點 vs 空中幽靈甩上平台
  function guide4(ctx) {
    var sc = 0.75, pw = 320, ph = 600, py = 270;
    var wy = 1280 - ph / sc;
    // 左: 幽靈站在地上
    panel(ctx, 30, py, pw, ph, 0, wy, sc, function (c) {
      drawLevel(c);
      var g = { x: 240, y: 1144 }, p = { x: 40, y: 1080 };
      drawGhost(c, { x: g.x, y: g.y, facing: -1, state: 'idle', gen: 1, hookable: true });
      drawHook(c, { x1: p.x + 20, y1: p.y + 28, x2: g.x + 20, y2: g.y });
      drawPlayer(c, { x: p.x, y: p.y, facing: 1, state: 'hook', gen: 2 });
      dashedPath(c, [[g.x + 20, g.y - 4], [g.x + 40, 1000, g.x + 70, 1060]], C.player, 5);
      faded(c, 0.5, function () { drawPlayer(c, { x: g.x + 10, y: 1000, facing: 1, state: 'air', gen: 2 }); });
      markOk(c, 380, 950, false, 30);
    });
    // 右: 幽靈在半空
    panel(ctx, 370, py, pw, ph, 0, wy, sc, function (c) {
      drawLevel(c);
      var g = { x: 220, y: 1030 }, p = { x: 40, y: 1144 };
      dashedPath(c, [[g.x + 20, 1196], [g.x + 20, g.y + 60]], 'rgba(111,216,255,0.6)', 3);
      drawGhost(c, { x: g.x, y: g.y, facing: 1, state: 'air', gen: 1, hookable: true });
      drawHook(c, { x1: p.x + 20, y1: p.y + 28, x2: g.x + 20, y2: g.y });
      drawPlayer(c, { x: p.x, y: p.y, facing: 1, state: 'hook', gen: 2 });
      dashedPath(c, [[g.x + 20, g.y - 4], [g.x + 40, 700, 330, 800]], C.player, 5);
      drawPlayer(c, { x: 310, y: 804, facing: 1, state: 'idle', gen: 2 });
      markOk(c, 400, 760, true, 30);
    });
    outlinedText(ctx, '幽靈站著', 30 + pw / 2, py + ph + 40, 26, C.text);
    outlinedText(ctx, '只甩一點', 30 + pw / 2, py + ph + 80, 26, C.textDim);
    outlinedText(ctx, '幽靈在空中', 370 + pw / 2, py + ph + 40, 26, C.hook);
    outlinedText(ctx, '甩上高處', 370 + pw / 2, py + ph + 80, 26, C.text);
  }

  // 第 5 頁: 三人一列, 輪到 2 號 / 輪到 3 號
  function guide5(ctx) {
    var sc = 2;
    function row(y, gen, label) {
      ctx.save();
      ctx.fillStyle = 'rgba(31,38,64,0.6)';
      rr(ctx, 40, y, W - 80, 340, 16);
      ctx.fill();
      ctx.restore();
      outlinedText(ctx, label, W / 2, y + 36, 28, C.text);
      var names = { player: '現在的你', ghost: '幽靈', gone: '消失', wait: '等待' };
      var cols = { player: C.player, ghost: C.ghost, gone: C.textDim, wait: C.textDim };
      for (var k = 1; k <= 3; k++) {
        var cx = 140 + (k - 1) * 220;
        var kind = figKind(k, gen);
        ctx.save();
        ctx.fillStyle = kind === 'player' ? C.player : '#2a3150';
        ctx.beginPath(); ctx.arc(cx, y + 92, 22, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        outlinedText(ctx, String(k), cx, y + 93, 26, kind === 'player' ? C.eye : C.text);
        figIcon(ctx, cx - 20 * sc, y + 130, kind, sc);
        outlinedText(ctx, names[kind], cx, y + 300, 26, cols[kind]);
      }
    }
    row(260, 2, '輪到 2 號');
    row(640, 3, '輪到 3 號');
  }

  function drawGuidePage(ctx, s) {
    var page = Math.max(0, Math.min(PAGES.length - 1, (s && s.page) | 0));
    var P = PAGES[page];
    ctx.save();
    ctx.fillStyle = C.hudBg;
    ctx.fillRect(0, 0, W, H);
    outlinedText(ctx, '鉤影', W / 2, 60, 30, C.textDim);
    outlinedText(ctx, P.title, W / 2, 130, 44, C.text);
    outlinedText(ctx, P.text, W / 2, 196, 28, C.text, 'center', false);
    P.draw(ctx);
    // 頁碼點
    for (var i = 0; i < PAGES.length; i++) {
      ctx.fillStyle = i === page ? C.text : '#3a4260';
      ctx.beginPath(); ctx.arc(W / 2 - 64 + i * 32, 1150, i === page ? 9 : 7, 0, Math.PI * 2); ctx.fill();
    }
    var last = page === PAGES.length - 1;
    var label = last ? '開始遊戲' : '下一頁';
    ctx.font = font(26, true);
    var kw = ctx.measureText('空白鍵').width + 26;
    var total = kw + 14 + ctx.measureText(label).width;
    var kx = W / 2 - total / 2;
    keyCap(ctx, kx, 1192, '空白鍵', 22);
    ctx.font = font(26, true);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.text;
    ctx.fillText(label, kx + kw + 14, 1210);
    ctx.restore();
  }

  window.Art = {
    canvas: { width: W, height: H },
    palette: {
      bg: C.bg, hud: C.hudBg, ground: C.ground, platform: C.platformTop,
      player: C.player, ghost: C.ghost, hook: C.hook, spike: C.spike, goal: C.goal,
      text: C.text, textDim: C.textDim
    },
    drawBackground: drawBackground,
    drawPlatform: drawPlatform,
    drawSpike: drawSpike,
    drawGoal: drawGoal,
    drawGhost: drawGhost,
    drawHook: drawHook,
    drawPlayer: drawPlayer,
    drawHud: drawHud,
    drawGuidePage: drawGuidePage
  };
})();
