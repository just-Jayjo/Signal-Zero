> **備份狀態**：已於 2026/10/17 備份到 GitHub 私人 repo `just-Jayjo/Signal-Zero`。
> **下次提醒**：之後只要改完、有進度，記得再 commit 並 push 上傳，備份才會是最新的。

# PROGRESS — 訊號：零層

## 2026-09-27 Session 6 — Loop 工程：全站效能／UI／遊戲全面檢查並修改（已部署 `index-Bzlfm3z-.js`）

依使用者要求啟用 `LOOP.md`。可驗證目標：`node --check` 全 PASS + `npm run build` 成功 + 線上 `dist/index.html` 的 JS hash 與本地一致 + 新 CSS 在線上存在。共 3 輪，第 3 輪達成並部署。

### 第 1 輪 — 使用者明確需求 + 高價值低風險
- **桌機全螢幕**：`main.js` 在 `#difficulty-select` 與訓練模式按鈕的 click 裡各加一次 `requestFullscreenIfPossible()`（click 是瀏覽器最認的使用者手勢）；原有常駐 `pointerdown/mousedown/keydown` 監聽保留。**注意：載入當下 `requestFullscreenIfPossible()` 一定會被瀏覽器拒絕**（非手勢），這行只是碰運氣，真正的觸發靠第一次互動。
- **桌機「操作指南」放大**：新增 `@media (min-width: 901px) and (min-height: 521px)`（= 兩個小螢幕 media 都不成立時），`#hud-guide-btn` padding 5/13→9/22、字級 0.68→0.92rem；`#pause-menu #pm-guide-btn` 字級→1.06rem、padding 11/24；`#pm-guide .pg-row` →0.94rem、`.pg-ico` scale 1.25。用 `and` 而不是 `or`，才不會蓋掉手機橫向 `max-height:430` 的縮小規則。
- **`gameInput.js` 真 bug**：`unlisten()` 會拔掉 `fullscreenchange`，但 `listen()` 沒加回 → 死亡／退出訓練後再玩，全螢幕變化不再呼叫 `resize()`。已在 `listen()` 補回。
- **`player.reset()` 真 bug**：只把 `health` 歸 100、不還原 `maxHealth` → 打贏第一魔王（上限 150）後重試會顯示 100/150 且分段仍按 150/7 算。改成 `health = this.maxHealth` 並重算 `segmentSize`。
- **`gameLevel.js` 真 bug**：`this.datalogPickups = []` 直接覆寫 → 舊資料拾取物留在場景且不再更新。已補 scene.remove + dispose。
- **HUD 每幀 DOM**：`hud.update()` 全面改成「值沒變不寫」——血量取整數、彈藥用 `ammo/reserve` key、武器名、敵人數、換彈旗標全部 cache，`innerHTML` 只在真的變時才重建。
- **boss 血條**：`gameLoop.js` label 的 `querySelector` 改成只在 label 字串變動時查；`gameCombat.showBossHealthBar`/`updateBossHealthBar` 加顯示狀態與百分比 cache（取整數），元素也 cache。
- **`waveSystem`**：每幀 `filter()` 改手動計數迴圈，不再產生新陣列。
- **`main.js syncGuideBtn`**：MutationObserver 監聽 `#hud` 的 style，而 hud 每幀改 style → 每幀觸發並寫 `display`。加 `hudGuideBtn._blocked` 比對，沒變不寫。

### 第 2 輪 — 派工 + 單點修復
- **派工（子代理，只准動 `src/levels/`）**：六個 level 檔的 `checkCollision` 迴圈內 `new Box3/Vector3` 全部提到迴圈外（模組層級 `_cBox/_cV1/_cV2`）；五個 `buildLighting` 補 `this.decorations.push(bulb)`，修掉換關殘留燈泡。已逐行複核 `level1.js:964-972`，語意與原本等價（`test` box 只依賴 position/radius，與 `box` 無關）。
- **單點擋傷（`player.takeDamage`）**：魔王的 `setInterval` 脫離主迴圈，暫停／劇情／轉場時照樣 `player.takeDamage()`（`shieldGuardian.js:619/692/768`、`signalCore.js:436/620/754`）。不在 12 個計時器逐個改，直接在 `player.js:takeDamage` 開頭用 `window.__szGame`（`main.js` 設定）檢查 `paused || transitioning || narrative.isActive()` 就 return。
- **`weapon.js` 真 bug**：`WeaponManager.update` 只更新 `currentWeapon`，換槍後另一把的 `_trails`/`_sparks` 永遠回收不到。改成遍歷所有武器，非當前武器只跑 `updateTrails()`/`_updateSparks()`。
- **`hud.showLevelAdvanceHint`**：gameLoop 每幀呼叫 → 加 `_hintShown` cache。

### 第 3 輪 — 驗證與部署
- `node --check` 全部改過的檔案 PASS；`npm run build` 成功（`index-Bzlfm3z-.js`）
- `npm run deploy` → 線上 `https://just-jayjo.github.io/Singal-Zero/` 取得 `assets/index-Bzlfm3z-.js`（與本地一致），`min-width: 901px) and (min-height: 521px` 的桌機指南 CSS 確認存在

### 驗證層級（依 LOOP.md 第 4 節）
- 第 1 層（對照看）✅、第 2 層（能跑就跑：node --check + vite build）✅、第 3 層（手動代入）部分 ✅（checkCollision 語意逐行核對）、第 4 層（看畫面）❌ **未做，我沒有瀏覽器截圖能力** — 燈泡是否清乾淨、指南放大後的排版、桌機全螢幕是否真的進去，都需要使用者實測。

### 稽核發現但本次未修（下一輪候選）
- `shieldGuardian.js:598/671`、`signalCore.js:303-314` 砲彈 `setInterval` 每 tick `box.clone().expandByScalar()` 的分配
- `gameCombat.js:353/380`、`weapon.js:348` 粒子每幀 `vel.clone()`
- `gameCombat.js` `updateExplosions()` 用寫死的 `0.016` 推進，沒有吃 delta、暫停時照樣累進
- `levels/*.js:811/560/386` 每關 9 個 PointLight + `gameInit` antialias/dpr1.5/soft shadow — 最大的 GPU 開銷，動它之前要先看畫面
- `narrative.js:149/162` `_close()` 的 setTimeout 競態（期間開新對話會被移除）
- `gameLevel.js:32-35` `spawnEnemies()` 只在 `currentLevel===0` 呼叫 → 波次敵人與 boss 完全不吃 `enemyHp` 難度倍率（困難模式只有玩家受傷倍率生效）
- `targetDummy.js:98-99` `_flashBody` 先 dispose 正在用的材質再 clone

## 2026-09-27 Session 5 — levels 熱路徑記憶體配置 + 燈泡 mesh 殘留修復（build 通過，未部署）

### 已完成（只動 `src/levels/` 六個檔）
**事項 1：`checkCollision` 迴圈內不再 `new`**
- `level1/2/3/4/5/trainingRange.js` 各自在模組層級（class 之外）加 `_cBox`/`_cV1`/`_cV2` 暫存實例
- 六檔原本的 `test` box 只依賴 `position`/`radius`、**跟 `box` 無關**，所以直接提到迴圈外組一次（`_cV1.set` + `_cV2.set` + `_cBox.set`），迴圈內只做 `box.intersectsBox(_cBox)`；語意與原本「每次 new 一個 test」完全一致（已核對 three r170 `Box3.set` 是 copy、`intersectsBox` 不 mutate 任何一邊）
- `this.collisionBoxes` 內的 box 全程未被 mutate，`computeCollisionBoxes` / `collisionBoxes.push(new Box3(...))` 這些建置期配置**沒動**（不是熱路徑）

**事項 2：燈泡 mesh 進 `decorations`**
- `level1:buildLighting`、`level2:buildLighting`、`level3:buildLighting`、`level4:buildLighting`、`level5:buildLighting` 各補一行 `this.decorations.push(bulb)`（原本只 `scene.add`）
- `trainingRange.js` **不需要改**：它的燈板 `panel` 本來就 push 進 `this.lights`，`buildGrenadePickups()` 是空的；掃過全部 `scene.add` 後，唯一沒被陣列管理的就剩敵人（`game.enemies`，歸遊戲管，不歸 level.clear）

### 驗證
- `node --check` 六個檔案全 PASS
- `npm run build` 成功：45 modules，`dist/assets/index-DzjcoxD0.js` 959.73 kB（僅既有的 chunk 過大警告），**未跑 deploy**
- 未實際開瀏覽器，換關後燈泡是否真的清掉需要實測

## 2026-09-27 Session 4 — 後坐力 / 手榴彈丟擲動畫 / 裝置適配（已部署 `index-BkzxvEQI.js`）

### 已完成
**後坐力加明顯（`src/core/weapon.js` + `src/core/player.js`）**
- 基準 `recoilAmount` 0.02→**0.032**、`recoilVisualKick` 0.03→**0.05**；射擊類 0.05/0.07→**0.078/0.108**；另一把 0.04/0.06→**0.062/0.092**（大約 +60%）
- `player._recoilRecovery` 8→**6.5**：回正慢一點，後坐比較讀得出來
- `recoilVisualKick` 同時放大 weapon 的位移後退（`recoilBack = _recoilKick * 0.4`）與 `rotateX` 抬頭，所以視覺幅度也一起變大
- 只調垂直方向（`player.applyRecoil` 只吃 pitch），沒加 yaw，避免跟觸控拖曳視角打架

**手榴彈丟擲動畫（`src/core/weapon.js` Grenade）**
- `createMesh()` 把手榴彈本體拆成獨立子群組 `this._nadeGroup`，手掌/手指仍在 `this.mesh` 上
- `shoot()` 改成只記錄狀態（`_throwT=0.0001`、`_throwEnemies`），**不再當場生成投射物**
- 新增 `_updateThrow(delta)`：全程 **0.30 秒**，`RELEASE = 0.45` 時才真正丟出去；手上那顆在 release 之後隱藏，`currentAmmo > 0`（= reload 完）才重新出現
- 新增 `_releaseGrenade()`：用 `this._nadeGroup.clone(true)` 當投射物（**真的就是手上那顆飛出去**），從手上取得世界座標/朝向，初速維持原設計 `dir * throwStrength` + `vel.y += 3`
- 新增 `_updateWeaponTransform()` 覆寫：`super` 算完再疊揮臂偏移——前 45% smoothstep 往後拉（x+0.05 / y−0.11 / z+0.14、rotX−0.85、rotY+0.45），後段 `sin(πq)` 往前甩（z−0.30、rotX+1.5）再歸位；最後把 `_forearmGroup` 用新的 grip 位置同步回去（否則前臂會停在原地）
- 投射物加 `spin` 旋轉，落地爆炸
- **重要：`clone(true)` 共用 geometry/material，所以爆炸路徑的 `geometry.dispose()`/`material.dispose()` 必須拿掉，不然丟第二顆時手上那顆會變黑/消失**（已拿掉）
- `Grenade.reset()` 覆寫清 `_throwT`/`_throwReleased`

**手機/平板/筆電適配（`index.html`）**
- `#pm-guide` padding-top 改 `max(7vh, 64px)`：收合按鈕固定在右上後，手機橫向 7vh≈28px 會讓它壓到指南標題
- 新增 `@media (pointer: coarse) and (min-width: 900px) and (min-height: 600px)`：平板橫向把射擊 74→86、跳躍 60→70、武器 42→50、選單 40→46，並放大指南與暫停選單字級
- **刻意不改搖桿**：`touchControls.js` 的 `JOY_RADIUS = 52` 寫死，改 `#joystick-base` 外框會讓推滿判定跟視覺對不上

