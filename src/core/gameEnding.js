import * as THREE from 'three'
import { NARRATIVE_ENDING } from './narrativeData.js'
import { getAllDatalogIds, getDatalogName, getFullDatalogText } from './datalog.js'
import { loadProtagonist, createProtagonist } from './protagonist.js'

const EC = { walkStart: 3.0, walkEnd: 9.5, fadeEnd: 12.0 }

export function addEndingMethods(Game, LEVEL_CLASSES) {

  Game.prototype.startEndingSequence = function() {
    try { localStorage.setItem('sz_boss2', '1') } catch {}
    this.transitioning = false
    this.clearReady = false
    this.endingSequence = true
    this.endingTimer = 0
    this._endingOrbitAngle = 0
    this._endingCinemaDone = false
    this._endingWalkStarted = false

    for (const e of this.enemies) {
      if (e.clearProjectiles) e.clearProjectiles()
    }
    if (this.audio) this.audio.stopBGM()
    if (this.audio) this.audio.playEndingBGM()
    document.getElementById('hud').style.display = 'none'

    /* 攝影機環繞中心：記錄玩家目前位置 */
    this._endingCameraPos = this.camera.position.clone()
    this._endingTarget = this._endingCameraPos.clone()

    /* 資料迴聲粒子 */
    this._spawnEndingParticles()

    /* 進入電影模式（黑邊 + 環繞運鏡） */
    document.body.classList.add('ending-cinema')

    this._startEndingCinema()
    this.enableEndingSequenceControls()
  }

  Game.prototype._spawnEndingParticles = function() {
    for (const p of this._endingParticles) {
      this.scene.remove(p)
      p.geometry.dispose()
      p.material.dispose()
    }
    this._endingParticles = []

    for (let i = 0; i < 70; i++) {
      const geo = new THREE.SphereGeometry(0.05, 6, 6)
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00f2ff,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
      const p = new THREE.Mesh(geo, mat)
      const radius = 2.4 + Math.random() * 5.5
      const angle = Math.random() * Math.PI * 2
      p.userData = {
        radius,
        angle,
        speed: 0.1 + Math.random() * 0.35,
        height: 0.3 + Math.random() * 2.6
      }
      p.position.set(Math.cos(angle) * radius, p.userData.height, Math.sin(angle) * radius)
      this.scene.add(p)
      this._endingParticles.push(p)
    }
  }

  Game.prototype._buildElevatorProp = function() {
    const g = new THREE.Group()
    const dark = new THREE.MeshStandardMaterial({ color: 0x121a22, roughness: 0.75, metalness: 0.45 })
    const glow = new THREE.MeshBasicMaterial({
      color: 0x00f2ff, transparent: true, opacity: 0.45,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    })
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 0.14), dark)
    back.position.set(0, 1.3, -0.7)
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.6, 1.4), dark)
    left.position.set(-1.4, 1.3, 0)
    const right = left.clone()
    right.position.x = 1.4
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.04, 0.34, 1.4), dark)
    lintel.position.set(0, 2.77, 0)
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.5), glow)
    seam.position.set(0, 1.3, -0.62)
    const floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5), new THREE.MeshBasicMaterial({
      color: 0x00f2ff, transparent: true, opacity: 0.14,
      blending: THREE.AdditiveBlending, depthWrite: false
    }))
    floorGlow.rotation.x = -Math.PI / 2
    floorGlow.position.set(0, 0.03, 0.1)
    g.add(back, left, right, lintel, seam, floorGlow)
    return g
  }

  Game.prototype._startEndingCinema = function() {
    this.camera.updateMatrixWorld(true)
    const camDir = new THREE.Vector3()
    this.camera.getWorldDirection(camDir)
    const back = camDir.clone().setY(0).normalize().negate()
    const side = new THREE.Vector3(back.z, 0, -back.x)

    this._endingBack = back
    this._endingSide = side
    this._endingBossPos = this._lastBossPos
      ? this._lastBossPos.clone()
      : this.camera.position.clone().addScaledVector(camDir, 9)

    const boss = this._endingBossPos
    this._endingCamA = boss.clone().addScaledVector(back, 4).addScaledVector(side, 2)
    this._endingCamA.y = 1.75
    this._endingLookA = boss.clone()
    this._endingLookA.y = 1.2
    this._endingCamB = boss.clone().addScaledVector(back, 3.5).addScaledVector(side, 2.5)
    this._endingCamB.y = 2.15

    this._endingHeroStart = boss.clone().addScaledVector(back, 6.5)
    this._endingHeroStart.y = 0
    this._endingHeroEnd = boss.clone().addScaledVector(back, 16.5)
    this._endingHeroEnd.y = 0

    this._spawnEndingExplosion(boss)

    const elevator = this._buildElevatorProp()
    elevator.position.copy(this._endingHeroEnd)
    elevator.lookAt(this._endingHeroStart.x, 0, this._endingHeroStart.z)
    this.scene.add(elevator)
    this._endingElevator = elevator

    this._endingHero = null
    this._endingHeroMixer = null
    loadProtagonist().then((data) => {
      if (!this.endingSequence) return
      const hero = createProtagonist(data)
      hero.position.copy(this._endingHeroStart)
      hero.lookAt(this._endingHeroEnd.x, 0, this._endingHeroEnd.z)
      this.scene.add(hero)
      this._endingHero = hero
      this._endingHeroMixer = hero.userData.mixer
      const a = hero.userData.actions
      if (a.idle) a.idle.play()
      else if (a.run) a.run.play()
      if (this.endingTimer >= EC.walkStart) this._beginEndingWalk()
    }).catch(() => {})

    const fade = document.createElement('div')
    fade.id = 'ending-fade'
    Object.assign(fade.style, {
      position: 'fixed', inset: '0', zIndex: '240',
      background: '#000', opacity: '0', pointerEvents: 'none'
    })
    document.body.appendChild(fade)
    this._endingFade = fade
  }

  Game.prototype._beginEndingWalk = function() {
    if (this._endingWalkStarted || !this._endingHero) return
    this._endingWalkStarted = true
    const a = this._endingHero.userData.actions
    if (a.idle) a.idle.fadeOut(0.3)
    if (a.run) {
      a.run.reset().fadeIn(0.3).play()
      a.run.timeScale = 1.4
    }
  }

  Game.prototype._spawnEndingExplosion = function(pos) {
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 20),
      new THREE.MeshBasicMaterial({
        color: 0xffd9a0, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    )
    flash.position.copy(pos)
    flash.position.y += 1.2
    this.scene.add(flash)
    this._endingFlash = flash

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.09, 8, 44),
      new THREE.MeshBasicMaterial({
        color: 0x00f2ff, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    )
    ring.position.copy(pos)
    ring.position.y += 1.2
    ring.rotation.x = Math.PI / 2
    this.scene.add(ring)
    this._endingRing = ring

    for (let i = 0; i < 4; i++) {
      try { this._createDeathDebris(pos) } catch {}
    }
  }

  Game.prototype._disposeEndingProp = function(key) {
    const m = this[key]
    if (!m) return
    this.scene.remove(m)
    if (m.geometry) m.geometry.dispose()
    if (m.material) m.material.dispose()
    this[key] = null
  }

  Game.prototype._showFinalEndingOverlay = function() {
    if (this._endingOverlay) return
    this.endingTimer = 0

    const overlay = document.createElement('div')
    overlay.id = 'ending-overlay'
    overlay.innerHTML = `
      <div class="ending-line ending-title">訊號仍在</div>
      <div class="ending-line ending-sub">零層核心已停止</div>
      <div class="ending-line ending-report">
        <div style="margin-bottom:10px;color:rgba(0,242,255,0.5);font-size:0.75rem;letter-spacing:0.2em;">作戰報告</div>
        <div class="ending-stat">擊殺數：<span id="end-kills">0</span></div>
        <div class="ending-stat">任務時長：<span id="end-time">0:00</span></div>
        <div class="ending-stat">存活狀態：<span id="end-status">存活</span></div>
      </div>
      <div class="ending-line ending-credits">
        <div style="margin-bottom:6px;color:rgba(0,242,255,0.3);font-size:0.8rem;letter-spacing:0.3em;">— 訊號：零層 —</div>
        <div class="ending-credit-line">Made with Three.js</div>
        <div class="ending-credit-line">Web Audio API</div>
        <div class="ending-credit-line">原型開發 2026</div>
      </div>
      <div class="ending-line ending-final"><span style="display:inline-block;width:8px;height:8px;border:1.5px solid rgba(0,242,255,0.3);margin-right:6px;vertical-align:middle"></span> 任務存檔已記錄</div>
      <div class="ending-line ending-buttons" style="opacity:0;transition:opacity 1s ease;">
        <button id="ending-datalog-btn" style="margin:20px 10px 0 0;padding:12px 30px;background:transparent;border:1px solid rgba(0,242,255,0.3);color:rgba(0,242,255,0.7);font-family:'Courier New',monospace;font-size:0.85rem;letter-spacing:0.15em;cursor:pointer;transition:all 0.3s;pointer-events:auto;">檢索日誌</button>
        <button id="ending-menu-btn" style="margin:20px 0 0 10px;padding:12px 30px;background:transparent;border:1px solid rgba(0,242,255,0.3);color:rgba(0,242,255,0.7);font-family:'Courier New',monospace;font-size:0.85rem;letter-spacing:0.15em;cursor:pointer;transition:all 0.3s;pointer-events:auto;">返回主選單</button>
      </div>
    `
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '300',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0)',
      pointerEvents: 'none',
      fontFamily: "'Courier New', monospace"
    })
    document.body.appendChild(overlay)

    for (const el of overlay.querySelectorAll('.ending-line')) {
      el.style.opacity = '0'
      el.style.transition = 'opacity 1.5s ease'
    }

    const reportEl = overlay.querySelector('.ending-report')
    if (reportEl) {
      reportEl.style.textAlign = 'left'
      reportEl.style.fontSize = '13px'
      reportEl.style.color = '#88bbdd'
      reportEl.style.lineHeight = '1.8'
      reportEl.style.border = '1px solid rgba(0,242,255,0.1)'
      reportEl.style.padding = '14px 22px'
      reportEl.style.background = 'rgba(0,10,20,0.4)'
      reportEl.style.minWidth = '200px'
    }

    const creditsEl = overlay.querySelector('.ending-credits')
    if (creditsEl) {
      creditsEl.style.textAlign = 'center'
      creditsEl.style.fontSize = '11px'
      creditsEl.style.color = '#557799'
      creditsEl.style.lineHeight = '1.6'
    }

    const finalEl = overlay.querySelector('.ending-final')
    if (finalEl) {
      finalEl.style.fontSize = '10px'
      finalEl.style.color = '#335566'
    }

    document.getElementById('end-kills').textContent = this.kills
    const minutes = Math.floor(this.elapsedTime / 60)
    const seconds = Math.floor(this.elapsedTime % 60)
    document.getElementById('end-time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`
    document.getElementById('end-status').textContent = this.player.health > 0 ? '存活' : '墜落'

    this._endingOverlay = overlay

    if (this.audio) {
      try { this.audio.playEndingBGM() } catch {}
    }

    const dlgBtn = overlay.querySelector('#ending-datalog-btn')
    if (dlgBtn) {
      dlgBtn.onclick = () => { this._showDatalogGallery() }
      dlgBtn.addEventListener('mouseenter', () => { dlgBtn.style.borderColor = '#00f2ff'; dlgBtn.style.color = '#00f2ff' })
      dlgBtn.addEventListener('mouseleave', () => { dlgBtn.style.borderColor = 'rgba(0,242,255,0.3)'; dlgBtn.style.color = 'rgba(0,242,255,0.7)' })
    }
    const menuBtn = overlay.querySelector('#ending-menu-btn')
    if (menuBtn) {
      menuBtn.onclick = () => { this._endingOverlay?.remove(); this._endingOverlay = null; this.restart() }
      menuBtn.addEventListener('mouseenter', () => { menuBtn.style.borderColor = '#00f2ff'; menuBtn.style.color = '#00f2ff' })
      menuBtn.addEventListener('mouseleave', () => { menuBtn.style.borderColor = 'rgba(0,242,255,0.3)'; menuBtn.style.color = 'rgba(0,242,255,0.7)' })
    }
  }

  Game.prototype.enableEndingSequenceControls = function() {
    this._endingKeyHandler = (e) => {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') {
        this.skipEndingSequence()
      }
    }
    document.addEventListener('keydown', this._endingKeyHandler)
    this._endingClickHandler = (e) => {
      if (e && e.target && e.target.closest && e.target.closest('button')) return
      this.skipEndingSequence()
    }
    document.addEventListener('mousedown', this._endingClickHandler)
    document.addEventListener('touchend', this._endingClickHandler, { passive: true })
  }

  Game.prototype.updateEndingSequence = function(delta) {
    this.endingTimer += delta
    const t = this.endingTimer

    if (this._endingHeroMixer) this._endingHeroMixer.update(delta)
    if (typeof this.updateExplosions === 'function') this.updateExplosions()

    if (t >= EC.walkStart && !this._endingWalkStarted) this._beginEndingWalk()

    if (this._endingFlash) {
      const k = Math.min(t / 1.6, 1)
      this._endingFlash.scale.setScalar(1 + k * 9)
      this._endingFlash.material.opacity = (1 - k) * 0.95
      if (k >= 1) this._disposeEndingProp('_endingFlash')
    }
    if (this._endingRing) {
      const k = Math.min(t / 1.8, 1)
      this._endingRing.scale.setScalar(1 + k * 16)
      this._endingRing.material.opacity = (1 - k) * 0.85
      if (k >= 1) this._disposeEndingProp('_endingRing')
    }

    if (this._endingHero && this._endingWalkStarted && t < EC.walkEnd) {
      const k = Math.min(Math.max((t - EC.walkStart) / (EC.walkEnd - EC.walkStart), 0), 1)
      this._endingHero.position.lerpVectors(this._endingHeroStart, this._endingHeroEnd, k)
      this._endingHero.lookAt(this._endingHeroEnd.x, 0, this._endingHeroEnd.z)
    }

    if (!this._endingCinemaDone) {
      const pan = Math.min(Math.max((t - EC.walkStart) / 2.5, 0), 1)
      const camPos = this._endingCamA.clone().lerp(this._endingCamB, pan)
      if (this._endingSide) {
        const drift = Math.sin(t * 0.35) * 0.5
        camPos.addScaledVector(this._endingSide, drift)
      }
      const lookA = this._endingLookA
      const lookB = this._endingHero
        ? this._endingHero.position.clone().setY(1.05)
        : this._endingHeroStart.clone().setY(1.05)
      const look = lookA.clone().lerp(lookB, pan)
      this.camera.position.copy(camPos)
      this.camera.lookAt(look)
    }

    for (const p of this._endingParticles) {
      p.userData.angle += delta * p.userData.speed
      p.position.x = Math.cos(p.userData.angle) * p.userData.radius
      p.position.z = Math.sin(p.userData.angle) * p.userData.radius
      p.position.y = p.userData.height + Math.sin(t * 0.5 + p.userData.angle) * 0.3
      p.material.opacity = 0.2 + Math.sin(t * 0.8 + p.userData.angle * 2) * 0.2
    }

    if (!this._endingCinemaDone && t >= EC.fadeEnd) {
      this._endingCinemaDone = true
      if (this._endingFade) this._endingFade.style.opacity = '1'
      this.endingTimer = 0
      this.narrative.show(NARRATIVE_ENDING, () => {
        this.endingTimer = 0
        this._showFinalEndingOverlay()
      }, { dim: 0.52 })
    }

    if (this._endingOverlay) {
      const fadeProgress = Math.min(t / 3, 1)
      this._endingOverlay.style.background = `rgba(0,0,0,${fadeProgress * 0.88})`

      const titleEl = this._endingOverlay.querySelector('.ending-title')
      const subEl = this._endingOverlay.querySelector('.ending-sub')
      const reportEl = this._endingOverlay.querySelector('.ending-report')
      const creditsEl = this._endingOverlay.querySelector('.ending-credits')
      const finalEl = this._endingOverlay.querySelector('.ending-final')
      const buttonsEl = this._endingOverlay.querySelector('.ending-buttons')

      if (t > 2 && titleEl && titleEl.style.opacity === '0') {
        titleEl.style.opacity = '1'
        titleEl.style.transition = 'opacity 2s ease'
      }
      if (t > 4 && subEl) {
        subEl.style.opacity = '1'
        subEl.style.transition = 'opacity 1.5s ease'
      }
      if (t > 6 && reportEl) {
        reportEl.style.opacity = '1'
        reportEl.style.transition = 'opacity 1.2s ease'
      }
      if (t > 8.5 && creditsEl) {
        creditsEl.style.opacity = '1'
        creditsEl.style.transition = 'opacity 1.5s ease'
      }
      if (t > 10.5 && finalEl) {
        finalEl.style.opacity = '1'
        finalEl.style.transition = 'opacity 1s ease'
        finalEl.style.color = '#00f2ff'
        finalEl.style.textShadow = '0 0 8px rgba(0,242,255,0.3)'
      }
      if (t > 12 && buttonsEl) {
        buttonsEl.style.opacity = '1'
      }
    }

    if (this._endingOverlay && this.endingTimer > 24) {
      this.skipEndingSequence()
    }
  }

  Game.prototype.skipEndingSequence = function() {
    if (this._endingOverlay) {
      this._endingOverlay.remove()
      this._endingOverlay = null
    }
    if (this._endingHero) {
      this.scene.remove(this._endingHero)
      if (this._endingHeroMixer) this._endingHeroMixer.stopAllAction()
      this._endingHero = null
      this._endingHeroMixer = null
    }
    if (this._endingElevator) {
      this.scene.remove(this._endingElevator)
      this._endingElevator = null
    }
    this._disposeEndingProp('_endingFlash')
    this._disposeEndingProp('_endingRing')
    if (this._endingFade) {
      this._endingFade.remove()
      this._endingFade = null
    }
    for (const p of this._endingParticles) {
      this.scene.remove(p)
      p.geometry.dispose()
      p.material.dispose()
    }
    this._endingParticles = []
    if (this._endingKeyHandler) {
      document.removeEventListener('keydown', this._endingKeyHandler)
      this._endingKeyHandler = null
    }
    if (this._endingClickHandler) {
      document.removeEventListener('mousedown', this._endingClickHandler)
      document.removeEventListener('touchend', this._endingClickHandler)
      this._endingClickHandler = null
    }
    if (document.body) document.body.classList.remove('ending-cinema')
    if (this.narrative.isActive()) {
      this.narrative.hide()
    }
    this.endingSequence = false
    this.currentLevel = LEVEL_CLASSES.length
    this.showResults()
  }

  Game.prototype.showResults = function() {
    this.running = false
    this.unlisten()
    if (this.audio) this.audio.stopBGM()
    const dead = this.player.health <= 0
    const accuracy = this.shotsFired > 0 ? Math.round((this.shotsHit / this.shotsFired) * 100) : 0
    const minutes = Math.floor(this.elapsedTime / 60)
    const seconds = Math.floor(this.elapsedTime % 60)
    const score = dead ? 0 : this.kills * 100 + accuracy * 5 - this.elapsedTime * 2
    let grade = dead ? 'F' : 'C'
    if (!dead) {
      if (score > 800) grade = 'S'
      else if (score > 600) grade = 'A'
      else if (score > 400) grade = 'B'
    }

    const won = !dead && this.currentLevel >= LEVEL_CLASSES.length - 1
    this._retryLevel = dead ? this.currentLevel : 0
    document.getElementById('result-title').innerHTML = won ? '<span style="display:inline-block;width:14px;height:14px;border:2px solid #00f2ff;margin-right:8px;vertical-align:middle;position:relative;top:-2px"></span> 訊號仍在' : dead ? '任務失敗' : '任務完成'
    document.getElementById('result-subtitle').textContent = won ? '零層核心已停止。' : ''
    document.getElementById('result-subtitle').style.display = won ? 'block' : 'none'
    document.getElementById('stat-kills').textContent = this.kills
    document.getElementById('stat-accuracy').textContent = accuracy + '%'
    document.getElementById('stat-time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`
    const gradeEl = document.getElementById('grade')
    gradeEl.textContent = grade
    gradeEl.className = 'grade grade-' + grade.toLowerCase()
    document.getElementById('results-screen').style.display = 'flex'
    if (document.pointerLockElement) document.exitPointerLock()

    const dlgBtn = document.getElementById('datalog-gallery-btn')
    if (dlgBtn) {
      dlgBtn.style.display = won ? 'inline-block' : 'none'
      dlgBtn.onclick = () => this._showDatalogGallery()
    }
    const dgalClose = document.getElementById('dgal-close')
    if (dgalClose) {
      dgalClose.onclick = () => {
        document.getElementById('datalog-gallery').style.display = 'none'
      }
    }
  }

  Game.prototype._showDatalogGallery = function() {
    const container = document.getElementById('dgal-entries')
    if (!container) return
    container.innerHTML = ''
    for (const id of getAllDatalogIds()) {
      const name = getDatalogName(id)
      const text = getFullDatalogText(id)
      const div = document.createElement('div')
      Object.assign(div.style, {
        marginBottom: '24px', padding: '16px', borderLeft: '2px solid rgba(0,242,255,0.2)',
        background: 'rgba(0,10,20,0.3)'
      })
      div.innerHTML = `<div style="color:#00f2ff;font-size:0.9rem;letter-spacing:0.1em;margin-bottom:8px;">${name}</div>
<div style="color:rgba(255,255,255,0.6);font-size:0.85rem;line-height:1.7;white-space:pre-wrap;">${text}</div>`
      container.appendChild(div)
    }
    const gal = document.getElementById('datalog-gallery')
    gal.style.display = 'block'
    gal.scrollTop = 0
    const closeBtn = document.getElementById('dgal-close')
    if (closeBtn) {
      closeBtn.onclick = () => { gal.style.display = 'none' }
    }
  }
}
