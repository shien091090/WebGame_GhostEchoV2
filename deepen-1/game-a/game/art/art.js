// 預影(前方預影 + 分色路線) 美術
// 全域物件 window.Art, 不用 ES module。純 Canvas 2D 幾何繪製, 無外部資源。
// 函式只負責「給狀態就畫」, 不含任何遊戲邏輯。
(function () {
  'use strict';

  var W = 720, H = 1280;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';

  var palette = {
    bg: '#10152a',          // 天空上緣
    bgLow: '#1b2242',       // 天空下緣
    star: '#2e3860',        // 背景星點
    hudBg: '#0a0e1c',       // HUD 底
    hudLine: '#2e3860',     // HUD 下緣線
    ground: '#2a3352',      // 實心地面本體
    groundDark: '#1d243d',  // 地面紋理
    platTop: '#a9b8de',     // 可站表面(地面頂、平台頂、幽靈頭頂)
    platBody: '#3b4669',    // 單向平台本體
    platSlat: '#56638c',    // 單向平台鏤空柵條
    spike: '#ff4d5e',       // 尖刺(危險)
    spikeBase: '#5a2230',   // 尖刺底座
    mech: '#ffb020',        // 機關色: 開關、門、路線的「踩開關」段
    mechDim: '#7a5a1c',     // 機關未啟動
    mechDark: '#2e230d',    // 門板底
    goalPole: '#d8deea',    // 旗桿
    goalA: '#ffffff',       // 終點旗格 A
    goalB: '#1a1f30',       // 終點旗格 B
    gen1: '#6b8cff',        // 第 1 代
    gen2: '#ff6ad5',        // 第 2 代
    gen3: '#5ee07a',        // 第 3 代
    hook: '#ffffff',        // 鉤爪、鉤索、可鉤發光
    pathAir: '#6ff3ff',     // 路線: 騰空
    pathGround: '#b8c4e0',  // 路線: 著地
    pathPlate: '#ffb020',   // 路線: 踩開關(= mech)
    dead: '#5b6275',        // 死亡 / 已用掉
    off: '#4a5270',         // 停用圖示
    text: '#eef2ff',
    textDim: '#8a94b4',
    outline: '#05070f',
    bad: '#ff4d5e'
  };

  function genColor(g) {
    return g === 2 ? palette.gen2 : g === 3 ? palette.gen3 : palette.gen1;
  }
  function now() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }

  // ---------- 共用小工具 ----------
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function txt(ctx, s, x, y, size, color, align, bold, outline) {
    ctx.font = (bold ? 'bold ' : '') + size + 'px ' + FONT;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    if (outline) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, size / 6);
      ctx.strokeStyle = palette.outline;
      ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }

  function arrow(ctx, x1, y1, x2, y2, color, width, dashed) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width || 3;
    ctx.lineCap = 'round';
    if (dashed) ctx.setLineDash([8, 7]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    var a = Math.atan2(y2 - y1, x2 - x1), L = 8 + (width || 3) * 2;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - L * Math.cos(a - 0.45), y2 - L * Math.sin(a - 0.45));
    ctx.lineTo(x2 - L * Math.cos(a + 0.45), y2 - L * Math.sin(a + 0.45));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 拋物線虛線箭頭(示意跳躍 / 甩出軌跡)
  function arcArrow(ctx, x1, y1, x2, y2, lift, color, width) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 3;
    ctx.lineCap = 'round';
    ctx.setLineDash([8, 7]);
    var cx = (x1 + x2) / 2, cy = Math.min(y1, y2) - lift;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.stroke();
    ctx.restore();
    // 箭頭沿切線
    var tx = x2 - cx, ty = y2 - cy, d = Math.sqrt(tx * tx + ty * ty) || 1;
    arrow(ctx, x2 - tx / d * 2, y2 - ty / d * 2, x2, y2, color, width, false);
  }

  function crossMark(ctx, cx, cy, r) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r);
    ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r);
    ctx.stroke();
    ctx.strokeStyle = palette.bad;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
  }

  function checkMark(ctx, cx, cy, r) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx - r * 0.3, cy + r * 0.7);
    ctx.lineTo(cx + r, cy - r * 0.8);
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 11;
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.restore();
  }

  // ---------- 角色共用身形(玩家 / 幽靈 / 預影 / 說明頁的消失者) ----------
  function legsFor(state, t) {
    if (state === 'run') {
      var s = Math.sin(t / 70);
      return [
        { x: 10 + s * 4, y: 46, h: 10 - Math.max(0, s) * 3 },
        { x: 22 - s * 4, y: 46, h: 10 - Math.max(0, -s) * 3 }
      ];
    }
    if (state === 'air') return [{ x: 7, y: 44, h: 8 }, { x: 25, y: 44, h: 8 }];
    if (state === 'hook') return [{ x: 13, y: 46, h: 10 }, { x: 19, y: 46, h: 10 }];
    if (state === 'dead') return [{ x: 7, y: 50, h: 6 }, { x: 25, y: 50, h: 6 }];
    return [{ x: 10, y: 46, h: 10 }, { x: 22, y: 46, h: 10 }];
  }

  // 身形路徑(身體 + 腿), 原點為碰撞框左上, 全部落在 40x56 內
  function figurePath(ctx, state, bodyTop, t) {
    rr(ctx, 4, bodyTop, 32, 46 - bodyTop, 12);
    var legs = legsFor(state, t);
    for (var i = 0; i < legs.length; i++) {
      ctx.rect(legs[i].x, legs[i].y, 8, legs[i].h);
    }
  }

  function armsPath(ctx, state) {
    ctx.beginPath();
    if (state === 'hook') {          // 雙手上舉, 被往上拉
      ctx.moveTo(8, 22); ctx.lineTo(3, 5);
      ctx.moveTo(32, 22); ctx.lineTo(37, 5);
      return true;
    }
    if (state === 'air') {           // 雙手張開
      ctx.moveTo(7, 26); ctx.lineTo(2, 18);
      ctx.moveTo(33, 26); ctx.lineTo(38, 18);
      return true;
    }
    return false;
  }

  function eyes(ctx, facing, dead, alpha) {
    var cx = 20 + facing * 5;
    if (dead) {
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      [cx - 5, cx + 5].forEach(function (ex) {
        ctx.moveTo(ex - 3, 13); ctx.lineTo(ex + 3, 19);
        ctx.moveTo(ex + 3, 13); ctx.lineTo(ex - 3, 19);
      });
      ctx.stroke();
      return;
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 5, 16, 4, 0, Math.PI * 2);
    ctx.arc(cx + 5, 16, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.outline;
    ctx.beginPath();
    ctx.arc(cx - 5 + facing * 1.6, 16, 2, 0, Math.PI * 2);
    ctx.arc(cx + 5 + facing * 1.6, 16, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // kind: player | ghost | preview | vanished(只用在說明頁)
  function figure(ctx, x, y, facing, state, gen, kind, hookable) {
    var t = now();
    var col = genColor(gen);
    facing = facing === -1 ? -1 : 1;
    ctx.save();
    ctx.translate(x, y);

    if (kind === 'player') {
      var dead = state === 'dead';
      if (armsPath(ctx, state)) {
        ctx.lineCap = 'round';
        ctx.strokeStyle = palette.outline; ctx.lineWidth = 7; ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.stroke();
      }
      ctx.beginPath();
      figurePath(ctx, state, 0, t);
      ctx.fillStyle = dead ? palette.dead : col;
      ctx.fill();
      ctx.strokeStyle = dead ? col : palette.outline;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      if (!dead) {   // 實體角色的上緣高光, 跟幽靈的半透明區隔
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        rr(ctx, 9, 3, 22, 6, 3);
        ctx.fill();
      }
      eyes(ctx, facing, dead, 1);
    } else if (kind === 'ghost') {
      var pulse = 0.5 + 0.5 * Math.sin(t / 140);
      if (hookable) {  // 可鉤: 白色外光 + 白輪廓, 脈動
        ctx.save();
        ctx.shadowColor = palette.hook;
        ctx.shadowBlur = 14 + 10 * pulse;
        ctx.beginPath();
        figurePath(ctx, state, 4, t);
        ctx.strokeStyle = palette.hook;
        ctx.lineWidth = 3 + pulse * 1.5;
        ctx.stroke();
        ctx.restore();
      }
      if (armsPath(ctx, state)) {
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.beginPath();
      figurePath(ctx, state, 4, t);
      ctx.globalAlpha = hookable ? 0.6 : 0.42;
      ctx.fillStyle = col;
      ctx.fill();
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = hookable ? palette.hook : col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
      eyes(ctx, facing, false, 0.75);
      // 頭頂可站的那一條邊: 與平台頂同色, 實心
      ctx.fillStyle = palette.outline;
      ctx.fillRect(0, 0, 40, 5);
      ctx.fillStyle = hookable ? palette.hook : palette.platTop;
      ctx.fillRect(1, 0.5, 38, 3.5);
    } else if (kind === 'preview') {
      // 預影: 無眼、無頭頂邊、極淡填色 + 細輪廓
      ctx.beginPath();
      figurePath(ctx, state, 4, t);
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = col;
      ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else { // vanished
      ctx.beginPath();
      figurePath(ctx, state, 4, t);
      ctx.setLineDash([5, 5]);
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = palette.textDim;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function hookIcon(ctx, cx, cy, r, on) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = on ? '#1c2440' : '#111528';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = on ? palette.hook : palette.off;
    if (!on) ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    var c = on ? palette.hook : palette.off;
    ctx.strokeStyle = c;
    ctx.lineCap = 'round';
    ctx.lineWidth = r * 0.14;
    if (on) { ctx.shadowColor = palette.hook; ctx.shadowBlur = 10; }
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.6);            // 柄
    ctx.lineTo(cx, cy + r * 0.15);
    ctx.moveTo(cx - r * 0.42, cy + r * 0.1); // 爪
    ctx.arc(cx, cy + r * 0.1, r * 0.42, Math.PI, 0, true);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.25, cy - r * 0.45); ctx.lineTo(cx + r * 0.25, cy - r * 0.45);
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (!on) {  // 用掉: 斜線
      ctx.strokeStyle = palette.bad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.7, cy + r * 0.7);
      ctx.lineTo(cx + r * 0.7, cy - r * 0.7);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 匯出函式 ----------
  function drawBackground(ctx) {
    ctx.save();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, palette.bg);
    g.addColorStop(1, palette.bgLow);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // 固定星點(決定性, 不動)
    ctx.fillStyle = palette.star;
    var seed = 7;
    for (var i = 0; i < 70; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      var sx = seed / 233280 * W;
      seed = (seed * 9301 + 49297) % 233280;
      var sy = 110 + seed / 233280 * 1060;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.restore();
  }

  function drawPlatform(ctx, s) {
    ctx.save();
    var x = s.x, y = s.y, w = s.w, h = s.h;
    if (h >= 40) {
      // 實心地面
      ctx.fillStyle = palette.ground;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = palette.groundDark;
      for (var i = x + 20; i < x + w - 10; i += 48) {
        ctx.fillRect(i, y + 22, 24, 4);
        ctx.fillRect(i + 22, y + 48, 18, 4);
      }
      ctx.fillStyle = palette.platTop;
      ctx.fillRect(x, y, w, 6);
    } else {
      // 單向平台: 實心頂帶 + 下方鏤空柵條(看得出從下面可穿過)
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = palette.platBody;
      ctx.fillRect(x, y + 8, w, h - 8);
      ctx.globalAlpha = 1;
      ctx.fillStyle = palette.platSlat;
      for (var k = x + 6; k < x + w - 4; k += 20) {
        ctx.fillRect(k, y + 8, 4, h - 8);
      }
      ctx.fillRect(x, y + h - 3, w, 3);
      ctx.fillStyle = palette.platTop;
      ctx.fillRect(x, y, w, 8);
    }
    ctx.restore();
  }

  function drawSpike(ctx, s) {
    ctx.save();
    var x = s.x, y = s.y, w = s.w || 60, h = 24;
    ctx.fillStyle = palette.spikeBase;
    ctx.fillRect(x, y + h - 5, w, 5);
    var n = Math.max(1, Math.round(w / 15)), sw = w / n;
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      ctx.moveTo(x + i * sw, y + h - 5);
      ctx.lineTo(x + i * sw + sw / 2, y);
      ctx.lineTo(x + (i + 1) * sw, y + h - 5);
    }
    ctx.closePath();
    ctx.fillStyle = palette.spike;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = palette.outline;
    ctx.stroke();
    ctx.restore();
  }

  function drawPlate(ctx, s) {
    ctx.save();
    var x = s.x, y = s.y, w = 80, h = 12;
    if (s.pressed) {
      // 壓下: 只剩 4px 高、全亮 + 外光
      ctx.shadowColor = palette.mech;
      ctx.shadowBlur = 16;
      ctx.fillStyle = palette.mech;
      ctx.fillRect(x, y + 8, w, 4);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff2c8';
      ctx.fillRect(x + 6, y + 8, w - 12, 1.5);
    } else {
      // 放開: 凸起 12px、暗琥珀 + 亮框 + 斜紋
      ctx.fillStyle = palette.mechDim;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = palette.mech;
      for (var i = x + 4; i <= x + w - 16; i += 14) {
        ctx.beginPath();
        ctx.moveTo(i, y + h); ctx.lineTo(i + 6, y + h); ctx.lineTo(i + 12, y); ctx.lineTo(i + 6, y);
        ctx.closePath();
        ctx.globalAlpha = 0.45;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = palette.mech;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    }
    ctx.restore();
  }

  function drawGate(ctx, s) {
    ctx.save();
    var x = s.x, y = s.y, w = 24, h = 220;
    if (!s.open) {
      // 關: 實心門板 + 琥珀柵欄
      ctx.fillStyle = palette.mechDark;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = palette.mech;
      ctx.fillRect(x + 4, y, 4, h);
      ctx.fillRect(x + 16, y, 4, h);
      for (var j = y + 20; j < y + h - 10; j += 40) ctx.fillRect(x, j, w, 4);
      ctx.strokeStyle = palette.mech;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    } else {
      // 開: 只剩虛線門框 + 頂端門楣, 中間空的
      ctx.globalAlpha = 0.45;
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = palette.mech;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.fillStyle = palette.mech;
      ctx.fillRect(x, y, w, 8);
    }
    ctx.restore();
  }

  function drawGoal(ctx, s) {
    ctx.save();
    var x = s.x, y = s.y;
    ctx.fillStyle = palette.goalPole;
    ctx.fillRect(x + 4, y + 4, 4, 70);
    ctx.beginPath();
    ctx.arc(x + 6, y + 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x, y + 74, 20, 6);
    // 黑白格旗
    var fx = x + 8, fy = y + 6, cw = 10, ch = 10;
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 4; c++) {
        ctx.fillStyle = (r + c) % 2 ? palette.goalB : palette.goalA;
        ctx.fillRect(fx + c * cw, fy + r * ch, cw, ch);
      }
    }
    ctx.strokeStyle = palette.goalA;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(fx + 0.75, fy + 0.75, 40 - 1.5, 30 - 1.5);
    ctx.restore();
  }

  var PATH_STYLE = {
    ground: { color: palette.pathGround, width: 3, dash: [], alpha: 0.7 },
    plate: { color: palette.pathPlate, width: 7, dash: [], alpha: 1 },
    air: { color: palette.pathAir, width: 4, dash: [10, 7], alpha: 0.95 }
  };

  function strokeRun(ctx, pts, a, b, st) {
    ctx.beginPath();
    ctx.moveTo(pts[a].x, pts[a].y);
    for (var i = a + 1; i <= b; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.setLineDash(st.dash);
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = st.width + 3;
    ctx.stroke();
    ctx.globalAlpha = st.alpha;
    ctx.strokeStyle = st.color;
    ctx.lineWidth = st.width;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }

  function drawGhostPath(ctx, s) {
    var pts = s.points || [];
    if (!pts.length) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var n = pts.length;
    // 依序畫: 著地(最低) → 踩開關 → 騰空(最高, 鉤爪決策用)
    ['ground', 'plate', 'air'].forEach(function (mode) {
      var st = PATH_STYLE[mode];
      var i = 0;
      while (i < n - 1) {
        if (pts[i].mode !== mode) { i++; continue; }
        var k = i;
        while (k < n - 1 && pts[k].mode === mode) k++;
        strokeRun(ctx, pts, i, k, st);
        i = k;
      }
    });
    // 起點(小空心圓)與終點(短直槓): 循環從終點跳回起點
    ctx.strokeStyle = palette.textDim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, 5, 0, Math.PI * 2);
    ctx.stroke();
    var e = pts[n - 1];
    ctx.beginPath();
    ctx.moveTo(e.x, e.y - 8); ctx.lineTo(e.x, e.y + 8);
    ctx.stroke();
    // 目前播放點
    var p = pts[Math.max(0, Math.min(n - 1, s.progress | 0))];
    var pst = PATH_STYLE[p.mode] || PATH_STYLE.ground;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = palette.outline;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = pst.color;
    ctx.fill();
    ctx.restore();
  }

  function drawGhostPreview(ctx, s) {
    figure(ctx, s.x, s.y, s.facing, s.state, s.gen, 'preview', false);
  }

  function drawGhost(ctx, s) {
    figure(ctx, s.x, s.y, s.facing, s.state, s.gen, 'ghost', !!s.hookable);
  }

  function drawHook(ctx, s) {
    ctx.save();
    var x1 = s.x1, y1 = s.y1, x2 = s.x2, y2 = s.y2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = palette.hook;
    ctx.lineWidth = 3;
    ctx.stroke();
    // 爪: 開口朝來處
    var a = Math.atan2(y2 - y1, x2 - x1);
    ctx.translate(x2, y2);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-9, -8);
    ctx.moveTo(0, 0); ctx.lineTo(-9, 8);
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = palette.hook;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  function drawPlayer(ctx, s) {
    figure(ctx, s.x, s.y, s.facing, s.state, s.gen, 'player', false);
  }

  function hudGenIcons(ctx, gen, maxGen, x0, y0) {
    for (var g = 1; g <= maxGen; g++) {
      var ix = x0 + (g - 1) * 36;
      ctx.save();
      ctx.translate(ix, y0);
      ctx.scale(0.6, 0.6);
      if (g < gen) figure(ctx, 0, 0, 1, 'dead', g, 'player', false);
      else if (g === gen) figure(ctx, 0, 0, 1, 'idle', g, 'player', false);
      else {
        ctx.beginPath();
        figurePath(ctx, 'idle', 0, 0);
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = genColor(g);
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      if (g === gen) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ix - 1, y0 + 38, 26, 3);
      }
    }
  }

  function drawHud(ctx, s) {
    ctx.save();
    var gen = s.gen || 1, maxGen = s.maxGen || 3;
    ctx.fillStyle = palette.hudBg;
    ctx.fillRect(0, 0, W, 100);
    ctx.fillStyle = palette.hudLine;
    ctx.fillRect(0, 98, W, 2);

    txt(ctx, '第 ' + gen + ' 人', 20, 34, 30, genColor(gen), 'left', true);
    txt(ctx, '/ 共 ' + maxGen + ' 人', 128, 36, 20, palette.textDim, 'left', false);
    hudGenIcons(ctx, gen, maxGen, 230, 12);
    txt(ctx, '←→ 走   空白 跳   Z 鉤爪   R 整關重來', 20, 80, 18, palette.textDim, 'left', false);

    var on = (s.hookLeft | 0) > 0;
    txt(ctx, '鉤爪', 610, 46, 22, on ? palette.text : palette.textDim, 'right', true);
    hookIcon(ctx, 660, 46, 28, on);

    var phase = s.phase;
    if (phase === 'dying') {
      ctx.fillStyle = 'rgba(5,7,15,0.7)';
      rr(ctx, 160, 116, 400, 48, 12);
      ctx.fill();
      txt(ctx, gen < maxGen ? '第 ' + gen + ' 人倒下, 下一人準備中' : '第 ' + gen + ' 人倒下',
        360, 140, 22, palette.text, 'center', true);
    } else if (phase === 'win') {
      ctx.fillStyle = 'rgba(5,7,15,0.72)';
      rr(ctx, 60, 116, 600, 140, 18);
      ctx.fill();
      ctx.strokeStyle = palette.goalA;
      ctx.lineWidth = 2;
      ctx.stroke();
      txt(ctx, '過關!', 360, 166, 54, '#ffffff', 'center', true, true);
      txt(ctx, '三人合力回放中 · 按空白鍵重來', 360, 226, 24, palette.text, 'center', false);
    } else if (phase === 'lose') {
      ctx.fillStyle = 'rgba(5,7,15,0.84)';
      ctx.fillRect(0, 0, W, H);
      txt(ctx, '失敗', 360, 540, 80, palette.bad, 'center', true, true);
      txt(ctx, '三個人都倒下了', 360, 630, 30, palette.text, 'center', false);
      txt(ctx, '按空白鍵重來', 360, 700, 30, '#ffffff', 'center', true);
    }
    ctx.restore();
  }

  // ---------- 說明頁 ----------
  var GUIDE = [
    { title: '走到旗子', text: '←→ 走、空白鍵跳、R 整關重來' },
    { title: '先死一次', text: '一個人到不了, 要先死一次' },
    { title: '死了變幽靈', text: '死掉的你會照路線一直重演' },
    { title: '踩幽靈', text: '幽靈的頭能站, 還會載著你走' },
    { title: '鉤幽靈', text: '幽靈發光時按 Z, 每人一次' },
    { title: '開關與門', text: '有人踩住開關, 門才會開' },
    { title: '只看得見上一個人', text: '共三人, 只看得見上一個的幽靈' }
  ];

  function panel(ctx, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = palette.bg;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = palette.hudLine;
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
    ctx.restore();
  }

  // 在 rect 內以 scale 縮放畫世界座標(wx, wy 對到 rect 左上)
  function scene(ctx, rx, ry, rw, rh, sc, wx, wy, fn) {
    panel(ctx, rx, ry, rw, rh);
    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, ry, rw, rh);
    ctx.clip();
    ctx.translate(rx, ry);
    ctx.scale(sc, sc);
    ctx.translate(-wx, -wy);
    fn();
    ctx.restore();
  }

  function keycap(ctx, x, y, w, label) {
    ctx.save();
    rr(ctx, x, y, w, 40, 8);
    ctx.fillStyle = '#e8ecf7';
    ctx.fill();
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 2;
    ctx.stroke();
    txt(ctx, label, x + w / 2, y + 21, 20, palette.outline, 'center', true);
    ctx.restore();
  }

  function levelBase(ctx, plateDown, gateOpen) {
    drawPlatform(ctx, { x: 0, y: 1200, w: 600, h: 80 });
    drawPlatform(ctx, { x: 0, y: 1000, w: 480, h: 24 });
    drawPlatform(ctx, { x: 240, y: 580, w: 480, h: 24 });
    drawSpike(ctx, { x: 0, y: 976, w: 60 });
    drawPlate(ctx, { x: 80, y: 988, pressed: !!plateDown });
    drawGate(ctx, { x: 560, y: 360, open: !!gateOpen });
    drawGoal(ctx, { x: 640, y: 500 });
  }

  function page1(ctx) {
    var sc = 0.66, rx = 122, ry = 330;
    scene(ctx, rx, ry, 720 * sc, 940 * sc, sc, 0, 340, function () {
      levelBase(ctx, false, false);
      drawPlayer(ctx, { x: 60, y: 1144, facing: 1, state: 'idle', gen: 1 });
    });
    keycap(ctx, 196, 800, 96, '← → 走');
    keycap(ctx, 300, 800, 96, '空白 跳');
    keycap(ctx, 404, 800, 90, 'R 重來');
  }

  function page2(ctx) {
    // 左: 跳不上
    scene(ctx, 30, 340, 320, 620, 1, 0, 0, function () {
      drawPlatform(ctx, { x: 0, y: 520, w: 320, h: 100 });
      drawPlatform(ctx, { x: 130, y: 300, w: 190, h: 24 });
      drawPlayer(ctx, { x: 40, y: 296, facing: 1, state: 'air', gen: 1 });
      arrow(ctx, 22, 512, 22, 360, palette.text, 3, true);
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = palette.textDim;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(30, 300); ctx.lineTo(130, 300); ctx.stroke();
      ctx.restore();
      crossMark(ctx, 105, 326, 14);
    });
    // 右: 掉進坑
    scene(ctx, 370, 340, 320, 620, 1, 0, 0, function () {
      drawPlatform(ctx, { x: 0, y: 520, w: 170, h: 100 });
      arcArrow(ctx, 110, 490, 245, 600, 50, palette.text, 3);
      drawPlayer(ctx, { x: 210, y: 506, facing: 1, state: 'air', gen: 1 });
      checkMark(ctx, 235, 380, 30);
    });
  }

  function demoPath() {
    var pts = [];
    function lin(x0, y0, x1, y1, n, mode) {
      for (var k = 0; k < n; k++) {
        var t = k / n;
        pts.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, mode: mode });
      }
    }
    function arc(x0, y0, x1, y1, peak, n) {
      for (var k = 0; k < n; k++) {
        var t = k / n;
        pts.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t - 4 * peak * t * (1 - t), mode: 'air' });
      }
    }
    lin(80, 1172, 230, 1172, 36, 'ground');
    arc(230, 1172, 320, 1116, 90, 30);   // 跳上看不見的第 1 代頭頂
    lin(320, 1116, 330, 1116, 6, 'ground');
    arc(330, 1116, 420, 972, 110, 34);   // 跳上平台一
    lin(420, 972, 180, 972, 50, 'ground');
    lin(180, 972, 120, 972, 20, 'plate');
    pts.push({ x: 120, y: 972, mode: 'plate' });
    return pts;
  }

  function figAt(p) { return { x: p.x - 20, y: p.y - 28 }; }

  function page3(ctx) {
    var pts = demoPath(), gi = 80, pi = gi + 30;
    scene(ctx, 9, 340, 702, 468, 1.3, 0, 880, function () {
      levelBase(ctx, false, false);
      drawPlayer(ctx, { x: 60, y: 1144, facing: 1, state: 'idle', gen: 3 });
      drawGhostPath(ctx, { points: pts, progress: gi });
      var pp = figAt(pts[pi]);
      drawGhostPreview(ctx, { x: pp.x, y: pp.y, facing: -1, state: 'run', gen: 2 });
      var gp = figAt(pts[gi]);
      drawGhost(ctx, { x: gp.x, y: gp.y, facing: 1, state: 'air', gen: 2, hookable: false });
      txt(ctx, '著地', 160, 1150, 17, palette.pathGround, 'center', true, true);
      txt(ctx, '騰空', 236, 1060, 17, palette.pathAir, 'center', true, true);
      txt(ctx, '踩開關', 150, 945, 17, palette.pathPlate, 'center', true, true);
      txt(ctx, '半秒後', pts[pi].x + 4, 928, 17, palette.text, 'center', true, true);
    });
  }

  function page4(ctx) {
    scene(ctx, 9, 340, 702, 468, 1.3, 0, 880, function () {
      levelBase(ctx, false, false);
      drawGhost(ctx, { x: 180, y: 1144, facing: 1, state: 'run', gen: 1, hookable: false });
      drawPlayer(ctx, { x: 180, y: 1088, facing: 1, state: 'idle', gen: 2 });
      arrow(ctx, 228, 1172, 272, 1172, palette.text, 3, false);
      arrow(ctx, 228, 1116, 272, 1116, palette.text, 3, false);
      arcArrow(ctx, 205, 1084, 345, 940, 60, palette.text, 3);
      drawPlayer(ctx, { x: 330, y: 944, facing: 1, state: 'idle', gen: 2 });
    });
  }

  function page5(ctx) {
    var sc = 0.6;
    function base() {
      drawPlatform(ctx, { x: 0, y: 880, w: 540, h: 120 });
      drawPlatform(ctx, { x: 220, y: 300, w: 320, h: 24 });
    }
    scene(ctx, 24, 340, 324, 600, sc, 0, 0, function () {
      base();
      drawGhost(ctx, { x: 300, y: 824, facing: -1, state: 'idle', gen: 1, hookable: true });
      drawHook(ctx, { x1: 170, y1: 808, x2: 320, y2: 824 });
      drawPlayer(ctx, { x: 150, y: 780, facing: 1, state: 'hook', gen: 2 });
      arrow(ctx, 380, 820, 380, 712, palette.text, 4, true);
    });
    scene(ctx, 372, 340, 324, 600, sc, 0, 0, function () {
      base();
      drawGhost(ctx, { x: 300, y: 520, facing: 1, state: 'air', gen: 1, hookable: true });
      drawHook(ctx, { x1: 170, y1: 728, x2: 320, y2: 520 });
      drawPlayer(ctx, { x: 150, y: 700, facing: 1, state: 'hook', gen: 2 });
      arcArrow(ctx, 330, 500, 400, 236, 30, palette.text, 4);
      drawPlayer(ctx, { x: 400, y: 244, facing: 1, state: 'idle', gen: 2 });
    });
    txt(ctx, '站地上', 186, 976, 26, palette.text, 'center', true);
    txt(ctx, '在半空', 534, 976, 26, palette.text, 'center', true);
    // HUD 角落的鉤爪次數(與遊戲內同一個圖示)
    ctx.fillStyle = palette.hudBg;
    rr(ctx, 230, 1024, 260, 84, 12);
    ctx.fill();
    ctx.strokeStyle = palette.hudLine;
    ctx.lineWidth = 2;
    ctx.stroke();
    txt(ctx, '鉤爪', 380, 1066, 22, palette.text, 'right', true);
    hookIcon(ctx, 430, 1066, 28, true);
  }

  function page6(ctx) {
    var sc = 0.8;
    function base(down) {
      drawPlatform(ctx, { x: 0, y: 620, w: 220, h: 24 });
      drawPlate(ctx, { x: 60, y: 608, pressed: down });
      drawPlatform(ctx, { x: 230, y: 400, w: 175, h: 24 });
      drawGate(ctx, { x: 320, y: 180, open: down });
    }
    scene(ctx, 24, 340, 324, 640, sc, 0, 0, function () { base(false); });
    scene(ctx, 372, 340, 324, 640, sc, 0, 0, function () {
      base(true);
      drawPlayer(ctx, { x: 80, y: 564, facing: 1, state: 'idle', gen: 1 });
    });
    txt(ctx, '沒人踩', 186, 1016, 26, palette.text, 'center', true);
    txt(ctx, '有人踩', 534, 1016, 26, palette.text, 'center', true);
  }

  function page7(ctx) {
    var sc = 1.6, xs = [148, 328, 508], y0 = 400;
    for (var i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(xs[i], y0);
      ctx.scale(sc, sc);
      if (i === 0) figure(ctx, 0, 0, 1, 'idle', 1, 'vanished', false);
      if (i === 1) drawGhost(ctx, { x: 0, y: 0, facing: 1, state: 'idle', gen: 2, hookable: false });
      if (i === 2) drawPlayer(ctx, { x: 0, y: 0, facing: -1, state: 'idle', gen: 3 });
      ctx.restore();
      txt(ctx, String(i + 1), xs[i] + 32, 370, 36, i === 0 ? palette.textDim : genColor(i + 1), 'center', true, true);
    }
    txt(ctx, '看不見', 180, 520, 22, palette.textDim, 'center', false);
    txt(ctx, '幽靈', 360, 520, 22, palette.text, 'center', false);
    txt(ctx, '輪到你', 540, 520, 22, palette.text, 'center', true);
    // 下方小圖: 2 號站在半空(腳下是看不見的 1 號)
    scene(ctx, 120, 580, 480, 470, 1, 0, 0, function () {
      drawPlatform(ctx, { x: 0, y: 420, w: 480, h: 60 });
      drawPlayer(ctx, { x: 60, y: 364, facing: 1, state: 'idle', gen: 3 });
      figure(ctx, 220, 250, 1, 'air', 1, 'vanished', false);
      drawGhost(ctx, { x: 220, y: 194, facing: 1, state: 'idle', gen: 2, hookable: false });
      arrow(ctx, 360, 280, 270, 278, palette.textDim, 3, false);
      txt(ctx, '1 號', 400, 280, 22, palette.textDim, 'center', true);
    });
  }

  var PAGES = [page1, page2, page3, page4, page5, page6, page7];

  function drawGuidePage(ctx, s) {
    var p = Math.max(0, Math.min(PAGES.length - 1, (s && s.page) | 0));
    ctx.save();
    drawBackground(ctx);
    txt(ctx, '預影 · 玩法說明', 360, 60, 22, palette.textDim, 'center', false);
    txt(ctx, GUIDE[p].title, 360, 160, 46, '#ffffff', 'center', true, true);
    txt(ctx, GUIDE[p].text, 360, 240, 30, palette.text, 'center', false);
    PAGES[p](ctx);
    // 頁碼點
    for (var i = 0; i < PAGES.length; i++) {
      ctx.beginPath();
      ctx.arc(360 + (i - 3) * 28, 1170, i === p ? 8 : 5, 0, Math.PI * 2);
      ctx.fillStyle = i === p ? '#ffffff' : palette.hudLine;
      ctx.fill();
    }
    txt(ctx, p === PAGES.length - 1 ? '按空白鍵 開始遊戲' : '按空白鍵 下一頁', 360, 1226, 28,
      '#ffffff', 'center', true);
    ctx.restore();
  }

  window.Art = {
    canvas: { width: W, height: H },
    palette: palette,
    guidePages: PAGES.length,
    drawBackground: drawBackground,
    drawPlatform: drawPlatform,
    drawSpike: drawSpike,
    drawPlate: drawPlate,
    drawGate: drawGate,
    drawGoal: drawGoal,
    drawGhostPath: drawGhostPath,
    drawGhostPreview: drawGhostPreview,
    drawGhost: drawGhost,
    drawHook: drawHook,
    drawPlayer: drawPlayer,
    drawHud: drawHud,
    drawGuidePage: drawGuidePage
  };
})();