### 尚未做
1. 過場改成「主角從電梯走出來」
2. Boss 音樂：兩魔王做出差異、改用「開場那三聲」的風格
3. 最終 Boss 難度 / 召喚時機 / 第一階段加攻擊
4. 結局三段爆炸 → 魔王變電梯 → 主角帶武器走進去 → 下降

## 2026-09-27 Session 3 — 手機 UI / 全螢幕 / 音樂速度 / 故事線邏輯修復（已部署 `index-DegwdWOa.js`）

### 已完成

**手機版按鈕縮小 + 選單鍵下移（`index.html`）**
- `#btn-fire` 90→74（`right:20 bottom:30`）、`#btn-jump` 74→60（`right:110 bottom:36`）、`#btn-weapon` 50→42（`bottom:120`）、`#btn-menu` 46→40 且 `top:14→54`（原設定是「往下移一點」，若要改回上移一格就好）
- 搖桿 `#joystick-base`/`#thumb` **沒動**：`touchControls.js` 的 `JOY_RADIUS = 52` 是寫死的，縮了外框會讓推滿判定跟視覺對不上

**手機版開發者模式（`src/main.js`）**
- 抽出 `activateDevMode()` 與 `makeTapCounter(targets, need, windowMs, onDone)`
- 主畫面 `.ds-title` 維持 10 次／2.5 秒；**新增「操作指南」按鈕（`#pm-guide-btn` + `#hud-guide-btn` 同一個計數器）20 秒內連點 10 次**
- 手機的玩法：暫停 → 連點「操作指南」，因為同顆按鈕開了會變「收合指南」再點就關，一顆按鈕自己來回點即可

**收合按鈕移開「返回主選單」（`index.html`）**
- `#pm-guide-close` 從內容底部置中改成 `position:fixed; top:16px; right:16px; z-index:421`，原本的位置跟 `.pm-panel` 裡的 `#pm-quit` 同一條垂直線上，關完指南手指剛好落在「返回主選單」
- `#pm-guide-btn` `margin-top:7→17`、`#pm-quit` `margin-top:7→21`：操作指南下移 10px，同時它跟返回主選單的間距從 14 拉到 28

**一進站／暫停回遊戲都自動全螢幕（`src/main.js`）**
- 常駐監聽 `pointerdown / touchstart / mousedown / keydown`，只要當下 `!document.fullscreenElement` 就 `document.documentElement.requestFullscreen({ navigationUI: 'hide' })`
- `fsPending` 旗標避免同一次手勢觸發三次呼叫
- **為什麼一定要綁手勢**：瀏覽器規定非使用者操作的 `requestFullscreen()` 一定被拒絕，所以「載入即全螢幕」做不到，最早就是「第一次任意點一下」。暫停後點「繼續遊戲」也是手勢 → 自動回全螢幕

**音樂速度（`src/core/audio.js`）**
- 新增 `_bgmStepMs(base)`：`(pointer: coarse)` → ×1.18（手機放慢），否則 ×0.90（桌機略加快）
- 套在 `playBGMLayer` 的 `stepMs 286` 與 `playBossBGMLayer` 的 `stepMs 250`；`playEndingBGM` 的節奏**沒動**
- **診斷（推理判斷，無法實際聽）**：兩個合成器都是寫死的 `setInterval(ms)`，牆上時間在手機桌機一樣快，所以合成器本身不可能比較快。差別來自錄音檔——觸控裝置我們刻意不走 `createMediaElementSource`（iOS 穩定性），檔音沒經過 `_bgmBoost`（2.2）被壓在下面，於是**合成層變成主聲**；一般層 `playBGMLayer` 只是 `playBGMFile` 的 fallback，所以手機若檔案播放失敗就只剩合成層，而合成層的 105/120 BPM 跟錄音檔對不上，聽起來就偏快
- **若調完還是不對**，可調的旋鈕就是 `1.18` / `0.90` 兩個數字，或改方向：手機上檔案播放成功時完全不要疊合成層

**故事線邏輯漏洞修復**
- `narrativeData.js` 整份重寫：
  - INTRO 補「你是第二組，第一組沒有回報」（解釋為何單人、哨兵還在跑）；拿掉「來自地下八百公尺」避免跟 log_02 的 800m 座標混淆
  - 第一層補「大廳的電梯還亮著——只有往下那顆」→ 結局的電梯不再憑空出現（也配合接下來每關電梯銜接）
  - 第三層「是有人下令啟動的」→「是用一個死人的帳號下令的」，直接扣 log_04 的林博士
  - 第四層補「焚化爐從沒點過火，他沒能燒掉任何東西」→ 接上 log_05 研究員要燒核心備份卻失蹤的斷點
  - 第五層補「藍圖上沒有這一層，他們還是叫它零層」→ 解決「第五層＝零層」的命名矛盾，扣 log_02
  - 結局「訊號沒有。」語意曖昧 →「訊號沒有停。」
- `datalog.js` 四處矛盾：
  - **log_01**：SOS 與第三層「它不在求救」衝突 → 明寫封包格式不屬於任何通訊協定、零層沒有通訊設備、「不是我們在求救」（SOS 是它抄來的）
  - **log_04**：林博士「六週前」→「四週前」（=672h），才能跟 log_07「密封艙 781 小時前最後開啟」排成 781h 裝鑽桿 → 672h 她進閘門 → 閘門未再開；另外補「命令的時間戳落在她失蹤之後」
  - **log_06**：「四樓是最後一層、再往上是實心岩盤」跟第 1→5 層往下的樓層矛盾 → 改成「冷卻迴圈是封閉迴路、壓力差為零、沒有儲液槽」，恐怖感保留
  - **log_07**：「九分鐘前發生第一次變化」跟 log_05「第七次回傳中文」衝突 → 改「最新一次變化，這是三十天內的第七次」
- `gameEnding.js`：結局標題「信號**中**斷」（用字還錯成「信」）與結果畫面「訊號**中**斷」→ 兩處統一改 **「訊號仍在」**（原本「訊號中斷」跟開放式結尾「訊號沒有停」直接矛盾）

### 尚未做（下一輪）
1. 過場改成「主角從電梯走出來」（目前是站在鏡頭前 idle）
2. Boss 音樂：第一魔王 vs 最終魔王做出差異、改用「開場那三聲」的風格、降低電音的陡度
3. 最終 Boss：第一階段調難、最終階段小兵提早召喚＋最後再多召喚、第一階段加一種攻擊（從最終階段挪一種過來）
4. 結局過場：爆炸分三次（boom boom boom、動態消散、三次顏色不同）→ 魔王本體變成電梯 → 主角走過去（**武器要黏在手上**）→ 進電梯 → 下降 → 進劇情
5. 以上全部完成後，最後一次做**手機／筆電／平板適配總檢查**

## 2026-09-27 Session 2 — 主角模型 / 5 秒關卡轉場 / 結局過場重寫（已部署 `index-DX8v1078.js`）

### 已完成

**F1 主角模型（Kenney Animated Characters 1，CC0）**
- 素材：`public/models/survivor/` — `characterMedium.fbx`（167KB，**二進位 FBX，檔內無任何貼圖檔名**）、`idle.fbx`(608KB)、`run.fbx`(573KB)、`survivorMaleB.png`、`LICENSE-Kenney.txt`（CC0，載入 `survivorMaleB.png` 手動指定）
- 採用**執行期 `FBXLoader`**（`three/addons/loaders/FBXLoader.js`），不是 GLB——這台機器沒有 blender / fbx2gltf，無法事前轉檔；three r170 的 exports map 內建 `three/addons/*`，Vite 直接吃得下（build 通過，45 modules）
- `src/core/protagonist.js`：`loadProtagonist()` 單次快取，`createProtagonist(data)` 用 `SkeletonUtils.clone` 產生實例
  - 貼圖手動給：`MeshStandardMaterial` + `SRGBColorSpace` + `color 0xcfd9e2`、`frustumCulled=false`（skinned mesh 必要）
  - 依 BBox 歸一化到 **1.78m**，再把模型平移成「腳底在 y=0、水平置中」→ 外層 root 的原點就是腳底
  - 動畫從 `idle.fbx`/`run.fbx` 的 `animations[0]` 取，掛在 root 的 `mixer` 上
- **未驗證項（無法在無瀏覽器環境確認）**：模型朝向（用 `lookAt` 讓 +Z 朝目標，若看起來倒退就是需要加一行 `rotateY(Math.PI)`）、貼圖 flipY、動作 clip 與 mesh 骨骼名稱是否對得上（同一作者，機率高但沒實測）
- 套用點：**關卡轉場過場** + **結局過場**（兩處都只在過場出現，不影響玩家操控的 FPS 視角）

**F3 5 秒關卡轉場（`src/core/gameTransition.js` + `index.html #level-transition`）**
- `advanceLevel()` 尾端原本的 `narrative.show(pages, cb)` 整段換成 `_startLevelTransition(floorName, body, onReady, onDone)`
  - `onReady`（黑幕期間 0.95s）只做 `_buildCurrentLevel()`；`onDone`（5.0s）才決定後續：`currentLevel===2` → `_spawnBossWithDescent` 的 boss intro，其餘 → `transitioning=false` + `lockPointer()`
- 時程（`gameTransition.js` 的 `T`）：0.95s 蓋黑+建關+生成主角 → 1.15s 文字 → 2.1s 揭幕 → 4.15s 蓋回 → 5.0s 結束
- 文案：`#lt-floor` = `電梯下行 · FLOOR 0X`，`#lt-name` = `LEVEL_NAMES[idx]`，`#lt-line` = `NARRATIVE_LEVELS[idx].slice(1)`（標題列拿掉，避免重複）
- 攝影機：主角放在鏡頭前方 5m、腳底 y=0、`lookAt` 鏡頭；鏡頭固定 y=1.55、沿 capture 的 forward 從 5.6m 推近到 3.5m；結束時還原 `camPos0/camQuat0`
- `gameLoop.animate()` 在 `endingSequence` 之後、`narrative.isActive()||transitioning` **之前**插入 `if (this._transition)` 分支：跑 `_updateLevelTransition` + render + return
- `#level-transition` z-index 240（低於 narrative 250、高於遊戲畫面）；`.on` 顯示、`.show-text` 淡入文字

**F2 結局過場重寫（`src/core/gameEnding.js`）**
- 時程 `EC = { walkStart: 3.0, walkEnd: 9.5, fadeEnd: 12.0 }`
  - **A（0–3s）Boss 爆炸特寫**：`gameLoop.js` 死亡 splice 前記錄 `this._lastBossPos`（shieldGuardian/signalCore），`_spawnEndingExplosion()` 造閃光球 + 擴散環 + `_createDeathDebris`×4；此段會呼叫 `updateExplosions()`（原本結局分支早 return，debris 不會動）
  - **B（3–9.5s）主角走向電梯**：主角從 `boss + back*6.5` 走到 `boss + back*16.5`（10m / 6.5s ≈ 1.5m/s），`run` 動作 `timeScale 1.4`；鏡頭由爆炸位（`camA`）在 2.5s 內 pan 到 `camB` 並改看主角
  - **C（9.5–12s）淡出黑幕**：動態建 `#ending-fade`（z-index **240**，必須低於 narrative 250 否則蓋住文字），12s 後才 `narrative.show(NARRATIVE_ENDING, {dim:0.52})` → `_showFinalEndingOverlay()`
