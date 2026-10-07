// 共鉤 — 美術繪製函式(Canvas 2D, 無外部資源)
// 契約: window.Art, 每個 drawXxx(ctx, state) 自行 save/restore
(function () {
  'use strict';

  var FONT = '"Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif';

  var P = {
    bg: '#0f1526',          // 背景上緣
    bgLow: '#1a2238',       // 背景下緣
    star: '#3a4670',        // 背景星點
    pit: '#05070d',         // 坑底
    hudBg: '#0a0e1a',       // HUD 底
    hudLine: '#2a3350',     // HUD 下緣分隔
    text: '#eef2ff',        // 主文字
    textDim: '#8a94b8',     // 次要文字
    ground: '#2c3550',      // 地面本體
    groundTop: '#7f8fb8',   // 地面表層
    ledge: '#8fa0c8',       // 單向平台頂板
    ledgeBody: '#3a4566',   // 單向平台下半(可穿過)
    player: '#ffd166',      // 玩家本體(金黃, 實心)
    playerEdge: '#fff6dc',  // 玩家外框
    eye: '#1a1a2e',         // 眼睛
    ghost: '#9db4ff',       // 幽靈(長春花藍, 半透明)
    vanished: '#6b7392',    // 已消失的更前一代(點線輪廓)
    hook: '#7dfff0',        // 鉤爪專屬色: 鉤索、可鉤發光、HUD 鉤爪圖示
    hookUsed: '#343c55',    // 用掉的鉤爪圖示
    dead: '#7c8296',        // 死亡角色
    danger: '#ff4d5e',      // 尖刺 / 失敗 / 打叉
    metal: '#5a6275',       // 尖刺底座、門框
    mech: '#e070ff',        // 開關與門(機關連動色)
    mechDim: '#5d3a6e',     // 機關未啟動
    gateBody: '#262d42',    // 門板
    goal: '#8cff5a',        // 終點旗 / 打勾
    pathLine: '#9db4ff',    // 幽靈路線
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

  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

  // 帶深色描邊的文字(P10)
  function label(ctx, str, x, y, size, color, align, bold) {
    ctx.font = (bold === false ? '' : 'bold ') + size + 'px ' + FONT;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size * 0.22);
    ctx.strokeStyle = 'rgba(5,7,14,0.9)';
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color || P.text;
    ctx.fillText(str, x, y);
  }

  function arrow(ctx, x1, y1, x2, y2, color, width, dashed) {
    var a = Math.atan2(y2 - y1, x2 - x1), hs = 10 + width * 1.5;
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth = width; ctx.lineCap = 'round';
    if (dashed) ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - Math.cos(a) * hs * 0.8, y2 - Math.sin(a) * hs * 0.8); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(a - 0.45) * hs, y2 - Math.sin(a - 0.45) * hs);
    ctx.lineTo(x2 - Math.cos(a + 0.45) * hs, y2 - Math.sin(a + 0.45) * hs);
    ctx.closePath(); ctx.fill();
  }

  function markCheck(ctx, x, y, r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10,14,26,0.85)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = P.goal; ctx.stroke();
    ctx.lineWidth = r * 0.28; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - r * 0.45, y); ctx.lineTo(x - r * 0.1, y + r * 0.38); ctx.lineTo(x + r * 0.5, y - r * 0.4);
    ctx.stroke();
    ctx.restore();
  }

  function markCross(ctx, x, y, r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10,14,26,0.85)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = P.danger; ctx.stroke();
    ctx.lineWidth = r * 0.28; ctx.lineCap = 'round';
    var k = r * 0.42;
    ctx.beginPath(); ctx.moveTo(x - k, y - k); ctx.lineTo(x + k, y + k);
    ctx.moveTo(x + k, y - k); ctx.lineTo(x - k, y + k); ctx.stroke();
    ctx.restore();
  }

  function keycap(ctx, x, y, text, w) {
    w = w || 44;
    ctx.save();
    rr(ctx, x, y + 4, w, 40, 8); ctx.fillStyle = '#0b0f1c'; ctx.fill();
    rr(ctx, x, y, w, 40, 8); ctx.fillStyle = '#e6ebff'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.fillStyle = '#141a2e';
    ctx.font = 'bold 22px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + 21);
    ctx.restore();
    return x + w;
  }

  // ---------- 角色共用畫法 ----------
  // kind: 'player' | 'ghost' | 'vanished'
  function drawFigure(ctx, s, kind) {
    var x = s.x, y = s.y;
    var f = s.facing === -1 ? -1 : 1;
    var st = s.state || 'idle';
    var t = now();
    var isDead = st === 'dead';
    var body, edge, alphaFill;

    if (kind === 'player') {
      body = isDead ? P.dead : P.player;
      edge = isDead ? '#4a4f60' : (st === 'hook' ? P.hook : P.playerEdge);
      alphaFill = 1;
    } else if (kind === 'ghost') {
      body = P.ghost; edge = s.hookable ? P.hook : P.ghost; alphaFill = 0.32;
    } else {
      body = P.vanished; edge = P.vanished; alphaFill = 0;
    }

    // 腿(在 y+44 ~ y+56 內)
    var lx1 = x + 9, lx2 = x + 23, ly1 = y + 44, ly2 = y + 44, lh1 = 12, lh2 = 12;
    if (st === 'run') {
      var ph = Math.sin(t / 70) > 0 ? 1 : -1;
      lx1 += 3 * ph; lx2 -= 3 * ph;
      lh1 = ph > 0 ? 12 : 9; lh2 = ph > 0 ? 9 : 12;
    } else if (st === 'air' || st === 'hook') {
      lx1 = x + 6; lx2 = x + 26; lh1 = 8; lh2 = 8;
    } else if (isDead) {
      lx1 = x + 4; lx2 = x + 28; lh1 = 6; lh2 = 6; ly1 = y + 50; ly2 = y + 50;
    }

    ctx.save();
    if (kind === 'vanished') {
      ctx.globalAlpha = 0.75;
      ctx.setLineDash([4, 5]);
      ctx.lineWidth = 2; ctx.strokeStyle = edge;
      rr(ctx, x + 3, y + 1, 34, 44, 11); ctx.stroke();
      ctx.strokeRect(lx1 + 1, ly1 + 2, 6, lh1 - 3);
      ctx.strokeRect(lx2 + 1, ly2 + 2, 6, lh2 - 3);
      ctx.setLineDash([]);
      if (s.gen) {
        ctx.fillStyle = edge; ctx.font = 'bold 16px ' + FONT;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(s.gen), x + 20, y + 30);
      }
      ctx.restore();
      return;
    }

    // 可鉤發光: 只往左右與下方暈開, 頭頂以上不畫(頭頂是可站的判定邊)
    if (kind === 'ghost' && s.hookable) {
      var pulse = 0.5 + 0.5 * Math.sin(t / 140);
      ctx.save();
      ctx.beginPath(); ctx.rect(x - 40, y, 120, 96); ctx.clip();
      ctx.shadowColor = P.hook; ctx.shadowBlur = 18 + 14 * pulse;
      ctx.globalAlpha = 0.55 + 0.35 * pulse;
      ctx.lineWidth = 6; ctx.strokeStyle = P.hook;
      rr(ctx, x + 1, y + 1, 38, 54, 12); ctx.stroke();
      ctx.restore();
    }

    // 腿
    ctx.globalAlpha = kind === 'ghost' ? 0.55 : 1;
    ctx.fillStyle = body;
    rr(ctx, lx1, ly1, 8, lh1, 3); ctx.fill();
    rr(ctx, lx2, ly2, 8, lh2, 3); ctx.fill();
    ctx.globalAlpha = 1;

    // 身體
    rr(ctx, x + 2, y + 1, 36, 45, 12);
    ctx.globalAlpha = alphaFill;
    ctx.fillStyle = (kind === 'ghost' && s.hookable) ? P.hook : body;
    if (kind === 'ghost' && s.hookable) ctx.globalAlpha = 0.38;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = (kind === 'ghost' && s.hookable) ? 3 : 2;
    ctx.strokeStyle = edge;
    ctx.stroke();

    // 幽靈頭頂踏板: 全寬實線 = 這條邊可以站
    if (kind === 'ghost') {
      ctx.fillStyle = s.hookable ? P.hook : P.ghost;
      rr(ctx, x, y, 40, 5, 2); ctx.fill();
    }

    // 手臂: hook 時朝面向側高舉
    if (st === 'hook') {
      ctx.strokeStyle = kind === 'player' ? P.playerEdge : P.ghost;
      ctx.lineWidth = 4; ctx.lineCap = 'round';
      var ax = x + 20 + f * 12;
      ctx.beginPath(); ctx.moveTo(ax, y + 24); ctx.lineTo(ax + f * 4, y + 8); ctx.stroke();
    }

    // 眼睛(偏向面向側)
    var ex = x + 20 + f * 6, ey = y + 15;
    if (isDead) {
      ctx.strokeStyle = P.eye; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      [-6, 6].forEach(function (d) {
        ctx.beginPath();
        ctx.moveTo(ex + d - 3, ey - 3); ctx.lineTo(ex + d + 3, ey + 3);
        ctx.moveTo(ex + d + 3, ey - 3); ctx.lineTo(ex + d - 3, ey + 3);
        ctx.stroke();
      });
    } else {
      ctx.fillStyle = kind === 'ghost' ? '#e8eeff' : P.eye;
      var eh = st === 'air' ? 9 : 7;
      ctx.fillRect(ex - 8, ey - eh / 2, 4, eh);
      ctx.fillRect(ex + 4, ey - eh / 2, 4, eh);
    }

    // 代數(肚子上的小字)
    if (s.gen) {
      ctx.font = 'bold 16px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = kind === 'ghost' ? '#e8eeff' : (isDead ? '#3a3f50' : '#6b4a00');
      ctx.fillText(String(s.gen), x + 20, y + 33);
    }
    ctx.restore();
  }

  // 鉤爪圖示(HUD 與說明頁共用)
  function hookIcon(ctx, cx, cy, size, available) {
    var k = size / 44;
    var c = available ? P.hook : P.hookUsed;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(k, k);
    // 底圓
    ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2);
    ctx.fillStyle = available ? 'rgba(125,255,240,0.14)' : 'rgba(20,24,38,0.9)';
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = c;
    if (!available) ctx.setLineDash([4, 4]);
    ctx.stroke(); ctx.setLineDash([]);
    if (available) { ctx.shadowColor = P.hook; ctx.shadowBlur = 10; }
    ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.lineCap = 'round';
    // 柄 + 頂環
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, 9); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -14, 3.5, 0, Math.PI * 2); ctx.stroke();
    // 三爪
    ctx.beginPath();
    ctx.moveTo(0, 9); ctx.quadraticCurveTo(-12, 10, -12, -1);
    ctx.moveTo(0, 9); ctx.quadraticCurveTo(12, 10, 12, -1);
    ctx.moveTo(0, 9); ctx.lineTo(0, 14);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlatformRaw(ctx, s) {
    var x = s.x, y = s.y, w = s.w, h = s.h;
    if (h >= 48) {
      // 實心地面
      ctx.fillStyle = P.ground; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      for (var i = 0; i < w; i += 32) ctx.fillRect(x + i + 6, y + 20 + ((i / 32) % 2) * 18, 14, 4);
      ctx.fillStyle = P.groundTop; ctx.fillRect(x, y, w, 6);
    } else {
      // 單向平台: 頂板實心(可站), 下半斜紋半透明(下方可穿過)
      ctx.fillStyle = P.ledgeBody; ctx.globalAlpha = 0.55; ctx.fillRect(x, y + 8, w, h - 8);
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y + 8, w, h - 8); ctx.clip();
      ctx.strokeStyle = 'rgba(143,160,200,0.35)'; ctx.lineWidth = 2;
      for (var j = -h; j < w; j += 14) {
        ctx.beginPath(); ctx.moveTo(x + j, y + h); ctx.lineTo(x + j + h, y + 8); ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = P.ledge; ctx.fillRect(x, y, w, 8);
      ctx.fillStyle = '#c9d4f0'; ctx.fillRect(x, y, w, 2);
    }
  }

  function drawPlateRaw(ctx, s) {
    var x = s.x, y = s.y;
    // 底座
    ctx.fillStyle = P.metal; ctx.fillRect(x, y + 9, 80, 3);
    if (s.pressed) {
      ctx.shadowColor = P.mech; ctx.shadowBlur = 16;
      ctx.fillStyle = P.mech; ctx.fillRect(x + 2, y + 6, 76, 4);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.7; ctx.fillRect(x + 6, y + 6, 68, 1.5); ctx.globalAlpha = 1;
    } else {
      rr(ctx, x + 4, y, 72, 10, 3);
      ctx.fillStyle = P.mechDim; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = P.mech; ctx.stroke();
      // 向下小箭頭: 這裡可以踩
      ctx.fillStyle = P.mech;
      ctx.beginPath(); ctx.moveTo(x + 34, y + 3); ctx.lineTo(x + 46, y + 3); ctx.lineTo(x + 40, y + 8); ctx.closePath(); ctx.fill();
    }
  }

  function drawGateRaw(ctx, s) {
    var x = s.x, y = s.y, w = 24, h = 220;
    if (!s.open) {
      ctx.fillStyle = P.gateBody; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#8b93ad';
      for (var i = 0; i < 3; i++) ctx.fillRect(x + 4 + i * 7, y + 6, 3, h - 12);
      ctx.lineWidth = 2; ctx.strokeStyle = P.metal; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      // 鎖燈(暗)
      ctx.fillStyle = P.mechDim; ctx.fillRect(x + 4, y + h / 2 - 8, 16, 16);
      ctx.lineWidth = 2; ctx.strokeStyle = P.mech; ctx.strokeRect(x + 4, y + h / 2 - 8, 16, 16);
    } else {
      // 開: 只剩點線門框 + 頂端收起的門板(亮)
      ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(224,112,255,0.55)';
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); ctx.setLineDash([]);
      ctx.shadowColor = P.mech; ctx.shadowBlur = 14;
      ctx.fillStyle = P.mech; ctx.fillRect(x, y, w, 12); ctx.fillRect(x, y + h - 4, w, 4);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.6; ctx.fillRect(x + 3, y + 3, w - 6, 2); ctx.globalAlpha = 1;
    }
  }

  function drawSpikeRaw(ctx, s) {
    var x = s.x, y = s.y, w = s.w || 60, h = 24;
    ctx.fillStyle = P.metal; ctx.fillRect(x, y + h - 4, w, 4);
    var n = Math.max(1, Math.round(w / 12)), sw = w / n;
    ctx.fillStyle = P.danger;
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      ctx.moveTo(x + i * sw, y + h - 4);
      ctx.lineTo(x + i * sw + sw / 2, y);
      ctx.lineTo(x + (i + 1) * sw, y + h - 4);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffb3ba'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (var k = 0; k < n; k++) { ctx.moveTo(x + k * sw + sw / 2, y + 1); ctx.lineTo(x + k * sw + sw * 0.3, y + h - 6); }
    ctx.stroke();
  }

  function drawGoalRaw(ctx, s) {
    var x = s.x, y = s.y, t = now();
    ctx.fillStyle = P.metal; rr(ctx, x + 2, y + 74, 20, 6, 2); ctx.fill();
    ctx.fillStyle = '#d8deef'; ctx.fillRect(x + 10, y + 2, 4, 74);
    ctx.beginPath(); ctx.arc(x + 12, y + 4, 4, 0, Math.PI * 2); ctx.fill();
    var wv = Math.sin(t / 260) * 4;
    ctx.shadowColor = P.goal; ctx.shadowBlur = 12;
    ctx.fillStyle = P.goal;
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 6);
    ctx.quadraticCurveTo(x + 30, y + 6 + wv, x + 47, y + 10);
    ctx.lineTo(x + 47, y + 36);
    ctx.quadraticCurveTo(x + 30, y + 32 + wv, x + 14, y + 34);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1d4a12';
    ctx.font = 'bold 18px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('★', x + 30, y + 21 + wv * 0.3);
  }

  function drawHookRaw(ctx, s) {
    var x1 = s.x1, y1 = s.y1, x2 = s.x2, y2 = s.y2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(5,7,14,0.85)'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.shadowColor = P.hook; ctx.shadowBlur = 10;
    ctx.strokeStyle = P.hook; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    // 爪頭(勾在幽靈頭頂中心)
    var a = Math.atan2(y2 - y1, x2 - x1);
    ctx.translate(x2, y2); ctx.rotate(a);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.quadraticCurveTo(-2, -9, -9, -9);
    ctx.moveTo(0, 0); ctx.quadraticCurveTo(-2, 9, -9, 9);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  }

  function drawPathRaw(ctx, s) {
    var pts = s.points || [];
    if (pts.length < 1) return;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (pts.length > 1) {
      ctx.strokeStyle = 'rgba(5,7,14,0.6)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      ctx.strokeStyle = P.pathLine; ctx.globalAlpha = 0.45; ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // 起點小方塊
    ctx.fillStyle = P.pathLine; ctx.globalAlpha = 0.6;
    ctx.fillRect(pts[0].x - 4, pts[0].y - 4, 8, 8); ctx.globalAlpha = 1;
    // 目前播放位置
    var idx = Math.max(0, Math.min(pts.length - 1, Math.floor(s.progress || 0)));
    var p = pts[idx];
    ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(5,7,14,0.7)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = P.pathLine; ctx.fill();
  }

  // ---------- HUD 小人圖示 ----------
  // mode: 'player' | 'ghost' | 'vanished' | 'future'
  function miniHead(ctx, x, y, mode, n) {
    ctx.save();
    rr(ctx, x, y, 26, 32, 9);
    if (mode === 'player') { ctx.fillStyle = P.player; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.playerEdge; ctx.stroke(); }
    else if (mode === 'ghost') {
      ctx.globalAlpha = 0.32; ctx.fillStyle = P.ghost; ctx.fill(); ctx.globalAlpha = 1;
      ctx.lineWidth = 2; ctx.strokeStyle = P.ghost; ctx.stroke();
      ctx.fillStyle = P.ghost; ctx.fillRect(x, y, 26, 4);
    } else if (mode === 'vanished') {
      ctx.setLineDash([3, 4]); ctx.lineWidth = 2; ctx.strokeStyle = P.vanished; ctx.stroke(); ctx.setLineDash([]);
    } else { ctx.lineWidth = 2; ctx.strokeStyle = '#2f3753'; ctx.stroke(); }
    ctx.font = 'bold 15px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = mode === 'player' ? '#6b4a00' : (mode === 'ghost' ? '#e8eeff' : (mode === 'vanished' ? P.vanished : '#3d4566'));
    ctx.fillText(String(n), x + 13, y + 18);
    ctx.restore();
  }

  // ---------- 說明頁 ----------
  var GUIDE = [
    { title: '走到旗子', body: '←→ 走、空白鍵跳、R 整關重來' },
    { title: '先死一次', body: '一個人到不了, 要先死一次' },
    { title: '死了變幽靈', body: '死掉的你會照路線一直重演' },
    { title: '踩幽靈', body: '幽靈的頭能站, 還會載著你走' },
    { title: '鉤幽靈', body: '幽靈發光時按 Z' },
    { title: '鉤爪三人共用', body: '鉤爪三個人共用, 只有 2 次' },
    { title: '開關與門', body: '有人踩住開關, 門才會開' },
    { title: '只看得見上一個人', body: '共三人, 只看得見上一個的幽靈' },
  ];

  function panel(ctx, x, y, w, h) {
    ctx.save();
    rr(ctx, x, y, w, h, 16);
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, P.bg); g.addColorStop(1, P.bgLow);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#2f3858'; ctx.stroke();
    ctx.restore();
  }

  function clipPanel(ctx, x, y, w, h) { rr(ctx, x, y, w, h, 16); ctx.clip(); }

  function pit(ctx, x, y, w, h) {
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(5,7,13,0.0)'); g.addColorStop(1, 'rgba(60,8,16,0.9)');
    ctx.fillStyle = P.pit; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  }

  function parabola(x0, y0, x1, peak, n) {
    // 中心點列: 從 (x0,y0) 跳起到 (x1,y0), 最高差 peak
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var u = i / n;
      pts.push({ x: x0 + (x1 - x0) * u, y: y0 - 4 * peak * u * (1 - u) });
    }
    return pts;
  }

  var guidePages = [
    // 1 走到旗子
    function (ctx) {
      var X = 40, Y = 330, W = 640, H = 740;
      panel(ctx, X, Y, W, H);
      ctx.save(); clipPanel(ctx, X, Y, W, H);
      drawPlatformRaw(ctx, { x: X, y: 990, w: W, h: 80 });
      drawPlatformRaw(ctx, { x: 360, y: 520, w: 320, h: 24 });
      drawGoalRaw(ctx, { x: 590, y: 440 });
      ctx.restore();
      drawFigure(ctx, { x: 90, y: 934, facing: 1, state: 'idle', gen: 1 }, 'player');
      // 按鍵標示(貼在角色旁)
      var kx = 160;
      var r = keycap(ctx, kx, 760, '←'); r = keycap(ctx, r + 8, 760, '→');
      label(ctx, '走', r + 14, 781, 24, P.text, 'left');
      r = keycap(ctx, kx, 818, '空白', 72);
      label(ctx, '跳', r + 14, 839, 24, P.text, 'left');
      r = keycap(ctx, kx, 876, 'R');
      label(ctx, '整關重來', r + 14, 897, 24, P.text, 'left');
      // 終點指認
      arrow(ctx, 480, 400, 572, 452, P.goal, 4, false);
      label(ctx, '終點', 440, 390, 26, P.goal);
    },
    // 2 先死一次
    function (ctx) {
      var Y = 330, H = 740;
      // 左格: 跳不上去
      panel(ctx, 40, Y, 310, H);
      ctx.save(); clipPanel(ctx, 40, Y, 310, H);
      drawPlatformRaw(ctx, { x: 40, y: 990, w: 310, h: 80 });
      drawPlatformRaw(ctx, { x: 40, y: 560, w: 310, h: 24 });
      ctx.restore();
      drawFigure(ctx, { x: 150, y: 760, facing: 1, state: 'air', gen: 1 }, 'player');
      arrow(ctx, 170, 960, 170, 830, P.textDim, 3, true);
      ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = P.danger; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(240, 590); ctx.lineTo(240, 754); ctx.stroke(); ctx.restore();
      markCross(ctx, 240, 672, 28);
      // 右格: 掉進坑
      panel(ctx, 370, Y, 310, H);
      ctx.save(); clipPanel(ctx, 370, Y, 310, H);
      drawPlatformRaw(ctx, { x: 370, y: 990, w: 120, h: 80 });
      pit(ctx, 490, 990, 110, 80);
      drawPlatformRaw(ctx, { x: 600, y: 990, w: 80, h: 80 });
      drawPlatformRaw(ctx, { x: 370, y: 560, w: 310, h: 24 });
      drawFigure(ctx, { x: 525, y: 1000, facing: 1, state: 'air', gen: 1 }, 'player');
      ctx.restore();
      arrow(ctx, 545, 880, 545, 980, P.textDim, 3, true);
      markCheck(ctx, 610, 860, 28);
      label(ctx, '下一個人接手', 525, 780, 24, P.goal);
    },
    // 3 死了變幽靈
    function (ctx) {
      var X = 40, Y = 330, W = 640, H = 740;
      panel(ctx, X, Y, W, H);
      ctx.save(); clipPanel(ctx, X, Y, W, H);
      drawPlatformRaw(ctx, { x: X, y: 990, w: W, h: 80 });
      ctx.restore();
      var pts = [];
      for (var i = 0; i <= 30; i++) pts.push({ x: 80 + i * 4, y: 962 });
      pts = pts.concat(parabola(200, 962, 440, 168, 60).slice(1));
      for (var j = 1; j <= 40; j++) pts.push({ x: 440 + j * 4, y: 962 });
      var prog = 30 + 22;
      drawPathRaw(ctx, { points: pts, progress: prog });
      var gp = pts[prog];
      drawFigure(ctx, { x: gp.x - 20, y: gp.y - 28, facing: 1, state: 'air', gen: 1, hookable: false }, 'ghost');
      drawFigure(ctx, { x: 60, y: 934, facing: 1, state: 'idle', gen: 2 }, 'player');
      label(ctx, '幽靈', gp.x + 52, gp.y - 40, 26, P.ghost);
      label(ctx, '現在播到這', gp.x + 90, gp.y + 20, 22, P.textDim, 'left');
      label(ctx, '新的你', 80, 900, 24, P.player);
    },
    // 4 踩幽靈
    function (ctx) {
      var X = 40, Y = 330, W = 640, H = 740;
      panel(ctx, X, Y, W, H);
      ctx.save(); clipPanel(ctx, X, Y, W, H);
      drawPlatformRaw(ctx, { x: X, y: 990, w: W, h: 80 });
      ctx.restore();
      var gx = 280, gy = 600;
      var pts = [];
      for (var i = 0; i <= 40; i++) pts.push({ x: gx + 20, y: 962 - i * (962 - (gy + 28)) / 40 });
      drawPathRaw(ctx, { points: pts, progress: 40 });
      drawFigure(ctx, { x: gx, y: gy, facing: 1, state: 'air', gen: 1, hookable: false }, 'ghost');
      drawFigure(ctx, { x: gx, y: gy - 56, facing: 1, state: 'idle', gen: 2 }, 'player');
      arrow(ctx, 380, 900, 380, 560, P.text, 5, false);
      label(ctx, '一起往上', 400, 730, 26, P.text, 'left');
    },
    // 5 鉤幽靈
    function (ctx) {
      var Y = 330, H = 740;
      // 左: 幽靈站在地上 → 只往上一點
      panel(ctx, 40, Y, 310, H);
      ctx.save(); clipPanel(ctx, 40, Y, 310, H);
      drawPlatformRaw(ctx, { x: 40, y: 990, w: 310, h: 80 });
      drawPlatformRaw(ctx, { x: 40, y: 560, w: 310, h: 24 });
      ctx.restore();
      label(ctx, '幽靈站在地上', 195, 380, 24, P.textDim);
      drawFigure(ctx, { x: 100, y: 934, facing: 1, state: 'idle', gen: 1, hookable: true }, 'ghost');
      drawFigure(ctx, { x: 100, y: 800, facing: 1, state: 'air', gen: 2 }, 'player');
      arrow(ctx, 120, 930, 120, 862, P.hook, 4, true);
      markCross(ctx, 240, 680, 28);
      keycap(ctx, 180, 900, 'Z');
      // 右: 幽靈在半空 → 甩上高處
      panel(ctx, 370, Y, 310, H);
      ctx.save(); clipPanel(ctx, 370, Y, 310, H);
      drawPlatformRaw(ctx, { x: 370, y: 990, w: 310, h: 80 });
      drawPlatformRaw(ctx, { x: 370, y: 560, w: 310, h: 24 });
      ctx.restore();
      label(ctx, '幽靈跳在半空', 525, 380, 24, P.textDim);
      drawFigure(ctx, { x: 420, y: 800, facing: 1, state: 'air', gen: 1, hookable: true }, 'ghost');
      drawFigure(ctx, { x: 560, y: 504, facing: 1, state: 'idle', gen: 2 }, 'player');
      ctx.save();
      ctx.setLineDash([10, 8]); ctx.strokeStyle = P.hook; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(440, 790); ctx.quadraticCurveTo(470, 420, 572, 470); ctx.stroke();
      ctx.restore();
      arrow(ctx, 556, 462, 574, 474, P.hook, 4, false);
      markCheck(ctx, 630, 440, 28);
      keycap(ctx, 500, 860, 'Z');
    },
    // 6 鉤爪三人共用
    function (ctx) {
      var X = 40, Y = 330, W = 640, H = 740;
      panel(ctx, X, Y, W, H);
      // HUD 樣式的鉤爪列
      ctx.save();
      rr(ctx, 160, 420, 400, 110, 14); ctx.fillStyle = P.hudBg; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = P.hudLine; ctx.stroke();
      ctx.restore();
      label(ctx, '全隊鉤爪', 250, 475, 26, P.textDim);
      hookIcon(ctx, 400, 475, 66, true);
      hookIcon(ctx, 490, 475, 66, false);
      label(ctx, '2 號用掉', 490, 570, 24, P.textDim);
      ctx.save(); ctx.strokeStyle = P.textDim; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(490, 555); ctx.lineTo(490, 512); ctx.stroke(); ctx.restore();
      var xs = [160, 340, 520];
      for (var i = 0; i < 3; i++) {
        drawFigure(ctx, { x: xs[i], y: 880, facing: 1, state: 'idle', gen: i + 1 }, 'player');
        arrow(ctx, xs[i] + 20, 866, 300 + i * 60, 600 + (i === 2 ? 30 : 0), P.text, 3, true);
      }
      ctx.save(); clipPanel(ctx, X, Y, W, H);
      drawPlatformRaw(ctx, { x: X, y: 936, w: W, h: 140 });
      ctx.restore();
      label(ctx, '換人不補', 360, 1010, 26, P.text);
    },
    // 7 開關與門
    function (ctx) {
      var Y = 330, H = 740;
      [[40, false], [370, true]].forEach(function (cfg) {
        var x0 = cfg[0], on = cfg[1];
        panel(ctx, x0, Y, 310, H);
        ctx.save(); clipPanel(ctx, x0, Y, 310, H);
        drawPlatformRaw(ctx, { x: x0, y: 900, w: 310, h: 24 });
        ctx.restore();
        drawPlateRaw(ctx, { x: x0 + 30, y: 888, pressed: on });
        drawGateRaw(ctx, { x: x0 + 220, y: 680, open: on });
        // 開關 → 門 的連動線
        ctx.save();
        ctx.setLineDash([6, 8]); ctx.lineWidth = 3;
        ctx.strokeStyle = on ? P.mech : P.mechDim;
        ctx.beginPath(); ctx.moveTo(x0 + 70, 940); ctx.lineTo(x0 + 70, 970); ctx.lineTo(x0 + 232, 970); ctx.lineTo(x0 + 232, 928);
        ctx.stroke(); ctx.restore();
        if (on) drawFigure(ctx, { x: x0 + 50, y: 844, facing: 1, state: 'idle', gen: 0 }, 'player');
        label(ctx, on ? '有人踩住' : '沒人踩', x0 + 155, 400, 24, P.textDim);
        if (on) markCheck(ctx, x0 + 232, 620, 26); else markCross(ctx, x0 + 232, 620, 26);
      });
    },
    // 8 只看得見上一個人
    function (ctx) {
      var X = 40, Y = 330, W = 640, H = 740;
      panel(ctx, X, Y, W, H);
      label(ctx, '輪到 3 號時', 360, 380, 26, P.textDim);
      drawFigure(ctx, { x: 160, y: 440, facing: 1, state: 'idle', gen: 1 }, 'vanished');
      drawFigure(ctx, { x: 340, y: 440, facing: 1, state: 'idle', gen: 2, hookable: false }, 'ghost');
      drawFigure(ctx, { x: 520, y: 440, facing: 1, state: 'idle', gen: 3 }, 'player');
      label(ctx, '看不見', 180, 530, 22, P.vanished);
      label(ctx, '幽靈', 360, 530, 22, P.ghost);
      label(ctx, '你', 540, 530, 22, P.player);
      ctx.save(); ctx.strokeStyle = '#2f3858'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(80, 580); ctx.lineTo(640, 580); ctx.stroke(); ctx.restore();
      // 小圖: 2 號幽靈鉤著看不見的 1 號
      ctx.save(); clipPanel(ctx, X, Y, W, H);
      drawPlatformRaw(ctx, { x: X, y: 1000, w: W, h: 80 });
      ctx.restore();
      var g1 = { x: 420, y: 660 }, g2 = { x: 260, y: 820 };
      drawFigure(ctx, { x: g1.x, y: g1.y, facing: -1, state: 'air', gen: 1 }, 'vanished');
      drawHookRaw(ctx, { x1: g2.x + 20, y1: g2.y + 28, x2: g1.x + 20, y2: g1.y });
      drawFigure(ctx, { x: g2.x, y: g2.y, facing: 1, state: 'hook', gen: 2, hookable: false }, 'ghost');
      label(ctx, '?', g1.x + 66, g1.y + 20, 36, P.vanished);
      label(ctx, '它鉤的是你看不見的人', 360, 960, 22, P.textDim);
    },
  ];

  // ---------- 匯出 ----------
  window.Art = {
    canvas: { width: 720, height: 1280 },
    palette: P,

    drawBackground: function (ctx) {
      ctx.save();
      var g = ctx.createLinearGradient(0, 0, 0, 1280);
      g.addColorStop(0, P.bg); g.addColorStop(1, P.bgLow);
      ctx.fillStyle = g; ctx.fillRect(0, 0, 720, 1280);
      // 星點(固定位置, 不動)
      ctx.fillStyle = P.star;
      for (var i = 0; i < 46; i++) {
        var sx = (i * 157 + 37) % 720, sy = 110 + ((i * 263 + 91) % 1060);
        ctx.fillRect(sx, sy, i % 3 === 0 ? 3 : 2, i % 3 === 0 ? 3 : 2);
      }
      // 坑 x 600~720(地面缺口), 往下漸暗並帶危險紅底
      pit(ctx, 600, 1200, 120, 80);
      ctx.restore();
    },

    drawPlatform: function (ctx, s) { ctx.save(); drawPlatformRaw(ctx, s); ctx.restore(); },
    drawSpike: function (ctx, s) { ctx.save(); drawSpikeRaw(ctx, s); ctx.restore(); },
    drawPlate: function (ctx, s) { ctx.save(); drawPlateRaw(ctx, s); ctx.restore(); },
    drawGate: function (ctx, s) { ctx.save(); drawGateRaw(ctx, s); ctx.restore(); },
    drawGoal: function (ctx, s) { ctx.save(); drawGoalRaw(ctx, s); ctx.restore(); },
    drawGhostPath: function (ctx, s) { ctx.save(); drawPathRaw(ctx, s); ctx.restore(); },
    drawGhost: function (ctx, s) { ctx.save(); drawFigure(ctx, s, 'ghost'); ctx.restore(); },
    drawHook: function (ctx, s) { ctx.save(); drawHookRaw(ctx, s); ctx.restore(); },
    drawPlayer: function (ctx, s) { ctx.save(); drawFigure(ctx, s, 'player'); ctx.restore(); },

    drawHud: function (ctx, s) {
      ctx.save();
      var gen = s.gen || 1, maxGen = s.maxGen || 3, phase = s.phase || 'play';
      var hookMax = s.hookMax || 2, hookLeft = Math.max(0, Math.min(hookMax, s.hookLeft || 0));
      // 底
      ctx.fillStyle = P.hudBg; ctx.fillRect(0, 0, 720, 100);
      ctx.fillStyle = P.hudLine; ctx.fillRect(0, 98, 720, 2);
      // 左: 三代小人(已消失 / 幽靈 / 你 / 還沒輪到)
      for (var i = 1; i <= maxGen; i++) {
        var mode;
        if (phase === 'win') mode = 'ghost';
        else if (i === gen) mode = 'player';
        else if (i === gen - 1) mode = 'ghost';
        else if (i < gen) mode = 'vanished';
        else mode = 'future';
        miniHead(ctx, 20 + (i - 1) * 34, 18, mode, i);
      }
      label(ctx, '第 ' + gen + ' 人 / ' + maxGen, 20 + maxGen * 34 + 12, 35, 28, P.text, 'left');
      // 右: 全隊鉤爪
      var firstIcon = 700 - 26 - (hookMax - 1) * 54;
      label(ctx, '全隊鉤爪', firstIcon - 36, 35, 20, P.textDim, 'right');
      for (var k = 0; k < hookMax; k++) {
        hookIcon(ctx, firstIcon + k * 54, 35, 44, k < hookLeft);
      }
      // 操作提示
      ctx.font = '17px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = P.textDim;
      ctx.fillText('←→ 走　空白 / ↑ 跳　Z 鉤爪　R 整關重來', 360, 80);

      if (phase === 'dying') {
        label(ctx, gen < maxGen ? '倒下了, 換下一個人' : '倒下了', 360, 132, 26, P.text);
      } else if (phase === 'win') {
        rr(ctx, 110, 560, 500, 150, 18);
        ctx.fillStyle = 'rgba(10,14,26,0.78)'; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = P.goal; ctx.stroke();
        label(ctx, '過關!', 360, 605, 48, P.goal);
        label(ctx, '三人合力回放中', 360, 650, 22, P.textDim);
        label(ctx, '按空白鍵重來', 360, 684, 24, P.text);
      } else if (phase === 'lose') {
        ctx.fillStyle = 'rgba(5,7,14,0.78)'; ctx.fillRect(0, 100, 720, 1180);
        label(ctx, '失敗', 360, 560, 64, P.danger);
        label(ctx, '三個人都倒下了', 360, 630, 28, P.text);
        label(ctx, '按空白鍵重來', 360, 700, 28, P.text);
      }
      ctx.restore();
    },

    drawGuidePage: function (ctx, s) {
      var n = GUIDE.length;
      var page = Math.max(0, Math.min(n - 1, (s && s.page) | 0));
      ctx.save();
      var g = ctx.createLinearGradient(0, 0, 0, 1280);
      g.addColorStop(0, '#0b1020'); g.addColorStop(1, '#141b30');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 720, 1280);
      label(ctx, '共鉤', 360, 70, 34, P.player);
      label(ctx, (page + 1) + ' / ' + n, 660, 70, 20, P.textDim, 'right', false);
      label(ctx, GUIDE[page].title, 360, 170, 44, P.text);
      label(ctx, GUIDE[page].body, 360, 250, 28, P.text, 'center', false);
      ctx.save();
      guidePages[page](ctx);
      ctx.restore();
      // 頁點
      for (var i = 0; i < n; i++) {
        ctx.beginPath(); ctx.arc(360 - (n - 1) * 14 + i * 28, 1130, i === page ? 8 : 5, 0, Math.PI * 2);
        ctx.fillStyle = i === page ? P.text : '#3a4466'; ctx.fill();
      }
      var last = page === n - 1;
      var hint = last ? '開始遊戲' : '下一頁';
      var r = keycap(ctx, 250, 1180, '空白', 80);
      label(ctx, hint, r + 16, 1201, 28, last ? P.goal : P.text, 'left');
      ctx.restore();
    },
  };
})();
