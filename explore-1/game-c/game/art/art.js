// 三代接力 — 美術繪製模組(Canvas 2D 幾何繪製, 無外部資源)
// 全域物件 window.Art, 非 ES module。函式只負責「給狀態 → 畫出來」。
(function () {
  'use strict';

  var W = 720, H = 1280;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';

  var palette = {
    bg: '#10131f',          // 背景上緣
    bgLow: '#1b2036',       // 背景下緣
    grid: 'rgba(255,255,255,0.035)',
    voidRed: 'rgba(255,60,80,0.28)', // 畫面最下緣的危險暗紅(只在坑裡看得到)
    hudBg: '#0a0c15',
    outline: '#0a0c14',     // 角色深色描邊
    gen1: '#34C3E8',        // 第 1 代 青(灰階 157)
    gen2: '#8A4DF0',        // 第 2 代 紫(灰階 113)
    gen3: '#9BF06B',        // 第 3 代 黃綠(灰階 199)
    deadBody: '#4a4f60',    // 死亡角色身體
    ground: '#2c3149',      // 地面本體
    groundTop: '#6b7394',   // 地面頂面
    ledgeTop: '#9aa5cc',    // 單向平台頂面(可站的那一條)
    ledgeBody: 'rgba(154,165,204,0.18)', // 單向平台下半(可穿過)
    spike: '#FF4D5E',       // 危險紅, 全畫面只給尖刺與失敗
    plateOff: '#9C6B1E',    // 開關放開(暗琥珀)
    plateOn: '#FFC23D',     // 開關壓住 / 門開(亮琥珀), 開關與門共用
    plateBase: '#3a3324',
    gateBar: '#C88A1E',     // 門柵
    gateBody: '#3b2a0c',
    goalPole: '#d8dbe6',
    flagA: '#ffffff',
    flagB: '#1a1d2b',
    text: '#eef1fa',
    textDim: '#8f97b3',
    win: '#FFC23D',
    lose: '#FF4D5E',
  };

  var GEN = [null, palette.gen1, palette.gen2, palette.gen3];
  function genColor(g) { return GEN[g] || palette.gen1; }

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
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function now() { return Date.now(); }
  function text(ctx, s, x, y, size, color, align, weight) {
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size / 7);
    ctx.strokeStyle = 'rgba(5,6,12,0.9)';
    ctx.strokeText(s, x, y);
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }

  // 腿的位置(相對角色左上), 依狀態
  function legs(st) {
    if (st === 'run') {
      return (Math.floor(now() / 110) % 2 === 0)
        ? [[3, 46, 9, 10], [28, 46, 9, 10]]
        : [[12, 46, 8, 10], [20, 46, 8, 10]];
    }
    if (st === 'air') return [[8, 46, 9, 6], [23, 46, 9, 6]];
    if (st === 'dead') return [[1, 49, 12, 7], [27, 49, 12, 7]];
    return [[9, 46, 8, 10], [23, 46, 8, 10]];
  }

  function eyes(ctx, x, y, facing, st, hollow) {
    var f = facing === -1 ? -1 : 1;
    var cx = x + 20 + f * 5;
    var ey = y + 17;
    var py = st === 'air' ? -2 : 0;
    for (var i = -1; i <= 1; i += 2) {
      var ex = cx + i * 6;
      if (st === 'dead') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(ex - 4, ey - 4); ctx.lineTo(ex + 4, ey + 4);
        ctx.moveTo(ex + 4, ey - 4); ctx.lineTo(ex - 4, ey + 4);
        ctx.stroke();
        continue;
      }
      ctx.beginPath();
      ctx.ellipse(ex, ey, 4.5, 5.5, 0, 0, Math.PI * 2);
      if (hollow) {
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.fillStyle = palette.outline;
        ctx.beginPath();
        ctx.arc(ex + f * 1.8, ey + py, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ---------- 背景 ----------
  function drawBackground(ctx) {
    ctx.save();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, palette.bg);
    g.addColorStop(1, palette.bgLow);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 40; x < W; x += 40) { ctx.moveTo(x + 0.5, 100); ctx.lineTo(x + 0.5, H); }
    for (var y = 120; y < H; y += 40) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
    // 畫面下緣的暗紅: 地面會蓋住, 只在坑裡露出 = 掉下去會死
    var v = ctx.createLinearGradient(0, H - 70, 0, H);
    v.addColorStop(0, 'rgba(255,60,80,0)');
    v.addColorStop(1, palette.voidRed);
    ctx.fillStyle = v;
    ctx.fillRect(0, H - 70, W, 70);
    ctx.restore();
  }

  // ---------- 平台 ----------
  // h >= 40 視為實心地面; 否則為單向平台(頂面實線可站, 下半半透明可穿過)
  function drawPlatform(ctx, s) {
    var x = s.x, y = s.y, w = s.w, h = s.h;
    ctx.save();
    if (h >= 40) {
      ctx.fillStyle = palette.ground;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var r = 0; r * 20 + 8 < h; r++) {
        var yy = y + 8 + r * 20;
        ctx.moveTo(x, yy); ctx.lineTo(x + w, yy);
        for (var bx = x + (r % 2 ? 20 : 0); bx < x + w; bx += 40) {
          ctx.moveTo(bx, yy); ctx.lineTo(bx, Math.min(yy + 20, y + h));
        }
      }
      ctx.stroke();
      ctx.fillStyle = palette.groundTop;
      ctx.fillRect(x, y, w, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x, y, w, 2);
    } else {
      ctx.fillStyle = palette.ledgeBody;
      ctx.fillRect(x, y + 6, w, h - 6);
      ctx.strokeStyle = 'rgba(154,165,204,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var sx = x + 8; sx < x + w; sx += 16) { ctx.moveTo(sx, y + 6); ctx.lineTo(sx, y + h); }
      ctx.stroke();
      // 底緣虛線: 從下面可以穿上來
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(154,165,204,0.55)';
      ctx.beginPath(); ctx.moveTo(x, y + h - 1); ctx.lineTo(x + w, y + h - 1); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = palette.ledgeTop;
      ctx.fillRect(x, y, w, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(x, y, w, 2);
    }
    ctx.restore();
  }

  // ---------- 尖刺 (80x24) ----------
  function drawSpike(ctx, s) {
    var x = s.x, y = s.y, w = s.w || 80, h = 24;
    var n = Math.max(1, Math.round(w / 20)), tw = w / n;
    ctx.save();
    ctx.fillStyle = '#3a0d14';
    ctx.fillRect(x, y + h - 4, w, 4);
    for (var i = 0; i < n; i++) {
      var tx = x + i * tw;
      ctx.beginPath();
      ctx.moveTo(tx + 1, y + h - 3);
      ctx.lineTo(tx + tw / 2, y + 1);
      ctx.lineTo(tx + tw - 1, y + h - 3);
      ctx.closePath();
      ctx.fillStyle = palette.spike;
      ctx.fill();
      ctx.strokeStyle = '#4a0a14';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffd0d5';
      ctx.beginPath();
      ctx.moveTo(tx + tw / 2, y + 2);
      ctx.lineTo(tx + tw / 2 - 2.5, y + 8);
      ctx.lineTo(tx + tw / 2 + 1, y + 8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 開關 (80x12) ----------
  function drawPlate(ctx, s) {
    var x = s.x, y = s.y, w = 80, h = 12;
    ctx.save();
    ctx.fillStyle = palette.plateBase;
    ctx.fillRect(x, y + h - 4, w, 4);
    if (s.pressed) {
      // 壓下: 按鈕齊平(只剩 4px), 亮琥珀 + 外光
      ctx.shadowColor = palette.plateOn;
      ctx.shadowBlur = 16;
      ctx.fillStyle = palette.plateOn;
      ctx.fillRect(x + 4, y + h - 5, w - 8, 5);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff3c4';
      ctx.fillRect(x + 4, y + h - 5, w - 8, 1.5);
    } else {
      // 放開: 按鈕凸起 10px, 暗琥珀, 頂面斜紋
      ctx.fillStyle = palette.plateOff;
      rr(ctx, x + 4, y, w - 8, h - 2, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var i = x + 12; i < x + w - 6; i += 12) { ctx.moveTo(i, y + h - 3); ctx.lineTo(i + 6, y + 2); }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,220,150,0.45)';
      ctx.fillRect(x + 6, y, w - 12, 2);
    }
    ctx.restore();
  }

  // ---------- 門 (24x320) ----------
  function drawGate(ctx, s) {
    var x = s.x, y = s.y, w = 24, h = 320;
    ctx.save();
    if (!s.open) {
      // 關: 實心門板 + 橫柵 + 外框, 頂燈暗
      ctx.fillStyle = palette.gateBody;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = palette.gateBar;
      for (var by = y + 20; by < y + h - 4; by += 20) ctx.fillRect(x + 2, by, w - 4, 6);
      ctx.fillRect(x + 9, y + 14, 6, h - 14);
      ctx.strokeStyle = palette.gateBar;
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
      ctx.fillStyle = palette.plateOff;
      ctx.fillRect(x + 3, y + 3, w - 6, 9);
    } else {
      // 開: 門板收到頂端 24px, 其餘只剩淡虛線框 = 可通過; 頂燈亮(與壓下的開關同色)
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = rgba(palette.plateOn, 0.35);
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      ctx.setLineDash([]);
      ctx.fillStyle = palette.gateBody;
      ctx.fillRect(x, y, w, 24);
      ctx.fillStyle = palette.gateBar;
      ctx.fillRect(x + 2, y + 16, w - 4, 5);
      ctx.shadowColor = palette.plateOn;
      ctx.shadowBlur = 14;
      ctx.fillStyle = palette.plateOn;
      ctx.fillRect(x + 3, y + 3, w - 6, 9);
      ctx.shadowBlur = 0;
      // 向上的小箭頭: 門已升起
      ctx.fillStyle = rgba(palette.plateOn, 0.5);
      for (var k = 0; k < 3; k++) {
        var ay = y + 60 + k * 90;
        ctx.beginPath();
        ctx.moveTo(x + w / 2, ay); ctx.lineTo(x + w / 2 - 6, ay + 8); ctx.lineTo(x + w / 2 + 6, ay + 8);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  }

  // ---------- 終點旗 (48x80) ----------
  function drawGoal(ctx, s) {
    var x = s.x, y = s.y;
    ctx.save();
    // 底座
    ctx.fillStyle = '#5c6380';
    rr(ctx, x, y + 72, 22, 8, 2); ctx.fill();
    // 旗桿
    ctx.fillStyle = palette.goalPole;
    ctx.fillRect(x + 8, y + 2, 4, 72);
    ctx.beginPath(); ctx.arc(x + 10, y + 3, 3.5, 0, Math.PI * 2); ctx.fill();
    // 方格旗(微幅飄動, 在 48 寬內)
    var t = now() / 300;
    var cols = 6, rows = 4, fx = x + 12, fy = y + 6, cw = 35 / cols, ch = 28 / rows;
    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = palette.flagA;
    ctx.fillRect(fx, fy, 35, 28);
    ctx.shadowBlur = 0;
    for (var c = 0; c < cols; c++) {
      var off = Math.sin(t + c * 0.8) * 1.5 * (c / cols);
      for (var r = 0; r < rows; r++) {
        ctx.fillStyle = (c + r) % 2 ? palette.flagB : palette.flagA;
        ctx.fillRect(fx + c * cw, fy + r * ch + off, cw + 0.5, ch + 0.5);
      }
    }
    ctx.strokeStyle = palette.flagB;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(fx, fy, 35, 28);
    ctx.restore();
  }

  // ---------- 角色共用身形 (40x56) ----------
  function drawFigure(ctx, s, ghost) {
    var x = s.x, y = s.y, st = s.state || 'idle', c = genColor(s.gen);
    var L = legs(st);
    ctx.save();
    if (ghost) {
      // 幽靈: 半透明身體 + 虛線輪廓 + 空心眼; 唯一實心的是頭頂那條可站的邊
      ctx.fillStyle = rgba(c, 0.28);
      for (var i = 0; i < 2; i++) ctx.fillRect(x + L[i][0], y + L[i][1], L[i][2], L[i][3]);
      rr(ctx, x + 2, y, 36, 48, 9);
      ctx.fill();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = rgba(c, 0.9);
      ctx.lineWidth = 2;
      rr(ctx, x + 3, y + 1, 34, 46, 8);
      ctx.stroke();
      ctx.setLineDash([]);
      eyes(ctx, x, y, s.facing, st, true);
      // 頭頂可站的邊: 全寬 40, 實心
      ctx.fillStyle = c;
      rr(ctx, x, y, 40, 6, 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 2, y, 36, 2);
    } else {
      var dead = st === 'dead';
      var body = dead ? palette.deadBody : c;
      ctx.fillStyle = body;
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 2;
      for (var j = 0; j < 2; j++) {
        rr(ctx, x + L[j][0], y + L[j][1], L[j][2], L[j][3], 2);
        ctx.fill(); ctx.stroke();
      }
      rr(ctx, x + 3, y + 1, 34, 46, 9);
      ctx.fill();
      // 腰帶(深一階)
      ctx.save();
      rr(ctx, x + 3, y + 1, 34, 46, 9); ctx.clip();
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x, y + 34, 40, 6);
      ctx.restore();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = dead ? c : palette.outline;
      rr(ctx, x + 3, y + 1, 34, 46, 9);
      ctx.stroke();
      if (!dead) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        rr(ctx, x + 8, y + 5, 9, 4, 2); ctx.fill();
      }
      eyes(ctx, x, y, s.facing, st, false);
    }
    ctx.restore();
  }

  function drawPlayer(ctx, s) { drawFigure(ctx, s, false); }
  function drawGhost(ctx, s) { drawFigure(ctx, s, true); }

  // 縮小版角色(HUD 與說明頁用), mode: 'player' | 'ghost' | 'gone' | 'wait'
  function miniFigure(ctx, x, y, scale, gen, mode) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    if (mode === 'wait') {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = rgba(genColor(gen), 0.6);
      ctx.lineWidth = 2;
      rr(ctx, 3, 1, 34, 46, 9); ctx.stroke();
      ctx.setLineDash([]);
    } else if (mode === 'gone') {
      ctx.globalAlpha *= 0.18;
      drawGhost(ctx, { x: 0, y: 0, facing: 1, state: 'idle', gen: gen });
    } else if (mode === 'ghost') {
      drawGhost(ctx, { x: 0, y: 0, facing: 1, state: 'idle', gen: gen });
    } else {
      drawPlayer(ctx, { x: 0, y: 0, facing: 1, state: 'idle', gen: gen });
    }
    ctx.restore();
  }

  // ---------- HUD ----------
  function drawHud(ctx, s) {
    var gen = s.gen || 1, maxGen = s.maxGen || 3, phase = s.phase || 'play';
    ctx.save();
    ctx.fillStyle = palette.hudBg;
    ctx.fillRect(0, 0, W, 100);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 99, W, 1);

    // 左: 第幾代 + 三格代數圖示(過去=淡出, 上一代=幽靈, 現在=實心, 未來=虛線空框)
    text(ctx, '第 ' + gen + ' / ' + maxGen + ' 代', 24, 50, 34, phase === 'win' ? palette.text : genColor(gen), 'left');
    for (var g = 1; g <= maxGen; g++) {
      var mode;
      if (phase === 'win') mode = 'ghost';
      else if (g < gen - 1) mode = 'gone';
      else if (g === gen - 1) mode = 'ghost';
      else if (g === gen) mode = (phase === 'dying' || phase === 'lose') ? 'ghost' : 'player';
      else mode = 'wait';
      var ix = 216 + (g - 1) * 40;
      if (g === gen && (phase === 'dying' || phase === 'lose')) {
        ctx.save(); ctx.translate(ix, 22); ctx.scale(0.6, 0.6);
        drawPlayer(ctx, { x: 0, y: 0, facing: 1, state: 'dead', gen: g });
        ctx.restore();
      } else {
        miniFigure(ctx, ix, 22, 0.6, g, mode);
      }
    }
    // 右: 操作提示
    text(ctx, '←→ 走   空白/↑ 跳', W - 24, 36, 20, palette.textDim, 'right', 'bold');
    text(ctx, 'R 整關重來', W - 24, 68, 20, palette.textDim, 'right', 'bold');

    if (phase === 'dying') {
      var msg = gen < maxGen ? '倒下了…第 ' + (gen + 1) + ' 代準備出生' : '倒下了…';
      ctx.fillStyle = 'rgba(10,12,21,0.75)';
      rr(ctx, 120, 124, 480, 48, 12); ctx.fill();
      text(ctx, msg, W / 2, 148, 26, palette.text, 'center');
    } else if (phase === 'win') {
      ctx.fillStyle = 'rgba(10,12,21,0.78)';
      rr(ctx, 100, 170, 520, 250, 20); ctx.fill();
      ctx.strokeStyle = rgba(palette.win, 0.8);
      ctx.lineWidth = 3;
      rr(ctx, 100, 170, 520, 250, 20); ctx.stroke();
      text(ctx, '過關!', W / 2, 238, 68, palette.win, 'center');
      text(ctx, '三代接力回放中', W / 2, 310, 28, palette.text, 'center');
      text(ctx, '按空白鍵重來', W / 2, 368, 26, palette.textDim, 'center');
    } else if (phase === 'lose') {
      ctx.fillStyle = 'rgba(5,6,12,0.65)';
      ctx.fillRect(0, 100, W, H - 100);
      ctx.fillStyle = 'rgba(16,10,16,0.92)';
      rr(ctx, 100, 480, 520, 280, 20); ctx.fill();
      ctx.strokeStyle = palette.lose;
      ctx.lineWidth = 3;
      rr(ctx, 100, 480, 520, 280, 20); ctx.stroke();
      text(ctx, '失敗', W / 2, 556, 68, palette.lose, 'center');
      text(ctx, '三代都倒下了', W / 2, 634, 28, palette.text, 'center');
      text(ctx, '按空白鍵重來', W / 2, 696, 26, palette.textDim, 'center');
    }
    ctx.restore();
  }

  // ---------- 說明頁 ----------
  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(8,10,18,0.6)';
    rr(ctx, x, y, w, h, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    rr(ctx, x, y, w, h, 16); ctx.stroke();
  }
  function keycap(ctx, label, cx, cy, w) {
    w = w || 44;
    ctx.fillStyle = '#e6e9f4';
    rr(ctx, cx - w / 2, cy - 20, w, 40, 8); ctx.fill();
    ctx.fillStyle = '#9aa1b8';
    ctx.fillRect(cx - w / 2 + 4, cy + 14, w - 8, 4);
    ctx.font = 'bold 22px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#141826';
    ctx.fillText(label, cx, cy - 1);
  }
  function dashedPath(ctx, pts, color, arrow) {
    ctx.save();
    ctx.setLineDash([8, 7]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) {
      if (pts[i].length === 4) ctx.quadraticCurveTo(pts[i][0], pts[i][1], pts[i][2], pts[i][3]);
      else ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    if (arrow) {
      var p = pts[pts.length - 1], q = pts.length > 1 ? pts[pts.length - 2] : p;
      var ex = p.length === 4 ? p[2] : p[0], ey = p.length === 4 ? p[3] : p[1];
      var sx = p.length === 4 ? p[0] : (q.length === 4 ? q[2] : q[0]);
      var sy = p.length === 4 ? p[1] : (q.length === 4 ? q[3] : q[1]);
      var a = Math.atan2(ey - sy, ex - sx);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - 14 * Math.cos(a - 0.45), ey - 14 * Math.sin(a - 0.45));
      ctx.lineTo(ex - 14 * Math.cos(a + 0.45), ey - 14 * Math.sin(a + 0.45));
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function mark(ctx, ok, cx, cy, label) {
    ctx.save();
    var c = ok ? '#7CF2A0' : palette.lose;
    ctx.fillStyle = 'rgba(8,10,18,0.85)';
    ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    if (ok) { ctx.moveTo(cx - 11, cy + 1); ctx.lineTo(cx - 3, cy + 9); ctx.lineTo(cx + 12, cy - 9); }
    else { ctx.moveTo(cx - 9, cy - 9); ctx.lineTo(cx + 9, cy + 9); ctx.moveTo(cx + 9, cy - 9); ctx.lineTo(cx - 9, cy + 9); }
    ctx.stroke();
    if (label) text(ctx, label, cx + 34, cy, 24, c, 'left');
    ctx.restore();
  }

  var GUIDE = [
    { title: '走到旗子', lines: ['←→ 走、空白鍵跳、R 整關重來'] },
    { title: '死了會變幽靈', lines: ['死掉的你會一直重演剛才的動作'] },
    { title: '踩幽靈', lines: ['幽靈的頭可以踩'] },
    { title: '開關與門', lines: ['開關被踩住, 門才會開'] },
    { title: '只有三個人', lines: ['共三人, 只看得到上一個人的幽靈'] },
  ];

  function guidePage1(ctx) {
    panel(ctx, 30, 290, 660, 760);
    // 整關縮圖: 遊戲座標 x 0~720, y 540~1280 → 縮 0.9
    var s = 0.9, ox = 360 - 360 * s, oy = 340 - 540 * s;
    ctx.save();
    ctx.beginPath(); rr(ctx, 30, 290, 660, 760, 16); ctx.clip();
    ctx.translate(ox, oy); ctx.scale(s, s);
    drawPlatform(ctx, { x: 0, y: 1200, w: 600, h: 80 });
    drawPlatform(ctx, { x: 0, y: 1000, w: 480, h: 24 });
    drawPlatform(ctx, { x: 360, y: 880, w: 360, h: 24 });
    drawSpike(ctx, { x: 0, y: 976, w: 80 });
    drawPlate(ctx, { x: 160, y: 988, pressed: false });
    drawGate(ctx, { x: 560, y: 560, open: false });
    drawGoal(ctx, { x: 640, y: 800 });
    drawPlayer(ctx, { x: 60, y: 1144, facing: 1, state: 'idle', gen: 1 });
    // 圈出終點旗
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = palette.win; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(664, 840, 62, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    var gx = function (x) { return ox + x * s; }, gy = function (y) { return oy + y * s; };
    text(ctx, '終點', gx(664), gy(840) - 72, 24, palette.win, 'center');
    // 角色旁的按鍵
    var px = gx(80), py = gy(1172);
    keycap(ctx, '←', px - 52, py, 40);
    keycap(ctx, '→', px + 52, py, 40);
    keycap(ctx, '空白', px + 12, py - 78, 72);
    text(ctx, '跳', px + 62, py - 78, 22, palette.text, 'left');
    keycap(ctx, 'R', px + 130, py - 6, 40);
    text(ctx, '整關重來', px + 158, py - 6, 22, palette.text, 'left');
  }

  function groundStrip(ctx, x, y, w) { drawPlatform(ctx, { x: x, y: y, w: w, h: 80 }); }

  function guidePage2(ctx) {
    var py = 340, ph = 620;
    panel(ctx, 24, py, 324, ph);
    panel(ctx, 372, py, 324, ph);
    text(ctx, '第 1 代', 186, py + 36, 26, palette.gen1, 'center');
    text(ctx, '第 2 代', 534, py + 36, 26, palette.gen2, 'center');
    var gt = py + 460; // 地面頂
    ctx.save();
    ctx.beginPath(); rr(ctx, 24, py, 324, ph, 16); ctx.clip();
    groundStrip(ctx, 24, gt, 220);
    var v = ctx.createLinearGradient(0, gt + 80, 0, py + ph);
    v.addColorStop(0, 'rgba(255,60,80,0)'); v.addColorStop(1, palette.voidRed);
    ctx.fillStyle = v; ctx.fillRect(244, gt, 104, py + ph - gt);
    dashedPath(ctx, [[84, gt - 28], [230, gt - 28], [270, gt - 40, 286, gt + 40]], rgba(palette.gen1, 0.7), true);
    drawPlayer(ctx, { x: 266, y: gt + 50, facing: 1, state: 'dead', gen: 1 });
    ctx.restore();

    ctx.save();
    ctx.beginPath(); rr(ctx, 372, py, 324, ph, 16); ctx.clip();
    groundStrip(ctx, 372, gt, 220);
    ctx.fillStyle = v; ctx.fillRect(592, gt, 104, py + ph - gt);
    // 幽靈照上一代路線走, 掉坑後從頭重來(循環)
    dashedPath(ctx, [[432, gt - 28], [578, gt - 28], [618, gt - 40, 634, gt + 40]], rgba(palette.gen1, 0.6), true);
    dashedPath(ctx, [[650, gt - 40], [660, py + 120, 520, py + 130], [420, py + 140, 410, gt - 80]], rgba(palette.gen1, 0.45), true);
    text(ctx, '一直重演', 534, py + 100, 22, palette.gen1, 'center');
    drawGhost(ctx, { x: 500, y: gt - 56, facing: 1, state: 'run', gen: 1 });
    drawPlayer(ctx, { x: 392, y: gt - 56, facing: 1, state: 'idle', gen: 2 });
    ctx.restore();
    text(ctx, '幽靈', 520, gt + 26, 22, palette.gen1, 'center');
    text(ctx, '你', 412, gt + 26, 22, palette.gen2, 'center');
  }

  function guidePage3(ctx) {
    var py = 320, ph = 700;
    panel(ctx, 24, py, 324, ph);
    panel(ctx, 372, py, 324, ph);
    var gt = py + 560, top = gt - 200;
    // 左: 一般跳, 跳不到
    ctx.save(); ctx.beginPath(); rr(ctx, 24, py, 324, ph, 16); ctx.clip();
    groundStrip(ctx, 24, gt, 324);
    drawPlatform(ctx, { x: 170, y: top, w: 178, h: 24 });
    dashedPath(ctx, [[110, gt - 4], [150, gt - 336, 190, gt - 4]], 'rgba(238,241,250,0.5)', true);
    drawPlayer(ctx, { x: 130, y: gt - 168 - 56, facing: 1, state: 'air', gen: 2 });
    ctx.restore();
    // 差距標示: 腳底到平台頂
    ctx.save();
    ctx.strokeStyle = palette.lose; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(180, gt - 168); ctx.lineTo(196, gt - 168); ctx.moveTo(188, gt - 168); ctx.lineTo(188, top + 2); ctx.stroke();
    ctx.restore();
    mark(ctx, false, 80, py + 70, '一般跳');

    // 右: 踩幽靈頭再跳, 上得去
    ctx.save(); ctx.beginPath(); rr(ctx, 372, py, 324, ph, 16); ctx.clip();
    groundStrip(ctx, 372, gt, 324);
    drawPlatform(ctx, { x: 518, y: top, w: 178, h: 24 });
    drawGhost(ctx, { x: 420, y: gt - 56, facing: 1, state: 'idle', gen: 1 });
    dashedPath(ctx, [[440, gt - 60], [470, gt - 300, 580, top - 4]], 'rgba(238,241,250,0.6)', true);
    drawPlayer(ctx, { x: 590, y: top - 56, facing: 1, state: 'idle', gen: 2 });
    ctx.restore();
    // 幽靈頭頂指認
    text(ctx, '頭頂可站', 440, gt + 30, 22, palette.gen1, 'center');
    mark(ctx, true, 428, py + 70, '踩幽靈');
  }

  function guidePage4(ctx) {
    var py = 320, ph = 700;
    var gt = py + 600;
    for (var k = 0; k < 2; k++) {
      var px = k === 0 ? 24 : 372, on = k === 1;
      panel(ctx, px, py, 324, ph);
      ctx.save(); ctx.beginPath(); rr(ctx, px, py, 324, ph, 16); ctx.clip();
      drawPlatform(ctx, { x: px, y: gt, w: 324, h: 24 });
      var plx = px + 40, gx = px + 250;
      // 開關 → 門的連動虛線(說明頁專用)
      dashedPath(ctx, [[plx + 40, gt - 20], [plx + 140, gt - 200, gx - 6, gt - 312]], rgba(palette.plateOn, on ? 0.7 : 0.25), true);
      if (on) {
        ctx.save();
        ctx.fillStyle = 'rgba(160,166,188,0.85)';
        rr(ctx, plx + 23, gt - 56, 34, 46, 9); ctx.fill();
        ctx.fillRect(plx + 29, gt - 10, 8, 10); ctx.fillRect(plx + 43, gt - 10, 8, 10);
        ctx.restore();
      }
      drawPlate(ctx, { x: plx, y: gt - 12, pressed: on });
      drawGate(ctx, { x: gx, y: gt - 320, open: on });
      ctx.restore();
      mark(ctx, on, px + 56, py + 64, on ? '門開' : '門關');
    }
  }

  function guidePage5(ctx) {
    panel(ctx, 30, 300, 660, 300);
    var sc = 1.7, xs = [150, 360, 570];
    for (var i = 0; i < 3; i++) {
      miniFigure(ctx, xs[i] - 20 * sc, 360, sc, i + 1, 'player');
      text(ctx, String(i + 1), xs[i], 360 + 56 * sc + 34, 34, genColor(i + 1), 'center');
    }
    text(ctx, '輪到 3 號時 ↓', 360, 660, 28, palette.text, 'center');
    panel(ctx, 30, 710, 660, 340);
    miniFigure(ctx, xs[0] - 20 * sc, 770, sc, 1, 'gone');
    miniFigure(ctx, xs[1] - 20 * sc, 770, sc, 2, 'ghost');
    miniFigure(ctx, xs[2] - 20 * sc, 770, sc, 3, 'player');
    text(ctx, '1 消失', xs[0], 770 + 56 * sc + 34, 26, palette.textDim, 'center');
    text(ctx, '2 幽靈', xs[1], 770 + 56 * sc + 34, 26, palette.gen2, 'center');
    text(ctx, '3 你', xs[2], 770 + 56 * sc + 34, 26, palette.gen3, 'center');
    mark(ctx, false, xs[0] + 46, 790);
  }

  function drawGuidePage(ctx, s) {
    var page = Math.max(0, Math.min(GUIDE.length - 1, (s && s.page) | 0));
    var g = GUIDE[page];
    ctx.save();
    drawBackground(ctx);
    ctx.fillStyle = palette.hudBg;
    ctx.fillRect(0, 0, W, 100);
    text(ctx, '三代接力  玩法說明', 24, 50, 30, palette.text, 'left');
    text(ctx, (page + 1) + ' / ' + GUIDE.length, W - 24, 50, 26, palette.textDim, 'right');
    text(ctx, g.title, W / 2, 170, 46, palette.win, 'center');
    for (var i = 0; i < g.lines.length; i++) text(ctx, g.lines[i], W / 2, 236 + i * 40, 28, palette.text, 'center');
    [guidePage1, guidePage2, guidePage3, guidePage4, guidePage5][page](ctx);
    var last = page === GUIDE.length - 1;
    ctx.fillStyle = 'rgba(10,12,21,0.85)';
    rr(ctx, 160, 1160, 400, 64, 32); ctx.fill();
    ctx.strokeStyle = rgba(palette.win, 0.7); ctx.lineWidth = 2;
    rr(ctx, 160, 1160, 400, 64, 32); ctx.stroke();
    text(ctx, last ? '空白鍵  開始遊戲' : '空白鍵  下一頁', W / 2, 1192, 28, last ? palette.win : palette.text, 'center');
    ctx.restore();
  }

  window.Art = {
    canvas: { width: W, height: H },
    palette: palette,
    guidePages: GUIDE.length,
    drawBackground: drawBackground,
    drawPlatform: drawPlatform,
    drawSpike: drawSpike,
    drawPlate: drawPlate,
    drawGate: drawGate,
    drawGoal: drawGoal,
    drawGhost: drawGhost,
    drawPlayer: drawPlayer,
    drawHud: drawHud,
    drawGuidePage: drawGuidePage,
  };
})();