- 電梯道具 `_buildElevatorProp()`：程序化幾何（背板/左右柱/門楣 + `#00f2ff` 加法混色光縫 + 地面光），放在 heroEnd、`lookAt(heroStart)` 朝向走來的主角
- `enableEndingSequenceControls()` 改到 `startEndingSequence()` 就啟用（原本只在 overlay 才綁），`_showFinalEndingOverlay` 裡移除重複綁定
- `skipEndingSequence()` 補齊清理：hero、elevator、flash、ring、`#ending-fade`
- 攝影機段落整段包在 `if (!this._endingCinemaDone)` 裡，避免結尾 `endingTimer` 歸零後鏡頭跳回 A 位
- **假設待定**：電梯上下方向未寫死（文案只說「走進電梯、門關上」）；過場 `#lt-floor` 寫「電梯下行」暗示往下，若要改回原設定的「上升」一行字可翻

### 下一步
1. **使用者實際看畫面驗證**（這台機器沒有瀏覽器截圖能力，以下全是推理判斷、未實測）：
   - 主角模型有沒有貼圖、比例對不對（目標 1.78m）
   - 主角**朝向**是否正確（`lookAt` 讓 +Z 朝目標；若走路是倒退 → `gameEnding.js` 與 `gameTransition.js` 的 `lookAt(...)` 各加 `model.rotateY(Math.PI)`）
   - 動作有沒有播（`idle.fbx`/`run.fbx` 的 clip 與 mesh 骨骼名是否同名）
   - 5 秒轉場的節奏、結局 12 秒過場的鏡頭有沒有穿牆
2. 若轉場/結局節奏不對，調 `gameTransition.js` 的 `T` 與 `gameEnding.js` 的 `EC`

## 2026-09-27 Session — 敘事精簡 + UI/訓練/音樂/Boss 攻擊批次（已部署 `index-uXpWgiii.js`）

### 已完成

**故事文字精簡 + 邏輯梳理（`src/core/narrativeData.js` 整份重寫）**
- 開場 4 句 → 2 句；每層 2–4 長句 → 標題 + 1–2 短句；Boss 介紹 2 長句 → 2 短句；結尾 11 句 → 3 句
- 主線改成貫穿意象：「訊號」逐層變強 → 第三層轉折（防禦不是失控、訊號在防守）→ 底層「它一直都在」→ 結尾「核心停止了／訊號沒有／你走進電梯」
- `gameEnding.js` 結尾 overlay 同步精簡：移除 `.ending-detail` 一整行，`.ending-sub` 改「零層核心已停止」，浮現時程 15s→12s、自動跳過 28s→24s；`result-subtitle` 改「零層核心已停止。」（原本「訊號源頭已被摧毀」跟開放式結尾矛盾）
- **假設**：結尾電梯方向目前文案走「走進電梯、門關上」，未寫死上下；等主角模型 + 下降動畫做進去時再定

**每波敵人計數（`waveSystem.js` + `gameLoop.js`）**
- `WaveSystem` 新增 `currentWaveTotal`（constructor + `reset()` 都歸零），`_startNextWave()` 用 `def.enemies.reduce` 算該波總數
- `gameLoop.js:188` HUD 分母改 `Math.max(waveTotal, this.enemies.length)`；波尚未定義時退回 `totalEnemies`；`hud.js` 不動
- 效果：殘存敵軍顯示「本波剩餘 / 本波總數」，不再是「整關總數 / 已存活數」
- 第四層（index 3）最後兩波各減 2 隻：波次5/6 9→7、波次6/6 12→10

**終 Boss 攻擊多樣化（`src/enemies/signalCore.js`）—— 修掉「只有轉阶段、幾乎沒技能」**
- constructor 裡 `orbitalTimer/pulseTimer/summonTimer/vortexTimer/missileTimer/laserTimer` 原本全是 `99.0`，且只有 phase≥2 才遞減 → 實際從未觸發（`summonTimer=99` 從 commit `14ed135 v0.1 beta` 就是這樣）
- 改為起始值 `orbital 6 / pulse 4 / summon 9 / vortex 9 / missile 11 / laser 7`
- `pulseTimer`（地面衝擊波 `_firePulseWave`）**移出 `phase >= 2` 閘**，phase 1 就會放，節奏 11s→9s→7s；`summonTimer` 重置 18s→14s；orbital/missile 維持 phase≥2
- 已確認 ShieldGuardian 的 `_groundSlam`（7m、冷卻 6/8s）與 `_summonCooldown` 完好未動

**音樂三軌分流（Q3=A：檔案軌 + 疊強化合成層）**
- `audio.js` `playBossBGMLayer(keepFile = false)`：`keepFile=true` 時**不呼叫 `stopBGM()`**，讓 WAV/MP3 繼續播、合成層疊上去
- `gameLevel.js _buildCurrentLevel`：index 4 → `bgm_boss.wav`、index 2（第一魔王「壁壘」）→ `bgm_industrial.mp3`，兩者都 `null` fallback + 直接疊 `playBossBGMLayer(true)`；其餘層維持 `bgm_normal.wav` + `playBGMLayer()` fallback
- 順序固定：先 `playBGMFile`（內部會 `stopBGM()`）再疊層，避免層被清掉

**桌機左上角操作指南（`index.html` + `main.js`）**
- `#pm-guide` **從暫停選單裡搬出來**改成全螢幕獨立浮層（`z-index: 420`），新增 `#pm-guide-close` 收合按鈕（因為蓋住暫停選單後原本的收合鍵點不到）
- 新增 `#hud-guide-btn`（fixed、`z-index: 415`、`top:8px left:14px`，`body.touch-mode` 強制隱藏）
- **為什麼不放在 `#hud` 裡**：桌機 pointer lock 期間點不到，解鎖時又被 `#blocker`(z100)/`#pause-menu`(z400) 蓋住 → 放外面 + 用 `MutationObserver` 同步 `#hud` 與 `#results-screen` 的 display 決定顯隱
- `main.js` 抽出 `setGuideOpen()/toggleGuide()`，`#pm-guide-btn`、`#hud-guide-btn`、`#pm-guide-close` 三個入口共用；另外加 `H` 鍵切換（pointer lock 時唯一可用的操作方式），key-mode 指南補 `<b>H</b> 操作指南` 一列
- 桌機 `#enemy-panel` 由 `top:30px` 下移到 `top:46px`，讓位給左上角按鈕

**魔王訓練解鎖（`localStorage`，專案首次使用 storage）**
- 鍵：`sz_boss1`（擊敗第 3 層「壁壘」，在 `advanceLevel()` `prevLevel===2` 時寫入）、`sz_boss2`（通關，`startEndingSequence()` 寫入），皆 `try/catch`
- `main.js` `refreshTrainingLocks()`：未解鎖的 `.training-btn.boss-btn` 設 `disabled` + `.locked`，點擊 handler 也擋 `btn.disabled`；`MutationObserver` 監看 `#training-select` 顯示時刷新

**訓練選單橫向排版 + 魔王訓練區（`index.html`）**
- `.training-boss-label`（紅字「魔王訓練」）+ `.boss-options` 兩顆紅框按鈕：`boss1 壁壘`、`boss2 零層核心`，desc 寫解鎖條件
- 手機 media query 內 `.training-options` 改 `flex-direction: row; flex-wrap: wrap`、`.training-btn { flex: 1 1 210px }`（寬螢幕 4 併排、窄螢幕 2×2）；`.boss-options` 桌機也橫排
- `gameTraining.js`：import `ShieldGuardian`/`SignalCore`；`_spawnTrainingEnemies()` 加 `boss1/boss2` 分支（在 `(14,0,0)` 生成、`boss._game = this`、`showBossHealthBar(true)`）；`_showEnemyProfile` 的 `svgIcons`/`data` 與 `hints` 都補兩隻 Boss

### 部署
- `npm run build` → `dist/assets/index-uXpWgiii.js`；`npm run deploy` → `gh-pages`；線上 20s 後確認 `index-uXpWgiii.js` + `boss-options` 已上線

### 下一步
- **F3** 5 秒關卡切換過場動畫（目前 `advanceLevel()` 是直接跳定位 + 叙事卡）
- **F1** 下載 CC0 授權 GLTF 主角模型（使用者選 B：外部 CC0 + 自己修改），需先用網頁搜尋找到可穩定下載的來源，不可亂猜 URL
- **F2** 結尾動畫改寫：魔王爆炸特寫 → 主角走向電梯 → 電梯 → 畫面淡出（需要 F1 的模型）
- 三者完成後 build + deploy + 更新本檔

---

## 2026-07-26 Session — 手機橫屏觸控操作 + 結尾劇情動畫串接 + Boss 弱化

### 已完成

**觸控操作（新檔 `src/core/touchControls.js`）**
- `isTouchDevice()` 用 `matchMedia('(pointer: coarse)')` 判斷**主要指標**是否為粗指標，觸控筆電（滑鼠為主要指標）不會誤入觸控模式
- `initTouchControls(game)`：在 `src/main.js` 的 `game.init()` 之後呼叫；成功才設 `game.isTouch = true`、`body.touch-mode`
- 浮動搖桿（`#joystick-zone` 左 45%）：`JOY_RADIUS=52`、`SPRINT_THRESHOLD=0.72`，推過 72% 半徑即衝刺，**沒有獨立衝刺鍵**（照使用者規格）
- 視角（`#aim-zone` 右 55%）：拖曳呼叫 `player.look(dx, dy, 0.0034)`
- 按鈕：`#btn-fire`（按住持續射擊）、`#btn-jump`、`#btn-weapon`（`switchTo((i+1)%len)` 循環切槍）、`#btn-menu`（開暫停選單）
- 附加：點 `#ammo-panel` 手動換彈、點 `#level-hint` 推進關卡（手機沒有 Q 鍵）
- 橫豎螢幕：直立時顯示 `#rotate-overlay` 並自動暫停（`pausedByRotation`），轉回橫向自動恢復
- `game._touchReset`：重設搖桿/開火旗標，在 `openPauseMenu()` 與 `restart()` 中呼叫

**Player 觸控輸入（`src/core/player.js`）**
- 新增 `touchMoveX/Y/Mag`、`touchSprint`、`touchActive`、`touchSensitivity`（constructor + `reset()` 都有）
- 把原本 `onMouseMove` 的 yaw/pitch 計算抽成 `look(dx, dy, sensitivity)`，桌機與觸控共用
- 新增 `_syncCameraRotation()`；`update()` **每幀末尾呼叫** —— 這同時修掉一個既有 bug：`_recoilPitch` 原本只在 `onMouseMove` 裡寫進 `camera.rotation.x`，不動滑鼠時後座力永遠不回復
- 移動分支：`touchActive` 時用搖桿向量，否則用 WASD
- 衝刺判斷改為 `wantSprint = touchActive ? touchSprint : sprintHeld`

**暫停機制（`src/core/gameInput.js`）**
- 新增 `openPauseMenu()` / `closePauseMenu()`：手機沒有 pointer lock，不能沿用 `onPointerLockChange` 的暫停
- `lockPointer()` 加 `if (this.isTouch) return`，並用 try/catch 包住 `requestPointerLock()`（新版 API 回傳 Promise，失敗時避免未捕捉拒絕）
- `body.ui-paused` 搭配 CSS 隱藏觸控按鈕

