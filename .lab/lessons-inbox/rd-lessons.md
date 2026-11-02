
- (放進「自測」, 併入「想在沒有瀏覽器時驗證整個遊戲流程」那條的同類) 觸控層 `?touch=1` 載入後 `PVDX.draw` 與鍵帽替換拋一大批 `Cannot read properties of undefined (reading 'call')` → 觸控層用 `window.CanvasRenderingContext2D.prototype.fillText` 當 `origFill`, vm 假環境沒有這個建構函式, origFill 為 undefined → 假環境補 `CanvasRenderingContext2D = function(){}` 並給 prototype 一個 `fillText`, 再載入 touch.js; 另補 `MouseEvent` 空建構函式
- (放進「其他」, 發布輪拿掉埋點下載時) 要整批拿掉埋點呼叫 → 手刪 20 多處易漏、易把單句 if/else 本體刪掉 → 寫 node 腳本以括號配對找出每個 `emit(...)` 陳述式整行刪除, 事先列出每處前一行確認不是不加大括號的 if/else; 刪完再 grep 只供紀錄用的欄位與計時變數一併清掉
