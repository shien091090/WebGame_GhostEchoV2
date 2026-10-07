# 升降接力 美術規格

> index.html 必須宣告 `<meta charset="utf-8">`, 否則 art.js 裡的中文會變亂碼。
> 載入方式: `<script src="art/art.js"></script>`(非 module), 之後用全域 `window.Art`。

## 邏輯畫布尺寸

720 × 1280(`Art.canvas = { width: 720, height: 1280 }`)。HUD 佔 y 0~100, 遊戲區 y 100~1280。

## 色票表

| 名稱 | 色碼 | 用途 |
|---|---|---|
| bg | #121827 | 背景(上 #161d30 漸層到下 bgLow) |
| bgLow | #07090f | 畫面底緣 / 坑的深淵 |
| hudBg | #0b1020 | HUD 帶、說明頁底 |
| hudLine | #2a3350 | HUD 分隔線、說明頁面板框 |
| ground | #3c4660 | 實心地面 |
| groundTop | #8794b5 | 地面頂緣 |
| ledge | #46516e | 單向平台 |
| ledgeTop | #b3c0de | 單向平台頂緣 / 底緣虛線 |
| spike | #ff4a5a | 尖刺(全畫面紅色只代表「會死」, 失敗字樣同色) |
| spikeBase | #5a1c24 | 尖刺底座 |
| lift | #3fd97a | 升降台開關、升降台(綠 = 升降台系統) |
| liftDim | #1f6b3e | 升降台系統未作動 |
| gate | #9a4dff | 門開關、門(紫 = 門系統) |
| gateDim | #4a2380 | 門系統未作動 / 門板橫紋 |
| goalPole / goalLight / goalDark | #e8ecf5 / #ffffff / #1a1f2e | 終點旗桿與黑白方格旗面 |
| player | #eef3ff | 玩家本體(實心不透明) |
| ink | #1a2033 | 眼睛、代數字、亮底上的記號 |
| dead | #6b7186 | 死亡中的玩家本體 |
| ghost | #9cc8ff | 幽靈本體(半透明)、路線 |
| ghostHead | #f2f8ff | 幽靈頭頂可站邊、路線的目前位置標記 |
| hook | #ffe14a | 鉤爪專屬: 鉤索、可鉤發光、拉動中的玩家輪廓、HUD 鉤爪圖示 |
| text / textDim | #eef3ff / #8a94b0 | 文字 / 次要文字 |
| lose | #ff4a5a | 失敗字樣、說明頁打叉 |

色相 / 灰階(node 計算): 尖刺 355° / 130、升降台 143° / 160、門 266° / 約 120、鉤爪 50° / 217、幽靈 213° / 193。兩組開關配對色色相差 > 120°, 灰階差約 40。

## 形狀語言

扁平、圓角人形、地形方角; 可站的邊一律是亮色實線頂緣, 可穿過 / 不存在的一律是虛線。

## 理念落實

- P0 辨識度先於好看: 五類東西各有專屬長相 — 人(圓角方塊 + 眼)、地形(方角 + 亮頂緣)、危險(紅三角)、機關(綠 / 紫)、終點(黑白方格旗); 背景只用低對比格點
- P1 視覺權重跟著決策迫切度: 只有三種東西會發光 — 可鉤的幽靈(黃)、被壓住的開關與作動中的升降台(本色), 都是「現在能用」的訊號; 背景、軌道、路線都壓到低不透明度
- P2 規則上存在的東西畫面上就存在: 幽靈頭頂畫一條亮實線 = 唯一能站的邊; 單向平台底緣畫虛線 = 可從下穿過; 升降台畫出全程軌道(780~1224); 門開著仍留上下門軸與虛線框, 表示它會再關; 鉤爪次數常駐在 HUD
- P3 一個意義一種長相: 綠只給升降台系統、紫只給門系統、黃只給鉤爪、紅只給死亡; 「虛線」= 可穿過 / 不在場(單向平台底、開著的門、已消失的那一代); 說明頁全部呼叫遊戲內函式
- P7 每個元素都要掙得版面: HUD 只放代數、鉤爪次數、一行操作提示; 不另畫「開關 → 物件」連線(靠同色已讀得出)
- P9 以最混亂的那一刻驗收: 過關回放三代幽靈 + 鉤索同時在場時, 每隻幽靈身上有代數字, 鉤索帶黑襯底, 交疊時仍分得開
- P13 事件要排隊: HUD 第二列同一時間只放一件事(操作提示 / 倒下提示 / 過關字樣三選一)
- P15 回饋強度與事件份量成正比: 開關壓下只是蓋子下沉 + 發光; 失敗才用整畫面暗幕
- P17 進度類資訊: 本作無進度條(鉤爪只有 0/1, 用一個圖示實 / 虛表示), 不適用
- P18 重要資訊不能只存在一瞬間: 過關後 HUD 常駐「過關!」直到玩家按鍵; 倒下提示在死亡演出 0.6 秒內常駐 HUD
- P19 資訊貼著物件: 代數字畫在人身上, 可鉤直接是幽靈自己發光, 開關種類記號刻在開關蓋子上
- P21 示意圖選分岔例: 第 2 頁「跳不上 ✗ / 掉坑 ✓」、第 5 頁「地上幽靈只甩一點 ✗ / 空中幽靈甩上平台 ✓」、第 6 頁沒人踩 / 有人踩並排

## 物件表

所有座標為遊戲座標(左上原點, y 向下); 除 drawHook / drawGhostPath 外 x, y 為物件左上角。所有函式 `(ctx, state)`, 自行 save/restore。

