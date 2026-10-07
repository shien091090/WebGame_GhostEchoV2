# 起跑哨 美術規格(deepen-2 / game-c)

> index.html 必須宣告 `<meta charset="utf-8">`, 否則 art.js 的中文字串在 file:// 下會變亂碼。
> 用法: `<script src="art/art.js"></script>` 後取用全域 `window.Art`。全部函式自帶 save / restore。

## 邏輯畫布尺寸

720 × 1280。HUD 佔上方 y 0~100(drawHud 自己畫底板), 遊戲區 y 100~1280。

## 色票表(`Art.palette`)

| 名稱 | 色碼 | 用途 |
|---|---|---|
| bg / bgTop | #121826 / #1b2440 | 背景直向漸層 |
| hudBg / hudLine | #0a0e18 / #2a3350 | HUD 底板與下緣線 |
| ground / groundTop | #2b3042 / #7c849c | 實心地面本體 / 頂緣 |
| platform / platformTop | #4b5470 / #b3bdd8 | 單向平台本體 / 亮頂緣 |
| player | #fff1d0 | 玩家角色(實心奶白, 深色外框) |
| playerDead | #8a8f9e | 死亡中的角色 |
| ghost / ghostEdge | #a8c4ff / #e6eeff | 幽靈半透明身體 / 頭頂可站實線、虛線外框 |
| path | #a8c4ff | 幽靈路線(與幽靈同色 = 它的未來) |
| whistle | #ffffff | 哨音波紋 |
| hook | #a6ff4d | **鉤爪專屬色**: 可鉤發光、瞄準虛線與箭頭、蓄力環、鉤索、玩家瞄準 / 彈射外框、HUD 鉤爪格、「Z 彈出 / X 取消」 |
| lift / liftDim | #36d6e7 / #1d7c87 | 升降台與升降台開關(亮 = 驅動中 / 壓住) |
| gate / gateDim | #e05cff / #7a3290 | 門與門開關 |
| spike / danger | #ff4d4d | 尖刺、坑底警示、失敗字、說明頁打叉 |
| goal | #ffd23f | 終點旗、過關字 |
| text / textDim | #eef1f8 / #8a93ad | 主要文字 / 次要文字 |

色相分配: 紅 0°(危險)、金 47°(終點)、黃綠 89°(鉤爪)、青 186°(升降台)、淡藍 220°(幽靈, 低飽和半透明)、洋紅 285°(門)。紅只給危險, 不挪作他用。

## 形狀語言

圓角方塊角色、扁平無漸層的場景塊、狀態靠「亮色 vs 暗色 + 實心 vs 虛線」切換; 所有文字帶深色描邊。

## 理念落實

- P0: 玩家 = 實心奶白 + 深外框; 幽靈 = 同一剪影但半透明淡藍 + 虛線外框; 危險只有紅; 每種可互動物件都有專屬色。
- P1: 最顯眼的是「現在可以鉤」(鉤爪色粗框)與瞄準箭頭; 路線、背景網格、升降台軌道都壓在低不透明度。
- P2: 幽靈「只有頭頂可站」畫成頭頂一條實線(其餘外框是虛線); 升降台行程畫成背景上的軌道虛線; 坑底有暗紅警示; 門開時保留虛線門框, 讓「之後會關」看得到。
- P3: 鉤爪色只代表鉤爪系統(發光、瞄準、鉤索、HUD 次數、提示字), 其他物件不用; 開關與受控物件同色同記號; 說明頁全部呼叫遊戲內函式。
- P4: 升降台 vs 門的開關除了顏色, 鈕上記號也不同(向上箭頭 vs 直條); 玩家 vs 幽靈 = 不透明度 + 外框線型; 開關放開 vs 壓住 = 高度 + 亮度。
- P7: HUD 只放代數、鉤爪次數、按鍵提示; 角色身上只有一個小小的代數數字(回放時三代要分得開)。
- P9: 線類元素(路線、鉤索、瞄準線、箭頭)都有深色襯底, 過關回放三代同框時仍讀得到。
- P13: 過關 / 失敗面板只有一塊, 不和其他事件疊。
- P15: 吹哨波紋(全場重要事件, 0.4 秒)是場上唯一的外擴大環; 鉤索只有 0.15 秒的細線。
- P17: 蓄力: 箭頭長度給「會飛多遠」, 角色外的蓄力環給「離滿還差多少」, 滿時環轉白。
- P18: 鉤爪次數常駐在 HUD; 代數用三個小人圖示常駐(上一代 = 幽靈樣、更早 = 消失虛線、未來 = 空框)。
- P19: 可鉤提示直接長在幽靈本體(框內粗框 + 染色), 不在旁邊掛圖示。
- P21: 說明第 2 頁並排「跳不上(叉)」與「掉坑(勾)」; 第 4 頁並排吹哨前後, 舊位置留虛線輪廓; 第 8 頁把「看不見的 1 號」與「被看見的 2 號幽靈」並排。

## 物件表