**結尾劇情動畫（`src/core/gameEnding.js`）—— 原本是死程式碼**
- 原況：`startEndingSequence()` 只播敘事就 `showResults()`，`endingSequence` 從未設 `true`、`_showFinalEndingOverlay()` 從未被呼叫
- 現在流程：`startEndingSequence()` → 設 `endingSequence=true`、記錄 `_endingCameraPos`、生成 70 顆資料迴聲粒子、加 `body.ending-cinema`（電影黑邊）→ `narrative.show(NARRATIVE_ENDING, cb, { dim: 0.52 })` → 敘事結束 → `_showFinalEndingOverlay()`（分階段浮現標題/戰報/製作名單/按鈕）
- `animate()` 中 `endingSequence` 分支移到 `narrative/transitioning` 判斷**之前**，否則被敘事的 early return 吃掉
- `updateEndingSequence` 鏡頭繞行 + 粒子環繞持續運作；自動跳過改為 `_endingOverlay` 存在且 `endingTimer > 28`
- 修掉既有 bug：`enableEndingSequenceControls` 的 `mousedown` 原本任意點擊就跳過，導致 overlay 的按鈕永遠點不到 → 加 `closest('button')` 過濾，並同時註冊 `touchend`
- `_spawnEndingParticles` 每顆独立 geometry/material，配合既有的 dispose 迴圈

**敘事畫面（`src/ui/narrative.js`）**
- `show(pages, onComplete, opts)` 新增 `opts.dim`（預設 0.88），結尾用 0.52 讓背景 3D 場景透出來
- 文字加半透明面板底（`rgba(0,8,16,0.55)` + 邊框）保證行動裝置可讀
- 補 `touchend` 前進（帶 300ms 去抖避免與 `click` 重複觸發），提示文字在 touch-mode 顯示「點擊畫面繼續」

**Boss 弱化**
- ShieldGuardian：HP 800→700、傷害 5→4（狂暴 7→6）、射擊冷卻 2.2→2.5（狂暴 1.5→1.8）、砸地 6/4→5/3、雷射 10/s→7/s、飛彈 `+3`→`+2`
- SignalCore：HP 2000→1750、射擊冷卻 `[1.5,1.8,2.0]`→`[1.8,2.1,2.4]`、瞄準彈傷害 `[4,5,7]`→`[3,4,6]`、追蹤球 `3+phase`→`2+phase`、環狀 `3+phase`→`2+phase`、衝擊波 `4+2*phase`→`3+2*phase`、飛彈 10→8、死亡爆波 15→12、雷射 14→11 / `6*delta`→`4.5*delta`、近身 `4*delta`→`3*delta`

**HUD / CSS（`index.html`、`src/ui/hud.js`）**
- meta：viewport（`user-scalable=no, viewport-fit=cover`）、mobile-web-app-capable、theme-color
- `#rotate-overlay`、`#cinema-bars`（z-260，蓋在敘事 250 之上）、`#touch-controls`（z-30）、`#pause-menu`（z-400）
- `body.ending-cinema #touch-controls { display:none }`（劇情中隱藏虛擬按鈕）
- **關鍵修正**：`body.touch-mode #hud { z-index: 35 }` —— `#hud` 原本 z-10，可互動的 `#ammo-panel` / `#level-hint` 會被 z-30 的 touch 區域擋住點不到；同時隱藏 `#hud::before/::after` 角框避免蓋到按鈕
- `body.touch-mode #level-hint` 改置中下方 `bottom:68px`，避開右側武器切換鍵
- `showLevelAdvanceHint()` 依 `body.touch-mode` 切換「點擊這裡前往下一層」/「按 Q 前往下一層」

### 手機 UI 第二輪（2026-07-26，已部署上線）

**按鈕改圖示 + 重新定位（`index.html`）**
- `#btn-fire` → 準星 SVG（圓環＋十字＋中心點）、`#btn-jump` → 跳躍人形 SVG、`#btn-weapon` → 循環箭頭 SVG、`#btn-menu` → 漢堡 SVG，全部改用 `stroke="currentColor"`，移除原本的「射/跳/FIRE/JUMP」文字與 `.bf-sub`/`.bj-sub` CSS
- 新增 `.touch-btn .tb-ico` 尺寸規則
- 位置：射擊 `right:24 bottom:58 (90×90)`（上移離開手勢列）、跳躍 `right:136 bottom:66 (74×74)`、切槍 `right:24 bottom:164 (50×50)`（移到右緣，原本 `right:128`）、選單維持左上
- `#enemy-panel`（殘存敵軍）touch-mode 從 `top:74 left:16` 改為 `top:16 left:74`，排到最上排、在選單鍵右邊

**暫停選單新增操作指南（`index.html` + `src/main.js`）**
- `#pause-menu` 加入 `#pm-guide-btn` 與 `#pm-guide`，兩組指南：`[data-mode="touch"]`（搖桿/視角/各按鈕/換彈/推進關卡）與 `[data-mode="key"]`（WASD/滑鼠/右鍵衝刺/Space/R/1-2-3/Q），用 `body.touch-mode` 切換只顯示對應那組
- 開關邏輯寫在 `main.js`（不能放 `touchControls.js`，那個檔在桌機會直接 return）
- `.pm-panel` 加 `max-height:92vh; overflow-y:auto` 避免橫向螢幕裝不下

**主畫面手機橫向（`index.html` `@media (max-height:430px)`）**
- `#blocker`、`#difficulty-select`、`#training-select` 加 `overflow-y:auto` 保險
- 難度選擇：隱裝飾角框、面板 padding 縮小、`ds-title` 改 `clamp(1.4rem,6vw,2.2rem)`、`ds-sub`/`ds-divider` 邊距縮小、按鈕改 `width:100%` + padding 9px、`.btn-hint` 縮到 0.55rem（原本按鈕 `min-width:280px; padding:16px 60px` 在 375px 高的橫向螢幕會超出）
- 暫停選單指南在 430px 高以下字級再縮一級

**部署**：`npm run build` → `npm run deploy`（gh-pages）→ 線上已驗證為 `index-DD0vMqh8.js`，`pm-guide` / `tb-ico` 都有出現
**網址**：https://just-jayjo.github.io/Singal-Zero/

### 手機 UI 第三輪 + 手機 BGM + 訓練模式流程（2026-07-26，已部署上線 `index-CSmnqL0P.js`）

**操作指南（`index.html` `#pm-guide`）**
- 新增 `.pg-ico`（inline SVG 尺寸規則）
- 「左半螢幕拖曳」配搖桿 SVG、「右半螢幕拖曳」配眼睛 SVG
- 射擊鍵／跳躍鍵／切換武器鍵三列**直接複製畫面上按鈕的同一組 SVG**（原本用 `◎ ⤒ ⟳` 文字符號，跟實際按鈕不一致）
- 刪除「☰ 選單鍵」那一列（使用者要求），其餘列全保留

**按鈕微調（`index.html`）**
- 跳躍鍵圖示從跳躍人形改成上箭頭 SVG（使用者要求）
- 右側三鍵整體下移 24px：射擊 `bottom:58→34`、跳躍 `66→42`、切槍 `164→140`
- `body.touch-mode #enemy-profile { top:2px; left:74px }`（殘存敵軍面板排到最上排）

**開發者模式（`index.html` + `src/main.js`）**
- 手機沒有鍵盤打不出 Konami，改成主畫面標題 `.ds-title` **2.5 秒內連點 10 次**啟用，啟用時標題閃「開發者模式已啟用」1.8 秒
- `body.touch-mode #dev-indicator` 原本 `display:none !important`，改成顯示在左下 `left:16 bottom:62` 字級縮小
- 補既有 bug：`restart()` 與 `exitTraining()` 會把 `devMode` 歸零但沒呼叫 `hud.showDevMode(false)`，指示燈會殘留 → 兩處補上

**手機 BGM 完全無聲（`src/core/audio.js` + `src/main.js` + `src/core/gameLevel.js`）**
- 主因假設：iOS 的 `AudioContext.createMediaElementSource()` 路由 `<audio>` 會輸出靜音，且 `play()` 失敗後的重試都落在 `setTimeout`（非手勢）必被擋 → `play()` 一旦 resolve 就永不退回 synth
- 修正：`playBGMFile` 在 **粗指標或 iOS 裝置不走 MediaElementSource**，改原生 `audioEl.play()` 直出（手機端 BGM 因此不依賴 AudioContext 狀態）；移除 `crossOrigin='anonymous'`
- 補 `audioEl.onerror` 重試/退場、6 秒看門狗（`paused` 或 `currentTime < 0.1` 就退回 synth），並用 `settled` / `bgmAudioEl !== audioEl` 雙重保險避免重複觸發
- `main.js` 全域 `pointerdown / touchend / mousedown / keydown / click` 都呼叫 `audio.resumeContext()`（手機瀏覽器會在非手勢狀態把 context 掛起）
- `_buildCurrentLevel` 播 BGM 前先 `resumeContext()`
- **訓練模式原本完全沒有 BGM**（`_buildCurrentLevel` 在訓練時根本不被呼叫），改在 `_startTrainingMode` 直接 `playBGMFile('./audio/bgm_normal.wav')`

**訓練模式流程重做（`src/main.js` + `src/core/gameTraining.js` + `src/core/gameLoop.js`）**
- 原流程：點「訓練模式」→ 立刻顯示「選擇訓練目標」選單（此時還沒進關卡）→ 選完才建場景 + 出靶 + 顯示敵人資料卡
- 新流程：點「訓練模式」→ **直接進訓練場**（場景先建好）→ 場景好了才顯示「選擇訓練目標」按鈕 → 選完才出靶 + 顯示資料卡
- `main.js` easy 分支改成 `game.trainingEnemy = null; game.start()`，不再直接切 `#training-select`；`.training-btn` 改呼叫 `game.selectTrainingEnemy(type)`
- `_startTrainingMode()` 不再 `_spawnTrainingEnemies()`、不再 `_showEnemyProfile()`、**不再 `lockPointer()`**，改成播 BGM + 顯示 `#training-select`
- 新增 `selectTrainingEnemy(type)`：隱藏選單 → 重建 `TrainingRange`（只有 `targetDummy` 才 `noObstacles=true`，沿用原本設計）→ spawn → `_showEnemyProfile` → `lockPointer()`
- **關鍵**：`gameLoop.start()` 的 `this.lockPointer()` 改成 `if (this.difficulty !== 'easy')` —— 桌機若在選單期間就拿到 pointer lock，滑鼠點擊會導向 canvas，選單按鈕會全部點不到（原本選單是在 `start()` 之前顯示所以沒這問題）
- `#training-select` z-index `30 → 60`，要蓋過 touch-mode 的 `#hud`(35) 與 `#touch-controls`(30)
- `restart()` 與 `exitTraining()` 都補 `#training-select` 隱藏（避免殘留）

**部署**：`npm run build` → `npm run deploy` → 線上已驗證 `index-CSmnqL0P.js`

**此輪待使用者回報**
1. 手機 BGM 是否恢復（含訓練模式）
2. 訓練模式新流程是否符合預期（先進場景、再出選單按鈕）
3. 「選單鍵刪掉」的假設是否正確 —— 目前只刪**指南裡那一列**，畫面上的 `#btn-menu` 保留（它是手機唯一的暫停入口）

### 驗證狀態
- `node --check` 通過（11 個檔案）
- `npx vite build` 通過（38 modules，index.html 42.16 kB，JS 868.89 kB，僅剩既有的 chunk 過大警告）
- **尚未實際開啟瀏覽器或手機實測** —— 觸控手感、鏡頭靈敏度、結尾劇情動畫節奏都需要使用者實際看過畫面確認

### 下一步
1. 用實際手機（或瀏覽器開發者工具的裝置模擬）測橫屏觸控：搖桿推進/衝刺判定、鏡頭拖曳靈敏度、按鈕位置是否擋到手指
2. 打到最終關驗證結尾劇情動畫：黑邊、鏡頭環繞、文字可讀性、按鈕可點、28 秒自動跳戰果畫面
3. 打 Boss 體感確認弱化幅度是否足夠（ShieldGuardian 第 2 關、SignalCore 第 4 關）

## 2026-07-25 Session — 最終Boss timer 管理 + weapon.js 子彈效能 + game.js 建構子重組 + 語法修復

