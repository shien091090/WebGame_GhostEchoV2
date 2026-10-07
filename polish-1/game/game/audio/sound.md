# 聲音規格 — Ghost Echo(polish-1)

RD 只需讀這份。`sound.js` 以 `<script src="audio/sound.js"></script>` 載入(一般 script, 不是 module), 提供全域 `window.Sound`。

## 聲音風格

音樂盒 / 撥弦的柔和旋律當背景, 上面疊輕巧的數位小音效(跳、彈、叮)與少量實體聲(喀、碰、門)。可愛、不刺耳, 死亡不給懲罰感。

## 呼叫方式

| 函式 | 說明 |
|---|---|
| `Sound.init()` | 第一次按任何鍵時呼叫(瀏覽器要求)。重複呼叫無害。init 前的 `play` 一律靜默丟棄 |
| `Sound.play(name, opts)` | 一次性音效; 未知 name 靜默忽略, 不會丟錯 |
| `Sound.playMusic(name)` | 背景音樂循環; 同一首重複呼叫不會重播; 換曲時前一首 0.6 秒淡出。**init 前呼叫也可以**: 會記住, init 時自動開始 |
| `Sound.stopMusic()` | 淡出停止音樂 |
| `Sound.setMuted(bool)` / `Sound.isMuted()` | 靜音開關, 音樂與音效一起; 靜音期間音樂照走(只是聽不到), 取消靜音接著播 |

## 事件表

相對音量 1.0 = 最響(hookLaunch)。全部不循環, 除了 aimCharge 是持續音(見下)。

| 事件名 | spec 音效清單 | 何時呼叫 | opts | 素材 | 相對音量 |
|---|---|---|---|---|---|
| `jump` | jump | 角色起跳(含從幽靈頭上起跳) | 無 | sfx_jump(Kenney 數位上滑) | 0.45 |
| `land` | land | 角色從空中落到可站的地方(**落在幽靈頭頂時改呼叫 headStand, 不用兩個都叫**) | 無 | sfx_land(軟悶擊) | 0.50 |
| `headStand` | headStand | 角色落到幽靈頭頂 | 無 | sfx_head_stand(撥弦「啵」)+ 疊一層較輕的 land | 0.65 |
| `spawn` | spawn | 新一代出生 | 無 | sfx_spawn(短閃亮上揚) | 0.60 |
| `death` | death | 角色死亡(坑、尖刺、超時)的那一刻 | 無 | sfx_death(往下掉的短音) | 0.60 |
| `whistle` | whistle | 按 C 吹哨成功時 | 無 | sfx_whistle(上揚哨音) | 0.65 |
| `aimStart` | aimStart | 進入瞄準(時間暫停)那一刻 | 無 | sfx_aim_start(往下收的掃頻) | 0.55 |
| `aimCharge` | aimCharge | 瞄準中, **每一幀呼叫一次**, 直到蓄力滿 | `{ charge: 0~1 }` | 程式產生 | 0.22(持續音) |
| `aimFull` | aimFull | 蓄力值第一次到 1 的那一幀 | 無 | sfx_aim_full(清脆「叮」) | 0.60 |
| `hookLaunch` | hookLaunch | 瞄準中按 Z 彈出 | 無 | sfx_hook_launch_zap + sfx_hook_launch_whoosh 疊兩層 | **1.00** |
| `hookCancel` | hookCancel | 瞄準中按 X 取消 | 無 | sfx_hook_cancel(短輕「嗒」) | 0.50 |
| `plateOn` | plateOn | 開關從放開變成被壓住(角色或幽靈) | 無 | sfx_plate(開關「喀」) | 0.60 |
| `plateOff` | plateOff | 開關從被壓住變成放開 | 無 | sfx_plate 降音高 0.75 倍(較低較鬆的「喀」) | 0.50 |
| `gateOpen` | gateOpen | 門從關變開 | 無 | sfx_gate_open(滑門開) | 0.60 |
| `gateClose` | gateClose | 門從開變關 | 無 | sfx_gate_close(滑門關) | 0.65 |
| `liftMove` | liftMove | 升降台開始往上或往下移動那一刻(不是每幀) | `{ dir: 'up' \| 'down' }`, 可省略; down 音高較低 | sfx_lift_move(機械嗡聲) | 0.40 |
| `seesaw` | seesaw | 翹翹板被觸發(落點端被壓) | 無 | sfx_seesaw(木板「碰」) | 0.70 |
| `seesawLaunch` | seesawLaunch | 角色被翹翹板彈起 | 無 | sfx_seesaw_launch(彈簧式上揚) | 0.80 |
| `keyGet` | keyGet | 撿起鑰匙, 或從幽靈手上接過鑰匙 | 無 | sfx_key_get(明亮上揚叮叮) | 0.75 |
| `lockOpen` | lockOpen | 鎖打開 | 無 | sfx_lock_open_latch(金屬扣)+ 0.1 秒後疊高一個大三度的 keyGet | 0.80 |
| `levelClear` | levelClear | 碰到終點旗 | 無 | sfx_level_clear(撥弦上行樂句) | 0.90 |
| `levelFail` | levelFail | 第 3 代死亡、進入失敗畫面時 | 無 | sfx_level_fail(撥弦下行樂句) | 0.60 |
| `restart` | restart | 按 R 整關重來 | 無 | sfx_restart(倒帶刮擦) | 0.55 |
| `unlock` | unlock | 解鎖頁出現 | 無 | sfx_unlock(撥弦上揚樂句) | 0.85 |
| `uiPage` | uiPage | 說明頁、關卡卡片翻頁(按空白鍵換頁時) | 無 | sfx_ui_page(翻書頁) | 0.50 |

