import * as THREE from 'three'
import { loadProtagonist, createProtagonist } from './protagonist.js'

const T = { build: 0.95, text: 1.15, reveal: 2.1, cover: 4.15, end: 5.0 }
const DIST_START = 5.6
const DIST_END = 3.5

function setOpacity(el, value) {
  if (el) el.style.opacity = String(value)
}

export function addTransitionMethods(Game) {

  Game.prototype._startLevelTransition = function (floorName, body, onReady, onDone) {
    const el = document.getElementById('level-transition')
    if (this._transition || !el) {
      if (onReady) onReady()
      if (onDone) onDone()
      return
    }

    const bg = document.getElementById('lt-bg')
    setOpacity(bg, 0)
    document.getElementById('lt-floor').textContent =
      `電梯下行 · FLOOR 0${this.currentLevel + 1}`
    document.getElementById('lt-name').textContent = floorName
    const lineEl = document.getElementById('lt-line')
    lineEl.textContent = body || ''
    lineEl.style.display = body ? 'block' : 'none'
    el.classList.add('on')
    el.classList.remove('show-text')
    void el.offsetWidth
    setOpacity(bg, 1)

    this._transition = {
      t: 0,
      built: false,
      textShown: false,
      revealed: false,
      covered: false,
      model: null,
      mixer: null,
      onReady,
      onDone,
      camPos0: this.camera.position.clone(),
      camQuat0: this.camera.quaternion.clone(),
      origin: null,
      forward: null
    }
    this.camera.updateMatrixWorld(true)
    this._transition.origin = this.camera.position.clone()
    this._transition.forward = new THREE.Vector3()
    this.camera.getWorldDirection(this._transition.forward)
  }

  Game.prototype._spawnTransitionActor = function (tr) {
    loadProtagonist().then((data) => {
      if (this._transition !== tr) return
      const p = tr.origin.clone().addScaledVector(tr.forward, 5.0)
      p.y = 0
      const hero = createProtagonist(data)
      hero.position.copy(p)
      hero.lookAt(tr.origin.x, 0, tr.origin.z)
      this.scene.add(hero)
      tr.model = hero
      tr.mixer = hero.userData.mixer
    }).catch(() => {})
  }

  Game.prototype._updateLevelTransition = function (delta) {
    const tr = this._transition
    if (!tr) return
    tr.t += delta
    const t = tr.t
    const el = document.getElementById('level-transition')
    const bg = document.getElementById('lt-bg')

    if (!tr.built && t >= T.build) {
      tr.built = true
      if (tr.onReady) tr.onReady()
      this._spawnTransitionActor(tr)
    }
    if (tr.built && !tr.textShown && t >= T.text) {
      tr.textShown = true
      if (el) el.classList.add('show-text')
    }
    if (!tr.revealed && t >= T.reveal) {
      tr.revealed = true
      setOpacity(bg, 0)
    }
    if (!tr.covered && t >= T.cover) {
      tr.covered = true
      setOpacity(bg, 1)
    }

    if (tr.model && tr.origin) {
      const k = Math.min(Math.max((t - T.build) / (T.end - T.build), 0), 1)
      const dist = DIST_START + (DIST_END - DIST_START) * k
      const look = tr.model.position
      this.camera.position.set(look.x, 1.55, look.z)
        .addScaledVector(tr.forward, -dist)
      this.camera.lookAt(look.x, look.y + 1.15, look.z)
      if (tr.mixer) tr.mixer.update(delta)
    }

    if (t >= T.end) {
      if (tr.model) {
        this.scene.remove(tr.model)
        const mixer = tr.mixer
        if (mixer) mixer.stopAllAction()
        tr.model = null
        tr.mixer = null
      }
      this.camera.position.copy(tr.camPos0)
      this.camera.quaternion.copy(tr.camQuat0)
      if (el) {
        el.classList.remove('on', 'show-text')
        setOpacity(bg, 0)
      }
      const done = tr.onDone
      this._transition = null
      if (done) done()
    }
  }
}
