// 接力鑰匙 — 美術(程式繪製, 無外部資源)
// 契約見 style.md; 函式名與 state 欄位照 interface.json
(function () {
  'use strict';

  var FONT = '"Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif';

  var C = {
    bg: '#141a33',
    bg2: '#1c1d3d',
    pit: '#07080f',
    ground: '#3a4258',
    groundTop: '#8f9bb8',
    slab: 'rgba(90,103,130,0.9)',
    slabTop: '#b3c0d8',
    player: '#3fa9ff',
    playerShade: '#1f6fb8',
    playerLine: '#0a2240',
    dead: '#6b7385',
    ghostFill: 'rgba(170,215,255,0.30)',
    ghostLine: 'rgba(215,238,255,0.95)',
    ghostHead: '#e9f7ff',
    hookGlow: '#aef6ff',
    path: 'rgba(159,216,255,0.75)',
    aim: '#7ff0ff',
    hook: '#ffffff',
    spike: '#ff4a4a',
    spikeBase: '#4a1a1a',
    lift: '#3fd46a',
    liftDark: '#1e5a33',
    gate: '#c46bff',
    gateDark: '#5e2a8c',
    key: '#ffcc33',
    keyDark: '#5a3d00',
    lockFill: '#c9971a',
    goalLight: '#f2f4f8',
    goalDark: '#2a2f40',
    pole: '#d9dde8',
    hudBg: 'rgba(11,15,30,0.94)',
    hudLine: '#2c3557',
    text: '#eef2ff',
    textDim: '#8c97b8',
    lose: '#ff6a6a'
  };

  // ---------- 小工具 ----------
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function text(ctx, s, x, y, size, color, align, weight) {
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(3, size / 6);
    ctx.strokeStyle = 'rgba(5,8,18,0.85)';
    ctx.lineJoin = 'round';
    ctx.strokeText(s, x, y);
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }

  function arrow(ctx, x1, y1, x2, y2, color, lw, head) {
    var a = Math.atan2(y2 - y1, x2 - x1);
    head = head || 16;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lw || 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - Math.cos(a) * head * 0.6, y2 - Math.sin(a) * head * 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(a - 0.45) * head, y2 - Math.sin(a - 0.45) * head);
    ctx.lineTo(x2 - Math.cos(a + 0.45) * head, y2 - Math.sin(a + 0.45) * head);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 鑰匙形狀: 在 (x,y) 起的 32x32 方框內, 乘上 s
  function keyShape(ctx, x, y, s, lw) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    function shape() {
      ctx.beginPath();
      ctx.arc(10, 16, 8.5, 0, Math.PI * 2);
      ctx.rect(16, 13.5, 15, 5);
      ctx.rect(22, 18.5, 4, 6);
      ctx.rect(27.5, 18.5, 3.5, 8);
    }
    ctx.lineJoin = 'round';
    ctx.strokeStyle = C.keyDark;
    ctx.lineWidth = lw || 3;
    shape();
    ctx.stroke();
    ctx.fillStyle = C.key;
    shape();
    ctx.fill();
    ctx.fillStyle = C.keyDark;
    ctx.beginPath();
    ctx.arc(10, 16, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---------- 角色 / 幽靈共用剪影(40x56 碰撞框內) ----------
  // o: { x, y, facing, state, gen, hasKey, kind:'player'|'ghost', hookable }
  function figure(ctx, o) {
    var x = o.x, y = o.y;
    var f = o.facing < 0 ? -1 : 1;
    var st = o.state || 'idle';
    var ghost = o.kind === 'ghost';
    var dead = !ghost && st === 'dead';
    ctx.save();

    // 腿
    var legs;
    if (st === 'run') {
      legs = [[20 + f * 4 - 5, 44, 10, 12], [20 - f * 9 - 5, 48, 10, 8]];
    } else if (st === 'air' || st === 'launch') {
      legs = [[8, 44, 10, 8], [22, 44, 10, 8]];
    } else if (dead) {
      legs = [[3, 48, 11, 8], [26, 48, 11, 8]];
    } else {
      legs = [[8, 46, 10, 10], [22, 46, 10, 10]];
    }

    // 可鉤發光(畫在本體之前)
    if (ghost && o.hookable) {
      ctx.save();
      ctx.shadowColor = C.hookGlow;
      ctx.shadowBlur = 22;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      rr(ctx, x + 1.5, y + 1.5, 37, 53, 12);
      ctx.stroke();
      ctx.stroke();
      ctx.restore();
    }

    var fill = ghost ? (o.hookable ? 'rgba(200,240,255,0.55)' : C.ghostFill) : (dead ? C.dead : C.player);
    var legFill = ghost ? fill : (dead ? '#4e5566' : C.playerShade);
    var line = ghost ? C.ghostLine : C.playerLine;

    // 腿
    for (var i = 0; i < legs.length; i++) {
      var L = legs[i];
      rr(ctx, x + L[0], y + L[1], L[2], L[3], 3);
      ctx.fillStyle = legFill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = line;
      if (ghost) ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 身體
    rr(ctx, x + 3, y + 1, 34, 46, 13);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = line;
    if (ghost) ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 瞄準中: 角色白框(時間停住)
    if (!ghost && st === 'aim') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      rr(ctx, x + 1.5, y + 1.5, 37, 53, 12);
      ctx.stroke();
    }

    // 幽靈頭頂: 唯一可站的邊
    if (ghost) {
      ctx.fillStyle = C.ghostHead;
      rr(ctx, x, y, 40, 5, 2);
      ctx.fill();
    }

    // 眼睛
    var ex = x + 20 + f * 6;
    if (dead) {
      ctx.strokeStyle = '#1b1f2a';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      [ex - 6, ex + 6].forEach(function (cx) {
        ctx.moveTo(cx - 3.5, y + 13); ctx.lineTo(cx + 3.5, y + 20);
        ctx.moveTo(cx + 3.5, y + 13); ctx.lineTo(cx - 3.5, y + 20);
      });
      ctx.stroke();
    } else {
      var lookUp = st === 'aim' || st === 'launch' ? -2 : 0;
      [ex - 6, ex + 6].forEach(function (cx) {
        ctx.fillStyle = ghost ? 'rgba(255,255,255,0.9)' : '#ffffff';
        ctx.beginPath();
        ctx.ellipse(cx, y + 16, 3.6, 5.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ghost ? 'rgba(20,40,80,0.85)' : '#0a1a33';
        ctx.beginPath();
        ctx.arc(cx + f * 1.4, y + 16.5 + lookUp, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 代數數字(肚子)
    if (o.gen) {
      ctx.font = 'bold 16px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ghost ? C.ghostHead : (dead ? '#2a2f3c' : C.playerLine);
      ctx.fillText(String(o.gen), x + 20 - f * 4, y + 35);
    }

    // 彈射中: 身後速度線
    if (st === 'launch') {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      var bx = f > 0 ? x + 1 : x + 39;
      [24, 31, 38].forEach(function (dy, k) {
        ctx.beginPath();
        ctx.moveTo(bx, y + dy);
        ctx.lineTo(bx + f * (6 + k * 2), y + dy);
        ctx.stroke();
      });
    }

    // 手上的鑰匙(不透明, 幽靈拿的也一樣清楚)
    if (o.hasKey) {
      var kx = f > 0 ? x + 24 : x;
      keyShape(ctx, kx, y + 22, 0.5, 4);
    }

    ctx.restore();
  }

  // 「消失的那一代」: 淡虛線剪影(僅說明頁 / HUD 用)
  function vanished(ctx, x, y) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = C.ghostLine;
    ctx.lineWidth = 2;
    rr(ctx, x + 3, y + 1, 34, 46, 13);
    ctx.stroke();
    rr(ctx, x + 8, y + 46, 10, 10, 3); ctx.stroke();
    rr(ctx, x + 22, y + 46, 10, 10, 3); ctx.stroke();
    ctx.restore();
  }

  // ---------- HUD 零件(說明頁共用) ----------
  function clawIcon(ctx, cx, cy, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 9); ctx.lineTo(cx, cy + 1);
    ctx.moveTo(cx, cy + 1); ctx.quadraticCurveTo(cx - 8, cy + 2, cx - 7, cy + 9);
    ctx.moveTo(cx, cy + 1); ctx.quadraticCurveTo(cx + 8, cy + 2, cx + 7, cy + 9);
    ctx.stroke();
    ctx.restore();
  }

  function hudHooks(ctx, x, y, left, max) {
    text(ctx, '鉤爪', x, y + 12, 17, C.textDim, 'left', 'bold');
    for (var i = 0; i < max; i++) {
      var cx = x + 17 + i * 42, cy = y + 46;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, 17, 0, Math.PI * 2);
      if (i < left) {
        ctx.fillStyle = C.aim;
        ctx.fill();
        ctx.restore();
        clawIcon(ctx, cx, cy, C.playerLine);
      } else {
        ctx.fillStyle = '#151b30';
        ctx.fill();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#3d4870';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        clawIcon(ctx, cx, cy, '#3d4870');
      }
    }
  }

  function hudKey(ctx, x, y, hasKey) {
    text(ctx, '鑰匙', x, y + 12, 17, C.textDim, 'left', 'bold');
    ctx.save();
    rr(ctx, x, y + 26, 40, 40, 8);
    if (hasKey) {
      ctx.fillStyle = 'rgba(255,204,51,0.18)';
      ctx.fill();
      ctx.strokeStyle = C.key;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      keyShape(ctx, x + 4, y + 30, 1, 3);
    } else {
      ctx.fillStyle = '#151b30';
      ctx.fill();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#3d4870';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  function pauseBars(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y - 9, 5, 18);
    ctx.fillRect(x + 9, y - 9, 5, 18);
  }

  function aimPrompt(ctx, cx, cy, w) {
    ctx.save();
    rr(ctx, cx - w / 2, cy - 16, w, 32, 16);
    ctx.fillStyle = C.aim;
    ctx.fill();
    pauseBars(ctx, cx - w / 2 + 16, cy, C.playerLine);
    ctx.font = 'bold 21px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.playerLine;
    ctx.fillText('時間暫停  Z 彈出 / X 取消', cx + 10, cy + 1);
    ctx.restore();
  }

  function timeStopFrame(ctx, x, y, w, h) {
    ctx.save();
    ctx.strokeStyle = 'rgba(127,240,255,0.75)';
    ctx.lineWidth = 6;
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
    ctx.fillStyle = 'rgba(127,240,255,0.06)';
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  function genRow(ctx, x, y, gen, maxGen, allGhost) {
    for (var i = 1; i <= maxGen; i++) {
      var fx = (x + (i - 1) * 32) / 0.6, fy = y / 0.6;
      ctx.save();
      ctx.scale(0.6, 0.6);
      if (allGhost) {
        figure(ctx, { x: fx, y: fy, facing: 1, state: 'idle', kind: 'ghost' });
      } else if (i === gen) {
        figure(ctx, { x: fx, y: fy, facing: 1, state: 'idle', kind: 'player' });
      } else if (i === gen - 1) {
        figure(ctx, { x: fx, y: fy, facing: 1, state: 'idle', kind: 'ghost' });
      } else if (i < gen - 1) {
        vanished(ctx, fx, fy);
      } else {
        ctx.strokeStyle = '#3d4870';
        ctx.lineWidth = 2.5;
        rr(ctx, fx + 3, fy + 1, 34, 55, 13);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ---------- 匯出 ----------
  var Art = {
    canvas: { width: 720, height: 1280 },
    palette: {
      bg: C.bg, player: C.player, ghost: C.ghostLine, path: C.path, aim: C.aim, hook: C.hook,
      platform: C.slabTop, spike: C.spike, lift: C.lift, gate: C.gate, key: C.key, lock: C.lockFill,
      goal: C.goalLight, text: C.text, textDim: C.textDim, hudBg: C.hudBg
    },

    drawBackground: function (ctx) {
      ctx.save();
      var g = ctx.createLinearGradient(0, 0, 0, 1280);
      g.addColorStop(0, C.bg);
      g.addColorStop(1, C.bg2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 720, 1280);
      // 遠景點點(固定位置)
      ctx.fillStyle = 'rgba(200,210,255,0.12)';
      for (var i = 0; i < 40; i++) {
        var sx = (i * 173) % 720, sy = 110 + ((i * 97) % 1050);
        ctx.fillRect(sx, sy, 2, 2);
      }
      // 升降台軌道(綠, 低權重): 標出電梯會跑的範圍
      ctx.strokeStyle = 'rgba(63,212,106,0.22)';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(486, 780); ctx.lineTo(486, 1200);
      ctx.moveTo(594, 780); ctx.lineTo(594, 1200);
      ctx.stroke();
      ctx.setLineDash([]);
      // 坑(右下): 深色往下
      var pg = ctx.createLinearGradient(0, 1200, 0, 1280);
      pg.addColorStop(0, 'rgba(7,8,15,0.4)');
      pg.addColorStop(1, C.pit);
      ctx.fillStyle = pg;
      ctx.fillRect(600, 1200, 120, 80);
      ctx.restore();
    },

    drawPlatform: function (ctx, s) {
      ctx.save();
      if (s.h >= 48) {
        // 實心地面
        ctx.fillStyle = C.ground;
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = C.groundTop;
        ctx.fillRect(s.x, s.y, s.w, 8);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (var bx = s.x + 30; bx < s.x + s.w; bx += 60) {
          ctx.moveTo(bx, s.y + 20); ctx.lineTo(bx + 14, s.y + 20);
          ctx.moveTo(bx + 30, s.y + 44); ctx.lineTo(bx + 44, s.y + 44);
        }
        ctx.stroke();
      } else {
        // 單向平台: 實心頂面 + 半透明身體 + 虛線底邊(下方可穿過)
        ctx.fillStyle = C.slab;
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = C.slabTop;
        ctx.fillRect(s.x, s.y, s.w, 6);
        ctx.strokeStyle = 'rgba(179,192,216,0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y + s.h - 1);
        ctx.lineTo(s.x + s.w, s.y + s.h - 1);
        ctx.stroke();
      }
      ctx.restore();
    },

    drawSpike: function (ctx, s) {
      var w = s.w || 60, h = 24;
      ctx.save();
      ctx.fillStyle = C.spikeBase;
      ctx.fillRect(s.x, s.y + h - 5, w, 5);
      var n = Math.max(1, Math.round(w / 12)), tw = w / n;
      ctx.fillStyle = C.spike;
      ctx.strokeStyle = '#ffb0b0';
      ctx.lineWidth = 1.5;
      for (var i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.moveTo(s.x + i * tw, s.y + h - 4);
        ctx.lineTo(s.x + i * tw + tw / 2, s.y);
        ctx.lineTo(s.x + (i + 1) * tw, s.y + h - 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    },

    drawPlate: function (ctx, s) {
      var col = s.kind === 'gate' ? C.gate : C.lift;
      ctx.save();
      // 底座
      rr(ctx, s.x, s.y + 7, 80, 5, 2);
      ctx.fillStyle = '#10131f';
      ctx.fill();
      if (s.pressed) {
        ctx.shadowColor = col;
        ctx.shadowBlur = 16;
        rr(ctx, s.x + 2, s.y + 6, 76, 6, 2);
        ctx.fillStyle = col;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillRect(s.x + 6, s.y + 6, 68, 2);
      } else {
        rr(ctx, s.x + 2, s.y, 76, 10, 3);
        ctx.fillStyle = s.kind === 'gate' ? C.gateDark : C.liftDark;
        ctx.fill();
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.stroke();
        // 種類記號: 升降台 = 向上箭頭, 門 = 兩根門柵
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (s.kind === 'gate') {
          ctx.moveTo(s.x + 36, s.y + 2); ctx.lineTo(s.x + 36, s.y + 8);
          ctx.moveTo(s.x + 44, s.y + 2); ctx.lineTo(s.x + 44, s.y + 8);
        } else {
          ctx.moveTo(s.x + 34, s.y + 8); ctx.lineTo(s.x + 40, s.y + 2); ctx.lineTo(s.x + 46, s.y + 8);
        }
        ctx.stroke();
      }
      ctx.restore();
    },

    drawLift: function (ctx, s) {
      ctx.save();
      if (s.active) {
        ctx.shadowColor = C.lift;
        ctx.shadowBlur = 14;
      }
      ctx.fillStyle = s.active ? C.lift : C.liftDark;
      ctx.fillRect(s.x, s.y, 120, 24);
      ctx.shadowBlur = 0;
      ctx.fillStyle = s.active ? '#c8ffd8' : C.lift;
      ctx.fillRect(s.x, s.y, 120, 5);
      ctx.strokeStyle = C.lift;
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x + 1, s.y + 1, 118, 22);
      // 向上箭頭(亮 = 正被驅動)
      ctx.strokeStyle = s.active ? '#ffffff' : 'rgba(63,212,106,0.6)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      [30, 60, 90].forEach(function (dx) {
        ctx.moveTo(s.x + dx - 8, s.y + 19);
        ctx.lineTo(s.x + dx, s.y + 11);
        ctx.lineTo(s.x + dx + 8, s.y + 19);
      });
      ctx.stroke();
      ctx.restore();
    },

    drawGate: function (ctx, s) {
      var x = s.x, y = s.y, w = 24, h = 220;
      ctx.save();
      if (s.open) {
        ctx.strokeStyle = 'rgba(196,107,255,0.55)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        ctx.setLineDash([]);
        ctx.fillStyle = C.gate;
        ctx.fillRect(x, y, w, 10);
        ctx.fillRect(x, y + h - 6, w, 6);
      } else {
        ctx.fillStyle = C.gateDark;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = C.gate;
        ctx.fillRect(x + 4, y, 5, h);
        ctx.fillRect(x + 15, y, 5, h);
        ctx.fillRect(x, y, w, 10);
        ctx.fillRect(x, y + h - 6, w, 6);
        ctx.strokeStyle = '#e8c4ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      }
      ctx.restore();
    },

    drawLock: function (ctx, s) {
      var x = s.x, y = s.y, w = 24, h = 220, cx = x + 12, cy = y + 110;
      ctx.save();
      if (s.open) {
        ctx.strokeStyle = 'rgba(255,204,51,0.55)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        ctx.setLineDash([]);
        ctx.fillStyle = C.key;
        ctx.fillRect(x, y, w, 10);
        ctx.fillRect(x, y + h - 6, w, 6);
        // 打開的掛鎖
        ctx.strokeStyle = C.key;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx - 4, cy - 10, 6, Math.PI, Math.PI * 2);
        ctx.moveTo(cx - 10, cy - 10); ctx.lineTo(cx - 10, cy - 4);
        ctx.stroke();
        rr(ctx, cx - 9, cy - 3, 18, 14, 3);
        ctx.fillStyle = C.key;
        ctx.fill();
      } else {
        ctx.fillStyle = C.lockFill;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = C.key;
        ctx.fillRect(x, y, w, 10);
        ctx.fillRect(x, y + h - 6, w, 6);
        ctx.strokeStyle = '#ffe08a';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        // 鑰匙孔
        ctx.fillStyle = C.keyDark;
        ctx.beginPath();
        ctx.arc(cx, cy - 6, 5.5, 0, Math.PI * 2);
        ctx.moveTo(cx - 3, cy - 3);
        ctx.lineTo(cx + 3, cy - 3);
        ctx.lineTo(cx + 5, cy + 12);
        ctx.lineTo(cx - 5, cy + 12);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },

    drawKey: function (ctx, s) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,204,51,0.18)';
      ctx.beginPath();
      ctx.arc(s.x + 16, s.y + 16, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = C.key;
      ctx.shadowBlur = 12;
      keyShape(ctx, s.x, s.y, 1, 3);
      ctx.restore();
    },

    drawGoal: function (ctx, s) {
      var x = s.x, y = s.y;
      ctx.save();
      ctx.fillStyle = C.pole;
      ctx.fillRect(x + 5, y + 4, 4, 72);
      ctx.fillStyle = '#7f879c';
      rr(ctx, x, y + 74, 16, 6, 2);
      ctx.fill();
      ctx.fillStyle = C.pole;
      ctx.beginPath();
      ctx.arc(x + 7, y + 4, 4, 0, Math.PI * 2);
      ctx.fill();
      // 方格旗
      var fx = x + 9, fy = y + 6, cw = 39 / 5, ch = 30 / 3;
      for (var r = 0; r < 3; r++) {
        for (var c = 0; c < 5; c++) {
          ctx.fillStyle = (r + c) % 2 === 0 ? C.goalLight : C.goalDark;
          ctx.fillRect(fx + c * cw, fy + r * ch, c === 4 ? cw : cw + 0.5, ch + 0.5);
        }
      }
      ctx.strokeStyle = C.goalLight;
      ctx.lineWidth = 2;
      ctx.strokeRect(fx, fy, 39, 30);
      ctx.restore();
    },

    drawGhostPath: function (ctx, s) {
      var segs = s.segments || [];
      ctx.save();
      ctx.strokeStyle = C.path;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([2, 7]);
      var last = null, prev = null;
      for (var i = 0; i < segs.length; i++) {
        var seg = segs[i];
        if (!seg || seg.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(seg[0].x, seg[0].y);
        for (var j = 1; j < seg.length; j++) ctx.lineTo(seg[j].x, seg[j].y);
        ctx.stroke();
        last = seg[seg.length - 1];
        prev = seg[Math.max(0, seg.length - 6)];
      }
      ctx.setLineDash([]);
      // 終點小箭頭(方向)
      if (last && prev && (last.x !== prev.x || last.y !== prev.y)) {
        var a = Math.atan2(last.y - prev.y, last.x - prev.x);
        ctx.fillStyle = C.path;
        ctx.beginPath();
        ctx.moveTo(last.x + Math.cos(a) * 6, last.y + Math.sin(a) * 6);
        ctx.lineTo(last.x + Math.cos(a + 2.5) * 9, last.y + Math.sin(a + 2.5) * 9);
        ctx.lineTo(last.x + Math.cos(a - 2.5) * 9, last.y + Math.sin(a - 2.5) * 9);
        ctx.closePath();
        ctx.fill();
      } else if (last) {
        ctx.fillStyle = C.path;
        ctx.beginPath();
        ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },

    drawGhost: function (ctx, s) {
      figure(ctx, { x: s.x, y: s.y, facing: s.facing, state: s.state, gen: s.gen, hasKey: s.hasKey, hookable: s.hookable, kind: 'ghost' });
    },

    drawHook: function (ctx, s) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(5,8,18,0.8)';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
      ctx.strokeStyle = C.hook;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
      // 爪頭
      var a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
      ctx.translate(s.x2, s.y2);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(-4, 0); ctx.quadraticCurveTo(4, -2, 6, -9);
      ctx.moveTo(-4, 0); ctx.quadraticCurveTo(4, 2, 6, 9);
      ctx.stroke();
      ctx.fillStyle = C.hook;
      ctx.beginPath(); ctx.arc(-4, 0, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },

    drawPlayer: function (ctx, s) {
      figure(ctx, { x: s.x, y: s.y, facing: s.facing, state: s.state, gen: s.gen, hasKey: s.hasKey, kind: 'player' });
    },

    drawAim: function (ctx, s) {
      var full = s.charge >= 1;
      ctx.save();
      // 方向虛線: 角色中心 → 幽靈中心
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(s.px, s.py); ctx.lineTo(s.gx, s.gy);
      ctx.stroke();
      ctx.setLineDash([]);
      // 力道箭頭: 深色襯底 + 亮色
      arrow(ctx, s.px, s.py, s.ax, s.ay, 'rgba(5,8,18,0.8)', 10, 26);
      if (full) {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 14;
      }
      arrow(ctx, s.px, s.py, s.ax, s.ay, full ? '#ffffff' : C.aim, 6, 22);
      ctx.restore();
    },

    drawHud: function (ctx, s) {
      ctx.save();
      var phase = s.phase || 'play';

      if (s.aiming) timeStopFrame(ctx, 0, 100, 720, 1180);

      // 上方 HUD 帶
      ctx.fillStyle = C.hudBg;
      ctx.fillRect(0, 0, 720, 100);
      ctx.fillStyle = C.hudLine;
      ctx.fillRect(0, 99, 720, 1);

      if (phase === 'win') {
        text(ctx, '過關!', 20, 36, 36, C.text, 'left');
        text(ctx, '三代合力回放', 20, 78, 20, C.aim, 'left');
        genRow(ctx, 210, 26, 3, s.maxGen || 3, true);
        text(ctx, '空白鍵 重來', 700, 50, 24, C.text, 'right');
      } else {
        // 代數
        text(ctx, '第 ' + s.gen + ' / ' + (s.maxGen || 3) + ' 代', 16, 14, 17, C.textDim, 'left');
        genRow(ctx, 16, 30, s.gen, s.maxGen || 3, false);
        hudHooks(ctx, 150, 2, s.hookLeft, s.hookMax || 2);
        hudKey(ctx, 262, 2, !!s.hasKey);
        text(ctx, 'R 整關重來', 704, 22, 17, C.textDim, 'right');
        if (s.aiming) {
          aimPrompt(ctx, 520, 62, 360);
        } else {
          text(ctx, '←→ 走  空白/↑ 跳  Z 鉤', 704, 62, 17, C.textDim, 'right');
        }
      }
      ctx.restore();

      if (phase === 'lose') {
        ctx.save();
        ctx.fillStyle = 'rgba(8,10,20,0.84)';
        ctx.fillRect(0, 0, 720, 1280);
        text(ctx, '失敗', 360, 560, 72, C.lose, 'center');
        text(ctx, '三個人都倒下了', 360, 650, 30, C.text, 'center');
        text(ctx, '空白鍵 重來', 360, 730, 30, C.aim, 'center');
        ctx.restore();
      }
    }
  };

  // ---------- 說明頁 ----------
  var PAGES = [
    { t: '走到旗子', d: '←→ 走、空白鍵跳、R 整關重來' },
    { t: '先死一次', d: '一個人到不了, 要先死一次' },
    { t: '死了變幽靈', d: '死掉的你會一直重演' },
    { t: '踩幽靈', d: '幽靈的頭能站, 還會載你走' },
    { t: '鉤幽靈', d: '幽靈發光時按 Z 瞄準, 每人 2 次' },
    { t: '開關', d: '有人踩住, 同色的東西才會動' },
    { t: '接力鑰匙', d: '鑰匙只有一把, 碰幽靈就能接過來' },
    { t: '只看得見上一個人', d: '共三人, 只看得見上一個的幽靈' }
  ];

  function scene(ctx, ox, oy, s, fn) {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    fn();
    ctx.restore();
  }

  function keycap(ctx, x, y, w, label) {
    ctx.save();
    rr(ctx, x, y + 4, w, 40, 8);
    ctx.fillStyle = '#0b0f1e';
    ctx.fill();
    rr(ctx, x, y, w, 40, 8);
    ctx.fillStyle = '#e6ebf7';
    ctx.fill();
    ctx.font = 'bold 22px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#141a33';
    ctx.fillText(label, x + w / 2, y + 21);
    ctx.restore();
  }

  function markOK(ctx, cx, cy) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(5,8,18,0.8)'; ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.stroke();
    ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 14, cy + 1); ctx.lineTo(cx - 4, cy + 12); ctx.lineTo(cx + 15, cy - 11); ctx.stroke();
    ctx.restore();
  }

  function markNG(ctx, cx, cy) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(5,8,18,0.8)'; ctx.fill();
    ctx.strokeStyle = C.lose; ctx.lineWidth = 4; ctx.stroke();
    ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 12, cy - 12); ctx.lineTo(cx + 12, cy + 12);
    ctx.moveTo(cx + 12, cy - 12); ctx.lineTo(cx - 12, cy + 12); ctx.stroke();
    ctx.restore();
  }

  function panel(ctx, x, y, w, h) {
    ctx.save();
    rr(ctx, x, y, w, h, 14);
    ctx.fillStyle = '#10162b';
    ctx.fill();
    ctx.strokeStyle = '#2c3557';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function clip(ctx, x, y, w, h) {
    rr(ctx, x, y, w, h, 14);
    ctx.clip();
  }

  var GP = [];

  // 1 走到旗子
  GP[0] = function (ctx) {
    var s = 0.62, ox = (720 - 720 * s) / 2, oy = 300 - 120 * s;
    scene(ctx, ox, oy, s, function () {
      Art.drawPlatform(ctx, { x: 0, y: 1200, w: 600, h: 80 });
      Art.drawPlatform(ctx, { x: 0, y: 780, w: 480, h: 24 });
      Art.drawPlatform(ctx, { x: 240, y: 360, w: 480, h: 24 });
      Art.drawLock(ctx, { x: 600, y: 140, open: false });
      Art.drawGoal(ctx, { x: 656, y: 280 });
      Art.drawPlayer(ctx, { x: 60, y: 1144, facing: 1, state: 'idle', gen: 1, hasKey: false });
    });
    var gy = oy + 1200 * s; // 地面螢幕 y
    var cy = gy - 92;
    keycap(ctx, 232, cy, 40, '←');
    keycap(ctx, 278, cy, 40, '→');
    keycap(ctx, 340, cy, 92, '空白鍵');
    keycap(ctx, 454, cy, 40, 'R');
    text(ctx, '走', 298, cy + 62, 17, C.textDim, 'center');
    text(ctx, '跳', 386, cy + 62, 17, C.textDim, 'center');
    text(ctx, '重來', 474, cy + 62, 17, C.textDim, 'center');
  };

  // 2 先死一次
  GP[1] = function (ctx) {
    // 左: 跳不上去
    ctx.save();
    clip(ctx, 36, 252, 318, 900);
    Art.drawPlatform(ctx, { x: 36, y: 1100, w: 318, h: 80 });
    Art.drawPlatform(ctx, { x: 90, y: 680, w: 264, h: 24 });
    // 跳躍弧(虛線)
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(80, 1072);
    ctx.quadraticCurveTo(110, 820, 130, 904);
    ctx.stroke();
    ctx.setLineDash([]);
    Art.drawPlayer(ctx, { x: 110, y: 876, facing: 1, state: 'air', gen: 1, hasKey: false });
    // 差距
    ctx.strokeStyle = C.lose; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(130, 870); ctx.lineTo(130, 708); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    markNG(ctx, 220, 790);

    // 右: 掉進坑
    ctx.save();
    clip(ctx, 366, 252, 318, 900);
    Art.drawPlatform(ctx, { x: 366, y: 1100, w: 150, h: 80 });
    ctx.fillStyle = C.pit;
    ctx.fillRect(516, 1100, 168, 80);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(420, 1072); ctx.lineTo(520, 1072); ctx.quadraticCurveTo(570, 1072, 584, 1120);
    ctx.stroke();
    ctx.setLineDash([]);
    Art.drawPlayer(ctx, { x: 560, y: 1094, facing: 1, state: 'air', gen: 1, hasKey: false });
    arrow(ctx, 640, 1020, 640, 1140, '#ffffff', 4, 16);
    ctx.restore();
    markOK(ctx, 590, 900);
    text(ctx, '跳不上去', 195, 300, 22, C.text, 'center');
    text(ctx, '死掉才是往前走', 525, 300, 22, C.text, 'center');
  };

  // 3 死了變幽靈
  GP[2] = function (ctx) {
    Art.drawPlatform(ctx, { x: 36, y: 1080, w: 648, h: 80 });
    var pts = [];
    var gx = 260, gyc = 1052;
    for (var x = gx; x <= 400; x += 4) pts.push({ x: x, y: gyc });
    for (var t = 0; t <= 1.0001; t += 0.025) {
      pts.push({ x: 400 + 140 * t, y: gyc - 4 * 168 * t * (1 - t) });
    }
    for (var x2 = 544; x2 <= 620; x2 += 4) pts.push({ x: x2, y: gyc });
    Art.drawGhostPath(ctx, { segments: [pts] });
    Art.drawGhost(ctx, { x: 240, y: 1024, facing: 1, state: 'run', gen: 1, hookable: false, hasKey: false });
    Art.drawPlayer(ctx, { x: 70, y: 1024, facing: 1, state: 'idle', gen: 2, hasKey: false });
    text(ctx, '新的你', 90, 990, 20, C.text, 'center');
    text(ctx, '上一個你', 260, 990, 20, C.ghostHead, 'center');
    text(ctx, '接下來 5 秒', 470, 840, 18, C.textDim, 'center');
  };

  // 4 踩幽靈
  GP[3] = function (ctx) {
    var s = 1.4, ox = 360 - 20 * s - 40, oy = 720;
    scene(ctx, ox, oy, s, function () {
      // 幽靈腳底離地 150(< 一般跳 168, 合法的跳躍中)
      Art.drawPlatform(ctx, { x: -220, y: 206, w: 480, h: 60 });
      Art.drawGhost(ctx, { x: 0, y: 0, facing: 1, state: 'air', gen: 1, hookable: false, hasKey: false });
      Art.drawPlayer(ctx, { x: 0, y: -56, facing: 1, state: 'idle', gen: 2, hasKey: false });
    });
    // 一起往上
    arrow(ctx, 430, 960, 430, 620, '#ffffff', 5, 22);
    arrow(ctx, 230, 960, 230, 620, '#ffffff', 5, 22);
    // 頭頂指認(箭頭尖碰到頭頂邊)
    text(ctx, '頭頂能站', 470, 722, 20, C.ghostHead, 'left');
    arrow(ctx, 462, 722, 352, 722, C.ghostHead, 3, 12);
  };

  // 5 鉤幽靈
  GP[4] = function (ctx) {
    timeStopFrame(ctx, 24, 236, 672, 928);
    Art.drawPlatform(ctx, { x: 36, y: 1080, w: 648, h: 80 });
    var px = 320, py = 1052, gxc = 400, gyc = 920;
    var dx = gxc - px, dy = gyc - py, d = Math.sqrt(dx * dx + dy * dy);
    var len = 1700 * (0.3 + 0.7 * 0.75) * 0.3;
    Art.drawGhost(ctx, { x: 380, y: 892, facing: 1, state: 'air', gen: 1, hookable: true, hasKey: false });
    Art.drawPlayer(ctx, { x: 300, y: 1024, facing: 1, state: 'aim', gen: 2, hasKey: false });
    Art.drawAim(ctx, { px: px, py: py, gx: gxc, gy: gyc, ax: px + dx / d * len, ay: py + dy / d * len, charge: 0.75 });
    aimPrompt(ctx, 400, 300, 360);
    hudHooks(ctx, 48, 252, 2, 2);
    text(ctx, '發光 = 可以鉤', 470, 960, 20, C.ghostHead, 'left');
    text(ctx, '箭頭越長飛越遠', 560, 640, 20, C.aim, 'center');
  };

  // 6 開關
  GP[5] = function (ctx) {
    var cols = [40, 370], rows = [300, 730], s = 0.7;
    text(ctx, '沒人踩', 195, 258, 22, C.textDim, 'center');
    text(ctx, '有人踩住', 525, 258, 22, C.text, 'center');
    for (var c = 0; c < 2; c++) {
      var pressed = c === 1;
      // 上組: 升降台
      (function (cx, cy) {
        panel(ctx, cx, cy, 310, 420);
        scene(ctx, cx + 20, cy + 10, s, function () {
          ctx.strokeStyle = 'rgba(63,212,106,0.22)';
          ctx.lineWidth = 3;
          ctx.setLineDash([10, 8]);
          ctx.beginPath();
          ctx.moveTo(246, 80); ctx.lineTo(246, 500);
          ctx.moveTo(354, 80); ctx.lineTo(354, 500);
          ctx.stroke();
          ctx.setLineDash([]);
          Art.drawPlatform(ctx, { x: 0, y: 500, w: 360, h: 60 });
          Art.drawPlate(ctx, { x: 30, y: 488, pressed: pressed, kind: 'lift' });
          Art.drawLift(ctx, { x: 240, y: pressed ? 80 : 500, active: pressed });
          if (pressed) arrow(ctx, 200, 440, 200, 140, '#ffffff', 6, 24);
        });
      })(cols[c], rows[0] - 20);
      // 下組: 門
      (function (cx, cy) {
        panel(ctx, cx, cy, 310, 420);
        scene(ctx, cx + 20, cy + 30, s, function () {
          Art.drawPlatform(ctx, { x: 0, y: 420, w: 360, h: 24 });
          Art.drawPlate(ctx, { x: 30, y: 408, pressed: pressed, kind: 'gate' });
          Art.drawGate(ctx, { x: 260, y: 200, open: pressed });
        });
      })(cols[c], rows[1] - 10);
    }
  };

  // 7 接力鑰匙
  GP[6] = function (ctx) {
    var gy = 1060, cells = [30, 255, 480];
    for (var i = 0; i < 3; i++) {
      panel(ctx, cells[i], 300, 210, 820);
      Art.drawPlatform(ctx, { x: cells[i] + 2, y: gy, w: 206, h: 24 });
    }
    // 1: 幽靈拿著鑰匙, 角色空手走向它
    var a = cells[0];
    Art.drawGhost(ctx, { x: a + 140, y: gy - 56, facing: -1, state: 'idle', gen: 1, hookable: false, hasKey: true });
    Art.drawPlayer(ctx, { x: a + 22, y: gy - 56, facing: 1, state: 'run', gen: 2, hasKey: false });
    arrow(ctx, a + 72, gy - 90, a + 128, gy - 90, '#ffffff', 4, 14);
    // 2: 碰到 → 角色拿到
    var b = cells[1];
    Art.drawGhost(ctx, { x: b + 100, y: gy - 56, facing: 1, state: 'idle', gen: 1, hookable: false, hasKey: true });
    Art.drawPlayer(ctx, { x: b + 70, y: gy - 56, facing: 1, state: 'idle', gen: 2, hasKey: true });
    ctx.save();
    ctx.strokeStyle = C.key; ctx.lineWidth = 3; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(b + 102, gy - 26, 15, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    text(ctx, '拿到了!', b + 80, gy - 170, 24, C.key, 'center');
    arrow(ctx, b + 86, gy - 150, b + 100, gy - 42, C.key, 3, 12);
    // 3: 帶鑰匙碰鎖 → 鎖開
    var c3 = cells[2];
    Art.drawLock(ctx, { x: c3 + 150, y: gy - 220, open: true });
    Art.drawPlayer(ctx, { x: c3 + 110, y: gy - 56, facing: 1, state: 'run', gen: 2, hasKey: true });
    text(ctx, '鎖開了', c3 + 105, gy - 290, 24, C.key, 'center');
    // 格間箭頭
    arrow(ctx, 238, 700, 252, 700, C.textDim, 3, 10);
    arrow(ctx, 463, 700, 477, 700, C.textDim, 3, 10);
  };

  // 8 只看得見上一個人
  GP[7] = function (ctx) {
    var s = 1.4, xs = [140, 360, 580], top = 300;
    scene(ctx, 0, 0, s, function () {
      vanished(ctx, (xs[0] - 28) / s, top / s);
      Art.drawGhost(ctx, { x: (xs[1] - 28) / s, y: top / s, facing: 1, state: 'idle', gen: 2, hookable: false, hasKey: false });
      Art.drawPlayer(ctx, { x: (xs[2] - 28) / s, y: top / s, facing: 1, state: 'idle', gen: 3, hasKey: false });
    });
    text(ctx, '1', xs[0], 410, 30, C.textDim, 'center');
    text(ctx, '2', xs[1], 410, 30, C.ghostHead, 'center');
    text(ctx, '3', xs[2], 410, 30, C.player, 'center');
    text(ctx, '看不見', xs[0], 450, 20, C.textDim, 'center');
    text(ctx, '幽靈', xs[1], 450, 20, C.ghostHead, 'center');
    text(ctx, '輪到你', xs[2], 450, 20, C.text, 'center');

    panel(ctx, 40, 500, 640, 640);
    var ss = 0.75, ox = 360 - 330 * ss, oy = 100;
    scene(ctx, ox, oy, ss, function () {
      Art.drawPlatform(ctx, { x: 0, y: 1200, w: 660, h: 80 });
      Art.drawPlate(ctx, { x: 160, y: 1188, pressed: false, kind: 'lift' });
      Art.drawLift(ctx, { x: 480, y: 1200, active: false });
      // 看不見的升降台(升起位置, 虛線)
      ctx.save();
      ctx.strokeStyle = 'rgba(63,212,106,0.7)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(480, 900, 120, 24);
      ctx.restore();
      vanished(ctx, 180, 1144);
      Art.drawGhost(ctx, { x: 520, y: 844, facing: -1, state: 'idle', gen: 2, hookable: false, hasKey: false });
      Art.drawPlayer(ctx, { x: 330, y: 1144, facing: 1, state: 'idle', gen: 3, hasKey: false });
      arrow(ctx, 640, 1100, 640, 820, '#ffffff', 6, 24);
    });
    text(ctx, '它搭的電梯, 是你看不見的 1 號開的', 360, 1110, 20, C.textDim, 'center');
  };

  Art.drawGuidePage = function (ctx, state) {
    var n = PAGES.length;
    var p = Math.max(0, Math.min(n - 1, (state && state.page) | 0));
    ctx.save();
    var g = ctx.createLinearGradient(0, 0, 0, 1280);
    g.addColorStop(0, C.bg);
    g.addColorStop(1, C.bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 720, 1280);
    text(ctx, '說明 ' + (p + 1) + ' / ' + n, 360, 56, 20, C.textDim, 'center');
    text(ctx, PAGES[p].t, 360, 124, 44, C.text, 'center');
    text(ctx, PAGES[p].d, 360, 188, 28, C.aim, 'center', 'bold');
    panel(ctx, 24, 236, 672, 928);
    ctx.save();
    clip(ctx, 24, 236, 672, 928);
    GP[p](ctx);
    ctx.restore();
    // 頁碼點
    for (var i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.arc(360 - (n - 1) * 12 + i * 24, 1196, i === p ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = i === p ? C.text : '#3d4870';
      ctx.fill();
    }
    text(ctx, p === n - 1 ? '空白鍵 開始遊戲' : '空白鍵 下一頁', 360, 1240, 26, C.text, 'center');
    ctx.restore();
  };

  window.Art = Art;
})();
