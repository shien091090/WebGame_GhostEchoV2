// 翹翹板接力 美術(Canvas 2D 幾何繪製, 無外部資源)
// 全域物件 window.Art; 函式只負責「給狀態就畫」, 不含遊戲邏輯
(function () {
  'use strict';

  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';

  var P = {
    bg: '#121829',        // 背景底
    bgTop: '#1d2645',     // 背景上緣漸層
    hudBg: '#0b0f1c',     // HUD 底板
    hudLine: '#2f3a5c',   // HUD 分隔線、說明頁框
    ground: '#2e3446',    // 地面(實心)本體
    groundTop: '#8590a8', // 地面頂緣
    platform: '#465069',  // 單向平台本體
    platformTop: '#b3bed6', // 單向平台頂緣(可站的那一條)
    spike: '#ff4a4a',     // 尖刺(危險, 全畫面唯一的紅色實心)
    spikeBase: '#5a2630', // 尖刺底座
    lift: '#43d36b',      // 升降台 + 升降台開關(綠)
    liftDim: '#1f6b37',   // 升降台未驅動 / 開關放開
    gate: '#4d86ff',      // 門 + 門開關(藍)
    gateDim: '#22407f',   // 門條紋 / 門開關放開
    seesaw: '#d8b07a',    // 翹翹板板身
    seesawLand: '#8a6a42',// 落點端(深)
    seesawLaunch: '#f2d3a0', // 發射端(亮)
    goalPole: '#e8e8e8',  // 終點旗桿
    goalA: '#ffffff',     // 旗面格子白
    goalB: '#1a1a1a',     // 旗面格子黑
    player: '#ffe6c2',    // 角色本體(實心奶油色)
    playerLine: '#2a1f14',// 角色外框
    playerLeg: '#3a3040', // 角色腳
    eye: '#1b2030',       // 眼罩
    ghost: '#b9a6ff',     // 幽靈本體(半透明淡紫)
    ghostTop: '#ece6ff',  // 幽靈頭頂可站邊
    path: '#b9a6ff',      // 幽靈路線(與幽靈同色)
    hook: '#ffe04a',      // 鉤爪相關: 可鉤發光、瞄準、鉤索、次數圖示
    text: '#eef2ff',      // 主要文字
    textDim: '#8d97b5',   // 次要文字
    dead: '#8a8f9c',      // 死亡角色
    ok: '#ffffff',        // 說明頁打勾
    bad: '#ff7a7a'        // 說明頁打叉
  };

  // ---------- 小工具 ----------
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function txt(ctx, s, x, y, size, color, align, weight) {
    ctx.save();
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size / 6);
    ctx.strokeStyle = 'rgba(5,8,16,0.9)';
    ctx.strokeText(s, x, y);
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
    ctx.restore();
  }

  function wrapText(ctx, s, x, y, maxW, size, lineH, color) {
    ctx.save();
    ctx.font = 'bold ' + size + 'px ' + FONT;
    var line = '', lines = [];
    for (var i = 0; i < s.length; i++) {
      var t = line + s[i];
      var m = ctx.measureText(t);
      if (m && m.width > maxW && line) { lines.push(line); line = s[i]; } else line = t;
    }
    if (line) lines.push(line);
    ctx.restore();
    for (var j = 0; j < lines.length; j++) txt(ctx, lines[j], x, y + j * lineH, size, color, 'center');
  }

  function arrow(ctx, x1, y1, x2, y2, color, w, head) {
    var a = Math.atan2(y2 - y1, x2 - x1);
    head = head || w * 3;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // 深色襯底
    ctx.strokeStyle = 'rgba(5,8,16,0.85)';
    ctx.fillStyle = 'rgba(5,8,16,0.85)';
    ctx.lineWidth = w + 4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - Math.cos(a) * head * 0.6, y2 - Math.sin(a) * head * 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2 + Math.cos(a) * 2, y2 + Math.sin(a) * 2);
    ctx.lineTo(x2 - Math.cos(a - 0.5) * (head + 3), y2 - Math.sin(a - 0.5) * (head + 3));
    ctx.lineTo(x2 - Math.cos(a + 0.5) * (head + 3), y2 - Math.sin(a + 0.5) * (head + 3));
    ctx.closePath();
    ctx.fill();
    // 本體
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - Math.cos(a) * head * 0.6, y2 - Math.sin(a) * head * 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(a - 0.5) * head, y2 - Math.sin(a - 0.5) * head);
    ctx.lineTo(x2 - Math.cos(a + 0.5) * head, y2 - Math.sin(a + 0.5) * head);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function chevron(ctx, cx, cy, w, h, up, color, lw) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw || 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    var d = up ? -1 : 1;
    ctx.moveTo(cx - w / 2, cy - d * h / 2);
    ctx.lineTo(cx, cy + d * h / 2);
    ctx.lineTo(cx + w / 2, cy - d * h / 2);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- 角色 / 幽靈共用骨架 ----------
  // kind: 'player' | 'ghost' ; 畫在 40x56 判定框內
  function figure(ctx, s, kind) {
    var st = s.state || 'idle';
    var f = s.facing < 0 ? -1 : 1;
    var ghost = kind === 'ghost';
    var dead = st === 'dead';
    ctx.save();
    ctx.translate(s.x + 20, s.y);
    ctx.scale(f, 1);

    // 腳
    var legs;
    if (dead) legs = [];
    else if (st === 'run') legs = [[-17, 45, 10, 11], [6, 43, 10, 11]];
    else if (st === 'idle') legs = [[-12, 46, 9, 10], [3, 46, 9, 10]];
    else legs = [[-11, 42, 9, 9], [2, 44, 9, 9]]; // air / aim / launch: 縮腳

    // 彈射時間: 腳下速度線(非判定, 只是效果)
    if (st === 'launch') {
      ctx.save();
      ctx.strokeStyle = ghost ? P.ghost : P.hook;
      ctx.globalAlpha = ghost ? 0.5 : 0.9;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (var k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(k * 11, 58 + Math.abs(k) * 4);
        ctx.lineTo(k * 11, 72 + Math.abs(k) * 4);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 可鉤: 黃色外光 + 黃框(兩條通道)
    if (ghost && s.hookable) {
      ctx.save();
      ctx.shadowColor = P.hook;
      ctx.shadowBlur = 24;
      ctx.strokeStyle = P.hook;
      ctx.lineWidth = 4;
      rr(ctx, -19, 1, 38, 54, 10);
      ctx.stroke();
      ctx.stroke();
      ctx.restore();
    }

    for (var i = 0; i < legs.length; i++) {
      var L = legs[i];
      ctx.save();
      ctx.globalAlpha = ghost ? 0.45 : 1;
      ctx.fillStyle = ghost ? P.ghost : P.playerLeg;
      rr(ctx, L[0], L[1], L[2], L[3], 3);
      ctx.fill();
      ctx.restore();
    }

    // 身體
    var by = dead ? 18 : 1, bh = dead ? 38 : 45;
    rr(ctx, -19, by, 38, bh, 10);
    if (ghost) {
      ctx.save();
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = P.ghost;
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = P.ghostTop;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = dead ? P.dead : P.player;
      ctx.fill();
      ctx.strokeStyle = P.playerLine;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 眼罩(朝向)
    if (dead) {
      ctx.save();
      ctx.strokeStyle = P.eye;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      [[-8, 30], [8, 30]].forEach(function (e) {
        ctx.beginPath();
        ctx.moveTo(e[0] - 4, e[1] - 4); ctx.lineTo(e[0] + 4, e[1] + 4);
        ctx.moveTo(e[0] + 4, e[1] - 4); ctx.lineTo(e[0] - 4, e[1] + 4);
        ctx.stroke();
      });
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = ghost ? 0.65 : 1;
      ctx.fillStyle = P.eye;
      rr(ctx, 0, 12, 17, 10, 4);
      ctx.fill();
      ctx.fillStyle = ghost ? P.ghostTop : '#ffffff';
      ctx.beginPath();
      ctx.arc(11, 17, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 幽靈頭頂: 唯一可站的一條邊, 實心不透明
    if (ghost) {
      ctx.save();
      ctx.fillStyle = P.ghostTop;
      rr(ctx, -20, 0, 40, 5, 2);
      ctx.fill();
      ctx.restore();
    }

    // 瞄準中: 黃框(時間停住, 角色是鉤爪的主角)
    if (!ghost && st === 'aim') {
      ctx.save();
      ctx.strokeStyle = P.hook;
      ctx.lineWidth = 3;
      rr(ctx, -18.5, 1.5, 37, 44, 9);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // 說明頁 / HUD 用: 已消失的上上代(虛線輪廓, 不是遊戲物件)
  function vanished(ctx, x, y) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = P.ghost;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 5]);
    rr(ctx, x + 1, y + 1, 38, 45, 10);
    ctx.stroke();
    ctx.restore();
  }

  function notYet(ctx, x, y) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = P.textDim;
    ctx.lineWidth = 2;
    rr(ctx, x + 1, y + 1, 38, 45, 10);
    ctx.stroke();
    ctx.restore();
  }

  // 鉤爪次數圖示(HUD 與說明頁共用)
  function hookIcon(ctx, cx, cy, r, full) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    if (full) {
      ctx.fillStyle = P.hook;
      ctx.fill();
      ctx.strokeStyle = 'rgba(5,8,16,0.9)';
    } else {
      ctx.fillStyle = 'rgba(255,224,74,0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,224,74,0.35)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,224,74,0.35)';
    }
    // 爪形
    ctx.lineWidth = Math.max(2, r / 5);
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.55);
    ctx.lineTo(cx, cy - r * 0.15);
    ctx.moveTo(cx - r * 0.5, cy - r * 0.55);
    ctx.quadraticCurveTo(cx - r * 0.45, cy - r * 0.05, cx, cy - r * 0.15);
    ctx.quadraticCurveTo(cx + r * 0.45, cy - r * 0.05, cx + r * 0.5, cy - r * 0.55);
    ctx.stroke();
    ctx.restore();
  }

  function hookRow(ctx, x, cy, left, max, r) {
    for (var i = 0; i < max; i++) hookIcon(ctx, x + r + i * (r * 2 + 10), cy, r, i < left);
  }

  function checkMark(ctx, cx, cy, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(5,8,16,0.85)';
    ctx.fill();
    ctx.strokeStyle = P.ok;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.lineWidth = r / 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.45, cy + r * 0.02);
    ctx.lineTo(cx - r * 0.1, cy + r * 0.38);
    ctx.lineTo(cx + r * 0.5, cy - r * 0.35);
    ctx.stroke();
    ctx.restore();
  }

  function crossMark(ctx, cx, cy, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(5,8,16,0.85)';
    ctx.fill();
    ctx.strokeStyle = P.bad;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.lineWidth = r / 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.4, cy - r * 0.4); ctx.lineTo(cx + r * 0.4, cy + r * 0.4);
    ctx.moveTo(cx + r * 0.4, cy - r * 0.4); ctx.lineTo(cx - r * 0.4, cy + r * 0.4);
    ctx.stroke();
    ctx.restore();
  }

  function keycap(ctx, cx, cy, label, size) {
    size = size || 22;
    ctx.save();
    ctx.font = 'bold ' + size + 'px ' + FONT;
    var m = ctx.measureText(label);
    var w = Math.max(size * 1.6, ((m && m.width) || size) + size);
    var h = size * 1.7;
    rr(ctx, cx - w / 2, cy - h / 2, w, h, 6);
    ctx.fillStyle = '#e9edf7';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#5b6584';
    ctx.stroke();
    ctx.fillStyle = '#141a2b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy + 1);
    ctx.restore();
    return w;
  }

  function dashedRect(ctx, x, y, w, h, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 0.8 : alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.restore();
  }

  var Art = {
    canvas: { width: 720, height: 1280 },
    palette: P,

    // ---------- 背景 ----------
    drawBackground: function (ctx) {
      ctx.save();
      var g = ctx.createLinearGradient(0, 0, 0, 1280);
      g.addColorStop(0, P.bgTop);
      g.addColorStop(1, P.bg);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 720, 1280);
      // 極淡的點陣, 只給空間感
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      for (var y = 130; y < 1280; y += 40) {
        for (var x = 20; x < 720; x += 40) ctx.fillRect(x, y, 2, 2);
      }
      ctx.restore();
    },

    // ---------- 地面 / 單向平台 ----------
    drawPlatform: function (ctx, s) {
      ctx.save();
      if (s.h >= 48) {
        // 地面: 實心, 厚
        ctx.fillStyle = P.ground;
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = P.groundTop;
        ctx.fillRect(s.x, s.y, s.w, 6);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 2;
        for (var yy = s.y + 22; yy < s.y + s.h; yy += 18) {
          ctx.beginPath(); ctx.moveTo(s.x, yy); ctx.lineTo(s.x + s.w, yy); ctx.stroke();
        }
      } else {
        // 單向平台: 頂面實線可站, 底面虛線(下方可穿過)
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = P.platform;
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.globalAlpha = 1;
        ctx.fillStyle = P.platformTop;
        ctx.fillRect(s.x, s.y, s.w, 5);
        ctx.strokeStyle = P.platformTop;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y + s.h - 1);
        ctx.lineTo(s.x + s.w, s.y + s.h - 1);
        ctx.stroke();
      }
      ctx.restore();
    },

    // ---------- 尖刺 60x24 ----------
    drawSpike: function (ctx, s) {
      var w = s.w || 60, h = 24, n = Math.max(1, Math.round(w / 15));
      var tw = w / n;
      ctx.save();
      ctx.fillStyle = P.spikeBase;
      ctx.fillRect(s.x, s.y + h - 5, w, 5);
      for (var i = 0; i < n; i++) {
        var x0 = s.x + i * tw;
        ctx.beginPath();
        ctx.moveTo(x0, s.y + h - 4);
        ctx.lineTo(x0 + tw / 2, s.y);
        ctx.lineTo(x0 + tw, s.y + h - 4);
        ctx.closePath();
        ctx.fillStyle = P.spike;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x0 + tw / 2, s.y + 2);
        ctx.lineTo(x0 + tw * 0.8, s.y + h - 6);
        ctx.strokeStyle = 'rgba(255,220,220,0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    },

    // ---------- 開關 80x12 ----------
    drawPlate: function (ctx, s) {
      var c = s.kind === 'gate' ? P.gate : P.lift;
      var cd = s.kind === 'gate' ? P.gateDim : P.liftDim;
      ctx.save();
      // 底座框(常駐, 標出開關範圍)
      ctx.fillStyle = 'rgba(5,8,16,0.7)';
      ctx.fillRect(s.x, s.y + 8, 80, 4);
      ctx.fillStyle = c;
      ctx.fillRect(s.x, s.y + 4, 4, 8);
      ctx.fillRect(s.x + 76, s.y + 4, 4, 8);
      if (s.pressed) {
        // 壓下: 只剩薄薄一條, 發亮
        ctx.shadowColor = c;
        ctx.shadowBlur = 16;
        ctx.fillStyle = c;
        ctx.fillRect(s.x + 4, s.y + 8, 72, 4);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(s.x + 4, s.y + 8, 72, 1.5);
      } else {
        // 放開: 凸起的鈕, 暗色本體 + 亮頂
        ctx.fillStyle = cd;
        rr(ctx, s.x + 6, s.y + 1, 68, 11, 3);
        ctx.fill();
        ctx.fillStyle = c;
        ctx.fillRect(s.x + 6, s.y + 1, 68, 3);
        // 鈕面小記號: 升降台 = 上下箭頭, 門 = 門形
        ctx.fillStyle = c;
        var cx = s.x + 40;
        if (s.kind === 'gate') {
          ctx.fillRect(cx - 3, s.y + 5, 6, 6);
        } else {
          ctx.beginPath();
          ctx.moveTo(cx - 5, s.y + 10); ctx.lineTo(cx, s.y + 5); ctx.lineTo(cx + 5, s.y + 10);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    },

    // ---------- 升降台 120x24, y 為頂面 780~1200 ----------
    drawLift: function (ctx, s) {
      var x = s.x, y = s.y, on = !!s.active;
      ctx.save();
      // 軌道(行程 780~1224), 常駐淡虛線
      ctx.strokeStyle = P.lift;
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(x + 8, 780); ctx.lineTo(x + 8, 1224);
      ctx.moveTo(x + 112, 780); ctx.lineTo(x + 112, 1224);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      // 本體
      if (on) { ctx.shadowColor = P.lift; ctx.shadowBlur = 14; }
      ctx.fillStyle = on ? P.lift : P.liftDim;
      ctx.fillRect(x, y, 120, 24);
      ctx.shadowBlur = 0;
      ctx.fillStyle = on ? '#c9ffd8' : P.lift;
      ctx.fillRect(x, y, 120, 5);
      // 方向記號: 被驅動 = 白色上箭頭; 沒驅動且不在底 = 暗色下箭頭; 在底 = 無
      if (on) {
        for (var i = 0; i < 3; i++) chevron(ctx, x + 36 + i * 24, y + 15, 14, 7, true, '#ffffff', 3);
      } else if (y < 1199) {
        for (var j = 0; j < 3; j++) chevron(ctx, x + 36 + j * 24, y + 15, 14, 7, false, 'rgba(5,8,16,0.6)', 3);
      }
      ctx.restore();
    },

    // ---------- 門 24x220 ----------
    drawGate: function (ctx, s) {
      var x = s.x, y = s.y;
      ctx.save();
      if (!s.open) {
        ctx.fillStyle = P.gate;
        ctx.fillRect(x, y, 24, 220);
        ctx.save();
        ctx.beginPath(); ctx.rect(x, y, 24, 220); ctx.clip();
        ctx.strokeStyle = P.gateDim;
        ctx.lineWidth = 6;
        for (var k = -24; k < 240; k += 22) {
          ctx.beginPath(); ctx.moveTo(x, y + k + 24); ctx.lineTo(x + 24, y + k); ctx.stroke();
        }
        ctx.restore();
        ctx.strokeStyle = '#cfe0ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, 22, 218);
      } else {
        ctx.fillStyle = P.gate;
        ctx.globalAlpha = 0.12;
        ctx.fillRect(x, y, 24, 220);
        ctx.globalAlpha = 1;
        dashedRect(ctx, x, y, 24, 220, P.gate, 0.7);
      }
      // 門楣(常駐, 開著也看得到門在哪)
      ctx.globalAlpha = 1;
      ctx.fillStyle = P.gate;
      ctx.fillRect(x, y, 24, 6);
      ctx.restore();
    },

    // ---------- 翹翹板 200x12, 支點 x+100 ----------
    drawSeesaw: function (ctx, s) {
      var t = Math.max(0, Math.min(1, s.tilt || 0));
      var px = s.x + 100, py = s.y + 6;
      ctx.save();
      // 支點
      ctx.fillStyle = '#5b4a33';
      ctx.beginPath();
      ctx.moveTo(px - 8, s.y + 12); ctx.lineTo(px, s.y + 3); ctx.lineTo(px + 8, s.y + 12);
      ctx.closePath();
      ctx.fill();
      ctx.translate(px, py);
      ctx.rotate(-t * 0.14);
      // 板身(中段)
      ctx.fillStyle = P.seesaw;
      ctx.fillRect(-20, -6, 40, 12);
      // 落點端(左, 深色, 向下箭頭)
      ctx.fillStyle = P.seesawLand;
      ctx.fillRect(-100, -6, 80, 12);
      chevron(ctx, -72, 0, 14, 6, false, '#ffffff', 2.5);
      chevron(ctx, -48, 0, 14, 6, false, '#ffffff', 2.5);
      // 發射端(右, 亮色, 向上箭頭)
      ctx.fillStyle = P.seesawLaunch;
      ctx.fillRect(20, -6, 80, 12);
      chevron(ctx, 48, 0, 14, 6, true, '#5b4a33', 2.5);
      chevron(ctx, 72, 0, 14, 6, true, '#5b4a33', 2.5);
      ctx.strokeStyle = 'rgba(5,8,16,0.6)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-100, -6, 200, 12);
      // 擺動中: 發射端上方噴起的白線
      if (t > 0.05) {
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = t;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for (var i = 0; i < 3; i++) {
          var lx = 36 + i * 24;
          ctx.beginPath(); ctx.moveTo(lx, -12); ctx.lineTo(lx, -12 - 16 * t); ctx.stroke();
        }
      }
      ctx.restore();
    },

    // ---------- 終點旗 48x80 ----------
    drawGoal: function (ctx, s) {
      var x = s.x, y = s.y;
      ctx.save();
      ctx.fillStyle = P.goalPole;
      ctx.fillRect(x + 4, y, 5, 80);
      ctx.fillRect(x, y + 75, 14, 5);
      var cols = 5, rows = 4, fw = 39 / cols, fh = 32 / rows;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          ctx.fillStyle = (r + c) % 2 ? P.goalB : P.goalA;
          ctx.fillRect(x + 9 + c * fw, y + 3 + r * fh, fw + 0.5, fh + 0.5);
        }
      }
      ctx.strokeStyle = P.goalA;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 9, y + 3, 39, 32);
      ctx.restore();
    },

    // ---------- 幽靈路線(接下來 5 秒) ----------
    drawGhostPath: function (ctx, s) {
      var segs = s.segments || [];
      ctx.save();
      ctx.strokeStyle = P.path;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([2, 7]);
      for (var i = 0; i < segs.length; i++) {
        var pts = segs[i];
        if (!pts || pts.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (var j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
        ctx.stroke();
      }
      ctx.restore();
    },

    // ---------- 幽靈 40x56 ----------
    drawGhost: function (ctx, s) {
      figure(ctx, s, 'ghost');
    },

    // ---------- 鉤索 ----------
    drawHook: function (ctx, s) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(5,8,16,0.85)';
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
      ctx.strokeStyle = P.hook;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
      // 爪頭
      var a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
      ctx.translate(s.x2, s.y2);
      ctx.rotate(a);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-10, -9); ctx.quadraticCurveTo(2, -8, 2, 0); ctx.quadraticCurveTo(2, 8, -10, 9);
      ctx.stroke();
      ctx.fillStyle = P.hook;
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },

    // ---------- 角色 40x56 ----------
    drawPlayer: function (ctx, s) {
      figure(ctx, s, 'player');
    },

    // ---------- 瞄準 ----------
    drawAim: function (ctx, s) {
      var full = (s.charge || 0) >= 0.999;
      ctx.save();
      // 方向虛線: 角色 → 幽靈
      ctx.strokeStyle = 'rgba(5,8,16,0.8)';
      ctx.lineWidth = 5;
      ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.moveTo(s.px, s.py); ctx.lineTo(s.gx, s.gy); ctx.stroke();
      ctx.strokeStyle = P.hook;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s.px, s.py); ctx.lineTo(s.gx, s.gy); ctx.stroke();
      ctx.setLineDash([]);
      // 被瞄準的幽靈: 中心十字準星
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(s.gx, s.gy, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      // 力道箭頭: 長度 = 速度; 蓄滿時白芯 + 外光
      ctx.save();
      if (full) { ctx.shadowColor = P.hook; ctx.shadowBlur = 18; }
      arrow(ctx, s.px, s.py, s.ax, s.ay, P.hook, 7, 22);
      ctx.restore();
      if (full) {
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        var a = Math.atan2(s.ay - s.py, s.ax - s.px);
        ctx.beginPath();
        ctx.moveTo(s.px, s.py);
        ctx.lineTo(s.ax - Math.cos(a) * 16, s.ay - Math.sin(a) * 16);
        ctx.stroke();
        ctx.restore();
      }
    },

    // ---------- HUD(0~100) ----------
    drawHud: function (ctx, s) {
      var gen = s.gen || 1, maxGen = s.maxGen || 3, phase = s.phase || 'play';
      ctx.save();
      ctx.fillStyle = P.hudBg;
      ctx.fillRect(0, 0, 720, 100);
      ctx.fillStyle = P.hudLine;
      ctx.fillRect(0, 98, 720, 2);

      if (phase === 'win') {
        txt(ctx, '過關!', 24, 40, 40, P.text, 'left');
        txt(ctx, '三代合力回放', 24, 78, 20, P.textDim, 'left');
        var kw = keycap(ctx, 600, 50, '空白鍵', 20);
        txt(ctx, '重來', 600 + kw / 2 + 10, 50, 20, P.text, 'left');
        ctx.restore();
        return;
      }

      // 代數: 三個小人, 目前 = 實心, 上一代 = 幽靈, 更早 = 消失虛線, 未來 = 灰框
      for (var g = 1; g <= maxGen; g++) {
        var ix = 18 + (g - 1) * 44;
        ctx.save();
        ctx.translate(ix, 14);
        ctx.scale(0.75, 0.75);
        if (g === gen) figure(ctx, { x: 0, y: 0, facing: 1, state: phase === 'dying' || phase === 'lose' ? 'dead' : 'idle' }, 'player');
        else if (g === gen - 1) figure(ctx, { x: 0, y: 0, facing: 1, state: 'idle', hookable: false }, 'ghost');
        else if (g < gen) vanished(ctx, 0, 0);
        else notYet(ctx, 0, 0);
        ctx.restore();
        txt(ctx, String(g), ix + 15, 66 + 18, 18, g === gen ? P.text : P.textDim, 'center');
      }
      txt(ctx, '第 ' + gen + ' / ' + maxGen + ' 人', 156, 50, 26, P.text, 'left');

      // 鉤爪次數
      txt(ctx, '鉤爪', 318, 50, 18, P.textDim, 'left');
      hookRow(ctx, 364, 50, Math.max(0, s.hookLeft | 0), s.hookMax || 2, 16);

      if (s.aiming) {
        // 時間暫停: 黃色提示條 + 遊戲區黃框
        ctx.save();
        rr(ctx, 452, 26, 182, 48, 10);
        ctx.fillStyle = P.hook;
        ctx.fill();
        ctx.fillStyle = '#141a2b';
        ctx.fillRect(466, 39, 6, 22);
        ctx.fillRect(477, 39, 6, 22);
        ctx.font = 'bold 22px ' + FONT;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Z 彈出 / X 取消', 492, 51);
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = P.hook;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 103, 714, 1174);
        ctx.restore();
      } else if (phase === 'dying' && gen < maxGen) {
        txt(ctx, '換下一個人…', 544, 50, 20, P.textDim, 'center');
      }

      txt(ctx, 'R 重來', 704, 50, 18, P.textDim, 'right');

      if (phase === 'lose') {
        ctx.fillStyle = 'rgba(5,8,16,0.8)';
        ctx.fillRect(0, 100, 720, 1180);
        txt(ctx, '失敗', 360, 560, 72, P.bad, 'center');
        txt(ctx, '三個人都倒下了', 360, 640, 26, P.text, 'center');
        var kw2 = keycap(ctx, 320, 720, '空白鍵', 22);
        txt(ctx, '重來', 320 + kw2 / 2 + 12, 720, 24, P.text, 'left');
      }
      ctx.restore();
    }
  };

  // ---------- 說明頁 ----------
  function levelBase(ctx, o) {
    o = o || {};
    Art.drawPlatform(ctx, { x: 0, y: 1200, w: 600, h: 80 });
    Art.drawPlatform(ctx, { x: 0, y: 780, w: 480, h: 24 });
    Art.drawPlatform(ctx, { x: 240, y: 360, w: 480, h: 24 });
    Art.drawLift(ctx, { x: 480, y: o.liftY == null ? 1200 : o.liftY, active: !!o.liftOn });
    Art.drawSpike(ctx, { x: 0, y: 756, w: 60 });
    Art.drawPlate(ctx, { x: 160, y: 1188, pressed: !!o.liftOn, kind: 'lift' });
    Art.drawPlate(ctx, { x: 80, y: 768, pressed: !!o.gateOn, kind: 'gate' });
    Art.drawSeesaw(ctx, { x: 180, y: 768, tilt: o.tilt || 0 });
    Art.drawGate(ctx, { x: 560, y: 140, open: !!o.gateOn });
    Art.drawGoal(ctx, { x: 640, y: 280 });
  }

  // 把世界座標區塊縮放進螢幕上的格子; 回傳座標換算
  function scene(ctx, cell, world, fn, frameColor) {
    var sc = Math.min(cell.w / world.w, cell.h / world.h);
    var ox = cell.x + (cell.w - world.w * sc) / 2, oy = cell.y + (cell.h - world.h * sc) / 2;
    ctx.save();
    rr(ctx, cell.x, cell.y, cell.w, cell.h, 12);
    ctx.fillStyle = '#0d1222';
    ctx.fill();
    ctx.clip();
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(sc, sc);
    ctx.translate(-world.x, -world.y);
    ctx.beginPath();
    ctx.rect(world.x, world.y, world.w, world.h);
    ctx.clip();
    Art.drawBackground(ctx);
    fn(ctx);
    ctx.restore();
    ctx.restore();
    ctx.save();
    rr(ctx, cell.x, cell.y, cell.w, cell.h, 12);
    ctx.strokeStyle = frameColor || P.hudLine;
    ctx.lineWidth = frameColor ? 5 : 2;
    ctx.stroke();
    ctx.restore();
    return {
      X: function (wx) { return ox + (wx - world.x) * sc; },
      Y: function (wy) { return oy + (wy - world.y) * sc; },
      s: sc
    };
  }

  function arcPoints(x0, y0, x1, h, n) {
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      pts.push({ x: x0 + (x1 - x0) * t, y: y0 - 4 * h * t * (1 - t) });
    }
    return pts;
  }

  function dashedPath(ctx, pts, color, w) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = w || 3;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.restore();
  }

  var PAGES = [
    {
      title: '走到旗子', text: '←→ 走、空白鍵跳、R 整關重來',
      draw: function (ctx) {
        var m = scene(ctx, { x: 60, y: 300, w: 600, h: 860 }, { x: 0, y: 100, w: 720, h: 1180 }, function (c) {
          levelBase(c);
          Art.drawPlayer(c, { x: 60, y: 1144, facing: 1, state: 'idle', gen: 1 });
        });
        // 終點旗: 圈住
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(m.X(664), m.Y(318), 46 * m.s + 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        // 按鍵貼在角色上方
        var bx = m.X(80), by = m.Y(1144) - 34;
        keycap(ctx, bx + 6, by - 90, '←  →', 20);
        keycap(ctx, bx + 116, by - 90, '空白鍵', 20);
        keycap(ctx, bx + 210, by - 90, 'R', 20);
        arrow(ctx, bx + 6, by - 66, bx, by, '#ffffff', 3, 12);
      }
    },
    {
      title: '先死一次', text: '一個人到不了, 要先死一次',
      draw: function (ctx) {
        var m = scene(ctx, { x: 40, y: 330, w: 640, h: 780 }, { x: 0, y: 740, w: 720, h: 540 }, function (c) {
          levelBase(c);
          dashedPath(c, arcPoints(240, 1172, 300, 168, 20), '#ffffff', 3);
          Art.drawPlayer(c, { x: 280, y: 976, facing: 1, state: 'air', gen: 1 });
          Art.drawPlayer(c, { x: 640, y: 1214, facing: 1, state: 'air', gen: 1 });
        });
        // 跳不上: 頭頂與平台之間的差距 + 打叉
        ctx.save();
        ctx.strokeStyle = P.bad;
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(m.X(300), m.Y(972)); ctx.lineTo(m.X(300), m.Y(808));
        ctx.stroke();
        ctx.restore();
        crossMark(ctx, m.X(380), m.Y(890), 26);
        // 掉進坑: 向下箭頭 + 打勾
        arrow(ctx, m.X(660), m.Y(1080), m.X(660), m.Y(1196), '#ffffff', 4, 14);
        checkMark(ctx, m.X(600), m.Y(1050), 26);
      }
    },
    {
      title: '死了變幽靈', text: '死掉的你會一直重演',
      draw: function (ctx) {
        var path = [];
        for (var i = 0; i <= 18; i++) path.push({ x: 260 + i * 6, y: 1172 });
        path = path.concat(arcPoints(368, 1172, 470, 150, 22).slice(1));
        scene(ctx, { x: 40, y: 360, w: 640, h: 660 }, { x: 0, y: 880, w: 720, h: 400 }, function (c) {
          levelBase(c);
          Art.drawPlayer(c, { x: 60, y: 1144, facing: 1, state: 'idle', gen: 2 });
          Art.drawGhostPath(c, { segments: [path] });
          Art.drawGhost(c, { x: 240, y: 1144, facing: 1, state: 'run', gen: 1, hookable: false });
        });
      }
    },
    {
      title: '踩幽靈', text: '幽靈的頭能站, 還會載你走',
      draw: function (ctx) {
        var m = scene(ctx, { x: 60, y: 330, w: 600, h: 800 }, { x: 120, y: 660, w: 480, h: 620 }, function (c) {
          levelBase(c);
          Art.drawGhost(c, { x: 300, y: 940, facing: 1, state: 'air', gen: 1, hookable: false });
          Art.drawPlayer(c, { x: 300, y: 884, facing: 1, state: 'idle', gen: 2 });
        });
        arrow(ctx, m.X(372), m.Y(1000), m.X(372), m.Y(860), '#ffffff', 5, 18);
        arrow(ctx, m.X(268), m.Y(1000), m.X(268), m.Y(860), '#ffffff', 5, 18);
      }
    },
    {
      title: '鉤幽靈', text: '幽靈發光時按 Z 瞄準, 每人 2 次',
      draw: function (ctx) {
        var px = 320, py = 1172, gx = 380, gy = 1030;
        var dx = gx - px, dy = gy - py, d = Math.sqrt(dx * dx + dy * dy);
        var len = 1700 * (0.3 + 0.7 * 0.7) * 0.3;
        var cell = { x: 40, y: 330, w: 640, h: 800 };
        var m = scene(ctx, cell, { x: 120, y: 660, w: 560, h: 620 }, function (c) {
          levelBase(c);
          Art.drawGhost(c, { x: 360, y: 1002, facing: 1, state: 'air', gen: 1, hookable: true });
          Art.drawPlayer(c, { x: 300, y: 1144, facing: 1, state: 'aim', gen: 2 });
          Art.drawAim(c, { px: px, py: py, gx: gx, gy: gy, ax: px + dx / d * len, ay: py + dy / d * len, charge: 0.7 });
        }, P.hook);
        // 暫停提示(與 HUD 同一長相)
        ctx.save();
        rr(ctx, cell.x + cell.w - 206, cell.y + 18, 186, 48, 10);
        ctx.fillStyle = P.hook;
        ctx.fill();
        ctx.fillStyle = '#141a2b';
        ctx.fillRect(cell.x + cell.w - 192, cell.y + 31, 6, 22);
        ctx.fillRect(cell.x + cell.w - 181, cell.y + 31, 6, 22);
        ctx.font = 'bold 22px ' + FONT;
        ctx.textBaseline = 'middle';
        ctx.fillText('Z 彈出 / X 取消', cell.x + cell.w - 166, cell.y + 43);
        ctx.restore();
        // HUD 上的鉤爪次數(2 格)
        ctx.save();
        rr(ctx, cell.x + 18, cell.y + 18, 170, 48, 10);
        ctx.fillStyle = P.hudBg;
        ctx.fill();
        ctx.restore();
        txt(ctx, '鉤爪', cell.x + 32, cell.y + 42, 18, P.textDim, 'left');
        hookRow(ctx, cell.x + 80, cell.y + 42, 2, 2, 16);
        void m;
      }
    },
    {
      title: '開關', text: '有人踩住, 同色的東西才會動',
      draw: function (ctx) {
        var top = { x: 130, y: 740, w: 500, h: 500 }, bot = { x: 40, y: 110, w: 580, h: 720 };
        var cells = [
          { x: 30, y: 320, w: 310, h: 370 }, { x: 380, y: 320, w: 310, h: 370 },
          { x: 30, y: 740, w: 310, h: 400 }, { x: 380, y: 740, w: 310, h: 400 }
        ];
        scene(ctx, cells[0], top, function (c) { levelBase(c); });
        scene(ctx, cells[1], top, function (c) { levelBase(c, { liftOn: true, liftY: 780 }); });
        scene(ctx, cells[2], bot, function (c) { levelBase(c); });
        scene(ctx, cells[3], bot, function (c) { levelBase(c, { gateOn: true }); });
        arrow(ctx, 344, 505, 376, 505, '#ffffff', 4, 12);
        arrow(ctx, 344, 940, 376, 940, '#ffffff', 4, 12);
        txt(ctx, '沒人踩', 185, 708, 20, P.textDim, 'center');
        txt(ctx, '有人踩住', 535, 708, 20, P.text, 'center');
        txt(ctx, '沒人踩', 185, 1160, 20, P.textDim, 'center');
        txt(ctx, '有人踩住', 535, 1160, 20, P.text, 'center');
      }
    },
    {
      title: '翹翹板', text: '有人落在這頭, 那頭的人會飛起',
      draw: function (ctx) {
        var world = { x: 140, y: 300, w: 300, h: 520 };
        var L = { x: 30, y: 330, w: 320, h: 800 }, R = { x: 370, y: 330, w: 320, h: 800 };
        var m1 = scene(ctx, L, world, function (c) {
          levelBase(c, { tilt: 1 });
          dashedPath(c, arcPoints(130, 752, 210, 140, 16), '#ffffff', 3);
          Art.drawPlayer(c, { x: 190, y: 724, facing: 1, state: 'idle', gen: 1 });
        });
        crossMark(ctx, m1.X(340), m1.Y(690), 24);
        var m2 = scene(ctx, R, world, function (c) {
          levelBase(c, { tilt: 1 });
          dashedPath(c, arcPoints(130, 752, 210, 140, 16), P.ghost, 3);
          Art.drawGhost(c, { x: 190, y: 724, facing: 1, state: 'idle', gen: 2, hookable: false });
          Art.drawPlayer(c, { x: 320, y: 430, facing: 1, state: 'air', gen: 3 });
          // 起跳前站的位置(淡)
          c.save();
          c.globalAlpha = 0.3;
          Art.drawPlayer(c, { x: 320, y: 724, facing: 1, state: 'idle', gen: 3 });
          c.restore();
        });
        arrow(ctx, m2.X(400), m2.Y(770), m2.X(400), m2.Y(420), '#ffffff', 6, 20);
        checkMark(ctx, m2.X(250), m2.Y(500), 24);
      }
    },
    {
      title: '只看得見上一個人', text: '共三人, 只看得見上一個的幽靈',
      draw: function (ctx) {
        // 上: 三人一列
        ctx.save();
        rr(ctx, 40, 320, 640, 330, 12);
        ctx.fillStyle = '#0d1222';
        ctx.fill();
        ctx.strokeStyle = P.hudLine;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        var xs = [150, 330, 510], k = 2.2;
        for (var i = 0; i < 3; i++) {
          ctx.save();
          ctx.translate(xs[i] - 20 * k + 20, 380);
          ctx.scale(k, k);
          if (i === 0) vanished(ctx, 0, 0);
          else if (i === 1) figure(ctx, { x: 0, y: 0, facing: 1, state: 'idle', hookable: false }, 'ghost');
          else figure(ctx, { x: 0, y: 0, facing: 1, state: 'idle' }, 'player');
          ctx.restore();
          txt(ctx, String(i + 1), xs[i] + 20, 540, 32, i === 0 ? P.textDim : P.text, 'center');
          txt(ctx, ['消失', '幽靈', '你'][i], xs[i] + 20, 590, 22, i === 0 ? P.textDim : P.text, 'center');
        }
        // 下: 2 號搭著看不見的升降台
        var m = scene(ctx, { x: 40, y: 690, w: 640, h: 460 }, { x: 60, y: 760, w: 620, h: 520 }, function (c) {
          levelBase(c);
          dashedRect(c, 480, 916, 120, 24, P.lift, 0.8);
          Art.drawGhost(c, { x: 500, y: 860, facing: 1, state: 'idle', gen: 2, hookable: false });
        });
        arrow(ctx, m.X(640), m.Y(1000), m.X(640), m.Y(860), '#ffffff', 5, 16);
      }
    }
  ];

  Art.drawGuidePage = function (ctx, s) {
    var n = PAGES.length;
    var p = Math.max(0, Math.min(n - 1, (s && s.page) | 0));
    var pg = PAGES[p];
    ctx.save();
    Art.drawBackground(ctx);
    ctx.fillStyle = 'rgba(5,8,16,0.45)';
    ctx.fillRect(0, 0, 720, 1280);
    txt(ctx, '翹翹板接力', 360, 60, 30, P.textDim, 'center');
    txt(ctx, pg.title, 360, 150, 48, P.text, 'center');
    wrapText(ctx, pg.text, 360, 230, 640, 28, 40, P.text);
    pg.draw(ctx);
    // 頁碼點
    for (var i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.arc(360 - (n - 1) * 12 + i * 24, 1182, i === p ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = i === p ? P.text : 'rgba(141,151,181,0.45)';
      ctx.fill();
    }
    var label = p === n - 1 ? '開始遊戲' : '下一頁';
    var kw = keycap(ctx, 300, 1236, '空白鍵', 22);
    txt(ctx, label, 300 + kw / 2 + 14, 1236, 26, P.text, 'left');
    ctx.restore();
  };

  window.Art = Art;
})();
