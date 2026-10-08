// 幽影接力(打磨版) — 美術繪圖模組(全 Canvas 2D 幾何, 無外部資源)
// 契約: 依 interface.json; 每個函式自己 save / restore。沿用 polish-1 的視覺語言(polish-2: 移除鑰匙與鎖, 新增按鈕、尖刺壓板、實心平台、貼物件的鍵帽提示)。
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
    wall: '#2b3042',
    wallEdge: '#7c849c',
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
    crusher: '#ff8c1a',
    crusherDark: '#7a3c06',
    crusherBody: '#3a2414',
    seesaw: '#8a93ad',
    seesawLand: '#4b5470',
    seesawLaunch: '#eef1f8',
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
    // x,y 為中心; 回傳寬度
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

  function bgFill(ctx) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.bgTop);
    g.addColorStop(1, C.bg);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // ---------- 壓板 / 按鈕共用的斜紋(壓板色專屬記號) ----------
  function hazardStripes(ctx, x, y, w, h, color, gap) {
    gap = gap || 18;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = color;
    for (var sx = x - h; sx < x + w + h; sx += gap * 2) {
      ctx.beginPath();
      ctx.moveTo(sx, y + h);
      ctx.lineTo(sx + gap, y + h);
      ctx.lineTo(sx + gap + h, y);
      ctx.lineTo(sx + h, y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 瞄準按鍵提示「[Z] 射出 / [X] 取消」(角色旁, 鍵帽與幽靈旁 Z 同一樣式) ----------
  var HINT_W = 196, HINT_H = 40;
  function aimHint(ctx, cx, cy) {
    var x0 = cx - HINT_W / 2;
    ctx.save();
    rr(ctx, x0, cy - HINT_H / 2, HINT_W, HINT_H, 10);
    ctx.fillStyle = 'rgba(10,14,24,0.9)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = C.hook;
    ctx.stroke();
    ctx.restore();
    keycap(ctx, 'Z', x0 + 22, cy, 26);
    text(ctx, '射出', x0 + 58, cy, 18, C.hook);
    text(ctx, '/', x0 + 92, cy, 18, C.textDim);
    keycap(ctx, 'X', x0 + 120, cy, 26);
    text(ctx, '取消', x0 + 158, cy, 18, C.text);
  }


  // ---------- 角色剪影(玩家與幽靈共用, 同一個人) ----------
  // 40 x 56 框內: 身體 (3,1)~(37,46); 腳 y 46~56
  function feet(state, facing) {
    if (state === 'air' || state === 'launch') {
      return [[8, 42, 10, 8], [22, 42, 10, 8]];
    }
    if (state === 'run') {
      return facing > 0 ? [[4, 46, 11, 10], [25, 44, 11, 10]] : [[25, 46, 11, 10], [4, 44, 11, 10]];
    }
    return [[7, 46, 11, 10], [22, 46, 11, 10]];
  }

  function drawFigure(ctx, x, y, facing, state, gen, mode, hookable) {
    // mode: 'player' | 'ghost' | 'gone'(說明頁 / HUD: 消失的更早一代)
    facing = facing < 0 ? -1 : 1;
    var dead = mode === 'player' && state === 'dead';
    var fs = feet(state, facing);
    var i;
    ctx.save();
    ctx.translate(x, y);

    if (mode === 'gone') {
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(168,196,255,0.4)';
      rr(ctx, 3, 1, 34, 45, 12);
      ctx.stroke();
      for (i = 0; i < 2; i++) { ctx.strokeRect(fs[i][0], fs[i][1], fs[i][2], fs[i][3]); }
      if (gen) {
        ctx.setLineDash([]);
        ctx.font = 'bold 15px ' + FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(168,196,255,0.5)';
        ctx.fillText(String(gen), 20, 34);
      }
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
      ctx.fillText(String(gen), 20, 32);
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

  function pauseFrame(ctx, x, y, w, h) {
    // 時間暫停: 遊戲區四周冷色霧框 + 四角括號 + 暫停符號
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

  function speaker(ctx, cx, cy, muted) {
    // 喇叭圖示, 約 34 x 28
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy - 6);
    ctx.lineTo(cx - 8, cy - 6);
    ctx.lineTo(cx, cy - 13);
    ctx.lineTo(cx, cy + 13);
    ctx.lineTo(cx - 8, cy + 6);
    ctx.lineTo(cx - 15, cy + 6);
    ctx.closePath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(8,10,18,0.9)';
    ctx.stroke();
    ctx.fillStyle = muted ? C.textDim : C.text;
    ctx.fill();
    ctx.lineWidth = 3;
    if (!muted) {
      ctx.strokeStyle = C.text;
      ctx.beginPath();
      ctx.arc(cx + 2, cy, 7, -0.9, 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 2, cy, 13, -0.9, 0.9);
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(8,10,18,0.9)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy + 14); ctx.lineTo(cx + 18, cy - 14);
      ctx.stroke();
      ctx.strokeStyle = C.text;
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 說明頁 / 解鎖頁示意圖(參考框 640 x 760, 外部縮放進指定框) ----------
  var REF_W = 640, REF_H = 760;

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

  function inBox(ctx, x, y, w, h, fn) {
    // 把參考框 640x760 等比縮放置中到 (x,y,w,h), 並裁在框內
    var s = Math.min(w / REF_W, h / REF_H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.translate(x + (w - REF_W * s) / 2, y + (h - REF_H * s) / 2);
    ctx.scale(s, s);
    fn(ctx);
    ctx.restore();
  }

  // 第 1 頁 走到旗子: 第 1 關縮圖 + 按鍵 + 靜音
  function guide0(ctx, A) {
    var s = REF_W / 720;
    ctx.save();
    ctx.scale(s, s);
    ctx.translate(0, -620);
    ctx.fillStyle = 'rgba(255,77,77,0.18)';
    ctx.fillRect(600, 1220, 120, 60);
    A.drawPlatform(ctx, { x: 0, y: 1200, w: 600, h: 80 });
    A.drawPlatform(ctx, { x: 280, y: 990, w: 340, h: 24 });
    A.drawPlatform(ctx, { x: 0, y: 780, w: 400, h: 24 });
    A.drawGoal(ctx, { x: 40, y: 700 });
    A.drawPlayer(ctx, { x: 60, y: 1144, facing: 1, state: 'idle', gen: 1 });
    ctx.restore();
    // 參考框座標: 角色 (53,463)~(89,513); 旗 (36,71)~(78,142)
    label(ctx, '終點旗', 140, 110, 26, C.goal);
    arrow(ctx, 104, 110, 84, 110, C.goal, 3, 12);
    label(ctx, '你', 71, 440, 26, C.text);
    keycap(ctx, '←', 160, 386, 36);
    keycap(ctx, '→', 204, 386, 36);
    label(ctx, '走', 246, 386, 24, C.text);
    var kw = keycap(ctx, '空白鍵', 142 + 40, 432, 36);
    label(ctx, '跳', 142 + 40 + kw / 2 + 22, 432, 24, C.text);
    keycap(ctx, 'R', 160, 478, 36);
    label(ctx, '整關重來', 236, 478, 24, C.text);
    // 角落: 靜音
    keycap(ctx, 'M', 546, 708, 36);
    speaker(ctx, 600, 708, false);
    label(ctx, '靜音', 573, 664, 22, C.textDim);
  }

  // 第 2 頁 先死一次: 跳不上(叉) / 掉坑(勾)
  function guide1(ctx, A) {
    var cw = 300, ch = 700, cy = 30;
    var ax = 10, bx = 330;
    cell(ctx, ax, cy, cw, ch);
    cell(ctx, bx, cy, cw, ch);
    var gy = 560;
    // 左格: 跳不上
    ctx.save();
    ctx.translate(ax, cy);
    A.drawPlatform(ctx, { x: 0, y: gy, w: cw, h: 80 });
    A.drawPlatform(ctx, { x: 0, y: 180, w: cw, h: 24 });
    ctx.strokeStyle = 'rgba(255,241,208,0.45)';
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(60, gy - 28);
    ctx.quadraticCurveTo(110, gy - 360, 150, gy - 110);
    ctx.stroke();
    ctx.setLineDash([]);
    A.drawPlayer(ctx, { x: 90, y: gy - 168 - 56, facing: 1, state: 'air', gen: 1 });
    arrow(ctx, 210, gy - 172, 210, 214, 'rgba(255,255,255,0.6)', 3, 12);
    mark(ctx, 'no', 210, 280, 30);
    label(ctx, '跳不上', 150, 670, 26, C.text);
    ctx.restore();
    // 右格: 掉坑
    ctx.save();
    ctx.translate(bx, cy);
    A.drawPlatform(ctx, { x: 0, y: gy, w: 170, h: 80 });
    A.drawPlatform(ctx, { x: 0, y: 180, w: cw, h: 24 });
    ctx.fillStyle = 'rgba(255,77,77,0.18)';
    ctx.fillRect(170, gy + 30, 130, 50);
    ctx.strokeStyle = 'rgba(255,241,208,0.45)';
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(110, gy - 28);
    ctx.quadraticCurveTo(200, gy - 50, 230, gy + 40);
    ctx.stroke();
    ctx.setLineDash([]);
    A.drawPlayer(ctx, { x: 205, y: gy + 10, facing: 1, state: 'dead', gen: 1 });
    mark(ctx, 'ok', 230, 420, 30);
    label(ctx, '先死, 才往前', 150, 670, 26, C.text);
    ctx.restore();
  }

  // 第 3 頁 死了變幽靈: 新的你 + 幽靈 + 前方路線
  function guide2(ctx, A) {
    var gy = 560;
    A.drawPlatform(ctx, { x: 0, y: gy, w: REF_W, h: 80 });
    ctx.fillStyle = 'rgba(255,241,208,0.25)';
    ctx.fillRect(40, gy - 4, 60, 4);
    label(ctx, '出生點', 70, gy + 40, 22, C.textDim);
    A.drawPlayer(ctx, { x: 50, y: gy - 56, facing: 1, state: 'idle', gen: 2 });
    label(ctx, '新的你', 70, gy - 90, 24, C.text);
    var gx = 240;
    var pts = pathPoints(gx + 20, gy - 28, 1, 72, 22);
    A.drawGhostPath(ctx, { segments: [pts] });
    A.drawGhost(ctx, { x: gx, y: gy - 56, facing: 1, state: 'run', gen: 1, hookable: false });
    label(ctx, '幽靈', gx + 20, gy - 90, 24, C.ghost);
    label(ctx, '接下來的路', 450, gy - 250, 22, C.ghost);
  }

  // 第 4 頁 踩幽靈: 站在幽靈頭上一起往上
  function guide3(ctx, A) {
    ctx.save();
    ctx.translate(320, 380);
    ctx.scale(2, 2);
    A.drawPlatform(ctx, { x: -160, y: 150, w: 320, h: 80 });
    var gx = -20, gyy = 30;
    ctx.save();
    ctx.globalAlpha = 0.35;
    drawFigure(ctx, gx, gyy + 74, 1, 'air', null, 'gone', false);
    ctx.restore();
    A.drawGhost(ctx, { x: gx, y: gyy, facing: 1, state: 'air', gen: 1, hookable: false });
    A.drawPlayer(ctx, { x: gx, y: gyy - 56, facing: 1, state: 'idle', gen: 2 });
    arrow(ctx, 48, 110, 48, -40, C.text, 3, 10);
    ctx.restore();
    // 參考框座標: 幽靈 (280,440)~(360,552), 頭頂線 y 440
    label(ctx, '一起往上', 500, 360, 26, C.text);
    label(ctx, '頭頂能站', 126, 440, 24, C.ghostEdge);
    arrow(ctx, 190, 440, 272, 440, C.ghostEdge, 3, 12);
  }

  // 第 5 頁 只看得見上一個人
  function guide4(ctx, A) {
    var y0 = 40, sc = 1.6;
    var xs = [110, 290, 470];
    var caps = ['看不見', '幽靈', '你'];
    var cols = [C.textDim, C.ghost, C.player];
    A.drawPlatform(ctx, { x: 40, y: y0 + 56 * sc + 4, w: REF_W - 80, h: 24 });
    for (var i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(xs[i], y0);
      ctx.scale(sc, sc);
      if (i === 0) drawFigure(ctx, 0, 0, 1, 'idle', 1, 'gone', false);
      else if (i === 1) A.drawGhost(ctx, { x: 0, y: 0, facing: 1, state: 'idle', gen: 2, hookable: false });
      else A.drawPlayer(ctx, { x: 0, y: 0, facing: 1, state: 'idle', gen: 3 });
      ctx.restore();
      text(ctx, String(i + 1) + ' 號', xs[i] + 32, y0 + 56 * sc + 62, 28, cols[i]);
      label(ctx, caps[i], xs[i] + 32, y0 + 56 * sc + 98, 24, cols[i]);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(40, 290, REF_W - 80, 2);
    // 下: 2 號幽靈在半空往上跳, 腳下是看不見的 1 號
    var gy = 680;
    A.drawPlatform(ctx, { x: 0, y: gy, w: REF_W, h: 80 });
    A.drawPlayer(ctx, { x: 70, y: gy - 56, facing: 1, state: 'idle', gen: 3 });
    label(ctx, '你', 90, gy - 80, 24, C.text);
    drawFigure(ctx, 330, 470, 1, 'air', 1, 'gone', false);
    A.drawGhost(ctx, { x: 330, y: 414, facing: 1, state: 'idle', gen: 2, hookable: false });
    arrow(ctx, 400, 520, 400, 400, C.ghost, 3, 12);
    label(ctx, '看不見的 1 號', 350, 560, 22, C.textDim);
  }

  var GUIDE = [guide0, guide1, guide2, guide3, guide4];
  var GUIDE_TITLES = ['走到旗子', '先死一次', '死了變幽靈', '踩幽靈', '只看得見上一個人'];
  var GUIDE_LINES = [
    '走到旗子就過關',
    '一個人到不了, 要先死一次',
    '死掉的你會一直重演',
    '幽靈的頭能站, 還會載你走',
    '共三人, 只看得見上一個'
  ];

  // 解鎖頁: 鉤爪 — 上格: 幽靈跳在半空亮綠框 + Z 鍵帽; 下格: 暫停中的瞄準 + 角色旁鍵帽提示; 角落 HUD 鉤爪 2 格
  function unlockHook(ctx, A) {
    var cx0 = 10, cw = 620;
    // 上格
    cell(ctx, cx0, 10, cw, 330);
    ctx.save();
    ctx.translate(cx0, 10);
    ctx.beginPath(); ctx.rect(0, 0, cw, 330); ctx.clip();
    A.drawPlatform(ctx, { x: 0, y: 290, w: cw, h: 80 });
    A.drawGhost(ctx, { x: 320, y: 120, facing: 1, state: 'air', gen: 1, hookable: true });
    A.drawPlayer(ctx, { x: 190, y: 234, facing: 1, state: 'idle', gen: 2 });
    // 角落: HUD 鉤爪次數
    rr(ctx, 16, 16, 176, 64, 12);
    ctx.fillStyle = C.hudBg;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.hudLine;
    ctx.stroke();
    text(ctx, '鉤爪', 50, 48, 20, C.textDim);
    hookPips(ctx, 86, 48, 2, 2);
    ctx.restore();
    // 下格: 暫停中瞄準
    cell(ctx, cx0, 360, cw, 390);
    ctx.save();
    ctx.translate(cx0, 360);
    ctx.beginPath(); ctx.rect(0, 0, cw, 390); ctx.clip();
    A.drawPlatform(ctx, { x: 0, y: 340, w: cw, h: 80 });
    var g = { x: 320, y: 130 }, p = { x: 200, y: 284 };
    A.drawGhost(ctx, { x: g.x, y: g.y, facing: 1, state: 'air', gen: 1, hookable: true });
    A.drawPlayer(ctx, { x: p.x, y: p.y, facing: 1, state: 'aim', gen: 2 });
    var pcx = p.x + 20, pcy = p.y + 28, gcx = g.x + 20, gcy = g.y + 28;
    var d = Math.hypot(gcx - pcx, gcy - pcy), L = 280;
    A.drawAim(ctx, { px: pcx, py: pcy, gx: gcx, gy: gcy, ax: pcx + (gcx - pcx) / d * L, ay: pcy + (gcy - pcy) / d * L, charge: 0.75 });
    pauseFrame(ctx, 0, 0, cw, 390);
    ctx.restore();
  }

  // 解鎖頁: 起跑哨
  function unlockWhistle(ctx, A) {
    var cw = 300, ch = 700, cy = 30;
    var xs = [10, 330];
    for (var k = 0; k < 2; k++) {
      cell(ctx, xs[k], cy, cw, ch);
      ctx.save();
      ctx.translate(xs[k], cy);
      ctx.beginPath();
      ctx.rect(0, 0, cw, ch);
      ctx.clip();
      var gy = 560;
      A.drawPlatform(ctx, { x: 0, y: gy, w: cw, h: 80 });
      A.drawPlatform(ctx, { x: 150, y: 300, w: 150, h: 24 });
      ctx.fillStyle = 'rgba(255,241,208,0.25)';
      ctx.fillRect(14, gy - 4, 52, 4);
      var px = 120;
      if (k === 0) {
        var p0 = pathPoints(240, 272, 1, 20, -1);
        A.drawGhostPath(ctx, { segments: [p0] });
        A.drawGhost(ctx, { x: 220, y: 244, facing: 1, state: 'run', gen: 1, hookable: false });
        A.drawPlayer(ctx, { x: px, y: gy - 56, facing: 1, state: 'idle', gen: 2 });
        keycap(ctx, 'C', px + 20, gy - 100, 48);
        label(ctx, '吹哨前', 150, 660, 24, C.text);
      } else {
        drawFigure(ctx, 220, 244, 1, 'run', null, 'gone', false);
        ctx.strokeStyle = 'rgba(168,196,255,0.5)';
        ctx.setLineDash([6, 8]);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(220, 280);
        ctx.quadraticCurveTo(80, 290, 46, 470);
        ctx.stroke();
        ctx.setLineDash([]);
        arrow(ctx, 50, 450, 42, 486, 'rgba(168,196,255,0.85)', 3, 14);
        var p1 = pathPoints(40, gy - 28, 1, 60, 30);
        A.drawGhostPath(ctx, { segments: [p1] });
        A.drawWhistleRing(ctx, { cx: 40, cy: gy - 28, t: 0.3 });
        A.drawGhost(ctx, { x: 20, y: gy - 56, facing: 1, state: 'idle', gen: 1, hookable: false });
        A.drawPlayer(ctx, { x: px + 40, y: gy - 56, facing: 1, state: 'idle', gen: 2 });
        label(ctx, '叫回出生點', 150, 660, 24, C.text);
      }
      ctx.restore();
    }
  }

  function bottomPrompt(ctx, label1) {
    ctx.save();
    ctx.font = 'bold 30px ' + FONT;
    var tw = ctx.measureText(label1).width;
    ctx.restore();
    ctx.save();
    ctx.font = 'bold 22px ' + FONT;
    var kw = Math.max(44, ctx.measureText('空白鍵').width + 22);
    ctx.restore();
    var total = kw + 16 + tw;
    var x0 = W / 2 - total / 2;
    keycap(ctx, '空白鍵', x0 + kw / 2, 1210, 44);
    text(ctx, label1, x0 + kw + 16, 1210, 30, C.text, 'left');
  }

  function guidePrompt(ctx, page, n) {
    // 說明頁底部(只有全畫布模式才畫): 第 1 頁「→ / 空白鍵 下一頁」; 中間「← 上一頁   → / 空白鍵 下一頁」; 最後「… 開始遊戲」
    var y = 1210, items = [];
    if (page > 0) items.push(['←'], ['上一頁', C.textDim], [' ', null, 34]);
    items.push(['→'], ['/', C.textDim], ['空白鍵'], [page === n - 1 ? '開始遊戲' : '下一頁', C.text]);
    var ws = [], total = 0, gap = 10;
    ctx.save();
    for (var i = 0; i < items.length; i++) {
      var it = items[i], wv;
      if (it[2]) wv = it[2];
      else if (it.length === 1) { ctx.font = 'bold 18px ' + FONT; wv = Math.max(40, ctx.measureText(it[0]).width + 20); }
      else { ctx.font = 'bold 26px ' + FONT; wv = ctx.measureText(it[0]).width; }
      ws.push(wv); total += wv + (i ? gap : 0);
    }
    ctx.restore();
    var x = W / 2 - total / 2;
    for (var j = 0; j < items.length; j++) {
      var a = items[j];
      if (a[2]) { /* 空白 */ }
      else if (a.length === 1) keycap(ctx, a[0], x + ws[j] / 2, y, 40);
      else text(ctx, a[0], x, y, 26, a[1], 'left');
      x += ws[j] + gap;
    }
  }

  // ---------- 關卡卡片的新東西圖示(用遊戲內畫法) ----------
  function introIcon(ctx, A, kind, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    if (kind === 'hook') {
      ctx.scale(1.4, 1.4);
      A.drawPlatform(ctx, { x: -120, y: 80, w: 240, h: 24 });
      A.drawGhost(ctx, { x: 20, y: -110, facing: 1, state: 'air', gen: 1, hookable: true });
      A.drawHook(ctx, { x1: -40, y1: 2, x2: 40, y2: -82 });
      A.drawPlayer(ctx, { x: -60, y: -26, facing: 1, state: 'launch', gen: 2 });
    } else if (kind === 'gate') {
      ctx.scale(1.15, 1.15);
      A.drawPlatform(ctx, { x: -150, y: 110, w: 300, h: 24 });
      A.drawPlate(ctx, { x: -120, y: 98, pressed: false, kind: 'gate' });
      A.drawGate(ctx, { x: 70, y: -110, open: false });
    } else if (kind === 'lift') {
      ctx.scale(1.15, 1.15);
      A.drawPlatform(ctx, { x: -150, y: 110, w: 300, h: 24 });
      A.drawPlate(ctx, { x: -130, y: 98, pressed: false, kind: 'lift' });
      liftRail(ctx, 20, -110, 110);
      A.drawLift(ctx, { x: 20, y: 0, active: true });
    } else if (kind === 'seesaw') {
      ctx.scale(1.4, 1.4);
      A.drawPlatform(ctx, { x: -120, y: 12, w: 240, h: 24 });
      A.drawSeesaw(ctx, { x: -100, y: 0, tilt: 0.7 });
    } else if (kind === 'button') {
      // 按鈕(被踩住) + 升起中的尖刺壓板(倒數量條約剩 6 成); 同一個壓板色
      ctx.scale(1.15, 1.15);
      A.drawPlatform(ctx, { x: -190, y: 110, w: 380, h: 50, solid: true });
      A.drawButton(ctx, { x: -175, y: 98, pressed: true });
      A.drawCrusher(ctx, { x: -20, w: 190, top: -160, bottom: 40, hold: 0.6, warn: false });
    } else {
      // relay: 三個小人(1 號已消失 / 2 號幽靈 / 3 號你)
      ctx.scale(1.5, 1.5);
      A.drawPlatform(ctx, { x: -120, y: 30, w: 240, h: 24 });
      drawFigure(ctx, -100, -26, 1, 'idle', 1, 'gone', false);
      A.drawGhost(ctx, { x: -20, y: -26, facing: 1, state: 'idle', gen: 2, hookable: false });
      A.drawPlayer(ctx, { x: 60, y: -26, facing: 1, state: 'idle', gen: 3 });
    }
    ctx.restore();
  }

  var Art = {
    canvas: { width: W, height: H },
    palette: C,

    drawBackground: function (ctx, s) {
      var level = s && s.level;
      ctx.save();
      bgFill(ctx);
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var gx = 0; gx <= W; gx += 60) { ctx.moveTo(gx + 0.5, HUD_H); ctx.lineTo(gx + 0.5, H); }
      for (var gy = HUD_H; gy <= H; gy += 60) { ctx.moveTo(0, gy + 0.5); ctx.lineTo(W, gy + 0.5); }
      ctx.stroke();
      // 坑底的暗紅警示(每關都在 x 600~720)
      var pg = ctx.createLinearGradient(0, 1210, 0, H);
      pg.addColorStop(0, 'rgba(255,77,77,0)');
      pg.addColorStop(1, 'rgba(255,77,77,0.22)');
      ctx.fillStyle = pg;
      ctx.fillRect(600, 1210, 120, 70);
      // 升降台軌道: 只有有升降台的關(4)
      if (level === 4) liftRail(ctx, 480, 780, 1200);
      ctx.restore();
    },

    drawPlatform: function (ctx, s) {
      ctx.save();
      var x = s.x, y = s.y, w = s.w, h = s.h;
      // 實心 = 地面材質(地面、實心平台、牆共用一個長相); 沒給 solid 時以厚度判斷(相容舊呼叫)
      var solid = s.solid == null ? h >= 48 : !!s.solid;
      if (solid) {
        ctx.fillStyle = C.ground;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = C.groundTop;
        ctx.fillRect(x, y, w, 6);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (h >= 48) {
          for (var bx = x + 30; bx < x + w; bx += 60) {
            ctx.moveTo(bx, y + 20); ctx.lineTo(Math.min(bx + 18, x + w), y + 20);
            if (bx + 30 < x + w) { ctx.moveTo(bx + 30, y + 46); ctx.lineTo(Math.min(bx + 48, x + w), y + 46); }
          }
        } else {
          // 薄的實心平台: 砌磚接縫 + 平整底緣(沒有單向平台的下緣鋸齒 = 從下面穿不過)
          for (var jx = x + 24; jx < x + w - 4; jx += 40) {
            ctx.moveTo(jx, y + 7); ctx.lineTo(jx, y + h - 4);
          }
        }
        ctx.stroke();
        if (h < 48) {
          ctx.fillStyle = C.groundTop;
          ctx.fillRect(x, y + h - 3, w, 3);
          ctx.fillRect(x, y, 3, h);
          ctx.fillRect(x + w - 3, y, 3, h);
        }
      } else {
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

    drawWall: function (ctx, s) {
      // 實心牆: 用地面的材質(實心 = 地面長相), 直立砌磚; 頂端一道平台色接縫表示「接在平台底下」
      ctx.save();
      var x = s.x, y = s.y, w = s.w || 24, h = s.h || 316;
      ctx.fillStyle = C.wall;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = C.wallEdge;
      ctx.fillRect(x, y, 3, h);
      ctx.fillRect(x + w - 3, y, 3, h);
      ctx.fillStyle = C.platform;
      ctx.fillRect(x, y, w, 5);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      var row = 0;
      for (var by = y + 22; by < y + h - 4; by += 22) {
        ctx.moveTo(x + 3, by); ctx.lineTo(x + w - 3, by);
        var jx = x + (row % 2 ? 8 : 16);
        ctx.moveTo(jx, by - 22 + (row === 0 ? 5 : 0)); ctx.lineTo(jx, by);
        row++;
      }
      ctx.stroke();
      ctx.fillStyle = C.groundTop;
      ctx.fillRect(x, y + h - 4, w, 4);
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
      ctx.fillStyle = '#0e1220';
      ctx.fillRect(x, y, w, h);
      if (s.pressed) {
        ctx.fillStyle = col;
        ctx.fillRect(x + 2, y + 7, w - 4, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(x + 2, y + 7, w - 4, 1.5);
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 3, h);
        ctx.fillRect(x + w - 3, y, 3, h);
      } else {
        ctx.fillStyle = dim;
        ctx.fillRect(x + 4, y, w - 8, 9);
        ctx.fillStyle = col;
        ctx.fillRect(x + 4, y, w - 8, 2);
      }
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

    drawButton: function (ctx, s) {
      // 80 x 12, 嵌在地面上: 圓頂按鈕(與平的開關踏板不同外形) + 底座斜紋(= 壓板的記號); 壓板色
      ctx.save();
      var x = s.x, y = s.y, w = 80, h = 12;
      ctx.fillStyle = '#0e1220';
      ctx.fillRect(x, y + 6, w, 6);
      if (s.pressed) {
        // 被踩住: 圓頂壓扁成亮色薄片, 底座兩側亮起
        rr(ctx, x + 8, y + 7, w - 16, 5, 2);
        ctx.fillStyle = C.crusher;
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillRect(x + 12, y + 7, w - 24, 1.5);
        ctx.fillStyle = C.crusher;
        ctx.fillRect(x, y + 6, 4, 6);
        ctx.fillRect(x + w - 4, y + 6, 4, 6);
      } else {
        // 放開: 凸起的圓頂(暗壓板色 + 亮頂弧)
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 9);
        ctx.bezierCurveTo(x + 14, y - 1, x + w - 14, y - 1, x + w - 10, y + 9);
        ctx.closePath();
        ctx.fillStyle = '#c4650f';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = C.outline;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 22, y + 4);
        ctx.quadraticCurveTo(x + 40, y + 0.5, x + 58, y + 4);
        ctx.strokeStyle = '#ffd2a0';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      // 底座斜紋帶(與壓板同一個記號)
      ctx.fillStyle = C.crusherDark;
      ctx.fillRect(x + 2, y + 9, w - 4, 3);
      hazardStripes(ctx, x + 2, y + 9, w - 4, 3, s.pressed ? C.crusher : 'rgba(255,140,26,0.6)', 5);
      ctx.restore();
    },

    drawCrusher: function (ctx, s) {
      // 尖刺壓板: x~x+w, top~bottom 的實心柱; 底部 20px 是朝下的紅尖刺(含在 bottom 以上)
      ctx.save();
      var x = s.x, w = s.w || 360, top = s.top == null ? HUD_H : s.top, bottom = s.bottom == null ? 360 : s.bottom;
      var hold = Math.max(0, Math.min(1, s.hold || 0));
      var SH = 20, bodyB = bottom - SH;
      var rem = hold * 1.2;
      var flashOn = !!s.warn && hold > 0 && (Math.floor(rem / 0.075) % 2 === 0);
      // 本體: 暗色實心(實心擋路), 兩側壓板色亮邊
      ctx.fillStyle = C.crusherBody;
      ctx.fillRect(x, top, w, bodyB - top);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var py = top + 30; py < bodyB - 30; py += 30) {
        ctx.moveTo(x + 6, py); ctx.lineTo(x + w - 6, py);
      }
      ctx.stroke();
      ctx.fillStyle = flashOn ? C.danger : C.crusher;
      ctx.fillRect(x, top, 5, bodyB - top);
      ctx.fillRect(x + w - 5, top, 5, bodyB - top);
      // 下緣斜紋帶(壓板色記號, 與按鈕底座相同)
      var bandH = 16;
      ctx.fillStyle = C.crusherDark;
      ctx.fillRect(x, bodyB - bandH, w, bandH);
      hazardStripes(ctx, x, bodyB - bandH, w, bandH, flashOn ? C.danger : C.crusher, 14);
      // 倒數量條: 斜紋帶上方。軌道常駐(這根柱子有倒數), 填色隨 hold 從右往左縮
      var tx = x + 20, tw = w - 40, th = 14, ty = bodyB - bandH - 8 - th;
      if (ty > top + 4) {
        rr(ctx, tx - 3, ty - 3, tw + 6, th + 6, 6);
        ctx.fillStyle = 'rgba(8,10,18,0.85)';
        ctx.fill();
        // 最後 0.3 秒那一段(左側 1/4)預先染暗紅: 量條縮進這段 = 快落下了
        var wz = tw * 0.3 / 1.2;
        ctx.fillStyle = 'rgba(255,77,77,0.22)';
        ctx.fillRect(tx, ty, wz, th);
        if (hold > 0) {
          var fw = Math.max(3, tw * hold);
          ctx.fillStyle = s.warn ? (flashOn ? C.danger : '#ffffff') : '#ffe2b8';
          ctx.fillRect(tx, ty, fw, th);
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.fillRect(tx, ty, fw, 3);
        }
        // 每 0.3 秒一格刻度
        ctx.fillStyle = 'rgba(8,10,18,0.9)';
        for (var k = 1; k < 4; k++) ctx.fillRect(tx + tw * k / 4 - 1, ty, 2, th);
      }
      // 尖刺: 底座條 + 朝下紅三角
      ctx.fillStyle = '#5a1a20';
      ctx.fillRect(x, bodyB, w, 4);
      var n = Math.max(1, Math.round(w / 12)), sw = w / n;
      for (var i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * sw, bodyB + 3);
        ctx.lineTo(x + i * sw + sw / 2, bottom);
        ctx.lineTo(x + (i + 1) * sw, bodyB + 3);
        ctx.closePath();
        ctx.fillStyle = flashOn ? '#ff9a9a' : C.spike;
        ctx.fill();
      }
      // 外框
      ctx.strokeStyle = C.outline;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, top + 1, w - 2, bodyB - top - 1);
      ctx.restore();
    },


    drawSeesaw: function (ctx, s) {
      // 200 x 12: 左 80 落點端(暗、↓) / 中 40 板身與支點 / 右 80 發射端(亮、↑)
      ctx.save();
      var x = s.x, y = s.y;
      var t = Math.max(0, Math.min(1, s.tilt || 0));
      var ang = -t * 12 * Math.PI / 180;
      // 支點(不動)
      ctx.fillStyle = '#1a1f2e';
      ctx.beginPath();
      ctx.moveTo(x + 100, y + 6);
      ctx.lineTo(x + 112, y + 12);
      ctx.lineTo(x + 88, y + 12);
      ctx.closePath();
      ctx.fill();
      ctx.translate(x + 100, y + 8);
      ctx.rotate(ang);
      // 板身
      rr(ctx, -100, -6, 200, 10, 3);
      ctx.fillStyle = C.seesaw;
      ctx.fill();
      // 落點端
      rr(ctx, -100, -6, 80, 10, 3);
      ctx.fillStyle = C.seesawLand;
      ctx.fill();
      // 發射端
      rr(ctx, 20, -6, 80, 10, 3);
      ctx.fillStyle = C.seesawLaunch;
      ctx.fill();
      rr(ctx, -100, -6, 200, 10, 3);
      ctx.lineWidth = 2;
      ctx.strokeStyle = C.outline;
      ctx.stroke();
      // 支點樞紐
      ctx.beginPath();
      ctx.arc(0, -1, 3, 0, Math.PI * 2);
      ctx.fillStyle = C.outline;
      ctx.fill();
      // 記號: 落點端 ↓(淡), 發射端 ↑(深)
      var k;
      ctx.fillStyle = 'rgba(238,241,248,0.8)';
      for (k = 0; k < 3; k++) {
        var lx = -84 + k * 24;
        ctx.beginPath();
        ctx.moveTo(lx - 5, -4); ctx.lineTo(lx + 5, -4); ctx.lineTo(lx, 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#1a1f2e';
      for (k = 0; k < 3; k++) {
        var rx = 36 + k * 24;
        ctx.beginPath();
        ctx.moveTo(rx - 5, 2); ctx.lineTo(rx + 5, 2); ctx.lineTo(rx, -4);
        ctx.closePath();
        ctx.fill();
      }
      // 擺動中: 發射端上方的彈起線
      if (t > 0.05) {
        ctx.strokeStyle = 'rgba(238,241,248,' + (0.35 + 0.6 * t) + ')';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (k = 0; k < 3; k++) {
          var sx = 40 + k * 22;
          ctx.moveTo(sx, -10); ctx.lineTo(sx, -10 - 10 * t);
        }
        ctx.stroke();
      }
      ctx.restore();
    },

    drawGoal: function (ctx, s) {
      ctx.save();
      var x = s.x, y = s.y;
      ctx.fillStyle = '#6b5a24';
      ctx.fillRect(x + 2, y + 72, 20, 8);
      ctx.fillStyle = '#e8e2c8';
      ctx.fillRect(x + 9, y + 2, 5, 72);
      ctx.beginPath();
      ctx.arc(x + 11.5, y + 4, 4, 0, Math.PI * 2);
      ctx.fill();
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
      var segs = (s && s.segments) || [];
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
      if (s.hookable) {
        // Z 鍵帽: 框外右上角(靠右緣時改左上), 與 drawAim 的鍵帽同一樣式
        var zx = s.x + 40 + 17 + 13 > W ? s.x - 17 : s.x + 40 + 17;
        var zy = Math.max(HUD_H + 15, s.y + 4);
        ctx.save();
        ctx.strokeStyle = C.hook;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        var ex = zx < s.x ? s.x + 2 : s.x + 38;
        ctx.moveTo(ex, Math.max(zy, s.y + 8));
        ctx.lineTo(zx + (zx < s.x ? 10 : -10), zy);
        ctx.stroke();
        ctx.restore();
        keycap(ctx, 'Z', zx, zy, 26);
        ctx.save();
        rr(ctx, zx - 15, zy - 15, 30, 30, 9);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = C.hook;
        ctx.stroke();
        ctx.restore();
      }
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
      ctx.beginPath();
      ctx.arc(s.gx, s.gy, 7, 0, Math.PI * 2);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      var ch = Math.max(0, Math.min(1, s.charge || 0));
      // 角色旁按鍵提示: 預設頭頂上方(避開蓄力環); 會壓到 HUD 或出畫布就放腳下。
      // 箭頭幾乎朝正上方時往側邊讓開, 不蓋住箭頭。提示先畫, 箭頭疊在上面(箭頭是決策本體)
      var hdx = s.ax - s.px, hdy = s.ay - s.py, hl = Math.hypot(hdx, hdy) || 1;
      var hy = s.py - 40 - 8 - HINT_H / 2;
      var below = hy - HINT_H / 2 < HUD_H + 4;
      if (below) hy = s.py + 40 + 8 + HINT_H / 2;
      var hx = s.px;
      var into = below ? (hdy / hl > 0.2) : (hdy / hl < -0.2);
      if (into) {
        var side = Math.abs(hdx) > 4 ? -Math.sign(hdx) : (s.px > W / 2 ? -1 : 1);
        hx = s.px + side * (HINT_W / 2 + 14);
      }
      hx = Math.max(HINT_W / 2 + 4, Math.min(W - HINT_W / 2 - 4, hx));
      if (hy + HINT_H / 2 > H - 4) hy = H - 4 - HINT_H / 2;
      aimHint(ctx, hx, hy);
      ctx.beginPath();
      ctx.arc(s.px, s.py, 40, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(166,255,77,0.18)';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s.px, s.py, 40, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ch);
      ctx.strokeStyle = ch >= 1 ? '#ffffff' : C.hook;
      ctx.stroke();
      var len = Math.hypot(s.ax - s.px, s.ay - s.py);
      if (len > 2) arrow(ctx, s.px, s.py, s.ax, s.ay, ch >= 1 ? '#e8ffd0' : C.hook, 7, 24);
      ctx.restore();
    },

    drawHud: function (ctx, s) {
      ctx.save();
      var gen = s.gen || 1, maxGen = s.maxGen || 3, phase = s.phase || 'play';
      ctx.fillStyle = C.hudBg;
      ctx.fillRect(0, 0, W, HUD_H);
      ctx.fillStyle = C.hudLine;
      ctx.fillRect(0, HUD_H - 3, W, 3);

      // 左: 代數 + 三個小人
      text(ctx, '第 ' + gen + ' 代', 16, 28, 26, C.text, 'left');
      text(ctx, '/ ' + maxGen, 112, 30, 20, C.textDim, 'left');
      for (var i = 1; i <= maxGen; i++) {
        var mode = i === gen ? 'player' : (i === gen - 1 ? 'ghost' : (i < gen ? 'gone' : 'future'));
        var fx = 16 + (i - 1) * 34, fy = 52;
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

      // 關卡
      text(ctx, '關卡', 222, 26, 18, C.textDim);
      text(ctx, (s.level || 1) + ' / ' + (s.levelCount || 6), 222, 64, 28, C.text);

      // 鉤爪次數(解鎖後)
      if (s.hookUnlocked) {
        keycap(ctx, 'Z', 312, 24, 26);
        text(ctx, '鉤爪', 348, 25, 18, C.hook);
        hookPips(ctx, 290, 64, s.hookLeft == null ? 2 : s.hookLeft, s.hookMax || 2);
      }

      // 右: 按鍵提示(瞄準提示改由 drawAim 畫在角色旁; 這裡只畫「時間停了」的框)
      if (s.aiming) pauseFrame(ctx, 0, HUD_H, W, H - HUD_H);
      if (s.whistleUnlocked) {
        ctx.save();
        if (s.aiming) ctx.globalAlpha = 0.35; // 瞄準中 C 無效
        keycap(ctx, 'C', 470, 56, 30);
        text(ctx, '吹哨', 508, 56, 18, C.text);
        ctx.restore();
      }
      keycap(ctx, 'R', 572, 56, 30);
      text(ctx, '重來', 610, 56, 18, C.textDim);

      // 靜音
      speaker(ctx, 690, 30, !!s.muted);
      keycap(ctx, 'M', 688, 74, 26);

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
        text(ctx, '空白鍵 下一關', W / 2, 686, 24, C.textDim);
      } else if (phase === 'lose') {
        ctx.fillStyle = 'rgba(6,8,14,0.78)';
        ctx.fillRect(0, HUD_H, W, H - HUD_H);
        text(ctx, '失敗', W / 2, 560, 72, C.danger);
        text(ctx, '三個人都沒摸到旗子', W / 2, 640, 30, C.text);
        text(ctx, '空白鍵 再試一次', W / 2, 710, 28, C.textDim);
      }
      ctx.restore();
    },

    // ---------- 說明頁 ----------
    // 有 x,y,w,h: 只在框內畫示意圖(RD 畫標題、文字、頁碼、翻頁提示)
    // 只有 page: 畫滿整張畫布(interface.json 的寫法), 含背景、標題、文字、頁碼點、翻頁提示
    drawGuidePage: function (ctx, s) {
      s = s || {};
      var n = GUIDE.length;
      var page = Math.max(0, Math.min(n - 1, s.page | 0));
      var A = Art;
      ctx.save();
      if (s.w > 0 && s.h > 0) {
        inBox(ctx, s.x || 0, s.y || 0, s.w, s.h, function (c) { GUIDE[page](c, A); });
        ctx.restore();
        return;
      }
      bgFill(ctx);
      text(ctx, '幽影接力', W / 2, 60, 30, C.textDim);
      text(ctx, GUIDE_TITLES[page], W / 2, 140, 46, C.text);
      text(ctx, GUIDE_LINES[page], W / 2, 214, 32, '#ffe9a8');
      var PX = 40, PY = 280, PW = 640, PH = 760;
      rr(ctx, PX, PY, PW, PH, 20);
      ctx.fillStyle = 'rgba(8,12,22,0.55)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.stroke();
      inBox(ctx, PX, PY, PW, PH, function (c) { GUIDE[page](c, A); });
      for (var i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.arc(W / 2 - (n - 1) * 14 + i * 28, 1120, i === page ? 8 : 5, 0, Math.PI * 2);
        ctx.fillStyle = i === page ? C.text : 'rgba(138,147,173,0.5)';
        ctx.fill();
      }
      guidePrompt(ctx, page, n);
      ctx.restore();
    },

    drawLevelIntro: function (ctx, s) {
      s = s || {};
      var A = Art;
      ctx.save();
      bgFill(ctx);
      text(ctx, '第 ' + (s.level || 1) + ' 關 / 共 ' + (s.levelCount || 6) + ' 關', W / 2, 250, 30, C.textDim);
      text(ctx, s.title || '', W / 2, 340, 68, C.text);
      rr(ctx, 120, 430, 480, 380, 24);
      ctx.fillStyle = 'rgba(8,12,22,0.55)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.stroke();
      ctx.save();
      rr(ctx, 120, 430, 480, 380, 24);
      ctx.clip();
      introIcon(ctx, A, s.newThing || 'relay', W / 2, 620);
      ctx.restore();
      text(ctx, s.hint || '', W / 2, 890, 34, '#ffe9a8');
      bottomPrompt(ctx, '開始');
      ctx.restore();
    },

    drawUnlockPage: function (ctx, s) {
      s = s || {};
      var A = Art;
      var hook = s.ability !== 'whistle';
      ctx.save();
      bgFill(ctx);
      text(ctx, '解鎖', W / 2, 90, 30, C.textDim);
      text(ctx, hook ? '鉤爪' : '起跑哨', W / 2, 160, 64, hook ? C.hook : C.whistle);
      text(ctx, hook ? '看到 Z 就按, 每人 2 次' : '按 C, 幽靈立刻從頭出發', W / 2, 236, 32, '#ffe9a8');
      var PX = 40, PY = 290, PW = 640, PH = 760;
      rr(ctx, PX, PY, PW, PH, 20);
      ctx.fillStyle = 'rgba(8,12,22,0.55)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.stroke();
      inBox(ctx, PX, PY, PW, PH, function (c) { (hook ? unlockHook : unlockWhistle)(c, A); });
      bottomPrompt(ctx, '繼續');
      ctx.restore();
    },

    drawEnding: function (ctx) {
      var A = Art;
      ctx.save();
      bgFill(ctx);
      // 靜態彩紙(金 / 白 / 淡藍), 只在上半
      var conf = [[90, 420, C.goal], [170, 480, C.ghost], [260, 400, '#ffffff'], [480, 430, C.goal], [560, 390, C.ghost], [640, 470, '#ffffff'],
        [130, 560, '#ffffff'], [600, 560, C.goal], [330, 520, C.ghost], [410, 470, '#ffffff']];
      for (var i = 0; i < conf.length; i++) {
        ctx.save();
        ctx.translate(conf[i][0], conf[i][1]);
        ctx.rotate(i * 0.7);
        ctx.fillStyle = conf[i][2];
        ctx.fillRect(-6, -3, 12, 6);
        ctx.restore();
      }
      text(ctx, '全部通關!', W / 2, 280, 76, C.goal);
      text(ctx, '三個人, 六關, 一起走到了', W / 2, 360, 28, C.text);
      A.drawPlatform(ctx, { x: 120, y: 820, w: 480, h: 24 });
      A.drawGoal(ctx, { x: 520, y: 740 });
      ctx.save();
      ctx.translate(360, 760);
      ctx.scale(1.6, 1.6);
      drawFigure(ctx, -110, -60, 1, 'air', 1, 'player', false);
      drawFigure(ctx, -40, -80, 1, 'air', 2, 'player', false);
      drawFigure(ctx, 30, -60, -1, 'air', 3, 'player', false);
      ctx.restore();
      bottomPrompt(ctx, '從第 1 關再玩');
      ctx.restore();
    }
  };

  window.Art = Art;
})();
