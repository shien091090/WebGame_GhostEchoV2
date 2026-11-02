# 幽影接力 音效說明(polish-9)

相對 polish-8: **只刪不加**(spec 打磨第 9 輪「音效刪 6 個, 音樂四首不變」)。
- 刪除事件 `whistle`、`buttonPress`、`crusherRise`、`crusherWarn`、`crusherSlam`、`crush`, 連同音檔一起刪掉(sound.js 也不再內嵌)。RD 若還呼叫這幾個名字, 會被當成未知事件靜默忽略, 不會報錯
- 剩下 30 個事件、4 首曲名與 interface.json 一一對應; 素材、音量、opts、呼叫時機全部不變, RD 不用改接法
- `death` 現在涵蓋所有死因(坑、尖刺、超時), 沒有「改叫 crush」的例外了
- `uiPage` 的時機補上「第 5 關回放後按空白鍵進全破畫面」(同一幀 `playMusic('ending')`, 疊播)

(polish-8 相對 polish-7: **音效、音樂完全不變**(spec 打磨第 8 輪「音效清單本輪不變」「音效、音樂不變」)。36 個事件名、4 首曲名、opts、素材、音量都照舊, RD 不用改接法。唯一的文字修正:
- `uiPage` 的呼叫時機補上「過關回放後按空白鍵(下一關)、失敗畫面按空白鍵(再試一次)」, 對齊 spec 音效清單的 uiPage 一列(上一版 sound.md 誤寫成不叫)。素材、音量不變; RD 若上一版沒接這兩處, 照 spec 補上即可)

(polish-7 相對 polish-6:)
- **新增 3 個事件, 需要 RD 接**: `pauseOpen`(按 Esc 打開暫停選單)、`pauseClose`(選「繼續」或再按 Esc 關閉)、`menuMove`(選單 ↑ / ↓ 真的移動了選擇)。interface.json 的 36 個事件、4 首曲名與本表一一對應
- `pauseOpen` 會**自動**把背景音樂降到 30% 並悶化、暫停蓄力聲; `pauseClose` 自動恢復(瞄準中打開的, 關掉後回到瞄準的悶化、蓄力聲從原值接著響)。RD 不用另外處理音樂
- `restart` 改成暫停選單選「重來」時呼叫(R 鍵已移除); `whistle` 改成空白鍵觸發。素材、音量不變
- 其餘 33 個事件、4 首曲子的素材、音量、opts 照舊

(polish-6 相對 polish-5: **音效、音樂完全不變**(spec 打磨第 6 輪明訂), 事件名、opts、素材、音量、呼叫時機都照舊, RD 不用改接法。唯一的文字修正: 第 1 階段的跳躍鍵帽改成只有 ↑(空白鍵不算打勾), 「同時觸發」表的例子跟著改。)

(polish-5 相對 polish-4:)
- **新增 3 個事件, 需要 RD 接**: `tutorialShow`(教學泡泡彈出)、`tutorialKey`(第 1 階段鍵帽打勾, 帶 `index`)、`tutorialDone`(教學階段完成)。interface.json 的 33 個事件、4 首曲名與本表一一對應
- `uiPage` 只改呼叫時機(開始畫面、解鎖頁、全破畫面按空白鍵), 素材與音量不變
- `title` 曲改在開始畫面 / 解鎖頁播(沒有說明頁、關卡卡片了), 曲子不變
- 其餘 30 個事件的素材、音量、opts、呼叫時機照舊

(polish-3 相對 polish-2 新增了 `timeTick`、`hookDenied`, 已實作。)

## 聲音風格

可愛輕快的 8-bit 復古音效(全部出自同一套音效包, 音色一致), 配上明亮的原聲小編制背景音樂(烏克麗麗、長笛、木琴、低音號)。

## 接法(RD 必讀)

