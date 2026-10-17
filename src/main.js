import * as THREE from 'three'
import { Game } from './core/game.js'
import { initTouchControls } from './core/touchControls.js'

const game = new Game()
game.init()
initTouchControls(game)
/* 全域參考：玩家受傷時要能查「現在是不是暫停／劇情中」（魔王的計時器脫離主迴圈） */
window.__szGame = game

/* 一進站就要全螢幕，暫停後點回遊戲也要自動回全螢幕。
   瀏覽器規定一定要有使用者手勢才准切全螢幕，所以常駐監聽第一次任意點擊／按鍵；
   只要當下不在全螢幕就重新申請（點「繼續遊戲」「重新挑戰」都會經過這條路）。 */
const FS_EVENTS = ['pointerdown', 'touchstart', 'mousedown', 'keydown']
let fsPending = false
function requestFullscreenIfPossible() {
  const el = document.documentElement
  if (fsPending || document.fullscreenElement || !el.requestFullscreen) return
  fsPending = true
  el.requestFullscreen({ navigationUI: 'hide' })
    .catch(() => {})
    .finally(() => { fsPending = false })
}
for (const evt of FS_EVENTS) {
  document.addEventListener(evt, requestFullscreenIfPossible, { passive: true })
}
requestFullscreenIfPossible()

document.getElementById('blocker').addEventListener('mousedown', (e) => {
  if (e.button !== 0) return
  if (e.target.closest && e.target.closest('#training-exit-btn')) return
  if (game.audio) game.audio.resumeContext()
  game.lockPointer()
  if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {})
  }
  const flash = document.getElementById('blocker').querySelector('.flash')
  if (flash.textContent === '點擊繼續' || flash.textContent === '按任意鍵繼續' || flash.textContent === '點擊開始') {
    if (game.running) {
      game.resumeFromPause()
    } else {
      game.restartContinue()
    }
  }
})

document.addEventListener('keydown', (e) => {
  if (!game.running || game.transitioning) return
  const blocker = document.getElementById('blocker')
  if (blocker.style.display !== 'none') {
    const flash = blocker.querySelector('.flash')
    if (flash.textContent === '按任意鍵繼續' || flash.textContent === '點擊繼續' || flash.textContent === '點擊開始') {
      if (e.code === 'Escape') return
      e.preventDefault()
      game.lockPointer()
      if (game.audio) game.audio.resumeContext()
      if (game.running) {
        game.resumeFromPause()
      } else {
        game.restartContinue()
      }
    }
  }
})

document.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return
  if (e.target.closest && e.target.closest('#blocker')) return
  if (game.narrative && game.narrative.isActive()) return
  if (!game.running || game.transitioning) return
  game.lockPointer()
  const blocker = document.getElementById('blocker')
  if (blocker.style.display !== 'none') {
    const flash = blocker.querySelector('.flash')
    if (flash.textContent === '按任意鍵繼續' || flash.textContent === '點擊繼續' || flash.textContent === '點擊開始') {
      if (game.audio) game.audio.resumeContext()
      if (game.running) {
        game.resumeFromPause()
      } else {
        game.restartContinue()
      }
    }
  }
})

document.getElementById('restart-btn').addEventListener('click', () => {
  game.restart()
})

document.querySelectorAll('#difficulty-select button').forEach(btn => {
  btn.addEventListener('click', () => {
    if (game.audio) game.audio.resumeContext()
    requestFullscreenIfPossible()
    game.setDifficulty(btn.dataset.diff)
    game.currentLevel = 0
    if (btn.dataset.diff === 'easy') {
      document.getElementById('blocker').style.display = 'none'
      document.getElementById('difficulty-select').style.display = 'none'
      game.trainingEnemy = null
      game.start()
    } else {
      game.start()
    }
  })
})

const SZ_BOSS_KEYS = { boss1: 'sz_boss1', boss2: 'sz_boss2' }
function szUnlocked(key) {
  try { return localStorage.getItem(key) === '1' } catch { return false }
}
function refreshTrainingLocks() {
  for (const [type, key] of Object.entries(SZ_BOSS_KEYS)) {
    const btn = document.querySelector(`.training-btn[data-enemy="${type}"]`)
    if (!btn) continue
    const ok = szUnlocked(key)
    btn.disabled = !ok
    btn.classList.toggle('locked', !ok)
  }
}
refreshTrainingLocks()
const trainingSelectEl = document.getElementById('training-select')
if (trainingSelectEl) {
  new MutationObserver(refreshTrainingLocks).observe(trainingSelectEl, { attributes: true, attributeFilter: ['style'] })
}

