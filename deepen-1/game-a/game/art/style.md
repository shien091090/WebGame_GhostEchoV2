# 預影 美術規格(給 RD)

> index.html 必須宣告 `<meta charset="utf-8">`, 否則 art.js 裡的中文會亂碼。
> 載入方式: `<script src="art/art.js"></script>`(一般 script, 非 module), 之後用全域 `window.Art`。
> 世界座標 = 畫布座標(不捲動、不縮放), spec 關卡配置表的數字直接傳進來。

## 邏輯畫布尺寸

720 × 1280(`Art.canvas`)。HUD 佔上方 y 0~100。

## 色票表

| 名稱 | 色碼 | 用途 |
|---|---|---|
| bg / bgLow | #10152a / #1b2242 | 背景上下漸層 |
| star | #2e3860 | 背景固定星點(不動) |
| hudBg / hudLine | #0a0e1c / #2e3860 | HUD 底、分隔線、說明頁框 |
| ground / groundDark | #2a3352 / #1d243d | 實心地面本體與紋理 |
| platTop | #a9b8de | **可站表面**: 地面頂、平台頂、幽靈頭頂那條邊 |
| platBody / platSlat | #3b4669 / #56638c | 單向平台的鏤空本體與柵條 |
| spike / spikeBase | #ff4d5e / #5a2230 | 尖刺(全畫面唯一的危險紅) |
| mech | #ffb020 | **機關色**: 開關、門、路線「踩開關」段 |
| mechDim / mechDark | #7a5a1c / #2e230d | 開關放開時的本體、門板底 |
| goalPole / goalA / goalB | #d8deea / #ffffff / #1a1f30 | 旗桿、黑白格終點旗 |
| gen1 / gen2 / gen3 | #6b8cff / #ff6ad5 / #5ee07a | 第 1 / 2 / 3 代的身體色(玩家、幽靈、預影、HUD 共用) |
| hook | #ffffff | 鉤索、鉤爪圖示、「可鉤」發光 |
| pathAir | #6ff3ff | 路線: 騰空 |
| pathGround | #b8c4e0 | 路線: 著地 |
| pathPlate | #ffb020 | 路線: 踩開關(= mech) |
| dead / off | #5b6275 / #4a5270 | 死亡角色本體、鉤爪用掉 |
| text / textDim | #eef2ff / #8a94b4 | 文字 |
| bad | #ff4d5e | 失敗字樣、說明頁打叉、鉤爪用掉斜線 |

## 形狀語言

扁平、圓角膠囊角色、方正地形、無漸層(背景除外); 實體物件有深色外框, 幽靈半透明, 預影只剩細輪廓。

## 理念落實

