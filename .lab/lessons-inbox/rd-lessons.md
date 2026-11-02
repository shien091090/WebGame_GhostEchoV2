
<!-- 發布輪(接力吉尼 jelly-jinni)提案 -->
- [分類: 環境 / 工具 — 合併進「用 python3 批次改檔…」那條的同類串] `node C:\Users\...\x.js` 在 Git Bash 回 MODULE_NOT_FOUND(路徑變成 `C:UsersuserAppData…`) → Bash 把反斜線當跳脫吃掉 → Bash 下 node 的腳本與參數路徑一律寫正斜線 `C:/Users/.../x.js`
- [分類: 自測 — 合併進「想在沒有瀏覽器時驗證整個遊戲流程」那條] 假 DOM 元素少了遊戲真的會呼叫的方法(例: 下載用的 `a.click()`), 被遊戲自己的 try/catch 吞成 console.error, 一次幾百筆「錯誤」像是遊戲壞了 → 假元素只實作了 appendChild / style → 假 document.createElement 的回傳物件補 click、removeChild; 看到整批同款錯誤先看堆疊是不是出在假物件
- [分類: Canvas / 渲染 — 合併進「整張畫面改座標系或比例」那條] 為了手機字級把一組世界層提示整組 `ctx.scale` 放大, 組內的 `ctx.restore()` 原本夾在最後一個文字之前, 文字掉到縮放之外、位置跑掉 → 原程式為了畫框線把 save/restore 包在中間, 文字呼叫排在 restore 之後 → 改放大前先讀整組, 把 restore 移到組內最後一個繪製呼叫之後, 組內座標改成相對縮放原點
