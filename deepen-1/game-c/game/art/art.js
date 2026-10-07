// 升降接力 美術 — Canvas 2D 幾何繪製, 無外部資源
// 全域 window.Art; 每個函式自己 save/restore
(function () {
  'use strict';

  var W = 720, H = 1280;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';

  var P = {
    bg: '#121827',
    bgLow: '#07090f',
    hudBg: '#0b1020',
    hudLine: '#2a3350',
    ground: '#3c4660',
    groundTop: '#8794b5',
    ledge: '#46516e',
    ledgeTop: '#b3c0de',
    spike: '#ff4a5a',
    spikeBase: '#5a1c24',
    lift: '#3fd97a',
    liftDim: '#1f6b3e',
    gate: '#9a4dff',
    gateDim: '#4a2380',
    goalPole: '#e8ecf5',
    goalLight: '#ffffff',
    goalDark: '#1a1f2e',
    player: '#eef3ff',
    ink: '#1a2033',
    dead: '#6b7186',
    ghost: '#9cc8ff',
    ghostHead: '#f2f8ff',
    path: '#9cc8ff',
    hook: '#ffe14a',
    text: '#eef3ff',
    textDim: '#8a94b0',
    lose: '#ff4a5a',
    panel: '#0e1424'
  };

  // ---------- 共用小工具 ----------
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
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

  function text(ctx, s, x, y, size, color, align, weight, outline) {
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    if (outline) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, size / 6);
      ctx.strokeStyle = outline;
      ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }

  function arrow(ctx, x1, y1, x2, y2, color, lw) {
    var a = Math.atan2(y2 - y1, x2 - x1);
    var head = lw * 3;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // 深色襯底
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = lw + 4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - Math.cos(a) * head * 0.6, y2 - Math.sin(a) * head * 0.6);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(a - 0.5) * head, y2 - Math.sin(a - 0.5) * head);
    ctx.lineTo(x2 - Math.cos(a + 0.5) * head, y2 - Math.sin(a + 0.5) * head);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }

  function markCheck(ctx, cx, cy, s) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.5, cy);
    ctx.lineTo(cx - s * 0.1, cy + s * 0.4);
    ctx.lineTo(cx + s * 0.55, cy - s * 0.45);
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = s * 0.32;
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = s * 0.18;
    ctx.stroke();
    ctx.restore();
  }

  function markCross(ctx, cx, cy, s) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.45, cy - s * 0.45);
    ctx.lineTo(cx + s * 0.45, cy + s * 0.45);
    ctx.moveTo(cx + s * 0.45, cy - s * 0.45);
    ctx.lineTo(cx - s * 0.45, cy + s * 0.45);
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = s * 0.32;
    ctx.stroke();
    ctx.strokeStyle = P.lose;
    ctx.lineWidth = s * 0.18;
    ctx.stroke();
    ctx.restore();
  }

  function keycap(ctx, x, y, label, w) {
    w = w || 56;
    ctx.save();
    rr(ctx, x, y, w, 50, 10);
    ctx.fillStyle = '#1c2438';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = P.text;
    ctx.stroke();
    text(ctx, label, x + w / 2, y + 26, 26, P.text, 'center');
    ctx.restore();
  }

  // 鉤爪圖示(HUD 與說明頁共用); filled = 還有次數
  function hookIcon(ctx, cx, cy, filled) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = filled ? 'rgba(255,225,74,0.18)' : 'rgba(0,0,0,0.3)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = filled ? P.hook : '#3a4260';
    if (!filled) ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    // 鉤形: 一根柄 + 兩支爪
    ctx.strokeStyle = filled ? P.hook : '#4a5272';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 12);
    ctx.lineTo(cx + 4, cy - 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 10);
    ctx.lineTo(cx + 6, cy - 6);
    ctx.lineTo(cx + 10, cy + 4);
    ctx.stroke();
    ctx.restore();
  }

  // 角色剪影(玩家 / 幽靈共用骨架, 40 x 56, 不超出框)
  function figure(ctx, x, y, facing, st, gen, mode, hookable) {
    var f = facing === -1 ? -1 : 1;
    var isGhost = mode === 'ghost';
    var isDead = !isGhost && st === 'dead';
    ctx.save();

    if (isGhost && hookable) {
      // 可鉤: 黃色外光 + 黃色實線輪廓
      ctx.save();
      ctx.shadowColor = P.hook;
      ctx.shadowBlur = 22;
      rr(ctx, x + 1.5, y + 1.5, 37, 53, 9);
      ctx.strokeStyle = P.hook;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.stroke();
      ctx.restore();
    }

    // 本體
    rr(ctx, x, y, 40, 56, 10);
    if (isGhost) {
      ctx.globalAlpha = hookable ? 0.55 : 0.4;
      ctx.fillStyle = P.ghost;
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = isDead ? P.dead : P.player;
      ctx.fill();
    }

    // 腳: 底部兩塊, 依狀態變形
    var footY = y + 47, footH = 9, fl = x + 7, fr = x + 23, fw = 10;
    if (st === 'run') {
      fl += f * 3; fr += f * 3;
    } else if (st === 'air' || st === 'hook') {
      footY = y + 42; footH = 8; fl = x + 9; fr = x + 21;
    }
    ctx.fillStyle = isGhost ? 'rgba(20,32,60,0.55)' : (isDead ? '#3c4152' : '#3b4566');
    if (st === 'run') {
      // 前腳著地、後腳抬
      var back = f === 1 ? fl : fr, front = f === 1 ? fr : fl;
      ctx.fillRect(front, y + 47, fw, 9);
      ctx.fillRect(back, y + 43, fw, 8);
    } else {
      ctx.fillRect(fl, footY, fw, footH);
      ctx.fillRect(fr, footY, fw, footH);
    }

    // 手: 鉤爪拉動中兩手往上
    if (st === 'hook') {
      ctx.strokeStyle = isGhost ? 'rgba(20,32,60,0.7)' : '#3b4566';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 30); ctx.lineTo(x + 7, y + 6);
      ctx.moveTo(x + 30, y + 30); ctx.lineTo(x + 33, y + 6);
      ctx.stroke();
    }

    // 眼睛: 朝向
    var ecx = x + 20 + f * 6;
    if (isDead) {
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      [ecx - 6, ecx + 6].forEach(function (ex) {
        ctx.moveTo(ex - 3, y + 15); ctx.lineTo(ex + 3, y + 21);
        ctx.moveTo(ex + 3, y + 15); ctx.lineTo(ex - 3, y + 21);
      });
      ctx.stroke();
    } else {
      ctx.fillStyle = isGhost ? 'rgba(14,22,44,0.8)' : P.ink;
      ctx.fillRect(ecx - 7, y + 13, 4, 9);
      ctx.fillRect(ecx + 3, y + 13, 4, 9);
    }

    // 代數
    if (gen) {
      text(ctx, String(gen), x + 20, y + 34, 15, isGhost ? '#ffffff' : P.ink, 'center');
    }

    // 輪廓(內縮, 畫面邊界 = 判定邊界)
    rr(ctx, x + 1, y + 1, 38, 54, 9);
    ctx.lineWidth = 2;
    if (isGhost) {
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = hookable ? P.hook : 'rgba(156,200,255,0.95)';
      ctx.stroke();
      ctx.setLineDash([]);
      // 頭頂: 唯一能站的邊, 實線亮條
      ctx.fillStyle = P.ghostHead;
      ctx.fillRect(x + 3, y, 34, 4);
    } else {
      ctx.strokeStyle = isDead ? P.lose : (st === 'hook' ? P.hook : '#0b0f1a');
      ctx.stroke();
    }
    ctx.restore();
  }

  // 說明頁: 已消失的那一代(虛線, 淡)
  function vanished(ctx, x, y, gen) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    rr(ctx, x + 1, y + 1, 38, 54, 9);
    ctx.setLineDash([4, 5]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = P.textDim;
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, String(gen), x + 20, y + 34, 15, P.textDim, 'center');
    ctx.restore();
  }

  // ---------- 匯出 ----------
  var Art = {
    canvas: { width: W, height: H },
    palette: P,

    drawBackground: function (ctx) {
      ctx.save();
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#161d30');
      g.addColorStop(0.75, P.bg);
      g.addColorStop(1, P.bgLow);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // 淡格點
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (var gy = 140; gy < 1200; gy += 40) {
        for (var gx = 20; gx < W; gx += 40) ctx.fillRect(gx, gy, 2, 2);
      }
      // 坑底深淵
      var v = ctx.createLinearGradient(0, 1200, 0, H);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 1200, W, 80);
      // HUD 帶
      ctx.fillStyle = P.hudBg;
      ctx.fillRect(0, 0, W, 100);
      ctx.fillStyle = P.hudLine;
      ctx.fillRect(0, 98, W, 2);
      ctx.restore();
    },

    drawPlatform: function (ctx, s) {
      var x = s.x, y = s.y, w = s.w, h = s.h;
      ctx.save();
      if (h >= 48) {
        // 實心地面
        ctx.fillStyle = P.ground;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = P.groundTop;
        ctx.fillRect(x, y, w, 5);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (var i = x + 30; i < x + w; i += 60) {
          ctx.moveTo(i, y + 5); ctx.lineTo(i - 20, y + h);
        }
        ctx.stroke();
      } else {
        // 單向平台: 實頂 + 虛線底(可從下穿過)
        ctx.fillStyle = P.ledge;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = P.ledgeTop;
        ctx.fillRect(x, y, w, 5);
        ctx.strokeStyle = 'rgba(179,192,222,0.55)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(x, y + h - 1);
        ctx.lineTo(x + w, y + h - 1);
        ctx.stroke();
      }
      ctx.restore();
    },

    drawSpike: function (ctx, s) {
      var x = s.x, y = s.y, w = s.w || 60, h = 24;
      ctx.save();
      ctx.fillStyle = P.spikeBase;
      ctx.fillRect(x, y + h - 5, w, 5);
      var n = Math.max(1, Math.round(w / 15)), tw = w / n;
      ctx.beginPath();
      for (var i = 0; i < n; i++) {
        ctx.moveTo(x + i * tw, y + h - 4);
        ctx.lineTo(x + i * tw + tw / 2, y);
        ctx.lineTo(x + (i + 1) * tw, y + h - 4);
      }
      ctx.closePath();
      ctx.fillStyle = P.spike;
      ctx.fill();
      ctx.strokeStyle = '#7a1420';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    },

    drawPlate: function (ctx, s) {
      var x = s.x, y = s.y, w = 80, h = 12;
      var lift = s.kind === 'lift';
      var c = lift ? P.lift : P.gate, cd = lift ? P.liftDim : P.gateDim;
      ctx.save();
      // 槽
      ctx.fillStyle = '#0a0d16';
      ctx.fillRect(x, y, w, h);
      var capY = s.pressed ? y + 6 : y, capH = s.pressed ? 6 : 12;
      if (s.pressed) {
        ctx.shadowColor = c;
        ctx.shadowBlur = 16;
      }
      ctx.fillStyle = s.pressed ? c : cd;
      ctx.fillRect(x + 2, capY, w - 4, capH);
      ctx.shadowBlur = 0;
      ctx.fillStyle = c;
      ctx.fillRect(x + 2, capY, w - 4, 2);
      // 種類記號: 升降台 = 上箭頭, 門 = 兩根門柱
      var ic = s.pressed ? P.ink : c, cx = x + w / 2, mid = capY + capH / 2, ih = capH - 4;
      ctx.fillStyle = ic;
      if (lift) {
        ctx.beginPath();
        ctx.moveTo(cx, mid - ih / 2);
        ctx.lineTo(cx + ih, mid + ih / 2);
        ctx.lineTo(cx - ih, mid + ih / 2);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(cx - 6, mid - ih / 2, 3, ih);
        ctx.fillRect(cx + 3, mid - ih / 2, 3, ih);
      }
      ctx.restore();
    },

    drawLift: function (ctx, s) {
      var x = s.x, y = s.y, w = 120, h = 24, act = !!s.active;
      ctx.save();
      // 軌道(全程 780~1224, 淡虛線)
      ctx.strokeStyle = act ? 'rgba(63,217,122,0.4)' : 'rgba(63,217,122,0.18)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(x + 3, 780); ctx.lineTo(x + 3, 1224);
      ctx.moveTo(x + w - 3, 780); ctx.lineTo(x + w - 3, 1224);
      ctx.stroke();
      ctx.setLineDash([]);
      // 本體
      if (act) { ctx.shadowColor = P.lift; ctx.shadowBlur = 18; }
      rr(ctx, x, y, w, h, 4);
      ctx.fillStyle = act ? P.lift : P.liftDim;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = act ? '#c8ffdc' : P.lift;
      ctx.fillRect(x + 2, y, w - 4, 4);
      // 上箭頭紋
      ctx.fillStyle = act ? P.ink : 'rgba(63,217,122,0.55)';
      for (var i = 0; i < 3; i++) {
        var cx = x + 30 + i * 30;
        ctx.beginPath();
        ctx.moveTo(cx, y + 8);
        ctx.lineTo(cx + 9, y + 19);
        ctx.lineTo(cx - 9, y + 19);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },

    drawGate: function (ctx, s) {
      var x = s.x, y = s.y, w = 24, h = 220;
      ctx.save();
      if (!s.open) {
        ctx.fillStyle = P.gate;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = P.gateDim;
        for (var i = y + 14; i < y + h - 8; i += 22) ctx.fillRect(x + 3, i, w - 6, 8);
        ctx.strokeStyle = '#2a1238';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      } else {
        // 開: 只剩虛線框 + 上下門軸
        ctx.fillStyle = 'rgba(154,77,255,0.1)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(154,77,255,0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        ctx.setLineDash([]);
        ctx.fillStyle = P.gate;
        ctx.fillRect(x, y, w, 8);
        ctx.fillRect(x, y + h - 8, w, 8);
      }
      ctx.restore();
    },

    drawGoal: function (ctx, s) {
      var x = s.x, y = s.y;
      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.6)';
      ctx.shadowBlur = 14;
      ctx.fillStyle = P.goalPole;
      ctx.fillRect(x + 4, y, 5, 80);
      ctx.shadowBlur = 0;
      ctx.fillRect(x, y + 75, 16, 5);
      // 方格旗面 40 x 32
      var fx = x + 9, fy = y + 2, sq = 8;
      for (var r = 0; r < 4; r++) {
        for (var c = 0; c < 5; c++) {
          ctx.fillStyle = (r + c) % 2 ? P.goalDark : P.goalLight;
          ctx.fillRect(fx + c * sq, fy + r * sq, sq, sq);
        }
      }
      ctx.strokeStyle = P.goalPole;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(fx, fy, 39, 32);
      ctx.restore();
    },

    drawGhostPath: function (ctx, s) {
      var pts = s.points || [];
      if (pts.length < 1) return;
      ctx.save();
      var n = pts.length, step = Math.max(1, Math.floor(n / 600));
      if (n >= 2) {
        ctx.strokeStyle = 'rgba(156,200,255,0.45)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([3, 9]);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (var i = step; i < n; i += step) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[n - 1].x, pts[n - 1].y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      var k = Math.max(0, Math.min(n - 1, s.progress | 0));
      var p = pts[k];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = P.ghostHead;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = P.ghostHead;
      ctx.fill();
      ctx.restore();
    },

    drawGhost: function (ctx, s) {
      figure(ctx, s.x, s.y, s.facing, s.state, s.gen, 'ghost', !!s.hookable);
    },

    drawHook: function (ctx, s) {
      var x1 = s.x1, y1 = s.y1, x2 = s.x2, y2 = s.y2;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = P.hook;
      ctx.lineWidth = 3;
      ctx.stroke();
      // 爪
      var a = Math.atan2(y2 - y1, x2 - x1);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 + Math.cos(a + 2.4) * 10, y2 + Math.sin(a + 2.4) * 10);
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 + Math.cos(a - 2.4) * 10, y2 + Math.sin(a - 2.4) * 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x2, y2, 4, 0, Math.PI * 2);
      ctx.fillStyle = P.hook;
      ctx.fill();
      ctx.restore();
    },

    drawPlayer: function (ctx, s) {
      figure(ctx, s.x, s.y, s.facing, s.state, s.gen, 'player', false);
    },

    drawHud: function (ctx, s) {
      var gen = s.gen || 1, maxGen = s.maxGen || 3, phase = s.phase || 'play';
      ctx.save();
      if (phase === 'lose') {
        ctx.fillStyle = 'rgba(5,7,12,0.78)';
        ctx.fillRect(0, 0, W, H);
        text(ctx, '失敗', W / 2, 520, 88, P.lose, 'center', 'bold', '#000');
        text(ctx, maxGen + ' 個人都倒下了', W / 2, 620, 32, P.text, 'center', 'bold', '#000');
        text(ctx, '空白鍵 重來', W / 2, 720, 34, P.text, 'center', 'bold', '#000');
        ctx.restore();
        return;
      }
      ctx.fillStyle = P.hudBg;
      ctx.fillRect(0, 0, W, 100);
      ctx.fillStyle = P.hudLine;
      ctx.fillRect(0, 98, W, 2);

      if (phase === 'win') {
        text(ctx, '過關!', W / 2, 36, 40, P.text, 'center');
        text(ctx, '三代合力回放 · 空白鍵 重來', W / 2, 78, 22, P.textDim, 'center');
        ctx.restore();
        return;
      }

      // 代數圖示: 縮小的人形
      for (var i = 1; i <= maxGen; i++) {
        var ix = 24 + (i - 1) * 34, iy = 14;
        ctx.save();
        ctx.translate(ix, iy);
        ctx.scale(0.5, 0.5);
        if (i === gen) figure(ctx, 0, 0, 1, 'idle', i, 'player', false);
        else if (i === gen - 1) figure(ctx, 0, 0, 1, 'idle', i, 'ghost', false);
        else if (i < gen - 1) vanished(ctx, 0, 0, i);
        else {
          rr(ctx, 1, 1, 38, 54, 9);
          ctx.strokeStyle = '#3a4260';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        ctx.restore();
      }
      text(ctx, '第 ' + gen + ' 人', 24 + maxGen * 34 + 10, 28, 28, P.text, 'left');
      text(ctx, '/ ' + maxGen, 24 + maxGen * 34 + 104, 30, 22, P.textDim, 'left');

      // 鉤爪次數
      var hm = s.hookMax || 1, hl = s.hookLeft || 0;
      text(ctx, '鉤爪', W - 40 - hm * 52, 28, 22, P.textDim, 'right');
      for (var k = 0; k < hm; k++) hookIcon(ctx, W - 46 - k * 52, 28, k < hl);

      // 第二列: 操作提示 / 死亡提示
      if (phase === 'dying') {
        text(ctx, '倒下了 → 變成幽靈, 換下一個人', W / 2, 78, 22, P.text, 'center');
      } else {
        text(ctx, '←→ 走 · 空白 跳 · Z 鉤 · R 整關重來', W / 2, 78, 19, P.textDim, 'center', 'normal');
      }
      ctx.restore();
    }
  };

  // ---------- 說明頁 ----------
  var GUIDE = [
    { title: '走到旗子', body: '←→ 走、空白鍵跳、R 整關重來' },
    { title: '先死一次', body: '一個人到不了, 要先死一次' },
    { title: '死了變幽靈', body: '死掉的你會照路線一直重演' },
    { title: '踩幽靈', body: '幽靈的頭能站, 還會載著你走' },
    { title: '鉤幽靈', body: '幽靈發光時按 Z, 每人一次' },
    { title: '開關', body: '有人踩住, 同色的東西才會動' },
    { title: '只看得見上一個人', body: '共三人, 只看得見上一個的幽靈' }
  ];

  // 在面板裡用遊戲座標畫一段場景
  function scene(ctx, px, py, pw, ph, wx, wy, ww, wh, fn) {
    ctx.save();
    rr(ctx, px, py, pw, ph, 14);
    ctx.fillStyle = P.panel;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = P.hudLine;
    ctx.stroke();
    rr(ctx, px, py, pw, ph, 14);
    ctx.clip();
    var s = Math.min(pw / ww, ph / wh);
    ctx.translate(px + (pw - ww * s) / 2, py + (ph - wh * s) / 2);
    ctx.scale(s, s);
    ctx.translate(-wx, -wy);
    ctx.fillStyle = P.bg;
    ctx.fillRect(wx, wy, ww, wh);
    fn(s);
    ctx.restore();
  }

  function levelBase(ctx, opt) {
    opt = opt || {};
    Art.drawPlatform(ctx, { x: 0, y: 1200, w: 600, h: 80 });
    Art.drawPlatform(ctx, { x: 0, y: 780, w: 480, h: 24 });
    Art.drawPlatform(ctx, { x: 240, y: 360, w: 480, h: 24 });
    Art.drawSpike(ctx, { x: 0, y: 756, w: 60 });
    Art.drawPlate(ctx, { x: 160, y: 1188, pressed: !!opt.liftPressed, kind: 'lift' });
    Art.drawPlate(ctx, { x: 80, y: 768, pressed: !!opt.gatePressed, kind: 'gate' });
    Art.drawLift(ctx, { x: 480, y: opt.liftY || 1200, active: !!opt.liftPressed });
    Art.drawGate(ctx, { x: 560, y: 140, open: !!opt.gatePressed });
    Art.drawGoal(ctx, { x: 640, y: 280 });
  }

  function caption(ctx, s, x, y) {
    text(ctx, s, x, y, 26, P.text, 'center');
  }

  var PAGES = [
    // 1 走到旗子
    function (ctx) {
      scene(ctx, 40, 210, 640, 920, 0, 100, 720, 1180, function () {
        levelBase(ctx);
        Art.drawPlayer(ctx, { x: 60, y: 1144, facing: 1, state: 'idle', gen: 1 });
        // 終點圈
        ctx.save();
        ctx.beginPath();
        ctx.arc(664, 320, 62, 0, Math.PI * 2);
        ctx.setLineDash([10, 8]);
        ctx.lineWidth = 5;
        ctx.strokeStyle = P.text;
        ctx.stroke();
        ctx.restore();
        text(ctx, '終點', 664, 410, 34, P.text, 'center', 'bold', '#000');
        // 按鍵
        keycap(ctx, 30, 940, '←', 64);
        keycap(ctx, 102, 940, '→', 64);
        keycap(ctx, 190, 940, '空白', 100);
        keycap(ctx, 316, 940, 'R', 64);
        text(ctx, '走', 98, 1020, 30, P.text, 'center', 'bold', '#000');
        text(ctx, '跳', 240, 1020, 30, P.text, 'center', 'bold', '#000');
        text(ctx, '重來', 348, 1020, 30, P.text, 'center', 'bold', '#000');
        arrow(ctx, 120, 1060, 90, 1130, P.text, 4);
      });
    },
    // 2 先死一次
    function (ctx) {
      var draw = function (fn) {
        return function () {
          Art.drawPlatform(ctx, { x: 0, y: 1200, w: 600, h: 80 });
          Art.drawPlatform(ctx, { x: 0, y: 780, w: 480, h: 24 });
          Art.drawSpike(ctx, { x: 0, y: 756, w: 60 });
          Art.drawPlate(ctx, { x: 160, y: 1188, pressed: false, kind: 'lift' });
          Art.drawPlate(ctx, { x: 80, y: 768, pressed: false, kind: 'gate' });
          Art.drawLift(ctx, { x: 480, y: 1200, active: false });
          fn();
        };
      };
      scene(ctx, 40, 210, 640, 440, 0, 700, 720, 580, draw(function () {
        Art.drawPlayer(ctx, { x: 300, y: 976, facing: 1, state: 'air', gen: 1 });
        ctx.save();
        ctx.setLineDash([8, 8]);
        ctx.lineWidth = 4;
        ctx.strokeStyle = P.text;
        ctx.beginPath();
        ctx.moveTo(320, 970); ctx.lineTo(320, 810);
        ctx.stroke();
        ctx.restore();
        markCross(ctx, 400, 890, 70);
      }));
      scene(ctx, 40, 680, 640, 440, 0, 700, 720, 580, draw(function () {
        Art.drawPlayer(ctx, { x: 640, y: 1190, facing: 1, state: 'air', gen: 1 });
        arrow(ctx, 600, 1080, 640, 1170, P.text, 6);
        markCheck(ctx, 560, 980, 80);
      }));
    },
    // 3 死了變幽靈
    function (ctx) {
      var pts = [], i;
      for (i = 0; i <= 30; i++) pts.push({ x: 80 + i * 4, y: 1172 });
      for (i = 0; i < 20; i++) pts.push({ x: 200, y: 1172 });
      for (i = 0; i <= 40; i++) {
        var t = i / 40, xx = 200 + t * 160;
        pts.push({ x: xx, y: 1172 - 168 * 4 * t * (1 - t) });
      }
      for (i = 1; i <= 65; i++) pts.push({ x: 360 + i * 4, y: 1172 });
      for (i = 1; i <= 30; i++) pts.push({ x: 620 + i * 1.5, y: 1172 + i * i * 0.16 });
      var prog = 95;
      scene(ctx, 40, 210, 640, 760, 0, 700, 720, 580, function () {
        Art.drawPlatform(ctx, { x: 0, y: 1200, w: 600, h: 80 });
        Art.drawPlatform(ctx, { x: 0, y: 780, w: 480, h: 24 });
        Art.drawSpike(ctx, { x: 0, y: 756, w: 60 });
        Art.drawPlate(ctx, { x: 160, y: 1188, pressed: false, kind: 'lift' });
        Art.drawPlate(ctx, { x: 80, y: 768, pressed: false, kind: 'gate' });
        Art.drawLift(ctx, { x: 480, y: 1200, active: false });
        Art.drawGhostPath(ctx, { points: pts, progress: prog });
        var gp = pts[prog];
        Art.drawGhost(ctx, { x: gp.x - 20, y: gp.y - 28, facing: 1, state: 'air', gen: 1, hookable: false });
        Art.drawPlayer(ctx, { x: 60, y: 1144, facing: 1, state: 'idle', gen: 2 });
      });
    },
    // 4 踩幽靈
    function (ctx) {
      scene(ctx, 40, 210, 640, 900, 120, 700, 480, 580, function () {
        Art.drawPlatform(ctx, { x: 0, y: 1200, w: 600, h: 80 });
        Art.drawPlatform(ctx, { x: 0, y: 780, w: 480, h: 24 });
        Art.drawGhost(ctx, { x: 300, y: 1030, facing: 1, state: 'air', gen: 1, hookable: false });
        Art.drawPlayer(ctx, { x: 300, y: 974, facing: 1, state: 'idle', gen: 2 });
        arrow(ctx, 380, 1086, 380, 980, P.text, 6);
        arrow(ctx, 240, 1086, 240, 980, P.text, 6);
      });
    },
    // 5 鉤幽靈
    function (ctx) {
      hookIcon(ctx, 640, 82, true);
      text(ctx, '× 1', 604, 82, 24, P.textDim, 'right');
      var base = function () {
        Art.drawPlatform(ctx, { x: 0, y: 1200, w: 600, h: 80 });
        Art.drawPlatform(ctx, { x: 0, y: 780, w: 480, h: 24 });
        Art.drawSpike(ctx, { x: 0, y: 756, w: 60 });
      };
      // 左格(上): 幽靈在地上 → 只往上一點
      scene(ctx, 40, 210, 640, 440, 0, 700, 720, 580, function () {
        base();
        Art.drawGhost(ctx, { x: 300, y: 1144, facing: 1, state: 'idle', gen: 1, hookable: false });
        Art.drawPlayer(ctx, { x: 300, y: 1000, facing: 1, state: 'air', gen: 2 });
        arrow(ctx, 380, 1140, 380, 1060, P.hook, 6);
        markCross(ctx, 470, 940, 64);
        text(ctx, '幽靈在地上', 560, 1100, 34, P.text, 'center', 'bold', '#000');
      });
      // 右格(下): 幽靈在空中, 發光 → 甩上平台
      scene(ctx, 40, 680, 640, 440, 0, 700, 720, 580, function () {
        base();
        Art.drawGhost(ctx, { x: 300, y: 1010, facing: 1, state: 'air', gen: 1, hookable: true });
        Art.drawHook(ctx, { x1: 140, y1: 1172, x2: 320, y2: 1010 });
        Art.drawPlayer(ctx, { x: 120, y: 1144, facing: 1, state: 'hook', gen: 2 });
        arrow(ctx, 380, 1000, 380, 770, P.hook, 7);
        markCheck(ctx, 450, 730, 70);
        text(ctx, '幽靈在空中', 560, 1100, 34, P.text, 'center', 'bold', '#000');
      });
    },
    // 6 開關
    function (ctx) {
      var cw = 270, ch = 380, lx = 40, rx = 410;
      var liftCell = function (px, py, on) {
        scene(ctx, px, py, cw, ch, 140, 740, 480, 500, function () {
          Art.drawPlatform(ctx, { x: 0, y: 1200, w: 600, h: 80 });
          Art.drawPlatform(ctx, { x: 0, y: 780, w: 480, h: 24 });
          Art.drawPlate(ctx, { x: 160, y: 1188, pressed: on, kind: 'lift' });
          Art.drawLift(ctx, { x: 480, y: on ? 780 : 1200, active: on });
        });
      };
      var gateCell = function (px, py, on) {
        scene(ctx, px, py, cw, ch, 0, 150, 300, 300, function () {
          Art.drawPlatform(ctx, { x: 0, y: 400, w: 300, h: 24 });
          Art.drawPlate(ctx, { x: 30, y: 388, pressed: on, kind: 'gate' });
          Art.drawGate(ctx, { x: 220, y: 180, open: on });
        });
      };
      liftCell(lx, 220, false);
      liftCell(rx, 220, true);
      arrow(ctx, 322, 410, 400, 410, P.text, 5);
      caption(ctx, '沒人踩', lx + cw / 2, 630);
      caption(ctx, '有人踩住', rx + cw / 2, 630);
      gateCell(lx, 690, false);
      gateCell(rx, 690, true);
      arrow(ctx, 322, 880, 400, 880, P.text, 5);
      caption(ctx, '沒人踩', lx + cw / 2, 1100);
      caption(ctx, '有人踩住', rx + cw / 2, 1100);
    },
    // 7 只看得見上一個人
    function (ctx) {
      ctx.save();
      rr(ctx, 40, 210, 640, 290, 14);
      ctx.fillStyle = P.panel;
      ctx.fill();
      ctx.strokeStyle = P.hudLine;
      ctx.lineWidth = 2;
      ctx.stroke();
      var xs = [160, 360, 560];
      for (var i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(xs[i] - 40, 250);
        ctx.scale(2, 2);
        if (i === 0) vanished(ctx, 0, 0, 1);
        else if (i === 1) figure(ctx, 0, 0, 1, 'idle', 2, 'ghost', false);
        else figure(ctx, 0, 0, -1, 'idle', 3, 'player', false);
        ctx.restore();
      }
      text(ctx, '看不見', 160, 410, 28, P.textDim, 'center');
      text(ctx, '幽靈', 360, 410, 28, P.ghost, 'center');
      text(ctx, '你', 560, 410, 28, P.text, 'center');
      arrow(ctx, 220, 306, 300, 306, P.textDim, 4);
      arrow(ctx, 420, 306, 500, 306, P.textDim, 4);
      ctx.restore();

      scene(ctx, 40, 530, 640, 600, 100, 700, 620, 580, function () {
        Art.drawPlatform(ctx, { x: 0, y: 1200, w: 600, h: 80 });
        Art.drawPlatform(ctx, { x: 0, y: 780, w: 480, h: 24 });
        Art.drawPlate(ctx, { x: 160, y: 1188, pressed: false, kind: 'lift' });
        Art.drawLift(ctx, { x: 480, y: 1200, active: false });
        vanished(ctx, 180, 1144, 1);
        // 看不見的升降台位置(虛線)
        ctx.save();
        ctx.setLineDash([8, 6]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(63,217,122,0.6)';
        ctx.strokeRect(481.5, 961.5, 117, 21);
        ctx.restore();
        Art.drawGhost(ctx, { x: 520, y: 904, facing: 1, state: 'idle', gen: 2, hookable: false });
        arrow(ctx, 640, 1100, 640, 920, P.text, 6);
      });
    }
  ];

  Art.drawGuidePage = function (ctx, s) {
    var n = PAGES.length;
    var page = Math.max(0, Math.min(n - 1, (s && s.page) | 0));
    var g = GUIDE[page];
    ctx.save();
    ctx.fillStyle = P.hudBg;
    ctx.fillRect(0, 0, W, H);
    text(ctx, (page + 1) + ' / ' + n, 40, 56, 24, P.textDim, 'left');
    text(ctx, g.title, W / 2, 104, 44, P.text, 'center');
    text(ctx, g.body, W / 2, 166, 30, P.text, 'center', 'normal');
    PAGES[page](ctx);
    // 頁碼點
    for (var i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.arc(W / 2 - (n - 1) * 14 + i * 28, 1176, i === page ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = i === page ? P.text : '#3a4260';
      ctx.fill();
    }
    text(ctx, page === n - 1 ? '空白鍵 開始遊戲' : '空白鍵 下一頁', W / 2, 1230, 28, P.text, 'center');
    ctx.restore();
  };

  window.Art = Art;
})();