### Changes

**SignalCore timer 管理完成**
- 5 個 `setInterval` 全部以 `this._addTimer(setInterval(...))` 包裝
- 4 個 `setTimeout`（階段轉換、瞄準射擊、軌道爆裂、飛彈發射）同樣以 `this._addTimer(setTimeout(...))` 包裝
- `die()` 中 `this._timers.clear()` 完整清除所有計時器

**ShieldGuardian timer 管理（延續上個 session 修復）**
- 7 個 `setInterval` 以 `this._addTimer` 包裝（上個 session 遺漏 closing `))` 導致 syntax error）

**Weapon.js 子彈射線效能優化**
- 移除 `WeaponBase.shoot()` 和 `BurstRifle.fireBurst()` 中每發子彈遍歷 `enemies` 建立 `allMeshes` 陣列
- `Game.animate()` 在敵方更新後預先建立 `this._enemyMeshes`（單純的 mesh 陣列），每幀一次 O(n) 替代每發 O(n²)
- `WeaponManager.shoot()` 接受 `enemyMeshes` 參數並傳遞至 `WeaponBase.shoot()` / `BurstRifle.shoot()`
- `Game.onMouseDown()` 傳遞 `this._enemyMeshes`

**Game.js 建構子屬性分組（向後相容）**
- `this.flags`: running, listening, paused, transitioning, clearReady, endingSequence, devMode, trainingMode
- `this.progress`: currentLevel, _retryLevel, kills, shotsFired, shotsHit, totalEnemies, startTime, elapsedTime, trainingScore
- `this.entities`: enemies, datalogPickups
- `this.effects`: _ambientParticles, _particleVelocities, _debrisList, _explosions, _enemyTrails, _rusherBeepTimers
- `this.ending`: endingTimer, _endingOverlay, _endingParticles, _endingCameraPos, _endingTarget, _endingOrbitAngle, _endingKeyHandler, _endingClickHandler
- 透過 `_installFlatGetters()` 為每個屬性建立 getter/setter proxy，既有 `this.xxx` 存取完全相容

**Syntax 錯誤修復**
- signalCore.js: 5 處 `}, 16)` → `}, 16))`（`_addTimer` 額外關閉括號）
- signalCore.js: 3 處 `setTimeout` 關閉括號補上 `))`
- shieldGuardian.js: 7 處 `}, 16)` → `}, 16))`

### Build
- 37 modules, 860 KB, 0 errors, clean build

## 2026-07-24 Session — SignalCore 最終Boss 彈速/準度下修 + game.js 重構清理

### 使用者回饋
- 最終Boss（Level 5 Signal Core）子彈太快太準，完全躲不開

### SignalCore 參數調整
- **彈速大幅下修**: `14 + this.phase * 3` → `8 + this.phase * 2`（P1:17→10, P3:23→14）
- **射擊間隔拉長**: cooldown `[0.8, 0.9, 1.0]` → `[1.5, 1.8, 2.0]`，初始 timer `1.5→2.5`
- **瞄準射擊散佈增加**: spread `[0.15, 0.25, 0.35]` → `[0.25, 0.35, 0.45]`
- **追蹤光球**: speed 5→4（更慢）、trackStrength `0.8+phase*0.2→0.3+phase*0.15`（追蹤更弱）、spread 0.6→1.2（散更開）、發射間隔 `[3.5/3.0/2.5]→[4.5/4.0/3.5]`
- **飛彈**: speed `8+random*3→5+random*2`
- **衝擊波**: 擴散速度 `6+phase*1.5→4+phase*1.0`

### Game.js 程式碼重構（第二波）
- 從 `game.js` 再拆出 3 個模組（沿用既有 mixin pattern）:
  - `gameInit.js`: `_preloadAssets`、`init`（場景/渲染器/燈光/系統初始化）
  - `gameInput.js`: `listen`/`unlisten`/`setDifficulty`/`lockPointer`/`resize`
  - `gameLoop.js`: `start`/`animate`/`restart`/`restartContinue`
- `game.js` 從 597 行降至 **139 行**（-77%），僅保留 constructor + static getter + mixin 接線
- Build 驗證: 37 modules, 858 KB, 0 errors

### Bug 修復
- **`weapon.js:reset()` 崩潰**: spark 存 mesh 本身但 `reset()` 錯用 `s.mesh.geometry` → TypeError，改 `s.geometry` 直接操作
- **`game.js` 匿名監聽器無法移除**: `contextmenu`/`click`/`fullscreenchange` 用匿名箭頭函式註冊，`unlisten()` 無法解除。改存入 `this._bound` 統一管理
- **`weapon.js` spark 獨立 RAF 迴圈**: 每顆 spark 各自 `requestAnimationFrame(update)`，大量射擊後孤兒 RAF 累積。改為主迴圈 `_updateSparks(delta)` 統一更新
- **`level5.js` 祭壇階梯錯誤加入 walls**: 儀式平台階梯（高度 0.1）被 `this.walls.push(step)` 變成隱形牆，移除

## 2026-07-20 Session (Final) — 全五層雜物清除 + 地形起伏 + L4/L5 Boss 削弱

### 美術重設計
**全五層通用**
- 移除：`buildConduits()`、`buildCeilingLights()`、`buildFloorGlow()`、`buildTerminals()`、`buildRobotDecorations()` — 小尺寸裝飾雜物全部刪除
- 新增大型地形起伏區塊（raised platforms + lowered pits + ramps），取代被刪除的雜物
- 保留所有 gameplay 必要結構（柱子、機櫃、冷卻槽、高台、祭壇等）

**Level 1**: 移除 corridorWalls/bunkers/stackedCrates/robotDecorations/conduits/terminals/ceilingLights/floorGlow，新增 4 個 ±10 隆起平台（0.8m 高）+ 2 個凹陷坑（-0.6m）

**Level 2**: 移除 elevatedWalkways/robotDecorations/terminals/conduits/ceilingLights/floorGlow，擴大 terrain ramps，新增 4 個 ±9 隆起板（0.8m）+ 2 個凹陷區（-0.5m），橋樑移除

**Level 3**: 移除 pipeBridges/walkways/floorVents/ceilingLights/floorGlow/conduits/terminals/robotDecorations，新增 4 個 ±7 隆起區（0.6m）環繞中心競技場

**Level 4**: 移除 debrisFields/ceilingLights/floorGlow/conduits/terminals/robotDecorations，crumbledStructures 減為 4 組角落、hangingCables 減為 2 條、warningBarriers 減為 4 組角落，新增 4 個 ±6 隆起平台 + 2 個凹陷坑

**Level 5**: 移除 ceilingLights/floorGlow/conduits/terminals，刪除未使用的 buildTerrain/buildHeightFeatures/buildElevatedPlatforms/buildMonoliths/buildRobotDecorations，新增 4 個 ±8 階梯平台

### 難度下調 — Level 4（Shield Guardian）
- HP: 1000 → 800
- 速度: 2.5 → 2.2，傷害: 6 → 5，射擊 CD: 1.8 → 2.2
- 護盾啟動間隔: 6s → 8s，護盾持續: 5s → 4s
- 狂怒（50% HP）速度: 3.2 → 2.8，CD: 1.2 → 1.5，傷害: 9 → 7
- 衝擊波傷害: 5/8 → 4/6，CD: 6/5 → 8/6
- 召喚小兵: 2 → 1 隻，CD: 10 → 12/14

### 難度下調 — Level 5（Signal Core）
- HP: 2500 → 2000
- 階段門檻: 66%/33% → 50%/25%（更晚進入高難度）
- Aimed Shot: 傷害 5/7/9 → 4/5/7，P3 連發 4→3
- 追蹤光球: 數量 phase*2→phase*1，傷害 phase+4→phase+3
- Orbital Burst 傷害: 4+phase*2 → 3+phase*1
- Pulse Wave 傷害: 6+phase*3 → 4+phase*2
- 飛彈: 4 → 3 枚
- 雷射初始傷害 18→14，持續 DPS 8→6
- Vortex 爆炸傷害 20→15
- 召喚 CD: 15s → 18s
- P3 近身 DPS: 6 → 4

### Build
- 34 modules, 852 KB, 0 errors, deployed to gh-pages
- git commit `8966161`

## 2026-07-20 Session (Later) — Levels 2-4 空間與視覺重設計

### Changes
**Level 2（伺服器機房）**
- `halfSize` 22→26（面積 44×44→52×52），解決「太壅擠」問題
- 天花板：拆除平面 → 十字鋼架梁（間距 4）+ 發光條 + 半透明遮光面板
- 牆面：嵌入式凹陷面板（3m 間距）+ 金屬邊框 + 底部/頂部發光條
- 機櫃行距、平台、照明、終端機位置全部對應放寬

**Level 3（冷卻廠／Boss 戰）**
- 冷卻槽從 6 減為 4（移除中心 `[0,-10],[0,10]`），Boss 移動空間更大
- 管線橋樑：僅訓練模式保留
- 走道：僅訓練模式保留，正常/Hard 模式移除
- 高台從 8 座減為 4 座（僅角落 `±10,±10`）
- 天花板/牆面：升級為十字鋼架梁 + 凹陷面板

**Level 4（崩塌設施）**
- 懸掛電線：從軸線 `[±10,4.5,0]` 移到角落 `[±10,±10,5.0]`，不再擋住出生視野
- 坍塌結構：移離 `[-10,0],[10,0]` 軸線 → 放到 `[-12,-4],[12,-4]` 等周邊
- 碎片場全部推到邊緣（`±12`），中心淨空
- 警告屏障移到牆角 `[-14,-6],[14,6],[-6,14]`
- 天花板/牆面：升級為十字鋼架梁 + 凹陷面板

### 設計決策
- 所有三個等級採用統一的 ceiling/wall 建構函式（`buildCeiling`/`buildWalls`），與 Level 5 Boss 房間品質一致
- Level 3 障礙物改為 `isTraining` 條件閘控，既有訓練模式不受影響

### Build
- 34 modules, 881 KB, 0 errors, deployed to gh-pages
- git commit `92f449a`

## 2026-07-20 Session — game.js 重構：拆成 5 個模組 + Bug 修復

### Changes

**Bug 修復**
- **`unlisten()` 缺 `mouseup` 移除**: `listen()` 註冊了 `mouseup` 事件但 `unlisten()` 從未 remove，導致多次 listen/unlisten 後多個 handler 疊加。已補上 `document.removeEventListener('mouseup', this._bound.mouseup)`
- **`start()` 缺執行中檢查**: 重複呼叫 `start()` 時會疊加多個 `animate()` 循環。已加入 `if (this.running) return` 守衛

**程式碼重構（game.js 1720 行 → 5 個模組）**
- `game.js`（~590 行）: 建構子（分組區域標題 + 註釋）、`init()`、`listen()/unlisten()`、`start()`、`animate()`、`restart()`、`restartContinue()`、`resize()`、靜態 getter
- `gameCombat.js`（~390 行）: 所有交戰、撿拾、碰撞、特效方法
- `gameLevel.js`（~310 行）: 關卡建立、波次管理、Boss 生成、關卡推進
- `gameEnding.js`（~290 行）: 結尾序列、結果畫面、資料日誌廊
- `gameTraining.js`（~200 行）: 訓練模式啟用、敵情面板、目標生成、暫停/退出

**建構子統一整理**: 使用 `/* === 類別標題 === */` 分組，建立時順便附單行說明（約 12 個分組區域）