- P0 辨識度先於好看: 每種物件一種形 + 一種色(紅三角 = 危險、琥珀 = 機關、黑白格 = 終點、膠囊 = 人); 狀態靠「形變 + 亮度」切換, 不靠細節
- P1 權重跟著決策走: 鉤爪決策最急, 「可鉤」白光是場上唯一會脈動的元素; 路線三色裡「騰空」段最粗亮且畫在最上層(要鉤的就是騰空幽靈), 著地段最淡; 背景星點固定不動
- P2 規則存在就要看得到: 幽靈頭頂「只有這條邊可站」畫成一條平台色實線; 單向平台下方畫鏤空柵條表示可從下穿過; 路線畫出起點小圈與終點短槓(循環從終點跳回起點時騎乘中的人會掉下); 鉤爪次數常駐 HUD; 物件繪製邊界 = interface.json 判定尺寸
- P3 一個意義一種長相: 平台色 = 可站(地面頂、平台頂、幽靈頭頂共用); 琥珀 = 機關(開關、門、路線踩開關段共用, 一看就知道開關管門); 白 = 鉤爪(鉤索、HUD 圖示、可鉤光); 世代色在玩家、幽靈、預影、HUD 一致; 說明頁全部呼叫遊戲內畫法
- P4 關鍵區分走兩條通道: 路線三態 = 顏色 + 線型(騰空青色虛線 / 著地灰白細實線 / 踩開關琥珀粗實線); 玩家 / 幽靈 / 預影 = 不透明度 + 有無眼睛與頭頂邊; 開關 = 高度(12 vs 4) + 亮度; 門 = 實心柵欄 vs 虛線空框
- P7 每個元素掙版面: 角色身上不標代數數字(世代色 + HUD 圖示已足); 說明頁圖說只寫條件詞(站地上 / 在半空、沒人踩 / 有人踩)
- P9 最混亂時驗收: 過關回放三代幽靈 + 鉤索同時在場, 各代靠世代色分、鉤索有黑襯底, 疊在幽靈半透明身體上仍讀得到
- P13 事件排隊: 同時只會有一塊事件框(倒下 / 過關 / 失敗擇一), 放在 HUD 下方空白天空
- P15 份量成正比: 倒下 = 小橫條, 過關 = 大框 + 54px 字, 失敗 = 全畫面遮罩
- P17 圖形與數字分工: 鉤爪只有 0 / 1, 只用圖示(亮 / 灰虛線 + 斜線), 不另寫數字
- P18 重要資訊不只一瞬: 已用掉的代數常駐在 HUD(灰色叉眼小人)
- P19 資訊貼著物件: 「可鉤」直接長在幽靈本身(外光 + 白輪廓 + 頭頂邊變白), 不另掛圖示
- P21 示意圖選分岔例: 第 2 頁「跳不上(差一截 + 叉)」對「掉坑(勾)」; 第 5 頁同一個鉤爪動作, 幽靈在地上 vs 在半空結果不同; 第 6 頁開關沒人踩 vs 有人踩

## 物件表

繪製層級(由下到上): drawBackground → drawPlatform → drawSpike → drawPlate → drawGate → drawGoal → drawGhostPath → drawGhostPreview → drawGhost → drawHook → drawPlayer → drawHud。說明頁用 drawGuidePage 單獨整頁畫。