- `index.html` 在 `game.js` **之前**載入: `<script src="audio/sound.js"></script>`(全域 `window.Sound`, 不是 module)
- 第一次按任何鍵時呼叫 `Sound.init()`(重複呼叫無害)。init 之前的 `play` 一律靜默丟棄; **`playMusic` 在 init 前呼叫會被記住, init 時才開始播**, 所以開網頁時可以直接 `Sound.playMusic('title')`
- M 鍵: `Sound.setMuted(!Sound.isMuted())`; 聲音開關圖示(`drawSoundIcon`)用 `Sound.isMuted()` 取值。靜音狀態只存在記憶體(本次開網頁期間保留)
- 未知事件名 / 曲名靜默忽略, 不會丟例外
- sound.js 約 13.6 MB(音訊資料以 base64 內嵌, 才能在 file:// 下用 Web Audio 做瞄準時的悶化), 載入時解碼音樂約需不到 1 秒; 解碼完成前要求的曲子會在解碼後自動開始

### 共用 opts

| 欄位 | 型別 | 說明 |
|---|---|---|
| `volume` | 0~1, 可省 | 這一次的音量倍率(預設 1)。一般不用傳 |

只有 `aimCharge`、`tutorialKey` 另有專用欄位, 見事件表。

## 事件表

相對音量: 每個檔案先統一響度, 再乘上表中數字(1 = 最大)。都不循環, 除了 aimCharge 是持續音。

| 事件名 | spec 音效清單 | 何時呼叫 | opts | 素材 | 相對音量 | 循環 |
|---|---|---|---|---|---|---|
| `jump` | jump | 角色起跳那一幀(含從幽靈頭上起跳)。**被翹翹板彈起、鉤爪射出時不要叫** | — | sfx_jump.wav | 0.35 | 否 |
| `land` | land | 角色從空中落到地面 / 平台 / 升降台 / 翹翹板。**落到幽靈頭頂改叫 headStand, 不要兩個都叫** | — | sfx_land.wav | 0.30 | 否 |
| `headStand` | headStand | 角色落到幽靈頭頂那一幀 | — | sfx_head_stand.wav + sfx_land.wav(小聲墊底) | 0.50 / 0.18 | 否 |
| `spawn` | spawn | 新一代出生那一幀(含每關第 1 代)。**暫停選單選「重來」後的第 1 代出生不要叫**(spec: 只播 restart) | — | sfx_spawn.wav | 0.45 | 否 |
| `death` | death | 角色死亡那一幀(坑、尖刺、60 秒超時) | — | sfx_death.wav | 0.55 | 否 |
| `timeTick` | timeTick(新) | 這一代剩餘時間跨過 5、4、3、2、1 秒那一幀各叫一次(共 5 聲; 例: timeLeft 從 > 5 變成 ≤ 5)。瞄準暫停中時間不動就不叫; 死亡 / 過關後不叫 | — | sfx_time_tick.wav(1250 Hz 短「滴」, 64 毫秒, 加了衰減) | 0.25 | 否 |
| `aimStart` | aimStart | 按 Z 進入瞄準那一刻。**同時自動把背景音樂降到 30% 並悶化**, RD 不用另外處理 | — | sfx_aim_start.wav | 0.45 | 否 |
| `aimCharge` | aimCharge | 瞄準中每幀呼叫一次, 帶當下蓄力值; 也可以只在進入瞄準時呼叫一次(之後聲音會照「1 秒到滿」自己往上滑)。蓄力滿時自己停。暫停選單開著時呼叫也無害(只記下蓄力值、不出聲) | `charge`: 0~1, 當下蓄力值;`stop`: true 時立刻停 | 程式產生(方波 + 三角波, 220 → 660 Hz 上揚) | 約 0.06~0.09 | 持續音 |
| `aimFull` | aimFull | 蓄力剛到滿那一幀(只叫一次)。會順便停掉蓄力聲 | — | sfx_aim_full.wav | 0.45 | 否 |
| `hookLaunch` | hookLaunch | 瞄準中按 Z 射出那一刻。會停掉蓄力聲、恢復背景音樂 | — | sfx_hook_whoosh.wav + sfx_hook_rise.wav 疊播 | 0.60 / 0.45 | 否 |
| `hookCancel` | hookCancel | 瞄準中按 X 取消。會停掉蓄力聲、恢復背景音樂 | — | sfx_hook_cancel.wav | 0.40 | 否 |
| `hookDenied` | hookDenied(新) | 按 Z 但這次不能進入瞄準(角色在空中、站在這隻幽靈頭上等, 依 spec 判定)那一刻。**不要**同時叫 aimStart; 不會影響音樂 | — | sfx_hook_denied.wav(約 240 Hz 低音「嗒」, 47 毫秒) | 0.25 | 否 |
| `plateOn` | plateOn | 開關從沒被壓變成被壓住(角色或幽靈) | — | sfx_plate_on.wav | 0.45 | 否 |
| `plateOff` | plateOff | 開關從被壓住變成放開 | — | sfx_plate_off.wav | 0.40 | 否 |
| `gateOpen` | gateOpen | 門從關變開那一幀 | — | sfx_gate_open.wav | 0.50 | 否 |
| `gateClose` | gateClose | 門真正關上那一幀(延遲結束、角色已離開) | — | sfx_gate_close.wav | 0.50 | 否 |
| `liftMove` | liftMove | 升降台從停住變成開始移動(往上或往下各算一次) | — | sfx_lift_move.wav | 0.35 | 否 |
| `seesaw` | seesaw | 翹翹板被觸發(有人落到落點端), 回放中觸發也叫 | — | sfx_seesaw.wav | 0.55 | 否 |
| `seesawLaunch` | seesawLaunch | 角色被翹翹板彈起那一幀(和 seesaw 同一幀, 兩個都叫) | — | sfx_seesaw_launch.wav | 0.60 | 否 |
| `levelClear` | levelClear | 碰到終點旗那一幀(之後再 `playMusic('replay')`)。spec: 同幀的 tutorialDone、land 等都**不要**叫 | — | sfx_level_clear.wav | 0.65 | 否 |
| `levelFail` | levelFail | 進入失敗畫面那一刻(第 3 代死亡演出結束) | — | sfx_level_fail.wav | 0.50 | 否 |
| `restart` | restart(改) | 暫停選單選「重來」那一刻。**只叫 restart, 不要再叫 pauseClose**; 會自動解除暫停 / 瞄準的悶化、停掉保留的蓄力聲 | — | sfx_restart.wav | 0.45 | 否 |
| `unlock` | unlock | 解鎖頁出現那一刻 | — | sfx_unlock.wav | 0.60 | 否 |
| `uiPage` | uiPage | 開始畫面按空白鍵開始、解鎖頁按空白鍵繼續、全破畫面按空白鍵回第 1 關、過關回放中按空白鍵進下一關(第 5 關則進全破畫面, 同一幀 `playMusic('ending')`)、失敗畫面按空白鍵再試一次。接著出生的第 1 代照叫 spawn | — | sfx_ui_page.wav | 0.40 | 否 |
| `tutorialShow` | tutorialShow(新) | 教學泡泡出現那一刻(pop 從 0 開始那一幀), 每個階段一次; 條件式階段再次出現也叫 | — | sfx_tutorial_show.wav(約 330→490 Hz 短「啵」, 60 毫秒, 加了衰減) | 0.30 | 否 |
| `tutorialKey` | tutorialKey(新) | 第 1 階段某個鍵帽第一次打勾那一幀(pressed 由 false 變 true), 每個鍵一次 | `index`: 0 / 1 / 2 = **這是第幾個打勾的鍵**(依打勾先後, 不是哪一個鍵); 音高 Do → Mi → Sol 依序升高。可省: 省略時自動依呼叫次數 0、1、2 往上, `tutorialShow` 時歸零 | sfx_tutorial_key1 / 2 / 3.wav(金幣「叮」, 960 / 1225 / 1425 Hz) | 0.32 | 否 |
| `tutorialDone` | tutorialDone(新) | 教學階段完成那一刻(done 從 0 開始那一幀) | — | sfx_tutorial_done.wav(上行琶音)+ 0.12 秒後 sfx_tutorial_sparkle.wav(高音「叮叮」) | 0.28 / 0.18 | 否 |
| `pauseOpen` | pauseOpen(新) | 遊玩中(含瞄準中)按 Esc、暫停選單打開那一刻。**自動**: 背景音樂降到 30% 並悶化、蓄力聲暫停(記住蓄力值) | — | sfx_pause_open.wav(約 1.1 → 1.8 kHz 往上掃的選單音, 0.27 秒) | 0.45 | 否 |
| `pauseClose` | pauseClose(新) | 選「繼續」或再按 Esc、暫停選單關閉那一刻(選「重來」時不叫, 改叫 restart)。**自動**: 解除暫停的悶化; 若是瞄準中打開的, 音樂維持瞄準的悶化、蓄力聲從原值接著響 | — | sfx_pause_close.wav(同一對, 約 2.1 → 0.9 kHz 往下掃, 0.27 秒) | 0.40 | 否 |
| `menuMove` | menuMove(新) | 暫停選單裡按 ↑ / ↓ 且選擇真的換了那一刻(到頂 / 底沒移動就不叫) | — | sfx_menu_move.wav(約 660 Hz 短「嗒」, 49 毫秒, 加了衰減) | 0.28 | 否 |

**aimCharge 為什麼是程式產生**: 它要跟著蓄力值即時、連續地升高音高, 長度又看玩家按多久而定; 找過 Kenney(Digital Audio、Sci-fi Sounds)和 OpenGameArt 的 512 Retro Sound Effects, 只有固定長度的上揚掃頻或固定音高的循環, 對不上可變的蓄力值, 所以用 Web Audio 振盪器即時產生(方波 + 三角波, 音色跟 8-bit 音效同一套)。

`aimCharge` 範例:

```js
// 進入瞄準
Sound.play('aimStart');
// 瞄準中每幀
if (charge < 1) Sound.play('aimCharge', { charge });
else if (!fullPlayed) { Sound.play('aimFull'); fullPlayed = true; }
// 射出 / 取消
Sound.play('hookLaunch');   // 或 Sound.play('hookCancel')
```

教學事件範例:

```js
// 泡泡彈出(每個階段一次)
Sound.play('tutorialShow');
// 第 1 階段: 某個鍵帽 pressed 由 false 變 true
Sound.play('tutorialKey', { index: checkedCount });   // checkedCount = 這之前已打勾幾個(0、1、2)
checkedCount++;
// 階段完成(done 開始)
Sound.play('tutorialDone');
```

暫停選單範例:

```js
// 遊玩中(含瞄準中)按 Esc 打開
Sound.play('pauseOpen');           // 音樂自動悶化、蓄力聲自動暫停
// ↑ / ↓ 且選擇真的換了
Sound.play('menuMove');
// 選「繼續」或再按 Esc
Sound.play('pauseClose');          // 自動恢復; 瞄準中打開的會回到瞄準的悶化
// 選「重來」
Sound.play('restart');             // 只叫這個, 不叫 pauseClose; 接著第 1 代出生不叫 spawn
```

## 背景音樂

`Sound.playMusic(曲名)`: 循環播放; 換到另一首時舊的淡出 0.6 秒。同一首重複呼叫不會重頭(可以每幀叫)。`Sound.stopMusic()` 淡出停止。

| 曲名 | spec | 何時切 | 素材 | 相對音量 | 循環方式 |
|---|---|---|---|---|---|
| `title` | title | 開始畫面、解鎖頁(開網頁時就可以叫, init 時才開始播) | music_title.mp3(Monkeys Spinning Monkeys, 明亮俏皮的弦樂撥奏) | 0.40 | 53 秒 / 32 小節, 段尾 2 秒淡出後從頭 |
| `play` | play | 遊玩中(每關同一首); 死亡演出、暫停選單、選單「重來」都**不要**重叫別首 | music_play.mp3(Easy Lemon, 輕鬆的吉他與木琴) | 0.34 | 70 秒 / 24 小節, 段尾 2 秒淡出後從頭 |
| `replay` | replay | 過關回放 | music_replay.mp3(Fluffing a Duck, 滑稽可愛的管樂) | 0.40 | 整首 67 秒, 播完從頭 |
| `ending` | ending | 全破畫面 | music_ending.mp3(Life of Riley, 溫暖的烏克麗麗與鐘琴) | 0.40 | 56 秒 / 24 小節, 段尾 2 秒淡出後從頭 |

- 「降到 30% 並悶化」有兩個原因, 任一個在就悶化, 兩個都解掉才恢復(RD 都不用另外處理):

| 原因 | 開始事件 | 結束事件 |
|---|---|---|
| 瞄準 | `aimStart` | `hookLaunch`、`hookCancel`、`death` |
| 暫停選單 | `pauseOpen` | `pauseClose` |
| (兩者一起清) | — | `restart`、`levelClear`、`levelFail`、`stopMusic()`、換到另一首曲子 |

- 換曲時保留 0.15 秒內剛設的原因(同一幀先開暫停再換曲不會漏)。這些狀態在靜音中、或同一事件連按被限頻時一樣會記, 取消靜音後音量正確
- 失敗畫面不換曲(沿用 play), 失敗後按空白鍵重來也不用重叫

## 同時觸發的處理

| 同一刻可能一起發生 | 處理 |
|---|---|
| 落到幽靈頭頂: land + headStand | RD 只叫 headStand。若兩個都叫了, headStand 會停掉並擋掉 0.15 秒內的 land |
| 翹翹板: seesaw + seesawLaunch(+ 幽靈或角色的 land) | 全部照叫; seesawLaunch 最大聲, land 小聲 |
| 射出: hookLaunch + 蓄力聲 | hookLaunch 自動停蓄力聲 |
| 幽靈離開開關: plateOff(+ gateClose 稍後) | 各自照叫, 音高 / 音色不同, 不互蓋 |
| 任何事件連發 | 每個事件有各自的最短間隔(見 sound.js), 同一事件最多 4 聲同時存在(最舊的被切掉) |
| 碰旗過關: levelClear + playMusic('replay') | 同一幀叫即可, 音樂淡入 0.4 秒, 號角會蓋在前面。同幀的 tutorialDone、land 等**不要叫**(spec) |
| 第 5 關回放後按空白鍵: uiPage + playMusic('ending') | 同一幀照叫(疊播); 回放曲淡出 0.6 秒、全破曲淡入 |
| 暫停選「重來」又同時完成第 9 階段(卡住了) | 先叫 restart; tutorialDone 由 RD 延到新嘗試出生那一幀再叫(spec, 不同幀) |
| 失敗: death → 0.6 秒後 levelFail | 各自照叫 |
| 回放 / 失敗畫面按空白鍵: uiPage + 下一關(或重試)第 1 代的 spawn 同一幀 | 照叫; uiPage 是 0.06 秒的短「嗒」、音量 0.40, spawn 的上揚在後面聽得出來 |
| 同一幀多個開關被壓 / 放開 | plateOn / plateOff 0.06 秒內只響一次 |
| 剩 1 秒的 timeTick 之後 1 秒超時: death | 各自照叫; timeTick 只有 64 毫秒, 不會跟 death 重疊 |
| timeTick 與其他事件同時(例: 剛好壓開關) | 照叫; timeTick 是高音短滴、音量 0.25, 不蓋掉機關聲 |
| 連按 Z 被拒: hookDenied 反覆 | 0.08 秒內重複只響一次; 低音、短、小聲, 不會變成警報 |
| 空中按 Z: hookDenied + 同時起跳的 jump | 照叫; 兩者音高差很多(jump 上揚、hookDenied 低悶) |
| 第 1 階段按跳: jump + tutorialKey 同一幀 | 照叫; 「叮」是 1 kHz 上下的定音, jump 是滑音, 聽得出兩聲 |
| 同一幀兩個鍵一起打勾(例: → 和 ↑ 同時按) | 叫兩次 tutorialKey(index 各自給); 第二聲自動往後錯開 0.07 秒, 聽起來是「叮、叮」不是一聲 |
| 第三個鍵打勾 → 第 1 階段完成: tutorialKey + tutorialDone 同一幀 | 照叫; tutorialDone 會自動延後到「叮」之後 0.12 秒, 聽起來是集滿點數 → 小成就 |
| tutorialDone 與 headStand / hookLaunch / seesawLaunch 同一幀 | 照叫; tutorialDone 音量 0.28 / 0.18, 比這三個(0.50~0.60)小一號, 動作聲在前面 |
| tutorialDone(0.8 秒特效)之後下一個泡泡: tutorialShow | 各自照叫; 琶音約 0.4 秒就結束, 不重疊 |
| tutorialShow 與機關聲同一幀(例: 泡泡在門開時出現) | 照叫; 「啵」只有 60 毫秒、音量 0.30 |
| 瞄準中按 Esc: pauseOpen(蓄力聲正在響) | pauseOpen 自動停掉蓄力聲並記住蓄力值; 選單開著時 RD 繼續叫 aimCharge 也不出聲 |
| 暫停選單關閉回到瞄準: pauseClose | 蓄力聲從原值接著響, 音樂維持瞄準的悶化; RD 下一幀照常叫 aimCharge 即可 |
| 暫停選單選「重來」: restart(+ 第 1 代出生) | 只叫 restart, 不叫 pauseClose、不叫 spawn; restart 會清掉所有悶化原因與保留的蓄力值 |
| 快速連按 Esc: pauseOpen / pauseClose 交替 | 同名 0.1 秒內只響一次, 但暫停狀態每次都記, 最後狀態一定正確 |
| 連按 ↑ / ↓: menuMove 反覆 | 0.04 秒內重複只響一次; 只有 49 毫秒、音量 0.28, 不會吵 |
| 暫停選單開著時按 M | 靜音照常切換; 選單開關的悶化狀態不受影響 |
| aimStart 與 pauseOpen 聽起來的差別 | aimStart 是高低交錯的「嗚哇」(約 950 / 460 Hz 來回), pauseOpen 是一路往上的掃頻(1.1 → 1.8 kHz), 像選單打開 |

## 理念或經驗落實

- **即時回饋音要立刻出聲**(經驗「即時回饋音聽起來延遲」): 所有音效量過「出到峰值一成的時間」, 全部 ≤ 5 毫秒; 音效以 16-bit PCM 內嵌, init 時同步填進 AudioBuffer, 不經非同步解碼, 第一鍵就有聲
- **背景音樂優先用現成整首、循環要夠長**(經驗「程式合成的背景音樂被嫌太快、一直重複很膩」): 四首都是 Kevin MacLeod 的現成曲, 循環段 53~70 秒(24~32 小節), 不用合成
- **incompetech 先用曲目清單篩選**(經驗「需要精準 BPM 與整數小節循環的背景音樂找不到可驗證的」): 從 `pieces.json` 依風格欄(Bright / Bouncy / Humorous / Calming / Uplifting)與長度挑, 依標示 BPM 算整數小節截段; 本作不需要跟拍, 沒做 BPM 實測
- **CC BY 音樂的署名文字**(經驗「CC BY 音樂的署名文字」): 照 incompetech 的固定格式寫進 credits.md, 並提醒製作人遊戲畫面要放
- **用 OfflineAudioContext 在載入時解碼內嵌 mp3**(經驗「背景音樂要跟拍子時鐘對齊…」): 沿用同一個做法讓 file:// 下也能用 Web Audio 做悶化; 本作不要求無縫循環, 改成段尾淡出再從頭, 不需要校正解碼器開頭填充
- **沿用任務保留同一套聲音**: 新增的 timeTick、hookDenied 也取自同一個 8-bit 音效包(Simple Bleeps 類), 響度照上一版同一套流程統一; 兩個原檔是平坦方波, 另加短衰減讓「滴 / 嗒」不刺耳(spec 要求不讓人慌、不是錯誤警報), 起音都在 1 毫秒內
- **polish-5 的教學三聲也沿用同一套**: 都取自同一個 8-bit 音效包, 響度流程與上一版相同, 起音全部在 1 毫秒內(量「到峰值一成」為 0.0 毫秒), 泡泡彈出時立刻有聲; 刻意避開已用過的檔(aimFull 的金幣、uiPage 的選單音、spawn / unlock 的能力音), 讓教學音和遊戲事件聽得出不同。tutorialKey 三段音高用同一個「叮」重取樣出 Do / Mi / Sol(大三和弦), 集點感來自音高往上; tutorialDone 選 0.25 秒的短琶音, 比 levelClear 的 0.51 秒號角短一半、音量也低, 符合 spec「比 levelClear 小一號」
- **polish-7 的暫停選單三聲也沿用同一套**(沿用任務保留同一套聲音): 取自同一個 8-bit 音效包的 Pause Sounds 與 Menu Sounds, 響度流程與上一版相同, 起音都在 1 毫秒內(量「到峰值一成」0.1 毫秒), 按 Esc 立刻有聲。pauseOpen / pauseClose 用同一對開 / 關(往上掃 / 往下掃), 刻意避開瞄準用過的那一對(aimStart / hookCancel), 讓「選單」和「時間被按住」聽得出不同; menuMove 避開 uiPage、tutorialShow 用過的兩支, 挑音高最低(約 660 Hz)、最短的一支, 原檔是平坦方波, 比照 timeTick 加短衰減讓「嗒」更輕
- **壓低音樂的原因變多時用原因表、掛勾放最前面**(經驗「規格要慢動作時背景音樂降一半…」的續條): 悶化改成「瞄準 / 暫停」兩個原因, 任一在就悶化; 掛勾放在 play 最前面, 不受靜音與同名限頻影響; 換曲時保留 0.15 秒內剛設的原因。冒煙測試逐一驗了: 瞄準中開關暫停、靜音中開關暫停、同一幀連開連關、暫停中選重來、暫停後同一幀換曲
- **polish-8 沿用任務**: spec 本輪聲音不變, 照「沿用任務保留上一版素材與音量」原則, 43 個檔與 sound.js 的資料、音量、邏輯全部不動(只在檔頭加版本註記), 冒煙測試重跑一次確認 36 個事件與 4 首曲名都對得上 interface.json
- **polish-9 只刪不加**: spec 刪掉起跑哨與壓板的 6 個事件, 依「清單沒列的不做」把事件定義、內嵌資料與 6 個音檔一起刪掉(spec 允許留著, 但留著會讓 credits 列數與實際用到的檔對不上); 其餘 30 個事件照「沿用任務保留上一版素材與音量」原則一個位元組都沒動。冒煙測試確認 30 個事件、4 首曲名對得上 interface.json, 已刪的 6 個名字呼叫時靜默不出聲
- spec 要求「title 不要有點毛」: 換成風格欄標 Bright / Humorous / Uplifting 的曲子, 沒有選 Mysterious / Dark 的