### 設計決策（跨模型接手用）
- 拆檔策略: 每個子模組 export `addXxxMethods(Game, ...deps)` 函式，game.js 在 class 定義後呼叫將 prototype method 掛上。好處是所有 `this.xxx` 照常運作、無需改變外部呼叫端
- `LEVEL_CLASSES`/`_textureCache`/`_modelCache`: 維持 module-level 常數，透過閉包傳入各子模組，不設 static property（減少耦合）
- `_bound` 事件參考留在 game.js constructor 內（唯一合理位置），子模組共用

## 2026-07-19 Session (Final Polish) — 全面Code Review + Bug Fixes

### 程式碼審查發現與修復

**Game-Breaking Bugs（已修復）**
- **ShieldGuardian `_descentProtection` 永久啓用**: 建構子設 `true` 但從未設為 `false`，Boss 永久承受 80% 減傷且無法進入 chase 狀態。改為計時器（3 秒後自動解除）
- **Level4 關卡內容缺失**: 6 個 build 方法（`buildCrumbledStructures`/`buildDebrisFields`/`buildHangingCables`/`buildWarningBarriers`/`buildElevatedPlatforms`/`buildRobotDecorations`）從未被 `build()` 呼叫。關卡只有四面牆+天花板。已全部補上
- **Level4 `updateFlicker` 燈光亮度歸零**: `light.intensity = light.intensity * (0.9+flicker*0.1)` 每次 decay 使亮度趨近於零。改為存儲 `baseIntensity` 並使用常數基值
- **Level3 `buildElevatedPlatforms()` 未呼叫**: 無平台、無 stairAreas、跳台 spawn 死碼。已補上
- **Level5 天花板燈光在頂板之上**: 天花板 y=5.0，燈具 y=5.4/5.7（看不見）。下移至 y=4.6/4.9

**GPU 記憶體洩漏（已修復）**
- **所有 6 個 level `clear()`**: 遍歷所有 tracked arrays，對每個 Mesh 的 geometry/material 執行 `dispose()`
- **game.js `advanceLevel()` / `restart()`**: 完整清理敵人網格、_debrisList、_endingParticles、_endingKeyHandler/ClickHandler listener、_endingOverlay DOM；爆炸粒子共用幾何不再被 dispose
- **`checkHealthPickups()`**: 補上 geometry/material dispose（ammo/grenade 已有）
- **`datalog.js` collect**: 補上 group traverse dispose
- **`targetDummy:_flashBody()`**: dispose old material 後再 clone
- **`waveSystem`**: 新增 `reset()` 方法

**UI 修正**
- **`#boss-health-container` 與 `#reload-indicator` 重疊**: 均為 `bottom:80px`、z-index:15。boss bar 改為 `bottom:110px`

**安全檢查**: 無 XSS 向量（所有 innerHTML 使用硬編碼文字）、無暴露金鑰、無 eval

### Build
- 29 modules, 873 KB, 0 errors, 0 warnings (clean build)

### 已知待辦（上傳前可選處理）
- `public/models/` 有 ~10 個未使用的 GLB 檔案（~30MB），遊戲全用程式化建模，可刪除縮小套件

## 2026-07-19 Session (BGM Final) — 音量・速度・延音三輪修正

### Changes
- **Master gain 2.0x + normalize to 0.98**: clip 後 normalization 確保接近 0dB
- **audio.js 音量拉滿**: `audioEl.volume` 0.8→1.0, `gain.gain` 0.8→1.0
- **前奏不再小聲**: 移除 `sectionFactor` 漸進音量、移除 pad 6s fadeIn（intro 與 full 同音量）
- **第一輪（音符過短）**: lead decay `Math.exp(-t*15)`、音長 0.15s → 使用者反應「節奏太快」
- **第二輪修正**: BPM 105→**95**（普通）、120→**105**（boss）；lead spacing 0.3→**0.38s**；decay `Math.exp(-t*15)`→`Math.exp(-t*8)`；音長 0.15→**0.35s**
- **琶音放慢**: spacing 0.15→**0.2s**、decay `Math.exp(-t*12)`→`Math.exp(-t*10)`
- **WAV 重新生成**: 兩個檔案各 ~6.8 MB，build 通過

### 使用者回饋記錄
1. 「BGM太小聲、前奏太小聲、旋律太拖（恐怖感）」→ 整體音量↑、前奏↑、音符縮短
2. 「節奏太快，拖延可以不要太長」→ BPM↓、適度延音、音符不拖

## 2026-07-18 Session (Bug Fixes) — 暫停恢復 · 訓練退出

### Bug Fixes
- **暫停後無法恢復** (`index.html`): `#training-exit-btn` 元素在 HTML 中缺失，導致 `onPointerLockChange()` 嘗試 `document.getElementById('training-exit-btn').style.display = ...` 時抛出 null reference error，`this.paused = true` 永遠不會被執行。結果：遮罩顯示但 `paused` 仍是 `false`，角色持續移動。修正：在 blocker 的 `.title-area` 內加入缺失的 `<button id="training-exit-btn">` 元素
- **訓練模式右上角退出按鈕無效** (`index.html`): `#training-exit-hud` 在 `#hud`（`pointer-events: none`）內，沒有覆寫 `pointer-events: auto`，點擊事件到不了按鈕。修正：加入 `pointer-events: auto` CSS 屬性
- **暫停畫面缺退出訓練按鈕** (`index.html`): `#training-exit-btn` 的 CSS 和 JS 都寫好了但 HTML 缺元素，現在補上
- **多餘 `</div>` 標籤** (`index.html`): 移除 blocker 後方多餘的 `</div>`

### Build
- 29 modules, ~852 kB, 0 errors

---

## 2026-07-18 Session (Collision Fix) — 碰撞盒全面修正 · 最終 Boss 強化

### Changes
- **碰撞盒策略徹底反轉** (`level1-5.js:computeCollisionBoxes`): 移除所有裝飾物的自動碰撞過濾迴圈（原本嘗試以 y>0.6 等啟發式過濾，導致天空粒子 `THREE.Points` 的 `Box3.setFromObject` 算出全場包圍盒，所有關卡完全無法移動）。改回只處理 `this.walls`
- **結構物碰撞手動加入**:
  - `level1:buildSupportColumns()` — 3 段主柱體 Mesh 加入 `this.walls`
  - `level2:buildServerRacks()` — 機櫃主體 Mesh 加入 `this.walls`
  - `level3:buildCoolantTanks()` — 已存在 `this.walls.push(body)`
  - `level5` — 祭壇階梯/石柱、巨石碑主體已存在 `this.walls`
- **Level3 BOSS 重疊修正** (`game.js:_spawnShieldGuardian`): BOSS 生成位置從 (0,0,0) 改為 (6,0,6)，不再與玩家起點重疊

### SignalCore 最終 Boss 強化
- **HP** 200 → 500，血量條更長
- **6 種攻擊模式**:
  1. **Aimed Shot** (全階段) — 指向性射擊，P1:1發/P2:2發/P3:3連發
  2. **Orbital Burst** (P2+) — 軌道環放射狀彈幕，每環 8-12 發
  3. **Pulse Wave** (P2+) — 擴散衝擊波，擊中時造成傷害
  4. **Summon Minions** (P2+) — 召喚 Rusher/PatrolBot，P3 數量與強化增加
  5. **Vortex Pull + Explosion** (P3) — 將玩家拉向核心後大爆炸 (20傷害)
  6. **Phase Nova** (過場) — 轉階段時 360° 放射狀彈幕
- **冷卻時間隨階段縮短**，射程增加至 40

### Bug fixes
- **敘事系統交錯鎖定** (`narrative.js:_advance`): `_close()` 的 `_active = false` 設在 1500ms 非同步計時器內，導致連續呼叫 `show()`（如第三關的關卡敘事 → BOSS簡介）被 `if (this._active) return` 擋住。BOSS簡介永遠不會顯示，`transitioning` 永遠為 true，玩家無法操作。修正：在呼叫 callback 之前立即設 `this._active = false`

### ShieldGuardian（第三關 BOSS）強化
- **HP 120→250 + 護盾 80→120**，速度/傷害/射速全面提升
- **狂怒模式**（HP < 50%）: 速度 2.5、射速 0.6s、雙連發砲擊、傷害 18
- **衝鋒攻擊**: 以 12m/s 朝玩家突進，近身造成傷害
- **召喚小兵**: 狂怒後每 12s 召喚強化 Rusher

### SignalCore HP 500→800

### Build
- 29 modules, ~835 kB, 0 errors

## 2026-07-18 Session (Final) — 碰撞盒修正 · 關卡重排 · 素材重繪 · 雷射誤擊

### Changes
- **碰撞盒過濾修正** (`level1-5.js:computeCollisionBoxes`): 原本 `y>0.2` 門檻太低導致地面碎塊阻擋玩家。改為 `y>0.6 || (x>0.8 && z>0.8 && y>0.3)` 並加上 `dec.isPoints` 跳過 — 每個關卡 `buildSky()` 的 300 顆粒子 (`THREE.Points`) 被 `Box3.setFromObject` 算出全場包圍盒，使所有關卡完全無法移動
- **雷射誤擊修正** (`sniper.js:258`): 紅色雷射線被子彈 raycaster 誤判擊中，新增 `raycast = () => {}` 跳過
- **關卡順序重排** — 新順序：L1 小兵 → L2 小兵 → L3 BOSS(壁壘守護者) → L4 小兵 → L5 BOSS(訊號核心)。對應調整：LEVEL_CLASSES/NARRATIVE_LEVELS/LEVEL_NAMES/`_setupWaves` case/wave 清場條件
- **所有 Emoji 替換為 CSS/SVG 繪製圖示** — HUD/按鈕/懸浮/波次提示/敵情面板/結尾畫面，共約 20+ 處全數取代
- **敵情面板 & 訓練提示加長** — 四種敵人皆有 SVG 手繪 icon + 詳細描述 + 戰術提示

### Build
- 29 modules, ~829 kB, 0 errors

## 2026-07-18 Session (Late) — Training Mode / 射擊場

### 新功能：訓練模式
- 選擇「訓練模式」不再只是數值減半，而是載入專屬**射擊場地圖**
- 寬敞室內場地（60×60），有天花板照明、地面格線、距離標示柱（5m~25m）
- **8 個靜態靶**：圓形靶面 + 靶心 + 靶環，分布在 8m~20m 距離
- **4 個動態靶**：左右往復平移（速度 2.5，範圍 ±4m）
- 擊中靶子：白色閃光回饋 → 靶子隱藏 → 1.2 秒後復位
- **無限子彈**：所有武器 reserveAmmo = Infinity
- 跳過開場劇情、跳過波次系統、跳過死亡（不會遊戲結束）
- 射擊場沒有敵人傷害、沒有撿拾物

### 檔案
- **新增** `src/enemies/targetDummy.js`：TargetDummy 類別，支援靜態/動態模式、擊中閃光、自動重生
- **新增** `src/levels/trainingRange.js`：TrainingRange 場地（牆、地板、天花板、照明、距離標記、靶子生成）
- **修改** `src/core/game.js`：`start()` 檢測 `difficulty === 'easy'` 時導入 TrainingRange，跳過一般遊戲流程
- **修改** `src/core/weapon.js`：`WeaponBase.shoot()` 與 `BurstRifle.fireBurst()` 加入 `mesh.visible` 過濾，防止射中隱藏中的靶子

### 子彈穿牆修正
- **所有玩家武器**（手槍、步槍）：`WeaponBase.shoot()` 與 `BurstRifle.fireBurst()` 加入 `level.walls` raycast — 若牆壁撞擊點比敵人更近則阻擋子彈
- `WeaponManager.shoot()` 與所有武器 `shoot()` 方法新增 `level` 參數，完整傳遞牆壁資料
- 狙擊手原有 `hasLineOfSight()` 已包含 `level.collisionBoxes` 碰撞檢測，不加牆仍有防護