| 物件 | 函式 | state 欄位 | 各狀態視覺差異 |
|---|---|---|---|
| 背景 | `drawBackground(ctx)` | — | 漸層 + 淡網格; 坑(x 600~720)底部暗紅漸層; 升降台軌道(x 480~600, y 780~1224)青色淡虛線。**固定照 spec 關卡配置畫** |
| 地面 / 平台 | `drawPlatform(ctx, {x, y, w, h})` | x, y, w, h | h ≥ 48 畫成實心地面(灰藍 + 亮頂緣 + 磚紋); h < 48 畫成單向平台(亮頂緣 + 下緣鋸齒, 暗示可從下穿) |
| 尖刺 | `drawSpike(ctx, {x, y, w})` | x, y, w | 只有一態: 紅色三角排, 高 24 |
| 開關 | `drawPlate(ctx, {x, y, pressed, kind})` | x, y, pressed(bool), kind('lift' / 'gate') | 放開: 凸起暗色鈕 + 亮頂線; 壓住: 扁平貼底、亮色、槽兩側亮條。kind=lift 青色 + 向上箭頭記號; kind=gate 洋紅 + 直條記號 |
| 升降台 | `drawLift(ctx, {x, y, active})` | x, y(頂面, 780~1200), active(bool) | active: 亮青 + 深色向上箭頭; 否: 暗青 + 淡箭頭 |
| 門 | `drawGate(ctx, {x, y, open})` | x, y, open(bool) | 關: 實心洋紅 + 暗條紋 + 深外框; 開: 只剩上下 8px 框頭 + 淡虛線門框 |
| 終點旗 | `drawGoal(ctx, {x, y})` | x, y | 金色旗面 + 白桿 |
| 幽靈路線 | `drawGhostPath(ctx, {segments})` | segments: `[[{x,y},...], ...]` | 淡藍點線 + 深襯底; 段與段不連; 每 60 點(1 秒)一個小圓點; 最後一點畫小空心圈 |
| 哨音波紋 | `drawWhistleRing(ctx, {cx, cy, t})` | cx, cy, t(0~1) | 白色外擴雙環 + 8 支「向內指」的小箭頭(= 叫回這裡); t 越大越淡 |
| 幽靈 | `drawGhost(ctx, {x, y, facing, state, gen, hookable})` | x, y, facing(1/-1), state(idle/run/air/launch), gen(1~3), hookable(bool) | 半透明淡藍身體 + 虛線外框 + **頭頂一條實線(可站)**; 面罩朝 facing; run 雙腳前後錯開; air 腳收起; launch 腳下三條速度線; hookable: 框內鉤爪色粗框 + 鉤爪色染色; 胸口小字 = gen |
| 鉤索 | `drawHook(ctx, {x1, y1, x2, y2})` | x1, y1, x2, y2 | 鉤爪色線 + 深襯底, 終點三爪鉤頭 |
| 玩家 | `drawPlayer(ctx, {x, y, facing, state, gen})` | x, y, facing, state(idle/run/air/aim/launch/dead), gen | 實心奶白 + 深外框; idle / run / air 同幽靈的腳形; aim: 鉤爪色實線外框; launch: 鉤爪色虛線外框 + 腳收起 + 鉤爪色速度線; dead: 灰身 + 紅 X 眼; 胸口小字 = gen |
| 瞄準 | `drawAim(ctx, {px, py, gx, gy, ax, ay, charge})` | 全部數字, charge 0~1 | px,py→gx,gy 鉤爪色虛線 + 幽靈中心靶圈; px,py→ax,ay 粗箭頭(深襯底); 角色外半徑 40 蓄力環, 滿時環與箭頭轉白 |
| HUD | `drawHud(ctx, {gen, maxGen, phase, hookLeft, hookMax, aiming})` | gen, maxGen, phase(play/dying/win/lose), hookLeft, hookMax, aiming(bool) | 見下 |
| 說明頁 | `drawGuidePage(ctx, {page})` | page(0~7) | 畫滿整張畫布(含背景、標題、文字、圖、頁碼點、「空白鍵 下一頁 / 開始遊戲」); 呼叫前不需要先畫背景 |

drawHud 細節:
- 左: 「第 N 代 / 3」+ 三個小人: 目前代 = 玩家樣、上一代 = 幽靈樣、更早 = 虛線消失、未來 = 空框
- 中: 「鉤爪」+ hookMax 格, 剩的實心鉤爪色, 用掉的虛線暗格
- 右: 平時是 C 吹哨 / Z 鉤 / R 重來 按鍵提示; **aiming=true 時換成鉤爪色「Z 彈出 / X 取消」框, 並在遊戲區四周畫冷色霧框 + 四角括號 + 右上暫停符號(時間停了)**
- phase=dying 且 gen<maxGen: HUD 下方小字「第 N+1 代準備出發…」
- phase=win: 畫面中段(y 520~720)金框面板「過關!/ 三代合力回放中 / 按空白鍵重來」; 不蓋全畫面, 回放照常可見
- phase=lose: 遊戲區全蓋暗幕 + 「失敗 / 三個人都沒摸到旗子 / 按空白鍵重來」

## 繪製層級(由下到上, RD 照這個順序呼叫)

drawBackground → drawPlatform(全部) → drawSpike → drawPlate → drawLift → drawGate → drawGoal → drawGhostPath → drawWhistleRing → drawGhost(回放時 gen 小的先畫) → drawHook → drawPlayer → drawAim → drawHud

## 尺寸表

| 物件 | 尺寸(px) | 備註 |
|---|---|---|
| 玩家 / 幽靈 | 40 × 56 | 全部狀態都畫在框內; 幽靈頭頂實線 = 框頂 y~y+3 |
| 尖刺 | w × 24 | 預設 w=60 |
| 開關 | 80 × 12 | |
| 升降台 | 120 × 24 | y = 頂面 |
| 門 | 24 × 220 | |
| 終點旗 | 48 × 80 | |
| 地面 / 平台 | 依 state w × h | |
| 瞄準蓄力環 | 半徑 40 | 以角色中心為圓心, 不屬判定範圍 |
| 哨音波紋 | 半徑 34 → 104(+ 外側指針約 26) | 演出, 不屬判定範圍 |
| HUD | 720 × 100 | |