| 物件 | 函式 | state 欄位 | 各狀態視覺 |
|---|---|---|---|
| 背景 | `drawBackground(ctx)` | — | 深藍漸層 + 固定星點 |
| Platform | `drawPlatform(ctx, {x, y, w, h})` | x, y, w, h | **h ≥ 40 畫成實心地面**(本體 + 6px 平台色頂); **h < 40 畫成單向平台**(8px 平台色頂帶 + 下方半透明鏤空柵條) |
| Spike | `drawSpike(ctx, {x, y, w})` | x, y, w | 紅三角一排(每 15px 一根)+ 暗紅底座, 高 24 |
| Plate | `drawPlate(ctx, {x, y, pressed})` | x, y, pressed | 放開: 凸起 12px 暗琥珀 + 亮框 + 斜紋; 壓住: 只剩底部 4px、全亮琥珀 + 外光 |
| Gate | `drawGate(ctx, {x, y, open})` | x, y, open | 關: 實心暗板 + 琥珀柵欄; 開: 半透明虛線門框 + 頂端 8px 門楣, 中間空 |
| Goal | `drawGoal(ctx, {x, y})` | x, y | 旗桿 + 黑白格旗 + 底座 |
| GhostPath | `drawGhostPath(ctx, {points, progress})` | points: [{x, y, mode}](mode = 'air' / 'ground' / 'plate', x/y 為幽靈中心), progress: 整數 | 騰空 = 青色虛線 4px; 著地 = 灰白實線 3px 半透明; 踩開關 = 琥珀實線 7px; 全段有黑襯底。points[0] 小空心圓、最後一點短直槓; points[progress] 畫白圈 + 該段顏色的實心點。points 空陣列時不畫 |
| GhostPreview | `drawGhostPreview(ctx, {x, y, facing, state, gen})` | x, y, facing(1 / -1), state(idle / run / air / hook), gen | 世代色細輪廓(40% 不透明)+ 8% 填色; **無眼、無頭頂邊**(不可站、不可鉤) |
| Ghost | `drawGhost(ctx, {x, y, facing, state, gen, hookable})` | x, y, facing, state(idle / run / air / hook), gen, hookable | 世代色 42% 半透明身體 + 輪廓 + 半透明眼; 頭頂一條 5px 平台色實線(可站邊)。hookable = true: 白色脈動外光 + 白輪廓 + 頭頂邊轉白, 身體 60% |
| Hook | `drawHook(ctx, {x1, y1, x2, y2})` | x1, y1(被拉者中心), x2, y2(被鉤幽靈頭頂中心) | 白線 3px + 黑襯底, x2/y2 端畫兩根爪 |
| Player | `drawPlayer(ctx, {x, y, facing, state, gen})` | x, y, facing, state(idle / run / air / hook / dead), gen | 不透明世代色 + 深色外框 + 上緣高光 + 白眼。idle 雙腳站; run 雙腳交替(依時間); air 腳收、手張開; hook 雙手上舉、雙腳併攏; dead 灰身體 + 世代色外框 + 叉眼 |
| HUD | `drawHud(ctx, {gen, maxGen, phase, hookLeft, hookMax})` | gen, maxGen, phase(play / dying / win / lose), hookLeft, hookMax | 上方 0~100 底條: 左「第 N 人 / 共 3 人」(世代色)、三個小人圖示(已死 = 灰叉眼, 當代 = 實色 + 白底線, 未來 = 空心輪廓)、按鍵提示列; 右「鉤爪」+ 圖示(有次數 = 白亮; 用掉 = 灰虛線圈 + 紅斜線)。dying: y 116~164 小橫條「第 N 人倒下, 下一人準備中」; win: y 116~256 大框「過關!」+「三人合力回放中 · 按空白鍵重來」(底下回放照常畫); lose: 全畫面遮罩「失敗 / 三個人都倒下了 / 按空白鍵重來」 |
| 說明頁 | `drawGuidePage(ctx, {page})` | page: 0~6 | 整頁自己畫(含背景), 不需另呼叫 drawBackground。頂部標題 + 一句說明, 中間示意圖, 底部頁碼點與「按空白鍵 下一頁」(最後一頁「按空白鍵 開始遊戲」)。總頁數 `Art.guidePages` = 7 |

補充:
- 過關回放: 三代都用 drawGhost(各帶自己的 gen, hookable 傳 false), 不畫 GhostPath 與 GhostPreview; 回放中的鉤索照樣用 drawHook
- 死亡演出 0.6 秒期間: 角色用 drawPlayer state 'dead' 畫在死亡位置, HUD phase 傳 'dying'
- 說明頁專用外觀「看不見的人」(灰色虛線輪廓)只出現在第 7 頁, 遊戲內不畫已消失的世代
- run 腿部擺動與可鉤脈動依 `performance.now()` 自己算, RD 不必傳時間

## 尺寸表

| 物件 | 尺寸(寬 × 高, px) | 備註 |
|---|---|---|
| Player / Ghost / GhostPreview | 40 × 56 | 繪製身形全在框內; 可鉤外光會溢出框外, 但實心邊界 = 判定框 |
| Ghost 頭頂可站邊 | 40 × 5 | 框頂 y ~ y+5 |
| Spike | w × 24(本關 60) | |
| Plate | 80 × 12 | 壓住時只畫底部 4px |
| Gate | 24 × 220 | |
| Goal | 48 × 80 | 旗面 40 × 30 |
| Platform | 依 state 的 w × h | 地面 h 80、平台 h 24 |
| HUD | 720 × 100 | 事件框在 y 116 起, 不壓 HUD |
| 鉤索 | 線寬 3(襯底 6) | |
| 路線 | 騰空 4 / 著地 3 / 踩開關 7 | 播放點標記半徑 8 |