| 物件 | 函式 | state 欄位 | 各狀態視覺差異 |
|---|---|---|---|
| 背景 | `drawBackground(ctx)` | 無 | 深藍漸層 + 淡格點; y 1200 以下漸暗(坑像深淵); y 0~100 HUD 底帶 |
| Platform | `drawPlatform(ctx, {x, y, w, h})` | x, y, w, h | h ≥ 48 視為實心地面(斜紋); 否則為單向平台: 亮頂緣 + 底緣虛線 |
| Spike | `drawSpike(ctx, {x, y, w})` | x, y, w | 固定高 24, 紅三角一排(每 15px 一根) + 暗紅底座 |
| Plate | `drawPlate(ctx, {x, y, pressed, kind})` | pressed: bool; kind: 'lift' \| 'gate' | lift = 綠 + 上箭頭記號; gate = 紫 + 兩根門柱記號。放開: 蓋子滿高 12、暗色; 壓住: 蓋子下沉到 6、本色亮 + 外光 |
| Lift | `drawLift(ctx, {x, y, active})` | x, y(頂面, 780~1200), active: bool | 永遠畫全程軌道淡虛線(x+3 / x+117, y 780~1224); active: 本色亮 + 外光 + 深色上箭頭; 否則暗綠 + 淡箭頭 |
| Gate | `drawGate(ctx, {x, y, open})` | open: bool | 關: 實心紫 + 暗橫紋; 開: 只剩淡紫虛線框 + 上下各 8px 門軸 |
| Goal | `drawGoal(ctx, {x, y})` | x, y | 白旗桿(淡外光) + 黑白方格旗 |
| GhostPath | `drawGhostPath(ctx, {points, progress})` | points: [{x, y}](碰撞框中心), progress: 整數 | 淡藍點狀虛線連成路線(點多時取樣到約 600 段); progress 那一點畫白環 + 白點。points 空陣列時不畫 |
| Ghost | `drawGhost(ctx, {x, y, facing, state, gen, hookable})` | facing 1 / -1; state idle \| run \| air \| hook; gen 1~3; hookable bool | 半透明淡藍 + 虛線輪廓 + 頭頂亮實線; 身上寫 gen。idle 雙腳著地; run 前腳著地後腳抬起; air 雙腳收起; hook 雙手上舉。hookable: 黃外光 + 黃實線輪廓、本體略不透明 |
| Hook | `drawHook(ctx, {x1, y1, x2, y2})` | 被拉者中心 → 幽靈頭頂中心 | 黃線 + 黑襯底, 終點畫爪 |
| Player | `drawPlayer(ctx, {x, y, facing, state, gen})` | facing; state idle \| run \| air \| hook \| dead; gen | 實心白 + 深色輪廓, 身上寫 gen。腳 / 手同幽靈; hook 時輪廓變黃; dead: 灰身 + 叉叉眼 + 紅輪廓 |
| HUD | `drawHud(ctx, {gen, maxGen, phase, hookLeft, hookMax})` | phase play \| dying \| win \| lose | 見下 |
| 說明頁 | `drawGuidePage(ctx, {page})` | page 0~6 | 全畫面; 每頁: 頁碼、標題、一行文字、示意圖、頁碼點、底部「空白鍵 下一頁」(最後一頁「空白鍵 開始遊戲」)。超出範圍的 page 會夾到 0~6 |

### HUD 細節

- play: 左上 maxGen 個小人(當代 = 實心白、上一代 = 幽靈樣、更早 = 淡虛線、未來 = 空框)+「第 N 人 / 3」; 右上「鉤爪」+ hookMax 個圖示(有次數 = 黃實、用掉 = 灰虛); 第二列 y≈78 操作提示「←→ 走 · 空白 跳 · Z 鉤 · R 整關重來」
- dying: 同 play, 第二列換成「倒下了 → 變成幽靈, 換下一個人」
- win: HUD 帶整條換成「過關!」+「三代合力回放 · 空白鍵 重來」, 不蓋遊戲區(回放照常在下面畫)
- lose: 整畫面暗幕 + 「失敗」「3 個人都倒下了」「空白鍵 重來」。lose 時請最後呼叫 drawHud

### 繪製順序(由下而上)

drawBackground → drawPlatform(全部) → drawSpike → drawLift → drawPlate → drawGate → drawGoal → drawGhostPath(回放時不畫) → drawGhost → drawHook → drawPlayer → drawHud

drawLift 要在 drawPlate 之前、drawPlatform 之後: 升降台在最低點時會蓋住地面 x 480~600 那段的頂緣, 這是預期(頂面齊平)。

## 尺寸表

| 物件 | 尺寸(px) | 備註 |
|---|---|---|
| Player / Ghost | 40 × 56 | 輪廓內縮 1px, 畫面邊界 = 碰撞框; 可鉤外光是唯一出框的效果 |
| Ghost 頭頂可站邊 | 34 × 4 | 框頂 y ~ y+4 |
| Plate | 80 × 12 | 壓住時蓋子 y+6~y+12 |
| Lift | 120 × 24 | 軌道線畫在 y 780~1224, 不在判定內 |
| Gate | 24 × 220 | |
| Goal | 48 × 80 | 旗面 40 × 32 位於 (x+9, y+2) |
| Spike | w × 24 | |
| Platform | w × h | 依呼叫 |
| GhostPath 標記 | 半徑 11 環 + 半徑 4 點 | |
| Hook | 線寬 3(襯底 7), 爪長 10 | |
| HUD | 720 × 100 | 字級: 主 28、次 19~22 |
| 說明頁 | 720 × 1280 | 標題 44、內文 30、底部提示 28 |