document.querySelectorAll('.training-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return
    if (game.audio) game.audio.resumeContext()
    requestFullscreenIfPossible()
    game.selectTrainingEnemy(btn.dataset.enemy)
  })
})

document.getElementById('training-exit-btn').addEventListener('mousedown', (e) => {
  e.stopPropagation()
})
document.getElementById('training-exit-btn').addEventListener('click', (e) => {
  e.stopPropagation()
  game.exitTraining()
})

document.getElementById('training-exit-hud').addEventListener('mousedown', (e) => {
  e.stopPropagation()
})
document.getElementById('training-exit-hud').addEventListener('click', () => {
  game.exitTraining()
})

const pmGuideBtn = document.getElementById('pm-guide-btn')
const pmGuide = document.getElementById('pm-guide')
const hudGuideBtn = document.getElementById('hud-guide-btn')
const pmGuideClose = document.getElementById('pm-guide-close')

function setGuideOpen(open) {
  if (!pmGuide) return
  pmGuide.classList.toggle('open', open)
  if (pmGuideBtn) pmGuideBtn.textContent = open ? '收合指南' : '操作指南'
}
function toggleGuide() {
  setGuideOpen(!(pmGuide && pmGuide.classList.contains('open')))
}
if (pmGuideBtn && pmGuide) pmGuideBtn.addEventListener('click', toggleGuide)
if (hudGuideBtn && pmGuide) hudGuideBtn.addEventListener('click', toggleGuide)
if (pmGuideClose) pmGuideClose.addEventListener('click', () => setGuideOpen(false))
document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyH' && !e.repeat && !e.ctrlKey && !e.metaKey) toggleGuide()
})

/* 左上角指南按鈕跟著 #hud 出現／消失 */
const hudEl = document.getElementById('hud')
const resultsEl = document.getElementById('results-screen')
if (hudEl && hudGuideBtn) {
  const syncGuideBtn = () => {
    const blocked = hudEl.style.display === 'none' ||
      (resultsEl && resultsEl.style.display === 'flex')
    if (hudGuideBtn._blocked === blocked) return
    hudGuideBtn._blocked = blocked
    hudGuideBtn.style.display = blocked ? 'none' : ''
  }
  syncGuideBtn()
  new MutationObserver(syncGuideBtn).observe(hudEl, { attributes: true, attributeFilter: ['style'] })
  if (resultsEl) new MutationObserver(syncGuideBtn).observe(resultsEl, { attributes: true, attributeFilter: ['style'] })
}

/* 開發者模式：主畫面標題 2.5 秒內連點 10 次；「操作指南」按鈕 20 秒內連點 10 次（手機沒有鍵盤，無法用 Konami） */
function activateDevMode() {
  if (game.flags.devMode) return
  game.flags.devMode = true
  if (game.player) game.player.health = game.player.maxHealth
  if (game.weaponManager && game.weaponManager.currentWeapon) {
    const w = game.weaponManager.currentWeapon
    w.currentAmmo = w.magazineSize
    w.reserveAmmo = Infinity
  }
  if (game.hud) game.hud.showDevMode(true)
}

function makeTapCounter(targets, need, windowMs, onDone) {
  const list = (Array.isArray(targets) ? targets : [targets]).filter(Boolean)
  if (!list.length) return
  let taps = 0
  let timer = null
  const hit = () => {
    if (game.flags.devMode) return
    taps++
    clearTimeout(timer)
    timer = setTimeout(() => { taps = 0 }, windowMs)
    if (taps < need) return
    taps = 0
    clearTimeout(timer)
    onDone()
  }
  for (const el of list) el.addEventListener('click', hit)
}

const dsTitle = document.querySelector('#difficulty-select .ds-title')
if (dsTitle) {
  const dsTitleDefault = dsTitle.textContent
  makeTapCounter(dsTitle, 10, 2500, () => {
    activateDevMode()
    dsTitle.textContent = '開發者模式已啟用'
    setTimeout(() => { dsTitle.textContent = dsTitleDefault }, 1800)
  })
}

makeTapCounter([pmGuideBtn, hudGuideBtn], 10, 20000, () => {
  activateDevMode()
  setGuideOpen(false)
  if (pmGuideBtn) {
    pmGuideBtn.textContent = '開發者模式已啟用'
    setTimeout(() => { pmGuideBtn.textContent = '操作指南' }, 1800)
  }
})

window.addEventListener('resize', () => game.resize())

/* 手機瀏覽器會在非手勢狀態把 AudioContext 掛起，任何一次互動都重新喚醒 */
;['pointerdown', 'touchend', 'mousedown', 'keydown', 'click'].forEach(evt => {
  document.addEventListener(evt, () => { if (game.audio) game.audio.resumeContext() }, { passive: true })
})
