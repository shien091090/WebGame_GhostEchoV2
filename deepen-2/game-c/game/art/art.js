// 起跑哨 — 美術繪圖模組(全 Canvas 2D 幾何, 無外部資源)
// 契約: 依 interface.json; 每個函式自己 save / restore。
(function () {
  'use strict';

  var W = 720, H = 1280, HUD_H = 100;

  var C = {
    bg: '#121826',
    bgTop: '#1b2440',
    hudBg: '#0a0e18',
    hudLine: '#2a3350',
    ground: '#2b3042',
    groundTop: '#7c849c',
    platform: '#4b5470',
    platformTop: '#b3bdd8',
    player: '#fff1d0',
    playerDead: '#8a8f9e',
    outline: '#141420',
    visor: '#1d2233',
    ghost: '#a8c4ff',
    ghostEdge: '#e6eeff',
    path: '#a8c4ff',
    whistle: '#ffffff',
    hook: '#a6ff4d',
    lift: '#36d6e7',
    liftDim: '#1d7c87',
    gate: '#e05cff',
    gateDim: '#7a3290',
    spike: '#ff4d4d',
    goal: '#ffd23f',
    text: '#eef1f8',
    textDim: '#8a93ad',
    danger: '#ff4d4d',
    ok: '#ffffff'
  };

  var FONT = '"Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif';

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

  function text(ctx, s, x, y, size, color, align, weight) {
    ctx.save();
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size / 6);
    ctx.strokeStyle = 'rgba(8,10,18,0.9)';
    ctx.strokeText(s, x, y);
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
    ctx.restore();
  }

  function keycap(ctx, label, x, y, size) {
    // x,y 為中心
    size = size || 40;
    ctx.save();
    ctx.font = 'bold ' + Math.round(size * 0.5) + 'px ' + FONT;
    var w = Math.max(size, ctx.measureText(label).width + size * 0.5);
    rr(ctx, x - w / 2, y - size / 2, w, size, 7);
    ctx.fillStyle = '#e9ecf5';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#5a6380';
    ctx.stroke();
    ctx.fillStyle = '#1a1f2e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 1);
    ctx.restore();
    return w;
  }

  function arrow(ctx, x1, y1, x2, y2, color, width, head) {
    var a = Math.atan2(y2 - y1, x2 - x1);
    head = head || 16;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // 深色襯底
    ctx.strokeStyle = 'rgba(8,10,18,0.85)';
    ctx.lineWidth = width + 5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - Math.cos(a) * head * 0.6, y2 - Math.sin(a) * head * 0.6);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(a - 0.45) * head, y2 - Math.sin(a - 0.45) * head);
    ctx.lineTo(x2 - Math.cos(a + 0.45) * head, y2 - Math.sin(a + 0.45) * head);
    ctx.closePath();
    ctx.fillStyle = 'rgba(8,10,18,0.85)';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(8,10,18,0.85)';
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function mark(ctx, kind, x, y, r) {
    // kind: 'ok' 白勾 / 'no' 紅叉
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,10,18,0.85)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = kind === 'ok' ? C.ok : C.danger;
    ctx.stroke();
    ctx.lineWidth = r * 0.28;
    ctx.beginPath();
    if (kind === 'ok') {
      ctx.moveTo(x - r * 0.45, y + r * 0.02);
      ctx.lineTo(x - r * 0.1, y + r * 0.38);
      ctx.lineTo(x + r * 0.5, y - r * 0.35);
    } else {
      ctx.moveTo(x - r * 0.4, y - r * 0.4);
      ctx.lineTo(x + r * 0.4, y + r * 0.4);
      ctx.moveTo(x + r * 0.4, y - r * 0.4);
      ctx.lineTo(x - r * 0.4, y + r * 0.4);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ---------- 角色剪影(玩家與幽靈共用, 同一個人) ----------
  // 40 x 56 框內: 身體 (3,1)~(37,46); 腳 y 46~56
  function feet(state, facing) {
    if (state === 'air' || state === 'launch' || state === 'aim_air') {
      return [[8, 42, 10, 8], [22, 42, 10, 8]];
    }
    if (state === 'run') {
      return facing > 0 ? [[4, 46, 11, 10], [25, 44, 11, 10]] : [[25, 46, 11, 10], [4, 44, 11, 10]];
    }
    return [[7, 46, 11, 10], [22, 46, 11, 10]];
  }

  function drawFigure(ctx, x, y, facing, state, gen, mode, hookable) {
    // mode: 'player' | 'ghost' | 'gone'(說明頁: 消失的上一代)
    facing = facing < 0 ? -1 : 1;
    var dead = mode === 'player' && state === 'dead';
    var fs = feet(state, facing);
    var i;
    ctx.save();
    ctx.translate(x, y);

    if (mode === 'gone') {
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(168,196,255,0.35)';
      rr(ctx, 3, 1, 34, 45, 12);
      ctx.stroke();
      for (i = 0; i < 2; i++) { ctx.strokeRect(fs[i][0], fs[i][1], fs[i][2], fs[i][3]); }
      ctx.restore();
      return;
    }

    var isGhost = mode === 'ghost';
    var body = isGhost ? 'rgba(168,196,255,0.38)' : (dead ? C.playerDead : C.player);

    // 腳
    ctx.fillStyle = isGhost ? 'rgba(168,196,255,0.45)' : (dead ? '#5d6170' : '#3a3550');
    for (i = 0; i < 2; i++) {
      rr(ctx, fs[i][0], fs[i][1], fs[i][2], fs[i][3], 3);
      ctx.fill();
    }

    // 身體
    rr(ctx, 3, 1, 34, 45, 12);
    ctx.fillStyle = body;
    ctx.fill();
    if (isGhost) {
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(230,238,255,0.85)';
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.outline;
      ctx.stroke();
    }

    // 面罩(朝向)
    var vx = 9 + facing * 4;
    rr(ctx, vx, 11, 22, 11, 5);
    ctx.fillStyle = isGhost ? 'rgba(20,26,45,0.55)' : C.visor;
    ctx.fill();
    if (dead) {
      ctx.strokeStyle = C.danger;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      var ex = [vx + 6, vx + 16];
      for (i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(ex[i] - 3, 13.5); ctx.lineTo(ex[i] + 3, 19.5);
        ctx.moveTo(ex[i] + 3, 13.5); ctx.lineTo(ex[i] - 3, 19.5);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = isGhost ? 'rgba(230,238,255,0.9)' : '#ffffff';
      var px = facing > 0 ? vx + 13 : vx + 4;
      ctx.fillRect(px, 14, 4, 5);
      ctx.fillRect(facing > 0 ? px - 7 : px + 7, 14, 4, 5);
    }

    // 代數(胸口小字)
    if (gen) {
      ctx.font = 'bold 15px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isGhost ? 'rgba(230,238,255,0.95)' : (dead ? '#3d404b' : '#6b5a3a');
      ctx.fillText(String(gen), 20, 34);
    }

    // 幽靈: 頭頂可站的實線(只有這一條擋人)
    if (isGhost) {
      ctx.fillStyle = C.ghostEdge;
      ctx.fillRect(0, 0, 40, 3);
    }

    // 彈射中: 腳下速度線(框內)
    if (state === 'launch') {
      ctx.strokeStyle = isGhost ? 'rgba(230,238,255,0.8)' : C.hook;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(10, 51); ctx.lineTo(10, 55);
      ctx.moveTo(20, 50); ctx.lineTo(20, 55);
      ctx.moveTo(30, 51); ctx.lineTo(30, 55);
      ctx.stroke();
    }

    // 玩家瞄準中 / 彈射中: 鉤爪色外框
    if (!isGhost && (state === 'aim' || state === 'launch')) {
      rr(ctx, 3, 1, 34, 45, 12);
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.hook;
      ctx.setLineDash(state === 'launch' ? [6, 4] : []);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 幽靈可鉤: 框內鉤爪色粗框 + 染色
    if (isGhost && hookable) {
      rr(ctx, 2, 2, 36, 52, 11);
      ctx.fillStyle = 'rgba(166,255,77,0.22)';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = C.hook;
      ctx.stroke();
      ctx.fillStyle = C.ghostEdge;
      ctx.fillRect(0, 0, 40, 3);
    }
    ctx.restore();
  }

  // ---------- 鉤爪小圖示(HUD / 說明頁) ----------
  function hookIcon(ctx, cx, cy, filled) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = filled ? C.hook : 'rgba(166,255,77,0.28)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 13);
    ctx.lineTo(cx, cy + 4);
    ctx.moveTo(cx, cy + 4);
    ctx.quadraticCurveTo(cx - 11, cy + 4, cx - 10, cy - 6);
    ctx.moveTo(cx, cy + 4);
    ctx.quadraticCurveTo(cx + 11, cy + 4, cx + 10, cy - 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy - 13, 3, 0, Math.PI * 2);
    ctx.fillStyle = filled ? C.hook : 'rgba(166,255,77,0.28)';
    ctx.fill();
    ctx.restore();
  }

  function hookPips(ctx, x, cy, left, max) {
    // x 為左緣; 回傳寬度
    ctx.save();
    for (var i = 0; i < max; i++) {
      var bx = x + i * 44;
      rr(ctx, bx, cy - 20, 38, 40, 8);
      ctx.fillStyle = i < left ? 'rgba(166,255,77,0.14)' : 'rgba(255,255,255,0.03)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = i < left ? C.hook : 'rgba(166,255,77,0.25)';
      if (i >= left) ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      hookIcon(ctx, bx + 19, cy + 2, i < left);
    }
    ctx.restore();
    return max * 44;
  }

  function aimBanner(ctx, cx, cy) {
    ctx.save();
    rr(ctx, cx - 150, cy - 24, 300, 48, 12);
    ctx.fillStyle = 'rgba(10,14,24,0.92)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.hook;
    ctx.stroke();
    ctx.restore();
    text(ctx, 'Z 彈出 / X 取消', cx, cy + 1, 28, C.hook);
  }

  function pauseFrame(ctx, x, y, w, h) {
    // 時間暫停: 遊戲區四周冷色霧框 + 四角括號
    ctx.save();
    ctx.fillStyle = 'rgba(150,180,255,0.13)';
    var b = 18;
    ctx.fillRect(x, y, w, b);
    ctx.fillRect(x, y + h - b, w, b);
    ctx.fillRect(x, y + b, b, h - 2 * b);
    ctx.fillRect(x + w - b, y + b, b, h - 2 * b);
    ctx.strokeStyle = 'rgba(210,225,255,0.75)';
    ctx.lineWidth = 4;
    var L = 44, m = b + 6;
    var cs = [[x + m, y + m, 1, 1], [x + w - m, y + m, -1, 1], [x + m, y + h - m, 1, -1], [x + w - m, y + h - m, -1, -1]];
    for (var i = 0; i < 4; i++) {
      var c = cs[i];
      ctx.beginPath();
      ctx.moveTo(c[0], c[1] + c[3] * L);
      ctx.lineTo(c[0], c[1]);
      ctx.lineTo(c[0] + c[2] * L, c[1]);
      ctx.stroke();
    }
    // 暫停符號
    ctx.fillStyle = 'rgba(210,225,255,0.8)';
    ctx.fillRect(x + w - m - 30, y + m + 12, 7, 22);
    ctx.fillRect(x + w - m - 18, y + m + 12, 7, 22);
    ctx.restore();
  }

  function liftRail(ctx, x, yTop, yBottom) {
    // 升降台軌道: 同色低權重虛線, 標出行程
    ctx.save();
    ctx.strokeStyle = 'rgba(54,214,231,0.22)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(x + 8, yTop); ctx.lineTo(x + 8, yBottom + 24);
    ctx.moveTo(x + 112, yTop); ctx.lineTo(x + 112, yBottom + 24);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(54,214,231,0.3)';
    ctx.fillRect(x + 2, yTop - 3, 14, 3);
    ctx.fillRect(x + 104, yTop - 3, 14, 3);
    ctx.restore();
  }

  // ---------- 關卡資料(只供說明頁縮圖用; 遊戲本身由 RD 擺) ----------
  var LV = {
    ground: { x: 0, y: 1200, w: 600, h: 80 },
    plat1: { x: 0, y: 780, w: 480, h: 24 },
    plat2: { x: 240, y: 360, w: 480, h: 24 },
    spike: { x: 0, y: 756, w: 60 },
    liftPlate: { x: 160, y: 1188 },
    gatePlate: { x: 80, y: 768 },
    lift: { x: 480, y: 1200 },
    gate: { x: 560, y: 140 },
    goal: { x: 640, y: 280 },
    spawn: { x: 60, y: 1144 }
  };

  var Art = {
    canvas: { width: W, height: H },
    palette: C,

    drawBackground: function (ctx) {
      ctx.save();
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, C.bgTop);
      g.addColorStop(1, C.bg);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // 低權重網格
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var gx = 0; gx <= W; gx += 60) { ctx.moveTo(gx + 0.5, HUD_H); ctx.lineTo(gx + 0.5, H); }
      for (var gy = HUD_H; gy <= H; gy += 60) { ctx.moveTo(0, gy + 0.5); ctx.lineTo(W, gy + 0.5); }
      ctx.stroke();
      // 坑底的暗紅警示(掉出畫面即死)
      var pg = ctx.createLinearGradient(0, 1210, 0, H);
      pg.addColorStop(0, 'rgba(255,77,77,0)');
      pg.addColorStop(1, 'rgba(255,77,77,0.22)');
      ctx.fillStyle = pg;
      ctx.fillRect(600, 1210, 120, 70);
      // 升降台軌道(行程 780 ~ 1200)
      liftRail(ctx, 480, 780, 1200);
      ctx.restore();
    },

    drawPlatform: function (ctx, s) {
      ctx.save();
      var x = s.x, y = s.y, w = s.w, h = s.h;
      if (h >= 48) {
        // 地面: 實心
        ctx.fillStyle = C.ground;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = C.groundTop;
        ctx.fillRect(x, y, w, 6);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (var bx = x + 30; bx < x + w; bx += 60) {
          ctx.moveTo(bx, y + 20); ctx.lineTo(bx + 18, y + 20);
          ctx.moveTo(bx + 30, y + 46); ctx.lineTo(bx + 48, y + 46);
        }
        ctx.stroke();
      } else {
        // 單向平台: 亮頂 + 下緣鋸齒(可從下穿)
        ctx.fillStyle = C.platform;
        ctx.fillRect(x, y, w, h - 6);
        ctx.fillStyle = C.platformTop;
        ctx.fillRect(x, y, w, 5);
        ctx.fillStyle = C.platform;
        ctx.beginPath();
        for (var tx = x; tx < x + w; tx += 12) {
          ctx.moveTo(tx, y + h - 6);
          ctx.lineTo(Math.min(tx + 12, x + w), y + h - 6);
          ctx.lineTo(Math.min(tx + 6, x + w), y + h);
          ctx.closePath();
        }
        ctx.fill();
      }
      ctx.restore();
    },

    drawSpike: function (ctx, s) {
      ctx.save();
      var x = s.x, y = s.y, w = s.w || 60, h = 24;
      ctx.fillStyle = '#5a1a20';
      ctx.fillRect(x, y + h - 5, w, 5);
      var n = Math.max(1, Math.round(w / 12));
      var tw = w / n;
      for (var i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * tw, y + h - 4);
        ctx.lineTo(x + i * tw + tw / 2, y);
        ctx.lineTo(x + (i + 1) * tw, y + h - 4);
        ctx.closePath();
        ctx.fillStyle = C.spike;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + i * tw + tw / 2, y + 1);
        ctx.lineTo(x + i * tw + tw / 2 - 2, y + h - 6);
        ctx.strokeStyle = '#ffb0b0';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    },

    drawPlate: function (ctx, s) {
      ctx.save();
      var x = s.x, y = s.y, w = 80, h = 12;
      var lift = s.kind !== 'gate';
      var col = lift ? C.lift : C.gate;
      var dim = lift ? C.liftDim : C.gateDim;
      // 底座槽
      ctx.fillStyle = '#0e1220';
      ctx.fillRect(x, y, w, h);
      if (s.pressed) {
        // 壓下: 扁平亮色, 貼底
        ctx.fillStyle = col;
        ctx.fillRect(x + 2, y + 7, w - 4, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(x + 2, y + 7, w - 4, 1.5);
        // 槽內兩側亮條 = 通電
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 3, h);
        ctx.fillRect(x + w - 3, y, 3, h);
      } else {
        // 放開: 凸起暗色鈕
        ctx.fillStyle = dim;
        ctx.fillRect(x + 4, y, w - 8, 9);
        ctx.fillStyle = col;
        ctx.fillRect(x + 4, y, w - 8, 2);
      }
      // 種類記號(形狀第二通道): 升降台 = 向上箭頭, 門 = 直條
      ctx.fillStyle = s.pressed ? '#0e1220' : col;
      var my = s.pressed ? y + 8 : y + 3;
      var mh = s.pressed ? 3 : 5;
      if (lift) {
        for (var i = -1; i <= 1; i++) {
          var cx = x + 40 + i * 18;
          ctx.beginPath();
          ctx.moveTo(cx - 5, my + mh);
          ctx.lineTo(cx, my);
          ctx.lineTo(cx + 5, my + mh);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        for (var j = -1; j <= 1; j++) {
          ctx.fillRect(x + 40 + j * 18 - 2, my, 4, mh);
        }
      }
      ctx.restore();
    },

    drawLift: function (ctx, s) {
      ctx.save();
      var x = s.x, y = s.y, w = 120, h = 24;
      var on = !!s.active;
      ctx.fillStyle = on ? C.lift : C.liftDim;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = on ? '#d8fbff' : C.lift;
      ctx.fillRect(x, y, w, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x, y + h - 4, w, 4);
      // 向上箭頭: 被驅動時亮
      ctx.fillStyle = on ? '#0b3a40' : 'rgba(54,214,231,0.35)';
      for (var i = 0; i < 3; i++) {
        var cx = x + 30 + i * 30;
        ctx.beginPath();
        ctx.moveTo(cx - 9, y + 18);
        ctx.lineTo(cx, y + 8);
        ctx.lineTo(cx + 9, y + 18);
        ctx.lineTo(cx + 5, y + 18);
        ctx.lineTo(cx, y + 13);
        ctx.lineTo(cx - 5, y + 18);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },

    drawGate: function (ctx, s) {
      ctx.save();
      var x = s.x, y = s.y, w = 24, h = 220;
      if (s.open) {
        // 開: 只剩虛線框與上下框頭
        ctx.strokeStyle = 'rgba(224,92,255,0.45)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 8]);
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        ctx.setLineDash([]);
        ctx.fillStyle = C.gate;
        ctx.fillRect(x, y, w, 8);
        ctx.fillRect(x, y + h - 8, w, 8);
      } else {
        ctx.fillStyle = C.gate;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = C.gateDim;
        for (var sy = y + 14; sy < y + h - 8; sy += 22) {
          ctx.fillRect(x + 3, sy, w - 6, 8);
        }
        ctx.strokeStyle = C.outline;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      }
      ctx.restore();
    },

    drawGoal: function (ctx, s) {
      ctx.save();
      var x = s.x, y = s.y;
      // 底座
      ctx.fillStyle = '#6b5a24';
      ctx.fillRect(x + 2, y + 72, 20, 8);
      // 旗桿
      ctx.fillStyle = '#e8e2c8';
      ctx.fillRect(x + 9, y + 2, 5, 72);
      ctx.beginPath();
      ctx.arc(x + 11.5, y + 4, 4, 0, Math.PI * 2);
      ctx.fill();
      // 旗面
      ctx.beginPath();
      ctx.moveTo(x + 14, y + 6);
      ctx.lineTo(x + 48, y + 14);
      ctx.lineTo(x + 40, y + 24);
      ctx.lineTo(x + 48, y + 36);
      ctx.lineTo(x + 14, y + 40);
      ctx.closePath();
      ctx.fillStyle = C.goal;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#8a6a10';
      ctx.stroke();
      // 星
      ctx.fillStyle = '#fff6c8';
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var r = i % 2 ? 3 : 7;
        var a = -Math.PI / 2 + i * Math.PI / 5;
        var px = x + 27 + Math.cos(a) * r, py = y + 23 + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },

    drawGhostPath: function (ctx, s) {
      var segs = s.segments || [];
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (var k = 0; k < segs.length; k++) {
        var p = segs[k];
        if (!p || p.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(p[0].x, p[0].y);
        for (var i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
        ctx.strokeStyle = 'rgba(8,10,18,0.55)';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(168,196,255,0.7)';
        ctx.lineWidth = 3;
        ctx.setLineDash([3, 7]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // 每秒一個小刻度(依全路線累計幀數)
      var n = 0;
      ctx.fillStyle = 'rgba(168,196,255,0.85)';
      for (var a = 0; a < segs.length; a++) {
        var q = segs[a] || [];
        for (var b = 0; b < q.length; b++) {
          if (n > 0 && n % 60 === 0) {
            ctx.beginPath();
            ctx.arc(q[b].x, q[b].y, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          n++;
        }
      }
      // 路線終點
      var last = segs.length ? segs[segs.length - 1] : null;
      if (last && last.length) {
        var e = last[last.length - 1];
        ctx.beginPath();
        ctx.arc(e.x, e.y, 6, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(168,196,255,0.85)';
        ctx.stroke();
      }
      ctx.restore();
    },

    drawWhistleRing: function (ctx, s) {
      var t = Math.max(0, Math.min(1, s.t || 0));
      var cx = s.cx, cy = s.cy;
      ctx.save();
      ctx.globalAlpha = 1 - t * 0.85;
      ctx.lineWidth = 5;
      ctx.strokeStyle = C.whistle;
      var r1 = 34 + 70 * t;
      ctx.beginPath();
      ctx.arc(cx, cy, r1, 0, Math.PI * 2);
      ctx.stroke();
      if (t > 0.2) {
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 34 + 70 * (t - 0.2), 0, Math.PI * 2);
        ctx.stroke();
      }
      // 向內的指針: 「叫回這裡」
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      var ri = r1 + 8, ro = r1 + 26 - 8 * t;
      for (var i = 0; i < 8; i++) {
        var a = i * Math.PI / 4 + Math.PI / 8;
        var ix = cx + Math.cos(a) * ri, iy = cy + Math.sin(a) * ri;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * ro, cy + Math.sin(a) * ro);
        ctx.lineTo(ix, iy);
        ctx.moveTo(ix + Math.cos(a + 0.5) * 7, iy + Math.sin(a + 0.5) * 7);
        ctx.lineTo(ix, iy);
        ctx.lineTo(ix + Math.cos(a - 0.5) * 7, iy + Math.sin(a - 0.5) * 7);
        ctx.stroke();
      }
      ctx.restore();
    },

    drawGhost: function (ctx, s) {
      ctx.save();
      drawFigure(ctx, s.x, s.y, s.facing, s.state, s.gen, 'ghost', !!s.hookable);
      ctx.restore();
    },

    drawHook: function (ctx, s) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.strokeStyle = 'rgba(8,10,18,0.85)';
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = C.hook;
      ctx.lineWidth = 3;
      ctx.stroke();
      // 鉤頭
      var a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
      ctx.lineWidth = 3.5;
      for (var i = -1; i <= 1; i++) {
        var b = a + Math.PI + i * 0.7;
        ctx.beginPath();
        ctx.moveTo(s.x2, s.y2);
        ctx.lineTo(s.x2 + Math.cos(b) * 11, s.y2 + Math.sin(b) * 11);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(s.x2, s.y2, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = C.hook;
      ctx.fill();
      ctx.restore();
    },

    drawPlayer: function (ctx, s) {
      ctx.save();
      drawFigure(ctx, s.x, s.y, s.facing, s.state, s.gen, 'player', false);
      ctx.restore();
    },

    drawAim: function (ctx, s) {
      ctx.save();
      ctx.lineCap = 'round';
      // 方向虛線: 角色中心 → 幽靈中心
      ctx.beginPath();
      ctx.moveTo(s.px, s.py);
      ctx.lineTo(s.gx, s.gy);
      ctx.strokeStyle = 'rgba(8,10,18,0.7)';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = C.hook;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.setLineDash([]);
      // 幽靈中心靶點
      ctx.beginPath();
      ctx.arc(s.gx, s.gy, 7, 0, Math.PI * 2);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // 蓄力環(角色外)
      var ch = Math.max(0, Math.min(1, s.charge || 0));
      ctx.beginPath();
      ctx.arc(s.px, s.py, 40, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(166,255,77,0.18)';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s.px, s.py, 40, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ch);
      ctx.strokeStyle = ch >= 1 ? '#ffffff' : C.hook;
      ctx.stroke();
      // 力道箭頭
      var len = Math.hypot(s.ax - s.px, s.ay - s.py);
      if (len > 2) arrow(ctx, s.px, s.py, s.ax, s.ay, ch >= 1 ? '#e8ffd0' : C.hook, 7, 24);
      ctx.restore();
    },

    drawHud: function (ctx, s) {
      ctx.save();
      var gen = s.gen || 1, maxGen = s.maxGen || 3, phase = s.phase || 'play';
      // 頂列底板
      ctx.fillStyle = C.hudBg;
      ctx.fillRect(0, 0, W, HUD_H);
      ctx.fillStyle = C.hudLine;
      ctx.fillRect(0, HUD_H - 3, W, 3);

      // 左: 代數
      text(ctx, '第 ' + gen + ' 代', 22, 34, 30, C.text, 'left');
      text(ctx, '/ ' + maxGen, 140, 36, 22, C.textDim, 'left');
      for (var i = 1; i <= maxGen; i++) {
        var mode = i === gen ? 'player' : (i === gen - 1 ? 'ghost' : (i < gen ? 'gone' : 'future'));
        var fx = 22 + (i - 1) * 34, fy = 60;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.scale(0.55, 0.55);
        if (mode === 'future') {
          rr(ctx, 3, 1, 34, 45, 12);
          ctx.strokeStyle = 'rgba(138,147,173,0.5)';
          ctx.lineWidth = 3;
          ctx.stroke();
        } else {
          drawFigure(ctx, 0, 0, 1, 'idle', null, mode, false);
        }
        ctx.restore();
      }

      // 中: 鉤爪次數
      text(ctx, '鉤爪', 262, 50, 20, C.textDim, 'center', 'bold');
      hookPips(ctx, 296, 50, s.hookLeft == null ? 2 : s.hookLeft, s.hookMax || 2);

      // 右: 按鍵提示 / 瞄準提示
      if (s.aiming) {
        // 時間暫停: 遊戲區霧框
        pauseFrame(ctx, 0, HUD_H, W, H - HUD_H);
        aimBanner(ctx, 560, 50);
      } else {
        keycap(ctx, 'C', 470, 50, 36);
        text(ctx, '吹哨', 515, 50, 20, C.text, 'center');
        keycap(ctx, 'Z', 570, 50, 36);
        text(ctx, '鉤', 604, 50, 20, C.hook, 'center');
        keycap(ctx, 'R', 645, 50, 36);
        text(ctx, '重來', 690, 50, 20, C.textDim, 'center');
      }

      if (phase === 'dying' && gen < maxGen) {
        text(ctx, '第 ' + (gen + 1) + ' 代準備出發…', W / 2, 130, 24, C.textDim);
      }

      if (phase === 'win') {
        rr(ctx, 110, 520, 500, 200, 18);
        ctx.fillStyle = 'rgba(10,14,24,0.82)';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = C.goal;
        ctx.stroke();
        text(ctx, '過關!', W / 2, 578, 64, C.goal);
        text(ctx, '三代合力回放中', W / 2, 640, 26, C.text);
        text(ctx, '按空白鍵重來', W / 2, 686, 24, C.textDim);
      } else if (phase === 'lose') {
        ctx.fillStyle = 'rgba(6,8,14,0.78)';
        ctx.fillRect(0, HUD_H, W, H - HUD_H);
        text(ctx, '失敗', W / 2, 560, 72, C.danger);
        text(ctx, '三個人都沒摸到旗子', W / 2, 640, 30, C.text);
        text(ctx, '按空白鍵重來', W / 2, 710, 28, C.textDim);
      }
      ctx.restore();
    },

    // ---------- 說明頁 ----------
    drawGuidePage: function (ctx, s) {
      var page = Math.max(0, Math.min(7, (s && s.page) | 0));
      var A = Art;
      var titles = ['走到旗子', '先死一次', '死了變幽靈', '吹哨', '踩幽靈', '鉤幽靈', '開關', '只看得見上一個人'];
      var lines = [
        '←→ 走、空白鍵跳、R 整關重來',
        '一個人到不了, 要先死一次',
        '死掉的你會一直重演',
        '按 C, 幽靈立刻從頭出發',
        '幽靈的頭能站, 還會載你走',
        '幽靈發光時按 Z 瞄準, 每人 2 次',
        '有人踩住, 同色的東西才會動',
        '共三人, 只看得見上一個的幽靈'
      ];
      ctx.save();
      // 底
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, C.bgTop);
      g.addColorStop(1, C.bg);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      text(ctx, '起跑哨', W / 2, 60, 34, C.textDim);
      text(ctx, '第 ' + (page + 1) + ' 頁  ' + titles[page], W / 2, 140, 46, C.text);
      text(ctx, lines[page], W / 2, 214, 32, '#ffe9a8');

      // 圖框
      var PX = 40, PY = 270, PW = 640, PH = 860;
      rr(ctx, PX, PY, PW, PH, 20);
      ctx.fillStyle = 'rgba(8,12,22,0.55)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.stroke();
      ctx.save();
      rr(ctx, PX, PY, PW, PH, 20);
      ctx.clip();

      var pages = [page1, page2, page3, page4, page5, page6, page7, page8];
      pages[page](ctx, A, PX, PY, PW, PH);
      ctx.restore();

      // 頁腳
      for (var i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc(W / 2 - 98 + i * 28, 1170, i === page ? 8 : 5, 0, Math.PI * 2);
        ctx.fillStyle = i === page ? C.text : 'rgba(138,147,173,0.5)';
        ctx.fill();
      }
      var kw = keycap(ctx, '空白鍵', W / 2 - 70, 1226, 44);
      text(ctx, page === 7 ? '開始遊戲' : '下一頁', W / 2 - 70 + kw / 2 + 70, 1226, 30, C.text);
      ctx.restore();
    }
  };

  // ---------- 說明頁各頁 ----------
  function drawStaticLevel(ctx, A, opt) {
    opt = opt || {};
    A.drawPlatform(ctx, LV.ground);
    A.drawPlatform(ctx, LV.plat1);
    A.drawPlatform(ctx, LV.plat2);
    A.drawSpike(ctx, LV.spike);
    A.drawPlate(ctx, { x: LV.liftPlate.x, y: LV.liftPlate.y, pressed: false, kind: 'lift' });
    A.drawPlate(ctx, { x: LV.gatePlate.x, y: LV.gatePlate.y, pressed: false, kind: 'gate' });
    liftRail(ctx, 480, 780, 1200);
    A.drawLift(ctx, { x: LV.lift.x, y: LV.lift.y, active: false });
    A.drawGate(ctx, { x: LV.gate.x, y: LV.gate.y, open: false });
    A.drawGoal(ctx, LV.goal);
  }

  function label(ctx, s, x, y, size, color) {
    text(ctx, s, x, y, size || 22, color || C.textDim);
  }

  function cell(ctx, x, y, w, h) {
    rr(ctx, x, y, w, h, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.stroke();
  }

  function page1(ctx, A, PX, PY, PW, PH) {
    var s = Math.min(PW / 720, (PH - 20) / 1180);
    var ox = PX + (PW - 720 * s) / 2, oy = PY + 10 + (PH - 20 - 1180 * s) / 2 - 100 * s;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    // 坑
    ctx.fillStyle = 'rgba(255,77,77,0.15)';
    ctx.fillRect(600, 1230, 120, 50);
    drawStaticLevel(ctx, A);
    // 旗子圈出
    ctx.beginPath();
    ctx.arc(664, 318, 70, 0, Math.PI * 2);
    ctx.strokeStyle = C.goal;
    ctx.lineWidth = 5;
    ctx.setLineDash([12, 10]);
    ctx.stroke();
    ctx.setLineDash([]);
    A.drawPlayer(ctx, { x: LV.spawn.x, y: LV.spawn.y, facing: 1, state: 'idle', gen: 1 });
    ctx.restore();
    // 螢幕座標標籤
    var px = ox + (LV.spawn.x + 20) * s, py = oy + LV.spawn.y * s;
    var fx = ox + 664 * s, fy = oy + 318 * s;
    label(ctx, '終點旗', fx - 20, fy + 80, 26, C.goal);
    label(ctx, '你', px, py - 26, 26, C.text);
    keycap(ctx, '←', px + 70, py - 120, 44);
    keycap(ctx, '→', px + 122, py - 120, 44);
    label(ctx, '走', px + 172, py - 120, 24, C.text);
    keycap(ctx, '空白鍵', px + 112, py - 186, 44);
    label(ctx, '跳', px + 196, py - 186, 24, C.text);
    keycap(ctx, 'R', px + 70, py - 252, 44);
    label(ctx, '整關重來', px + 150, py - 252, 24, C.text);
  }

  function page2(ctx, A, PX, PY, PW, PH) {
    var cw = 300, ch = 780, cy = PY + 40;
    var ax = PX + 14, bx = PX + PW - 14 - cw;
    cell(ctx, ax, cy, cw, ch);
    cell(ctx, bx, cy, cw, ch);
    // 左格: 跳不上
    ctx.save();
    ctx.translate(ax, cy);
    A.drawPlatform(ctx, { x: 0, y: 640, w: cw, h: 80 });
    A.drawPlatform(ctx, { x: 0, y: 200, w: cw, h: 24 });
    // 跳躍弧線
    ctx.strokeStyle = 'rgba(255,241,208,0.45)';
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(60, 612);
    ctx.quadraticCurveTo(110, 300, 150, 528);
    ctx.stroke();
    ctx.setLineDash([]);
    A.drawPlayer(ctx, { x: 90, y: 640 - 168 - 56, facing: 1, state: 'air', gen: 1 });
    // 差距
    arrow(ctx, 210, 412, 210, 236, 'rgba(255,255,255,0.6)', 3, 12);
    mark(ctx, 'no', 210, 330, 30);
    label(ctx, '跳不上', 150, 740, 26, C.text);
    ctx.restore();
    // 右格: 掉坑
    ctx.save();
    ctx.translate(bx, cy);
    A.drawPlatform(ctx, { x: 0, y: 640, w: 170, h: 80 });
    A.drawPlatform(ctx, { x: 0, y: 200, w: cw, h: 24 });
    ctx.fillStyle = 'rgba(255,77,77,0.18)';
    ctx.fillRect(170, 680, 130, 40);
    ctx.strokeStyle = 'rgba(255,241,208,0.45)';
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(110, 612);
    ctx.quadraticCurveTo(200, 590, 230, 690);
    ctx.stroke();
    ctx.setLineDash([]);
    A.drawPlayer(ctx, { x: 205, y: 660, facing: 1, state: 'dead', gen: 1 });
    mark(ctx, 'ok', 230, 520, 30);
    label(ctx, '先死, 才往前', 150, 400, 26, C.text);
    ctx.restore();
  }

  function pathPoints(x0, y0, dir, n, jumpAt) {
    var pts = [], x = x0, y = y0, vy = 0, air = false, ground = y0;
    for (var i = 0; i < n; i++) {
      pts.push({ x: x, y: y });
      x += dir * 260 / 60;
      if (i === jumpAt) { vy = -900; air = true; }
      if (air) {
        vy += 2400 / 60;
        y += vy / 60;
        if (y >= ground) { y = ground; air = false; vy = 0; }
      }
    }
    return pts;
  }

  function page3(ctx, A, PX, PY, PW, PH) {
    ctx.save();
    ctx.translate(PX, PY);
    var gy = 620;
    A.drawPlatform(ctx, { x: 0, y: gy, w: PW, h: 80 });
    // 出生點記號
    ctx.fillStyle = 'rgba(255,241,208,0.25)';
    ctx.fillRect(40, gy - 4, 60, 4);
    label(ctx, '出生點', 70, gy + 40, 22, C.textDim);
    A.drawPlayer(ctx, { x: 50, y: gy - 56, facing: 1, state: 'idle', gen: 2 });
    label(ctx, '新的你', 70, gy - 90, 24, C.text);
    var gx = 250;
    var pts = pathPoints(gx + 20, gy - 28, 1, 70, 22);
    A.drawGhostPath(ctx, { segments: [pts] });
    A.drawGhost(ctx, { x: gx, y: gy - 56, facing: 1, state: 'run', gen: 1, hookable: false });
    label(ctx, '上一個你(幽靈)', gx + 20, gy - 90 + 180, 24, C.ghost);
    label(ctx, '接下來要走的路', 480, gy - 260, 22, C.ghost);
    ctx.restore();
  }

  function page4(ctx, A, PX, PY, PW, PH) {
    var cw = 300, ch = 780, cy = PY + 40;
    var xs = [PX + 14, PX + PW - 14 - cw];
    for (var k = 0; k < 2; k++) {
      cell(ctx, xs[k], cy, cw, ch);
      ctx.save();
      ctx.translate(xs[k], cy);
      ctx.beginPath();
      ctx.rect(0, 0, cw, ch);
      ctx.clip();
      var gy = 640;
      A.drawPlatform(ctx, { x: 0, y: gy, w: cw, h: 80 });
      A.drawPlatform(ctx, { x: 150, y: 380, w: 150, h: 24 });
      ctx.fillStyle = 'rgba(255,241,208,0.25)';
      ctx.fillRect(14, gy - 4, 52, 4);
      label(ctx, '出生點', 40, gy + 40, 20, C.textDim);
      var px = 110;
      if (k === 0) {
        var p0 = pathPoints(240, 352, 1, 20, -1);
        A.drawGhostPath(ctx, { segments: [p0] });
        A.drawGhost(ctx, { x: 220, y: 324, facing: 1, state: 'run', gen: 1, hookable: false });
        A.drawPlayer(ctx, { x: px, y: gy - 56, facing: 1, state: 'idle', gen: 2 });
        keycap(ctx, 'C', px + 20, gy - 110, 48);
        label(ctx, '吹哨', px + 20, gy - 160, 24, C.text);
        label(ctx, '幽靈在遠處', 225, 290, 22, C.ghost);
      } else {
        // 原位置淡虛線輪廓
        drawFigure(ctx, 220, 324, 1, 'run', null, 'gone', false);
        ctx.strokeStyle = 'rgba(168,196,255,0.5)';
        ctx.setLineDash([6, 8]);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(220, 360);
        ctx.quadraticCurveTo(90, 360, 50, 540);
        ctx.stroke();
        ctx.setLineDash([]);
        arrow(ctx, 56, 520, 46, 556, 'rgba(168,196,255,0.8)', 3, 14);
        var p1 = pathPoints(40, gy - 28, 1, 60, 30);
        A.drawGhostPath(ctx, { segments: [p1] });
        A.drawWhistleRing(ctx, { cx: 40, cy: gy - 28, t: 0.3 });
        A.drawGhost(ctx, { x: 20, y: gy - 56, facing: 1, state: 'idle', gen: 1, hookable: false });
        A.drawPlayer(ctx, { x: px, y: gy - 56, facing: 1, state: 'idle', gen: 2 });
        label(ctx, '叫回出生點', 150, 740, 24, C.text);
      }
      ctx.restore();
    }
    label(ctx, '按 C 前', xs[0] + cw / 2, cy + ch - 40, 24, C.text);
  }

  function page5(ctx, A, PX, PY, PW, PH) {
    ctx.save();
    ctx.translate(PX + PW / 2, PY + PH / 2);
    var s = 2;
    ctx.scale(s, s);
    // 地面
    A.drawPlatform(ctx, { x: -160, y: 150, w: 320, h: 80 });
    // 幽靈在空中上升, 角色站頭上
    var gx = -20, gyy = 30;
    // 先前位置淡影(示意移動)
    ctx.globalAlpha = 0.25;
    drawFigure(ctx, gx, gyy + 70, 1, 'air', null, 'gone', false);
    ctx.globalAlpha = 1;
    A.drawGhost(ctx, { x: gx, y: gyy, facing: 1, state: 'air', gen: 1, hookable: false });
    A.drawPlayer(ctx, { x: gx, y: gyy - 56, facing: 1, state: 'idle', gen: 2 });
    arrow(ctx, 50, 70, 50, -60, C.text, 3, 10);
    arrow(ctx, -40, 70, -40, -60, C.text, 3, 10);
    ctx.restore();
    label(ctx, '一起往上', PX + PW / 2 + 160, PY + PH / 2 - 40, 26, C.text);
    label(ctx, '頭頂這條能站', PX + PW / 2, PY + PH / 2 + 160, 24, C.ghostEdge);
  }

  function page6(ctx, A, PX, PY, PW, PH) {
    ctx.save();
    ctx.translate(PX, PY);
    var gy = 700;
    A.drawPlatform(ctx, { x: 0, y: gy, w: PW, h: 80 });
    A.drawPlatform(ctx, { x: 0, y: 230, w: PW, h: 24 });
    var g = { x: 330, y: 470 };
    var p = { x: 230, y: gy - 56 };
    A.drawGhost(ctx, { x: g.x, y: g.y, facing: 1, state: 'air', gen: 1, hookable: true });
    A.drawPlayer(ctx, { x: p.x, y: p.y, facing: 1, state: 'aim', gen: 2 });
    var pcx = p.x + 20, pcy = p.y + 28, gcx = g.x + 20, gcy = g.y + 28;
    var d = Math.hypot(gcx - pcx, gcy - pcy);
    var L = 1700 * (0.3 + 0.7 * 0.75) * 0.3 * 0.75; // 示意: 縮短到圖框內
    var ax = pcx + (gcx - pcx) / d * L, ay = pcy + (gcy - pcy) / d * L;
    A.drawAim(ctx, { px: pcx, py: pcy, gx: gcx, gy: gcy, ax: ax, ay: ay, charge: 0.75 });
    pauseFrame(ctx, 0, 0, PW, PH);
    label(ctx, '發光 = 可鉤', g.x + 120, g.y + 10, 24, C.hook);
    label(ctx, '越久越遠', pcx - 120, pcy - 70, 24, C.hook);
    // 角落 HUD 鉤爪次數
    rr(ctx, 24, 40, 170, 64, 12);
    ctx.fillStyle = C.hudBg;
    ctx.fill();
    text(ctx, '鉤爪', 56, 72, 20, C.textDim);
    hookPips(ctx, 88, 72, 2, 2);
    aimBanner(ctx, PW / 2, PH - 60);
    ctx.restore();
  }

  function page7(ctx, A, PX, PY, PW, PH) {
    var cw = 300, ch = 380;
    var rows = [PY + 30, PY + 450];
    var xs = [PX + 14, PX + PW - 14 - cw];
    for (var r = 0; r < 2; r++) {
      for (var k = 0; k < 2; k++) {
        cell(ctx, xs[k], rows[r], cw, ch);
        ctx.save();
        ctx.translate(xs[k], rows[r]);
        var gy = 300, pressed = k === 1;
        A.drawPlatform(ctx, { x: 0, y: gy, w: cw, h: 80 });
        if (r === 0) {
          A.drawPlate(ctx, { x: 20, y: gy - 12, pressed: pressed, kind: 'lift' });
          liftRail(ctx, 160, 80, gy);
          A.drawLift(ctx, { x: 160, y: pressed ? 80 : gy, active: pressed });
          if (pressed) arrow(ctx, 220, 250, 220, 130, C.lift, 4, 14);
        } else {
          A.drawPlate(ctx, { x: 20, y: gy - 12, pressed: pressed, kind: 'gate' });
          A.drawGate(ctx, { x: 210, y: gy - 220, open: pressed });
        }
        label(ctx, pressed ? '有人踩' : '沒人踩', 60, gy - 50, 24, C.text);
        ctx.restore();
      }
      text(ctx, '→', PX + PW / 2, rows[r] + ch / 2, 40, C.text);
    }
  }

  function page8(ctx, A, PX, PY, PW, PH) {
    ctx.save();
    ctx.translate(PX, PY);
    // 上: 三人排排
    var y0 = 60, sc = 1.6;
    var xs = [110, 290, 470];
    var caps = ['看不見', '幽靈', '你'];
    var cols = [C.textDim, C.ghost, C.player];
    A.drawPlatform(ctx, { x: 40, y: y0 + 56 * sc + 4, w: PW - 80, h: 24 });
    for (var i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(xs[i], y0);
      ctx.scale(sc, sc);
      if (i === 0) drawFigure(ctx, 0, 0, 1, 'idle', 1, 'gone', false);
      else if (i === 1) A.drawGhost(ctx, { x: 0, y: 0, facing: 1, state: 'idle', gen: 2, hookable: false });
      else A.drawPlayer(ctx, { x: 0, y: 0, facing: 1, state: 'idle', gen: 3 });
      ctx.restore();
      text(ctx, String(i + 1) + ' 號', xs[i] + 32, y0 + 56 * sc + 60, 28, cols[i]);
      label(ctx, caps[i], xs[i] + 32, y0 + 56 * sc + 98, 24, cols[i]);
    }
    // 分隔
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(40, 330, PW - 80, 2);
    // 下: 2 號幽靈在空中上升, 腳下是虛線升降台
    var gy = 780;
    A.drawPlatform(ctx, { x: 0, y: gy, w: 400, h: 80 });
    A.drawPlatform(ctx, { x: 0, y: 480, w: 400, h: 24 });
    A.drawPlate(ctx, { x: 120, y: gy - 12, pressed: false, kind: 'lift' });
    liftRail(ctx, 400, 480, gy);
    A.drawLift(ctx, { x: 400, y: gy, active: false });
    var ly = 600;
    ctx.strokeStyle = 'rgba(54,214,231,0.8)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(401.5, ly + 1.5, 117, 21);
    ctx.setLineDash([]);
    A.drawGhost(ctx, { x: 440, y: ly - 56, facing: 1, state: 'idle', gen: 2, hookable: false });
    arrow(ctx, 560, 640, 560, 520, C.ghost, 3, 12);
    label(ctx, '看不見的 1 號', 470, ly + 60, 22, C.lift);
    label(ctx, '開的電梯', 470, ly + 90, 22, C.lift);
    ctx.restore();
  }

  window.Art = Art;
})();
