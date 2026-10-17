const JOY_RADIUS = 52
const SPRINT_THRESHOLD = 0.72
const TOUCH_SENSITIVITY = 0.0034

export function isTouchDevice() {
  if (window.matchMedia) {
    if (window.matchMedia('(pointer: coarse)').matches) return true
    if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return true
    return false
  }
  return navigator.maxTouchPoints > 0 && !window.matchMedia
}

export function initTouchControls(game) {
  if (!isTouchDevice()) return false

  const rotOverlay = document.getElementById('rotate-overlay')
  const joyZone = document.getElementById('joystick-zone')
  const aimZone = document.getElementById('aim-zone')
  const joyBase = document.getElementById('joystick-base')
  const joyThumb = document.getElementById('joystick-thumb')
  const btnFire = document.getElementById('btn-fire')
  const btnJump = document.getElementById('btn-jump')
  const btnWeapon = document.getElementById('btn-weapon')
  const btnMenu = document.getElementById('btn-menu')
  const ammoPanel = document.getElementById('ammo-panel')
  const levelHint = document.getElementById('level-hint')
  const pauseMenu = document.getElementById('pause-menu')

  if (!joyZone || !aimZone) return false

  let joyTouchId = null
  let joyOrigin = { x: 0, y: 0 }
  let aimTouchId = null
  let aimLast = { x: 0, y: 0 }
  let pausedByRotation = false

  game.isTouch = true
  game.touchFiring = false
  game.touchSensitivity = TOUCH_SENSITIVITY
  document.body.classList.add('touch-mode')

  const canControl = () =>
    game.running && !game.paused && !game.transitioning &&
    !(game.narrative && game.narrative.isActive()) && !game.endingSequence &&
    game.player && game.player.health > 0

  /* ---------------- 搖桿 ---------------- */
  const resetJoystick = () => {
    joyTouchId = null
    if (joyBase) joyBase.style.display = 'none'
    if (joyThumb) joyThumb.style.display = 'none'
    const p = game.player
    if (p) {
      p.touchMoveX = 0
      p.touchMoveY = 0
      p.touchMoveMag = 0
      p.touchSprint = false
      p.touchActive = false
    }
  }

  joyZone.addEventListener('touchstart', (e) => {
    if (joyTouchId !== null) return
    const t = e.changedTouches[0]
    joyTouchId = t.identifier
    joyOrigin = { x: t.clientX, y: t.clientY }
    joyBase.style.display = 'block'
    joyThumb.style.display = 'block'
    joyBase.style.left = t.clientX + 'px'
    joyBase.style.top = t.clientY + 'px'
    joyThumb.style.left = t.clientX + 'px'
    joyThumb.style.top = t.clientY + 'px'
    e.preventDefault()
  }, { passive: false })

  joyZone.addEventListener('touchmove', (e) => {
    if (joyTouchId === null) return
    let t = null
    for (const c of e.changedTouches) if (c.identifier === joyTouchId) t = c
    if (!t) return

    let dx = t.clientX - joyOrigin.x
    let dy = t.clientY - joyOrigin.y
    const dist = Math.hypot(dx, dy)
    const clamped = Math.min(dist, JOY_RADIUS)
    if (dist > 0.001) {
      dx = (dx / dist) * clamped
      dy = (dy / dist) * clamped
    }
    joyThumb.style.left = (joyOrigin.x + dx) + 'px'
    joyThumb.style.top = (joyOrigin.y + dy) + 'px'

    const mag = clamped / JOY_RADIUS
    const p = game.player
    if (p) {
      p.touchMoveX = dx / JOY_RADIUS
      p.touchMoveY = -dy / JOY_RADIUS
      p.touchMoveMag = mag
      p.touchSprint = mag >= SPRINT_THRESHOLD
      p.touchActive = true
    }
    e.preventDefault()
  }, { passive: false })

  const joyEnd = (e) => {
    if (joyTouchId === null) return
    for (const c of e.changedTouches) {
      if (c.identifier === joyTouchId) { resetJoystick(); break }
    }
  }
  joyZone.addEventListener('touchend', joyEnd)
  joyZone.addEventListener('touchcancel', joyEnd)

  /* ---------------- 轉視角 ---------------- */
  aimZone.addEventListener('touchstart', (e) => {
    if (aimTouchId !== null) return
    const t = e.changedTouches[0]
    aimTouchId = t.identifier
    aimLast = { x: t.clientX, y: t.clientY }
    e.preventDefault()
  }, { passive: false })

  aimZone.addEventListener('touchmove', (e) => {
    if (aimTouchId === null) return
    let t = null
    for (const c of e.changedTouches) if (c.identifier === aimTouchId) t = c
    if (!t) return
    const dx = t.clientX - aimLast.x
    const dy = t.clientY - aimLast.y
    aimLast = { x: t.clientX, y: t.clientY }
    const p = game.player
    if (p && p.look) p.look(dx, dy, game.touchSensitivity || TOUCH_SENSITIVITY)
    e.preventDefault()
  }, { passive: false })

  const aimEnd = (e) => {
    if (aimTouchId === null) return
    for (const c of e.changedTouches) {
      if (c.identifier === aimTouchId) { aimTouchId = null; break }
    }
  }
  aimZone.addEventListener('touchend', aimEnd)
  aimZone.addEventListener('touchcancel', aimEnd)

  /* ---------------- 按鈕 ---------------- */
  const bindHold = (el, onStart, onEnd) => {
    if (!el) return
    const start = (e) => {
      e.preventDefault()
      e.stopPropagation()
      el.classList.add('tb-on')
      if (onStart) onStart()
    }
    const end = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation() }
      el.classList.remove('tb-on')
      if (onEnd) onEnd()
    }
    el.addEventListener('touchstart', start, { passive: false })
    el.addEventListener('touchend', end)
    el.addEventListener('touchcancel', end)
    el.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); if (onStart) onStart(); el.classList.add('tb-on') })
    el.addEventListener('mouseup', () => { if (onEnd) onEnd(); el.classList.remove('tb-on') })
    el.addEventListener('mouseleave', () => { if (onEnd) onEnd(); el.classList.remove('tb-on') })
  }

  bindHold(btnFire,
    () => { if (canControl()) game.touchFiring = true },
    () => { game.touchFiring = false }
  )

  bindHold(btnJump,
    () => { if (game.player) game.player._jumpPressed = true },
    () => { if (game.player) game.player._jumpPressed = false }
  )

  bindHold(btnWeapon,
    () => {
      if (!game.weaponManager) return
      const next = (game.weaponManager.currentIndex + 1) % game.weaponManager.weapons.length
      game.weaponManager.switchTo(next)
    },
    null
  )

  bindHold(btnMenu, () => { game.openPauseMenu() }, null)

  /* 彈藥面板 = 手動換彈 */
  if (ammoPanel) {
    ammoPanel.addEventListener('touchstart', (e) => {
      e.preventDefault(); e.stopPropagation()
      const w = game.weaponManager && game.weaponManager.currentWeapon
      if (w && !w.isReloading && w.currentAmmo < w.magazineSize && w.reserveAmmo > 0) w.reload()
    }, { passive: false })
  }

  /* 關卡推進提示 = 點擊前往下一層 */
  if (levelHint) {
    levelHint.addEventListener('touchstart', (e) => {
      e.preventDefault(); e.stopPropagation()
      if (game.clearReady && !game.transitioning && !game.endingSequence && game.player && game.player.health > 0) {
        game.clearReady = false
        game.transitioning = true
        game.hud.showLevelAdvanceHint(false)
        game.advanceLevel()
      }
    }, { passive: false })
    levelHint.addEventListener('click', (e) => {
      e.stopPropagation()
      if (game.clearReady && !game.transitioning && !game.endingSequence && game.player && game.player.health > 0) {
        game.clearReady = false
        game.transitioning = true
        game.hud.showLevelAdvanceHint(false)
        game.advanceLevel()
      }
    })
  }

  /* ---------------- 暫停選單按鈕 ---------------- */
  const pmResume = document.getElementById('pm-resume')
  const pmRestart = document.getElementById('pm-restart')
  const pmQuit = document.getElementById('pm-quit')
  if (pmResume) pmResume.addEventListener('click', () => game.closePauseMenu())
  if (pmRestart) pmRestart.addEventListener('click', () => {
    game.closePauseMenu()
    game._retryLevel = game.currentLevel
    game.restart()
  })
  if (pmQuit) pmQuit.addEventListener('click', () => {
    game.closePauseMenu()
    game._retryLevel = 0
    game.restart()
  })

  /* ---------------- 橫豎螢幕 ---------------- */
  const checkOrientation = () => {
    const portrait = window.innerHeight > window.innerWidth
    if (rotOverlay) rotOverlay.style.display = portrait ? 'flex' : 'none'
    if (portrait) {
      game.touchFiring = false
      resetJoystick()
      if (game.running && !game.transitioning && !game.endingSequence && !game.paused) {
        pausedByRotation = true
        game.paused = true
      }
    } else if (pausedByRotation) {
      pausedByRotation = false
      if (pauseMenu && pauseMenu.style.display !== 'flex') game.paused = false
    }
  }

  window.addEventListener('resize', checkOrientation)
  window.addEventListener('orientationchange', () => setTimeout(checkOrientation, 120))
  if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', () => setTimeout(checkOrientation, 120))
  }
  checkOrientation()

  game._touchReset = () => {
    game.touchFiring = false
    resetJoystick()
    aimTouchId = null
    if (btnFire) btnFire.classList.remove('tb-on')
    if (btnJump) btnJump.classList.remove('tb-on')
  }

  return true
}