### Bug 修正
- **敘事中誤射**（game.js `onMouseDown`）：加入 `this.narrative.isActive() || this.transitioning` 檢查，關卡間文字說明時點擊不會發射子彈
- **devMode magSize**（game.js:394）：animate 循環中的 devMode 補彈也改為 `magazineSize`（之前漏修此處）

### 難度平衡
- **全體敵方傷害下調**：patrolBot 7→5, rusher 4→3, sniper 15→12
- **rusher 行動模式**：速度 4.5→3.5，側移擺動係數從 1.5/1.0 降至 0.8/0.6 — 更直線衝鋒、更容易命中
- **Level2 最終波**（case 1, 波次 5/5）重新平衡：rusher 3→2 且移除 dmgMult、sniper 2→1 且 hpMult 1.2→1.1、patrolBot hpMult 1.4→1.2 — 敵方數量從 7 降為 5

### Bug Fixes
- **Q key**: now requires `this.enemies.length === 0` to advance (prevents skipping uncleared levels)
- **M key**: now locked behind `this.devMode` (was accidentally accessible to all players)
- **BurstRifle impact sparks** (`weapon.js:613`): added `this.createImpactSpark(hits[0].point)` to `fireBurst()` — rifle now produces orange (`0xff8800`) bullet impact particles like the pistol
- **Pause/unpause pointer lock** (`game.js:856-859`): removed 50ms `setTimeout` around `lockPointer()` call in `resumeFromPause()` — was breaking user gesture chain, causing pointer lock to fail silently on resume

### BGM Redesign — `playBGMLayer()`
- **Super-saw pad**: 7 detuned sawtooth oscillators (±8/±16/±24 cents, Q=2.0) for classic rich pad sound
- **Warm sine pad**: 4 sine voices (root, 3rd, 5th, octave) with dedicated lowpass filter
- **Filter envelope**: pad filter frequency jumps to 700Hz on chord change, then sweeps back to 250Hz over 2.8s — creates breathing motion
- **Arpeggio**: 8-note pattern per trigger, wider range (root → 5th → 3rd → 5th↑ → 3rd → 5th → octave → 5th)
- **Lead melody**: 8-note phrase with wider intervals descending from 5th↑ back to root
- **Bass filter sweep**: lowpass filter opens to 400Hz then closes to 50Hz per note for more attack
- **Timing**: arp on beats 8/14, lead on beats 5/13 (shifted from 6 for better flow)

## 2026-07-18 Session (Late) — BGM Boost & Sniper Visibility

### Changes
- **BGM dedicated boost node** (`audio.js`): added `_bgmBoost` gain node (1.8×) between all BGM sources and `masterGain`. All `playBGMLayer`, `playEndingBGM`, and `playBGMFile` connections rerouted through `_bgmBoost` → `masterGain` → destination. SFX unaffected (still direct to `masterGain`)
- **BGM component gains doubled again**: subGain 0.3→0.5, pad oscillator mix 0.15/3→0.4/3, padGain 0.35→0.55, pad2 oscillator 0.1/2→0.2/2, pad2Gain 0.2→0.35, chord oscillator 0.2/2→0.35/2
- **Sniper laser sight** (`sniper.js`): red `LineBasicMaterial` beam extending 100 units from gun muzzle, red glowing `SphereGeometry` dot at muzzle point. Laser opacity pulses faster in chase state
- **Sniper visor glow pulse**: visor/lens `emissiveIntensity` oscillates — slow pulse (×0.003) in patrol, fast pulse (×0.006) in chase

### Active
- BGM volume should now be significantly louder (dedicated 1.8× boost on top of component gain increases)
- Sniper now immediately locatable via red laser beam and pulsing visor glow

## 2026-07-17 Session — Major Optimization Pass

### Goal
Increase play time, improve UX, raise visual polish across the board.

### Pass 1 — Content & Features
- **Weapon bob** (`weapon.js:83-104`): sine oscillation on X rotate + Y position while moving, phase driven by player movement. Weapon now subtly sways when walking/running.
- **Sprint FOV** (`player.js:110-115`): camera FOV smoothly transitions 75→85 when sprinting, giving a sense of speed.
- **Hit marker** (`game.js:242-244`): crosshair expands on enemy hit (already had CSS class, now actually triggered from `onShoot` callback).
- **Wave expansion** (`game.js:286-318`):
  - Level1 (idx 0): converted from free-roam to 4-wave system (rusher test → patrol → mixed → sniper+rusher)
  - Level2 (idx 1): 3→5 waves (added elite wave + extra mixed wave)
  - Level3 (idx 2): 4→6 waves (added聯合攻勢 wave +猛烈反擊 wave)
- **Level1 wave integration** (`game.js:270-276`): reordered `_setupWaves()` before `spawnEnemies` check so Level1 uses wave system instead of free-roam spawns.
- **Clear condition updated** (`game.js:444-453`): simplified to `currentLevel < 3` check for wave system (includes Level1 now), boss levels auto-clear.
- **Bullet impact sparks** (`weapon.js:165-196`): `createImpactSpark()` spawns 5-8 small colored spheres at hit point with physics (gravity + velocity), fade out over 0.3-0.5s.
- **Ambient particles** (`game.js:580-624`): `_createAmbientParticles()` generates 80 floating dust motes with slow drift velocity, wrapping at level bounds. `_updateAmbientParticles()` runs each frame.
- **Controls hint** (`game.js:578-582`): `_showControlsHint()` fades in WASD/Shift/R/1-2 key guide at bottom of screen for 8 seconds on Level1 start. CSS + HTML in index.html.
- **Wave-based ammo/health drops** (`waveSystem.js:35-55`): `_dropPickup()` spawns a bullet pickup or medkit at random position after each wave clears. Uses existing createBulletPickup/createMedkit.

### Pass 2 — Polish & Refinement
- **Build order fix**: moved `_setupWaves()` before `spawnEnemies` check to prevent double-enemy spawning on Level1.
- **Ammo/health pickup import**: fixed ESM import in waveSystem.js (was using `require`/dynamic import, now proper top-level imports).
- **Level1 flow**: after intro narrative ends, Level1 builds with wave system, controls hint fades in for 8s.

### Build
- 27 modules, 2.68s, 793KB JS
- No warnings/errors

### Fixes (after user testing feedback)
- **Sprint changed to RMB**: removed ShiftLeft/ShiftRight handling, added `onMouseDown`/`onMouseUp` tracking `button === 2`, added `mouseup` event listener + `contextmenu` prevention
- **Weapon not visible fix**: `forward` offset was `-0.XX` (placing weapon BEHIND camera in +Z), changed to **`+0.35`** (weapon now IN FRONT of camera in -Z)
- **Q key not working**: removed `this.currentLevel > 0` restriction; also fixed `idx` used before declaration bug in `advanceLevel()` (ReferenceError on all level transitions)
- **M key not working**: moved out of `else if (devMode)` branch into standalone `if` block
- **Frustum culling**: added `mesh.frustumCulled = false` to all 3 weapon types
- **Difficulty tweaks**: patrolBot dmg 12→8, detectionRange 18→14; rusher dmg 8→5; Level1 waves reworked (no snipers, more forgiving); added 2 extra medkits in Level1
- **Weapon position iteration**: final values → right: 0.40, up: -0.12, forward: 0.35, scale: 1.5, rotateX: 0.12, rotateY: 0.35, rotateZ: 0.04

## 2026-07-18 Session — Hand Fix, Grenade Redesign, Final Polish

### Fixes
- **Hand/Forearm direction**: palm + fingers moved back into weapon group (rotate with weapon, naturally wrap grip); forearm extracted to separate scene object with camera-only quaternion → hangs straight down, not tilted by weapon rotation. Forearm positioned behind grip (+Z, toward camera) to simulate arm extending from below
- **Grenade → 脈衝炸彈**: redesigned to futuristic plasma bomb — smooth ellipsoid (0x3a4a5a metallic), cyan glowing equatorial ring + tip sensor + tail fins + nozzle glow. Old pineapple grooves removed
- **Grenade grooves not visible fix**: groove boxes were at radius 0.037 (inside sphere surface 0.040), now at 0.040 (flush with surface) with pure black color (0x000000)

### Balance
- `explosionRadius`: 15 → 10 → **5** (now matches visual sphere max radius ~5.1)

### Polish — Final Optimization Pass
- **Bug fix**: `magSize` → `magazineSize` in devMode activation (`game.js:86`) — was setting `currentAmmo = undefined`
- **Explosion shadow disc**: dark circle on ground at blast center, expands 8× over 400ms, fades out with 0.5→0 opacity
- **Screen shake**: `Player.shake(intensity, duration)` — random Jitter on camera position during explosions. Rusher contact (0.12, 200ms) and grenade explosion (distance-based, up to 0.15)
- **Trail cleanup**: `WeaponBase.reset()` now properly disposes all active `_trails` before clearing array
- **Restart cleanup**: `Game.restart()` now cleans up `_explosions`, `_enemyTrails`, `_datalogTimeout`, `_particleVelocities`, resets `paused` and `devMode`
- **AdvanceLevel cleanup**: same arrays cleaned on level transition (prevents effect carryover)
- **Dead code removed**: nonexistent `enemy.type === 'drone'` contact damage branch removed from `checkEnemyCollisions()`
- **Build**: 27 modules, 805KB, clean build

### Active
- All basic mechanics and polish in place; ready for playtesting

### Changes
- **Bullet pickup alignment fixed**: cone tip y `0.075*s` → `0.0925*s` (sits flush on cylinder)
- **Detailed PulsePistol model**: added slide, muzzle ring, grip ridges, trigger guard, magazine, side panels
- **Detailed BurstRifle model**: added upper receiver, muzzle brake, handguard vents, grip texture, trigger guard, mag base, stock, tactical rail, ejection port, glow strip
- **Grenade weapon** (`weapon.js`): new `Grenade` class — spherical mesh with grooves/lever/pin, parabolic throw with gravity, 3s fuse or ground impact, area explosion (6m radius, 60 base dmg with falloff), visual explosion sphere + point light
- **WeaponManager**: 3 weapons (pistol, rifle, grenade), switch with keys 1/2/3
- **Grenade pickup** (`pickups.js`): `createGrenadePickup()` — sphere body, grooves, lever, pin, orange glow
- **Level integration**: all 5 levels have `buildGrenadePickups()`, `checkGrenadePickups()` in game.js adds 2 ammo to grenade reserve
- **Pickup count reduced**: Level1 health 4→2 (removed 2 extra), Level1 ammo 4→3
- **Controls hint updated**: Shift→右鍵, 1 2→1 2 3
- **Scale**: 1.5→1.3 (slightly smaller weapon on screen)

### Build
- 27 modules, 801 KB, clean build

### Game Flow (Updated)
- Start → Intro narrative → **Level1 (4 waves)** → intermission → **Level2 (5 waves)** → intermission → **Level3 (6 waves)** → intermission → Boss intro → Level4 (Shield Guardian) → intermission → Level5 (Signal Core) → ending → results

## 2026-07-16 Session

### Completed
- **NarrativeScreen** (`src/ui/narrative.js`): reusable text intermission overlay with fade in/out, page progression, key-to-continue flow, auto-cleanup
- **DataLog collectible** (`src/core/datalog.js`): 7 lore entries (`log_01` to `log_07`) with floating glow-panel mesh, Box3 collision, rotation+bob animation, per-level spawning, collect callback
- **Narrative integration** (`src/core/game.js`):
  - `_buildCurrentLevel()` extracted as reusable level builder
  - `_spawnDatalogPickups()` generates 1 data log per level
  - Opening narrative (`NARRATIVE_INTRO`, 4 pages) plays before level 1
  - Level-specific narrative (`NARRATIVE_LEVELS`, 2-3 pages each) plays between levels via `advanceLevel()`
  - `checkDataLogs()` runs in animate loop for proximity detection
  - `showDatalogPopup()` displays collected log name+text for 5s
  - Game logic (player/enemy updates) skipped during active narrative
  - Key handler returns early when narrative is active
  - Pointer lock change skips pause UI during narrative
