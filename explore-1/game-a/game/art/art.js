// 疊影 — 美術繪圖函式(全域 window.Art, 非 ES module)
// 只負責「給狀態、畫出來」; 不含任何遊戲邏輯
(function () {
  'use strict';

  var W = 720, H = 1280, HUD_H = 100;

  var palette = {
    bg: '#141a2e',          // 背景上緣
    bgLow: '#0b0f1c',       // 背景下緣(坑底更暗)
    hudBg: '#0a0d18',       // HUD 底板
    ground: '#4a5470',      // 實心地面本體
    groundTop: '#8a96b8',   // 地面上緣
    oneWay: '#6b7aa6',      // 單向平台本體
    oneWayTop: '#c9d4f2',   // 單向平台上緣(可站的邊)
    spike: '#ff3b4e',       // 尖刺(全畫面唯一的紅 = 危險)
    spikeDark: '#8a1020',
    goalPole: '#e8ecf6',
    goal: '#ffd23a',        // 終點旗(金黃)
    player: '#ff9a3c',      // 玩家本體(暖橘, 實心)
    playerDark: '#7a3a08',
    dead: '#6d7280',        // 死亡中的玩家
    ghost: '#4fe3ff',       // 幽靈(冷青, 半透明)
    ghostHead: '#e6fbff',   // 幽靈頭頂可站的那條邊
    path: '#4fe3ff',        // 幽靈路線
    text: '#eef2ff',
    textDim: '#8a93b0',
    good: '#6ee07a',        // 說明頁打勾
    bad: '#ff3b4e'          // 說明頁打叉(同危險紅)
  };

  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';

  // ---------- 小工具 ----------
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function text(ctx, s, x, y, size, color, align, weight) {
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size / 6);
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(s, x, y);
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }

  // 角色共用骨架: 40×56 框內, 身體 0~46, 腿 46~56
  // opt: { fill, stroke, dashed, eyes:'open'|'x', digit, digitColor, alpha }
  function figure(ctx, x, y, facing, pose, opt) {
    var f = facing === -1 ? -1 : 1;
    ctx.save();
    ctx.globalAlpha *= num(opt.alpha, 1);
    // 腿
    ctx.fillStyle = opt.fill;
    if (pose === 'run') {
      // 一前一後
      ctx.beginPath();
      ctx.moveTo(x + 14, y + 44); ctx.lineTo(x + 22, y + 44);
      ctx.lineTo(x + 20 + 12 * f - (f > 0 ? 0 : 0), y + 56); ctx.lineTo(x + 20 + 4 * f, y + 56);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 18, y + 44); ctx.lineTo(x + 26, y + 44);
      ctx.lineTo(x + 20 - 6 * f, y + 56); ctx.lineTo(x + 20 - 14 * f, y + 56);
      ctx.closePath(); ctx.fill();
    } else if (pose === 'air') {
      // 腿縮起
      ctx.fillRect(x + 9, y + 44, 8, 8);
      ctx.fillRect(x + 23, y + 44, 8, 8);
    } else {
      ctx.fillRect(x + 9, y + 44, 8, 12);
      ctx.fillRect(x + 23, y + 44, 8, 12);
    }
    // 身體
    rr(ctx, x + 1, y + 1, 38, 45, 12);
    ctx.fillStyle = opt.fill;
    ctx.fill();
    if (opt.stroke) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = opt.stroke;
      if (opt.dashed) ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // 眼睛(朝向側偏移)
    var ex = x + 20 + 6 * f;
    if (opt.eyes === 'x') {
      ctx.strokeStyle = '#1b1e28';
      ctx.lineWidth = 3;
      [ex - 7, ex + 5].forEach(function (cx) {
        ctx.beginPath();
        ctx.moveTo(cx - 3, y + 13); ctx.lineTo(cx + 3, y + 19);
        ctx.moveTo(cx + 3, y + 13); ctx.lineTo(cx - 3, y + 19);
        ctx.stroke();
      });
    } else {
      ctx.fillStyle = opt.eyeColor || '#1b1e28';
      var ey = pose === 'air' ? y + 12 : y + 15;
      ctx.fillRect(ex - 8, ey, 5, 8);
      ctx.fillRect(ex + 3, ey, 5, 8);
    }
    // 代數數字(小, 在胸口, 不壓眼睛)
    if (opt.digit) {
      ctx.font = 'bold 16px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = opt.digitColor;
      ctx.fillText(String(opt.digit), x + 20, y + 35);
    }
    ctx.restore();
  }

  function keycap(ctx, label, cx, cy, w, h) {
    ctx.save();
    rr(ctx, cx - w / 2, cy - h / 2, w, h, 8);
    ctx.fillStyle = '#e8ecf6';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#2a3150';
    ctx.stroke();
    ctx.font = 'bold ' + Math.min(26, h * 0.5) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#141a2e';
    ctx.fillText(label, cx, cy + 1);
    ctx.restore();
  }

  function mark(ctx, ok, cx, cy, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fill();
    ctx.lineWidth = r * 0.28;
    ctx.lineCap = 'round';
    ctx.strokeStyle = ok ? palette.good : palette.bad;
    ctx.stroke();
    ctx.beginPath();
    if (ok) {
      ctx.moveTo(cx - r * 0.45, cy); ctx.lineTo(cx - r * 0.1, cy + r * 0.38); ctx.lineTo(cx + r * 0.5, cy - r * 0.35);
    } else {
      ctx.moveTo(cx - r * 0.4, cy - r * 0.4); ctx.lineTo(cx + r * 0.4, cy + r * 0.4);
      ctx.moveTo(cx + r * 0.4, cy - r * 0.4); ctx.lineTo(cx - r * 0.4, cy + r * 0.4);
    }
    ctx.stroke();
    ctx.restore();
  }

  function arrow(ctx, x1, y1, x2, y2, color, width, dashed) {
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth = width || 4; ctx.lineCap = 'round';
    if (dashed) ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.setLineDash([]);
    var a = Math.atan2(y2 - y1, x2 - x1), s = 6 + (width || 4) * 2;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45));
    ctx.lineTo(x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45));
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // 拋物線虛線(起點 → 頂點 → 終點), 用二次曲線近似
  function arc3(ctx, x1, y1, xa, ya, x2, y2, color) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(xa, 2 * ya - (y1 + y2) / 2, x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- 遊戲物件 ----------
  function drawBackground(ctx) {
    ctx.save();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, palette.bg);
    g.addColorStop(1, palette.bgLow);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // 極淡的格線, 幫玩家目測高度(每 40px 一格, 不搶戲)
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var gx = 0; gx <= W; gx += 40) { ctx.moveTo(gx + 0.5, HUD_H); ctx.lineTo(gx + 0.5, H); }
    for (var gy = HUD_H; gy <= H; gy += 40) { ctx.moveTo(0, gy + 0.5); ctx.lineTo(W, gy + 0.5); }
    ctx.stroke();
    ctx.restore();
  }

  // h >= 48 視為實心地面, 否則為單向平台
  function drawPlatform(ctx, s) {
    var x = num(s.x, 0), y = num(s.y, 0), w = num(s.w, 0), h = num(s.h, 0);
    ctx.save();
    if (h >= 48) {
      ctx.fillStyle = palette.ground;
      ctx.fillRect(x, y, w, h);
      // 實心: 磚紋
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var ry = y + 20; ry < y + h; ry += 20) {
        ctx.moveTo(x, ry); ctx.lineTo(x + w, ry);
        var off = ((ry - y) / 20) % 2 ? 20 : 0;
        for (var rx = x + off; rx < x + w; rx += 40) { ctx.moveTo(rx, ry); ctx.lineTo(rx, ry + 20 > y + h ? y + h : ry + 20); }
      }
      ctx.stroke();
      ctx.fillStyle = palette.groundTop;
      ctx.fillRect(x, y, w, 6);
    } else {
      // 單向: 上緣實線亮邊(可站), 本體較淡, 下緣虛線(可穿過)
      ctx.fillStyle = palette.oneWay;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = palette.oneWayTop;
      ctx.fillRect(x, y, w, 6);
      ctx.strokeStyle = palette.oneWayTop;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.moveTo(x, y + h - 1); ctx.lineTo(x + w, y + h - 1); ctx.stroke();
      ctx.setLineDash([]);
      // 上指小箭頭紋: 從下方穿上來
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = palette.oneWayTop;
      for (var ax = x + 20; ax < x + w - 10; ax += 40) {
        ctx.beginPath();
        ctx.moveTo(ax, y + 9); ctx.lineTo(ax + 6, y + h - 5); ctx.lineTo(ax - 6, y + h - 5);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawSpike(ctx, s) {
    var x = num(s.x, 0), y = num(s.y, 0), w = num(s.w, 80), h = 24;
    ctx.save();
    var n = Math.max(1, Math.round(w / 16)), tw = w / n;
    for (var i = 0; i < n; i++) {
      var tx = x + i * tw;
      ctx.beginPath();
      ctx.moveTo(tx, y + h); ctx.lineTo(tx + tw / 2, y); ctx.lineTo(tx + tw, y + h);
      ctx.closePath();
      ctx.fillStyle = palette.spike; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(tx + tw / 2, y); ctx.lineTo(tx + tw, y + h); ctx.lineTo(tx + tw / 2, y + h);
      ctx.closePath();
      ctx.fillStyle = palette.spikeDark; ctx.fill();
    }
    ctx.restore();
  }

  function drawGoal(ctx, s) {
    var x = num(s.x, 0), y = num(s.y, 0);
    ctx.save();
    // 底座
    ctx.fillStyle = palette.goalPole;
    ctx.fillRect(x + 2, y + 74, 20, 6);
    // 旗桿
    ctx.fillRect(x + 9, y, 6, 76);
    // 旗面(三角, 金黃)
    ctx.beginPath();
    ctx.moveTo(x + 15, y + 4); ctx.lineTo(x + 48, y + 18); ctx.lineTo(x + 15, y + 34);
    ctx.closePath();
    ctx.fillStyle = palette.goal; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#8a6a00'; ctx.stroke();
    // 星
    ctx.fillStyle = '#fff6c8';
    ctx.beginPath(); ctx.arc(x + 4, y + 4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawGhostPath(ctx, s) {
    var pts = s && s.points;
    if (!pts || !pts.length) return;
    ctx.save();
    ctx.strokeStyle = palette.path;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.setLineDash([]);
    // 起點: 小方塊(第 0 幀)
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = palette.path;
    ctx.fillRect(pts[0].x - 5, pts[0].y - 5, 10, 10);
    // 終點: 小叉(死亡處, 播完會跳回起點)
    var e = pts[pts.length - 1];
    ctx.lineWidth = 3;
    ctx.strokeStyle = palette.path;
    ctx.beginPath();
    ctx.moveTo(e.x - 6, e.y - 6); ctx.lineTo(e.x + 6, e.y + 6);
    ctx.moveTo(e.x + 6, e.y - 6); ctx.lineTo(e.x - 6, e.y + 6);
    ctx.stroke();
    // 目前播放位置: 實心環
    var p = Math.max(0, Math.min(1, num(s.progress, 0))) * (pts.length - 1);
    var i0 = Math.floor(p), i1 = Math.min(pts.length - 1, i0 + 1), t = p - i0;
    var mx = pts[i0].x + (pts[i1].x - pts[i0].x) * t;
    var my = pts[i0].y + (pts[i1].y - pts[i0].y) * t;
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(mx, my, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#0b0f1c'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = palette.ghostHead; ctx.stroke();
    ctx.beginPath(); ctx.arc(mx, my, 3, 0, Math.PI * 2);
    ctx.fillStyle = palette.ghost; ctx.fill();
    ctx.restore();
  }

  function drawGhost(ctx, s) {
    var x = num(s.x, 0), y = num(s.y, 0);
    ctx.save();
    figure(ctx, x, y, s.facing, s.state, {
      fill: 'rgba(79,227,255,0.38)', stroke: palette.ghost, dashed: true,
      eyeColor: palette.ghostHead, digit: s.gen, digitColor: palette.ghostHead
    });
    // 頭頂可站的那條邊: 全身唯一實心不透明的部分
    ctx.fillStyle = palette.ghostHead;
    rr(ctx, x, y, 40, 5, 2.5);
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer(ctx, s) {
    var x = num(s.x, 0), y = num(s.y, 0);
    ctx.save();
    if (s.state === 'dead') {
      figure(ctx, x, y, s.facing, 'idle', {
        fill: palette.dead, stroke: '#3a3e4a', eyes: 'x', digit: s.gen, digitColor: '#2a2d36'
      });
    } else {
      figure(ctx, x, y, s.facing, s.state, {
        fill: palette.player, stroke: palette.playerDark, digit: s.gen, digitColor: palette.playerDark
      });
    }
    ctx.restore();
  }

  // 代數小人圖示(HUD 與說明頁共用): kind = 'now' | 'ghost' | 'gone' | 'left'
  function genIcon(ctx, cx, cy, n, kind) {
    var x = cx - 20, y = cy - 28;
    ctx.save();
    if (kind === 'now') {
      figure(ctx, x, y, 1, 'idle', { fill: palette.player, stroke: palette.playerDark, digit: n, digitColor: palette.playerDark });
    } else if (kind === 'dead') {
      figure(ctx, x, y, 1, 'idle', { fill: palette.dead, stroke: '#3a3e4a', eyes: 'x', digit: n, digitColor: '#2a2d36' });
    } else if (kind === 'ghost') {
      drawGhost(ctx, { x: x, y: y, facing: 1, state: 'idle', gen: n });
    } else if (kind === 'gone') {
      figure(ctx, x, y, 1, 'idle', { fill: 'rgba(138,147,176,0.12)', stroke: 'rgba(138,147,176,0.35)', dashed: true, eyeColor: 'rgba(138,147,176,0.3)', digit: n, digitColor: 'rgba(138,147,176,0.5)' });
    } else { // left: 還沒輪到
      figure(ctx, x, y, 1, 'idle', { fill: 'rgba(0,0,0,0)', stroke: palette.textDim, eyeColor: palette.textDim, digit: n, digitColor: palette.textDim });
    }
    ctx.restore();
  }

  function drawHud(ctx, s) {
    var gen = num(s.gen, 1), maxGen = num(s.maxGen, 3), phase = s.phase || 'play';
    ctx.save();
    ctx.fillStyle = palette.hudBg;
    ctx.fillRect(0, 0, W, HUD_H);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, HUD_H - 2, W, 2);

    // 代數列: 小人圖示, 位置固定
    for (var i = 1; i <= maxGen; i++) {
      var kind;
      if (i === gen) kind = (phase === 'dying' || phase === 'lose') ? 'dead' : 'now';
      else if (i === gen - 1) kind = 'ghost';
      else if (i < gen) kind = 'gone';
      else kind = 'left';
      genIcon(ctx, 44 + (i - 1) * 56, 52, i, kind);
    }
    text(ctx, '第 ' + gen + ' / ' + maxGen + ' 人', 200, 52, 26, palette.text, 'left');

    // 操作提示(固定在右側)
    keycap(ctx, 'R', 470, 32, 44, 32);
    text(ctx, '這一代重來', 504, 32, 18, palette.textDim, 'left');
    keycap(ctx, 'Backspace', 440, 72, 104, 32);
    text(ctx, '整關重來', 504, 72, 18, palette.textDim, 'left');
    ctx.restore();

    if (phase === 'win' || phase === 'lose') {
      ctx.save();
      ctx.fillStyle = 'rgba(5,7,14,0.72)';
      ctx.fillRect(0, 0, W, H);
      var win = phase === 'win';
      rr(ctx, 90, 470, 540, 320, 24);
      ctx.fillStyle = '#1c2340'; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = win ? palette.goal : palette.spike; ctx.stroke();
      text(ctx, win ? '過關!' : '失敗', W / 2, 560, 72, win ? palette.goal : palette.spike);
      text(ctx, win ? ('第 ' + gen + ' 人摸到旗子') : ('三個人都用完了'), W / 2, 640, 28, palette.text);
      keycap(ctx, '空白鍵', W / 2 - 70, 722, 120, 48);
      text(ctx, '重來', W / 2 + 30, 722, 28, palette.text, 'left');
      ctx.restore();
    }
  }

  // ---------- 說明頁 ----------
  var GUIDE = [
    { title: '走到旗子', body: '←→ 走、空白鍵跳, 摸到旗子過關' },
    { title: '死了會變幽靈', body: '死掉的你會一直重演剛才的動作' },
    { title: '踩幽靈', body: '幽靈的頭可以踩' },
    { title: '只有三個人', body: '共三人, 只看得到上一個人的幽靈' },
    { title: '重來', body: 'R 這一代重來, Backspace 整關重來' }
  ];

  // 在 (px,py,pw,ph) 的框裡, 以 scale 畫世界座標的一塊(原點 wx,wy)
  function panel(ctx, px, py, pw, ph, wx, wy, scale, fn) {
    ctx.save();
    rr(ctx, px, py, pw, ph, 16);
    ctx.fillStyle = palette.bg; ctx.fill();
    ctx.clip();
    ctx.translate(px, py);
    ctx.scale(scale, scale);
    ctx.translate(-wx, -wy);
    fn();
    ctx.restore();
    ctx.save();
    rr(ctx, px, py, pw, ph, 16);
    ctx.lineWidth = 3; ctx.strokeStyle = '#2f3858'; ctx.stroke();
    ctx.restore();
  }

  function levelBase(ctx) {
    drawPlatform(ctx, { x: 0, y: 1200, w: 600, h: 80 });
    drawPlatform(ctx, { x: 0, y: 1000, w: 480, h: 24 });
    drawSpike(ctx, { x: 0, y: 976, w: 80 });
    drawPlatform(ctx, { x: 300, y: 800, w: 420, h: 24 });
    drawGoal(ctx, { x: 640, y: 720 });
  }

  var guidePages = [
    // 1 走到旗子
    function (ctx) {
      panel(ctx, 30, 300, 660, 620, 0, 680, 660 / 720, function () {
        levelBase(ctx);
        drawPlayer(ctx, { x: 60, y: 1144, facing: 1, state: 'idle', gen: 1 });
      });
      var sc = 660 / 720, ox = 30, oy = 300 - 680 * sc;
      // 角色旁的按鍵
      var pcx = ox + 80 * sc, pty = oy + 1144 * sc;
      keycap(ctx, '←', pcx - 30, pty - 50, 44, 40);
      keycap(ctx, '→', pcx + 22, pty - 50, 44, 40);
      keycap(ctx, '空白鍵', pcx + 130, pty - 50, 110, 40);
      text(ctx, '走', pcx - 4, pty - 92, 22, palette.text);
      text(ctx, '跳', pcx + 130, pty - 92, 22, palette.text);
      // 指向旗子
      var gx = ox + 664 * sc, gy = oy + 720 * sc;
      text(ctx, '摸到旗子', gx - 100, gy + 24, 24, palette.goal);
    },
    // 2 死了會變幽靈
    function (ctx) {
      // 左格: 掉進坑
      panel(ctx, 30, 300, 320, 440, 380, 880, 320 / 340, function () {
        drawPlatform(ctx, { x: 0, y: 1200, w: 600, h: 80 });
        drawPlayer(ctx, { x: 540, y: 1144, facing: 1, state: 'run', gen: 1 });
        drawPlayer(ctx, { x: 640, y: 1214, facing: 1, state: 'dead', gen: 1 });
      });
      var s1 = 320 / 340;
      arrow(ctx, 30 + (585 - 380) * s1, 300 + (1150 - 880) * s1, 30 + (650 - 380) * s1, 300 + (1205 - 880) * s1, palette.textDim, 4, true);
      text(ctx, '第 1 人', 190, 340, 24, palette.text);
      // 中間箭頭
      arrow(ctx, 352, 520, 368, 520, palette.textDim, 4);
      // 右格: 新角色 + 幽靈 + 路線
      panel(ctx, 370, 300, 320, 440, 0, 880, 320 / 340, function () {
        drawPlatform(ctx, { x: 0, y: 1200, w: 600, h: 80 });
        var pts = [];
        for (var i = 0; i <= 20; i++) pts.push({ x: 80 + i * 13, y: 1200 });
        for (var j = 1; j <= 6; j++) pts.push({ x: 340 + j * 10, y: 1200 - (j * 30 - j * j * 3.2) });
        drawGhostPath(ctx, { points: pts, progress: 0.55 });
        var gp = pts[Math.round(0.55 * (pts.length - 1))];
        drawGhost(ctx, { x: gp.x - 20, y: gp.y - 56, facing: 1, state: 'run', gen: 1 });
        drawPlayer(ctx, { x: 60, y: 1144, facing: 1, state: 'idle', gen: 2 });
      });
      text(ctx, '第 2 人', 530, 340, 24, palette.text);
      text(ctx, '虛線 = 上一人走過的路', 360, 790, 22, palette.ghost);
    },
    // 3 踩幽靈
    function (ctx) {
      var sc = 320 / 260;
      // 左格: 踩幽靈 → 上得去
      panel(ctx, 30, 300, 320, 600, 0, 840, sc, function () {
        drawPlatform(ctx, { x: 0, y: 1200, w: 260, h: 80 });
        drawPlatform(ctx, { x: 60, y: 1000, w: 200, h: 24 });
        drawGhost(ctx, { x: 40, y: 1144, facing: 1, state: 'idle', gen: 1 });
        // 頭頂 1144, 最高再 +168 → 腳底 976 (高過平台 1000)
        arc3(ctx, 60, 1144, 110, 976, 160, 1000, palette.player);
        drawPlayer(ctx, { x: 40, y: 1088, facing: 1, state: 'idle', gen: 2 });
        drawPlayer(ctx, { x: 140, y: 944, facing: 1, state: 'idle', gen: 2 });
      });
      mark(ctx, true, 300, 360, 30);
      // 右格: 直接跳 → 碰不到
      panel(ctx, 370, 300, 320, 600, 0, 840, sc, function () {
        drawPlatform(ctx, { x: 0, y: 1200, w: 260, h: 80 });
        drawPlatform(ctx, { x: 60, y: 1000, w: 200, h: 24 });
        // 地面 1200, 最高 +168 → 腳底 1032 (低於平台 1000)
        arc3(ctx, 60, 1200, 110, 1032, 160, 1200, palette.player);
        drawPlayer(ctx, { x: 40, y: 1144, facing: 1, state: 'idle', gen: 2 });
        drawPlayer(ctx, { x: 90, y: 976, facing: 1, state: 'air', gen: 2 });
      });
      mark(ctx, false, 640, 360, 30);
      text(ctx, '踩頭再跳', 190, 940, 26, palette.text);
      text(ctx, '直接跳', 530, 940, 26, palette.text);
    },
    // 4 只有三個人
    function (ctx) {
      var rows = [
        { y: 400, label: '輪到 1 號', kinds: ['now', 'left', 'left'] },
        { y: 600, label: '輪到 2 號', kinds: ['ghost', 'now', 'left'] },
        { y: 800, label: '輪到 3 號', kinds: ['gone', 'ghost', 'now'] }
      ];
      rows.forEach(function (r) {
        ctx.save();
        rr(ctx, 30, r.y - 80, 660, 160, 16);
        ctx.fillStyle = palette.bg; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = '#2f3858'; ctx.stroke();
        ctx.restore();
        text(ctx, r.label, 130, r.y, 26, palette.text);
        for (var i = 0; i < 3; i++) {
          ctx.save();
          var cx = 330 + i * 130, cy = r.y + 8;
          ctx.translate(cx, cy); ctx.scale(1.5, 1.5); ctx.translate(-cx, -cy);
          genIcon(ctx, cx, cy, i + 1, r.kinds[i]);
          ctx.restore();
        }
      });
      text(ctx, '消失', 330, 880 + 26, 22, palette.textDim);
      text(ctx, '幽靈', 460, 880 + 26, 22, palette.ghost);
      text(ctx, '你', 590, 880 + 26, 22, palette.player);
    },
    // 5 重來
    function (ctx) {
      var sc = 400 / 480;
      // R: 角色回出生點, 幽靈仍在
      keycap(ctx, 'R', 120, 480, 120, 90);
      panel(ctx, 230, 320, 460, 320, 0, 960, sc, function () {
        drawPlatform(ctx, { x: 0, y: 1200, w: 600, h: 80 });
        drawPlatform(ctx, { x: 0, y: 1000, w: 480, h: 24 });
        drawSpike(ctx, { x: 0, y: 976, w: 80 });
        var pts = [];
        for (var i = 0; i <= 14; i++) pts.push({ x: 80 + i * 18, y: 1200 });
        drawGhostPath(ctx, { points: pts, progress: 0.7 });
        drawGhost(ctx, { x: 80 + 0.7 * 14 * 18 - 20, y: 1144, facing: 1, state: 'run', gen: 1 });
        ctx.save(); ctx.globalAlpha = 0.3;
        drawPlayer(ctx, { x: 440, y: 1144, facing: 1, state: 'idle', gen: 2 });
        ctx.restore();
        arrow(ctx, 430, 1130, 120, 1130, palette.text, 5, true);
        drawPlayer(ctx, { x: 60, y: 1144, facing: 1, state: 'idle', gen: 2 });
      });
      text(ctx, '這一代重來', 120, 570, 22, palette.text);
      // Backspace: 回到只剩 1 號
      keycap(ctx, 'Backspace', 120, 820, 170, 90);
      panel(ctx, 230, 660, 460, 320, 0, 960, sc, function () {
        drawPlatform(ctx, { x: 0, y: 1200, w: 600, h: 80 });
        drawPlatform(ctx, { x: 0, y: 1000, w: 480, h: 24 });
        drawSpike(ctx, { x: 0, y: 976, w: 80 });
        drawPlayer(ctx, { x: 60, y: 1144, facing: 1, state: 'idle', gen: 1 });
      });
      text(ctx, '整關重來', 120, 910, 22, palette.text);
    }
  ];

  function drawGuidePage(ctx, s) {
    var page = Math.max(0, Math.min(GUIDE.length - 1, num(s && s.page, 0)));
    var g = GUIDE[page];
    ctx.save();
    drawBackground(ctx);
    ctx.fillStyle = 'rgba(5,7,14,0.5)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, '疊影', W / 2, 80, 40, palette.ghost);
    text(ctx, (page + 1) + ' / ' + GUIDE.length + '  ' + g.title, W / 2, 160, 40, palette.text);
    text(ctx, g.body, W / 2, 232, 28, palette.text, 'center', 'normal');
    ctx.restore();

    ctx.save();
    guidePages[page](ctx);
    ctx.restore();

    ctx.save();
    var last = page === GUIDE.length - 1;
    keycap(ctx, '空白鍵', W / 2 - 80, 1150, 130, 56);
    text(ctx, last ? '開始遊戲' : '下一頁', W / 2 + 0, 1150, 30, palette.text, 'left');
    // 頁碼點
    for (var i = 0; i < GUIDE.length; i++) {
      ctx.beginPath();
      ctx.arc(W / 2 - 48 + i * 24, 1220, 6, 0, Math.PI * 2);
      ctx.fillStyle = i === page ? palette.text : '#3a4262';
      ctx.fill();
    }
    ctx.restore();
  }

  window.Art = {
    canvas: { width: W, height: H },
    palette: palette,
    drawBackground: drawBackground,
    drawPlatform: drawPlatform,
    drawSpike: drawSpike,
    drawGoal: drawGoal,
    drawGhostPath: drawGhostPath,
    drawGhost: drawGhost,
    drawPlayer: drawPlayer,
    drawHud: drawHud,
    drawGuidePage: drawGuidePage
  };
})();