### aimCharge 細節(程式產生)

- 三角波 + 輕微方波泛音, 音高隨 `charge` 從 G3 (196 Hz) 平滑升到 G5 (784 Hz), 帶一點顫音
- 建議: 進入瞄準後每幀 `Sound.play('aimCharge', { charge })`。停止更新 0.22 秒會自動收掉
- `charge` 到 1(或呼叫 `aimFull`、`hookLaunch`、`hookCancel`、`restart`、`death`)立刻停; `aimFull` 之後到下一次 `aimStart` 前, 再叫 aimCharge 都不出聲
- 若 RD 只在進入瞄準時呼叫一次且**不帶 charge**, 會自己用 1 秒從低升到高再停(跟 spec 的 1 秒蓄力一致), 也能用
- 程式產生的理由: 這個音要跟著蓄力值即時改音高, 現成素材是固定長度的錄音, 做不到「隨 charge 連續升高、滿了立刻停」; Kenney 七個音效包與 OpenGameArt(搜 charge loop / charging)都沒有可循環、能變音高又風格相合的蓄力聲

## 背景音樂

| 曲名 | 何時 `playMusic` | 素材 | 長度(一圈) |
|---|---|---|---|
| `title` | 說明頁、關卡卡片、解鎖頁 | music_title(音樂盒「詭異華爾滋」, 輕鬆帶點神秘) | 106.7 秒 |
| `play` | 遊玩中(每關同一首) | music_play(音樂盒可愛小曲, 不急) | 137.1 秒 |
| `replay` | 過關回放 | music_replay(音樂盒快樂波卡, 輕快) | 171.4 秒 |
| `ending` | 全破畫面 | music_ending(鐘聲琶音搖籃曲, 溫暖) | 39.5 秒 |

- 全部循環, 曲子本身是做成可接回開頭的循環段; sound.js 用無縫循環點播放
- **瞄準時的悶化不用 RD 處理**: `play('aimStart')` 時音樂自動降到 30% 並加低通(悶悶的), `hookLaunch` / `hookCancel` / `restart` / `death` / `levelFail` / `levelClear` 任一呼叫時恢復
- 死亡時音樂不停(sound.js 不會因 death 停音樂)
- `levelClear`、`levelFail`、`unlock` 播放時音樂暫時壓到 35% 約 1 秒再回來, 讓樂句聽得清楚

## 同時觸發的處理

| 同一刻可能一起發生 | 處理 |
|---|---|
| 落在幽靈頭頂: land + headStand | 只出 headStand(它自帶一層輕的落地聲)。RD 兩個都叫也沒關係: 0.1 秒內的 land 會被丟掉或靜掉 |
| 從幽靈頭上起跳: jump | 只有 jump |
| 第 3 代死亡: death + levelFail | 兩個都叫; levelFail 自動延後 0.35 秒, 先聽到「噗」再接失敗樂句 |
| 壓開關開門: plateOn + gateOpen(或 plateOff + gateClose) | 兩個都叫; 門聲自動晚 0.04 秒, 先「喀」再門動 |
| 翹翹板: seesaw + seesawLaunch | 兩個都叫; 彈起聲晚 0.03 秒, 先「碰」再「咻」 |
| 撿鑰匙開鎖 | 各自叫; lockOpen 本身已含一聲 keyGet 風格的叮 |
| 同一事件同一幀被叫多次(例: 兩隻幽靈同時踩開關) | 每個事件有最短間隔(0.05~0.5 秒), 太密的自動丟掉; 同事件最多 4 聲同時 |
| 過關: levelClear + playMusic('replay') | 兩個都叫; 音樂暫時讓位給樂句 |
| 優先順序(誰該最清楚) | hookLaunch > levelClear / unlock > seesawLaunch > lockOpen / keyGet > 其他; 頻繁的 jump / land 刻意壓低並加隨機微小音高變化, 反覆聽不膩 |

## 技術備註

- 音效為 24 kHz 16-bit PCM 內嵌在 sound.js, init 時直接填進 AudioBuffer, 按鍵到出聲沒有解碼延遲; 各素材已剪掉開頭靜音、統一響度
- 音樂為 mp3 內嵌在 sound.js, 頁面載入時就先解碼(不需使用者操作); 瀏覽器沒有 Web Audio 時退回 `<audio>` 播 `audio/assets/` 裡的檔(沒有悶化, 只降音量; 蓄力音不出聲)
- sound.js 約 4.7 MB(大部分是四首音樂), 本機雙擊開啟沒問題

## 理念或經驗落實

- 背景音樂優先找現成整首、循環要長(品味, BubbleCatcher round-7): 四首都是現成 CC0 整首曲, 一圈 40~171 秒, 沒有合成音樂
- 按鍵直接回饋的音要在 0.03 秒內到峰值一成、以 16-bit PCM 內嵌(辨識, SlimeTetris round-11): jump / hookLaunch / hookCancel / whistle / uiPage / restart 等量得 0~4 毫秒; 翻頁不用開頭有長段細碎聲的翻書素材, 改用短的那支並剪頭
- 背景音樂內嵌 mp3、載入時用 OfflineAudioContext 解碼、0.05 秒檔頭靜音自動校正解碼器填充、循環終點後多放 0.5 秒(辨識, BubbleCatcher round-7 build): 照做, 用來支援「瞄準時悶化」與無縫循環
- CC BY 素材署名照抄進 credits.md 並提醒製作人(辨識): 本作唯一 CC BY 是哨音(dklon), 回報裡提醒