- **Datalog popup UI**: CSS + HTML element in `index.html` (centered top, cyan border, auto-hide)
- **Build**: compiles cleanly (23 modules, 0 errors)

## 2026-07-19 Session — Ending Cutscene Redo, Boss Balance, Bug Fixes

### Ending Cutscene Redo (`game.js`)
- **Camera**: replaced static pan-to-center + slow rotation with **dynamic orbit** — camera circles the player at radius 3-4.5m (sinusoidal), subtle Y bob, continuously looks at player position
- **Particles**: 60 floating cyan spheres drift in orbital paths with varying radius, speed, and height, opacity pulses per particle for a "data echo" atmosphere
- **Text reveals**: faster timing (title at 2s, sub at 4.5s, detail at 6.5s, report at 8.5s, credits at 11s, final line at 13s, buttons at 15s, auto-skip at 20s)
- **Buttons**: use `overlay.querySelector` (not `getElementById`), added `mousedown` skip handler for clicking anywhere to dismiss
- **Cleanup**: `remove()` instead of `removeChild()`, particles properly `scene.remove()` + `dispose()` geometry/material

### Bug Fixes
- **Restart button**: `main.js` blocker handler now matches `'點擊開始'` text in addition to existing matches
- **Narrative check in `_showFinalEndingOverlay`**: removed `this.narrative.isActive()` check from skip (no longer needed)

### Build
- 29 modules, 860 KB, clean build

## 2026-07-19 Session — SignalCore Balance, Spawn Fix, Level Skip Debug

### SignalCore (`signalCore.js`)
- **Phase 1 攻擊強化**: aimed shot 改為 2 發連射（原 1 發）、射速 0.8s（原 1.8s）、基礎 speed 22→26（原 15→18），散佈稍微增加讓彈幕更豐富
- **新增追蹤光球** (`_fireTrackingOrbs`): 每 3.5/3.0/2.5 秒發射 3/4/5 顆 cyan 追蹤彈，具備 lerp 導向玩家 + 追蹤強度隨時間遞減，取代部分全頻攻擊
- **全頻攻擊大幅降低頻率**: orbitalBurst 9→7s（原 4.5→3）、pulseWave 10→8s（原 7→4）、summon 固定 15s（原 9→5）、missile 14s（原 5）、laser 8s（原 4）、vortex 14s（原 12）
- **Phase 2/3 回歸單一重型攻擊**（不再同時觸發所有 attack type），改為以追蹤光球 + aimed shot 為主、重型攻擊為輔
- **近身傷害範圍** 8→6m

### 玩家出生位置與面對方向 (`game.js`)
- **Shield Guardian（idx 2）**: 出生從 (-10, -10) → (0, -16)，直接面對 Boss 位置 (4, 0, 0)
- **SignalCore（idx 4）**: 出生從 (-12, -12) → (0, -16)，直接面對 Boss 位置 (0, 0, 0)
- 訓練場方向已正確（yaw = -π/2 朝向 +X 靶區）

### Debug log 加入
- `advanceLevel()`: 記錄 prev/next level index、cleanup 開始、build level class name
- M/Q key skip handlers: 記錄 currentLevel、transitioning 狀態、enemies 數量

### Build
- 29 modules, 861 KB, clean build
- Level2: 3 waves, Level3: 4 waves, Level4: Shield Guardian boss, Level5: 3-phase Signal Core boss

### Known Issues
- Level4 shield guardian might run out of arena bounds on chase — needs patrol area clamp
- SignalCore phase transitions have short invuln period (1.5s) that's hard to notice
- Ending BGM oscillators have no scheduled stop time; rely on stopBGM() cleanup

## 2026-07-16 Session (Polish)

### Tweaks
- **Level2 server rack spacing**: `offset * 1.5` → `* 2.8`, rack rows spread wider, walkways moved away from racks to prevent overlap
- **Bullet damage reduced**: default pistol 10→9, burst rifle 15→13, backup pistol 9→8 for slightly longer engagement pacing
- **BGM enrichment**: added 4 more chords to progression (8→12), LFO-modulated pad lowpass filter (0.08Hz sine, ±60Hz), second sine pad layer panned right with octave-up doubled chord root, feedback delay on arpeggio (280ms, 0.25 gain), lead melody phrase on beat 6 of every bar, stereo pan for pad layers (L/R ±0.3), drums centered

### Bug Fixes
- **Level4 boss not spawning / can't progress**: duplicate `case 3:` in `_setupWaves()` switch caused Shield Guardian code to be dead code (JavaScript matches first case only). Also clear condition used `currentLevel < 4` putting boss level into wave-system check. Fixed: removed duplicate, routed case 3 → Shield Guardian, case 2 → Level3 proper waves, changed clear condition to use `enemies.length === 0` for `currentLevel >= 3` (boss levels) instead of wave system check.

### Build
- Clean compile, 27 modules, 2.59s

## 2026-07-16 Session (Expansion)

### Bug Fixes
- **pitchMultiplier → 1.0**: vertical mouse speed now equals horizontal (`player.js:27,49`)
- **Camera teleport fix**: first 3 frames after pointer lock are discarded to prevent stale `movementX/Y` from causing sudden rotation jumps (`player.js:53-54`)
- **PatrolBot contact damage removed**: only rusher self-destruct and drone proximity deal contact damage; patrolBot relies on bullets only (`game.js:555-565`)
- **PatrolBot bullet damage increased**: 5 → 12 to compensate for losing contact damage (`patrolBot.js:10`)

### Expansion Completed
1. **NarrativeData extraction** (`src/core/narrativeData.js`): 4 narrative arrays (intro, 5 level texts, boss intro, ending) moved out of `game.js` for clean separation
2. **WaveSystem** (`src/core/waveSystem.js`): generic wave manager with defined waves, countdown between waves, spawn area control, per-enemy HP/damage multipliers, wave messages
   - Level2: 3 waves (patrolBot patrol → rusher rush → mixed)
   - Level3: 4 waves (reinforced patrol → fast strike → triple sniper → final wave)
   - Level4: Shield Guardian boss (single-entity wave)
   - Level5: 3-phase Signal Core boss (spawned directly)
3. **ShieldGuardian boss** (`src/enemies/shieldGuardian.js`): 120 HP, 80-shield energy barrier that blocks frontal damage (dot > -0.3 from front), shield recharges after 5s downtime, fires 15-damage cannon projectiles with visible trail spheres and impact explosion FX
4. **SignalCore 3-phase boss** (`src/enemies/signalCore.js`): 200 HP, 3 phases at 66% and 33% HP:
   - Phase 1: stationary icosahedron core, orbiting torus rings, single projectile, cyan glow
   - Phase 2: dual projectiles with slight spread, magenta glow, faster fire rate (1.3s cd)
   - Phase 3: triple rapid-fire spread, proximity damage (6 DPS within 8m), red glow, core destabilization pulse animation
   - Phase transitions trigger 1.5s invulnerability with core spin animation
   - Projectiles are Three.js sphere meshes with physics update, lifetime, player hit detection
5. **Boss HUD**: health bar with dynamic label (封鎖單位 / 訊號核心), proper show/hide on boss death
6. **Kill feed**: names added for `shieldGuardian` → 壁壘守護者, `signalCore` → 訊號核心

### Game Flow (Full)
- Start → Intro narrative (4 pages) → Level1 (free roam, basic enemies) → intermission → Level2 (3-wave system) → intermission → Level3 (4-wave system) → intermission → Boss intro narrative → Level4 (Shield Guardian boss fight) → intermission → Level5 (3-phase Signal Core boss) → ending sequence → results

### File Changes
- **Modified**: `game.js` (wave/boss integration, clear conditions, imports), `player.js` (teleport fix, pitch=1.0), `patrolBot.js` (damage 12), `hud.js` (boss names), `index.html` (wave/boss HUD elements + CSS)
- **Created**: `narrativeData.js`, `waveSystem.js`, `shieldGuardian.js`, `signalCore.js`

## 2026-07-15 Session

### Completed
- **Platform edge transition fix**: `player.js` elevatedPlatforms check `< hs` → `<= hs`; all 5 levels stairAreas `hd` +0.1 → +0.25
- **BGM synth rewrite**: sub-bass drone, 3 detuned sawtooth pad, 2 triangle chord voices, 4-on-floor kick+click, snare, closed/open hi-hat, arpeggio, 8-chord progression, proper volume balance
- **Scene decoration**: `buildCeilingLights()` (4 pendant fixtures), `buildFloorGlow()` (4 glow strips), `buildConduits()` (wall pipes with glow joints to levels 2-5), `buildTerminals()` (computer terminals to levels 3-5)
- **Railing collision fix**: z-side rail collision boxes removed entirely (were at platform center, blocking stairs); x-side rail collision boxes repositioned to actual rail location
- **Level5 spawn fix**: ritual platform base moved from `this.walls` to `this.decorations`
- **BGM MP3 robustness**: `playBGMFile()` retries 3 times (500ms interval) on failure before falling to synth
- **Tail flame effects**: PatrolBot (2 thrusters, double cone), Rusher (1 thruster, double cone aligned to tilt)
- **Bunker/column decoration**: bunker wall top trim, vertical glow strips, corner dots, glow dots; column corner panels, corner bolts, mid-band glow ring
- **Enemy model detail** (all 3 types): split lines, grills, vents, armor plates, rivets, etc.
- **Ending sequence enhancement**: phased multi-stage narrative overlay with 6 stages (title at 2.5s, sub at 5s, detail at 7s, stats report at 9s, credits at 12s, final line at 15s → results at 18s); added `playEndingBGM()` with pad+bass+bell+noise ambient drone; stats display (kills, time, status); CSS for all new ending elements
- **Ending BGM rewrite**: sine pad chords + filter sweep, sine bass drone, triangle arp, lowpass noise — based on playBGMLayer style
- **Game BGM always uses synth**: `start()` calls `playBGMLayer()` directly (not MP3)
- **Main menu title**: enlarged to 4.5rem, stronger double-layer text-shadow glow
- **Columns (level1) completely redesigned**: tiered shaft (3 segments), vertical fluting grooves, 3-tier capital + 3-tier base with glow trim, corner panel/bolt arrays at 4 heights, double glow waist bands, vent grills, transparent top scan ring
- **BGM drum volume reduced**: kick 0.7→0.4, click 0.4→0.25, snare 0.2→0.12, snare tone 0.12→0.07, hat 0.08/0.04→0.05/0.025
- **Walls enhanced (all 5 levels)**:
  - Level1: vertical divider strips + data access panels with cyan LEDs
  - Level2: server-green mid-band line + vertical dividers + access panels with green LEDs
  - Level3 (bare→enhanced): teal baseboard + crown glow trim + vertical dividers
  - Level4 (bare→enhanced): amber baseboard + crown + warning mid-band + vertical dividers
  - Level5: dim red crown molding + dark vertical dividers
- **Build**: 750KB JS, 2.7s build time

### Active
- **Step 2**: building narrative intermission system (done) — need to add data-log collectibles to all 5 levels, test flow

### Known Issues
- Ending BGM oscillators (bassOsc, padOscs) have no scheduled stop time; rely on `stopBGM()` cleanup — acceptable for ~18s sequence
