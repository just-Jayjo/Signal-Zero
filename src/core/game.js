import * as THREE from 'three'
import { NarrativeScreen } from '../ui/narrative.js'
import { WaveSystem } from './waveSystem.js'
import { Level1 } from '../levels/level1.js'
import { Level2 } from '../levels/level2.js'
import { Level3 } from '../levels/level3.js'
import { Level4 } from '../levels/level4.js'
import { Level5 } from '../levels/level5.js'
import { NARRATIVE_INTRO } from './narrativeData.js'
import { addInitMethods } from './gameInit.js'
import { addInputMethods } from './gameInput.js'
import { addLoopMethods } from './gameLoop.js'
import { addCombatMethods } from './gameCombat.js'
import { addLevelMethods } from './gameLevel.js'
import { addEndingMethods } from './gameEnding.js'
import { addTrainingMethods } from './gameTraining.js'
import { addTransitionMethods } from './gameTransition.js'

const LEVEL_CLASSES = [Level1, Level2, Level4, Level3, Level5]

const _textureCache = new Map()
const _modelCache = new Map()

export class Game {
  constructor() {
    window.__game = this

    this.scene = null
    this.camera = null
    this.renderer = null
    this.clock = new THREE.Clock()

    this.player = null
    this.weaponManager = null
    this.hud = null
    this.audio = null
    this.level = null
    this.narrative = new NarrativeScreen()
    this.waveSystem = new WaveSystem(this)

    this.flags = {
      running: false,
      listening: false,
      paused: false,
      transitioning: false,
      clearReady: false,
      endingSequence: false,
      devMode: false,
      trainingMode: false
    }

    this.progress = {
      currentLevel: 0,
      _retryLevel: 0,
      kills: 0,
      shotsFired: 0,
      shotsHit: 0,
      totalEnemies: 0,
      startTime: 0,
      elapsedTime: 0,
      trainingScore: 0
    }

    this.entities = {
      enemies: [],
      datalogPickups: []
    }

    this.difficulty = 'normal'
    this.difficultyModifiers = {
      easy: { enemyHp: 0.7, damageMultiplier: 0.5 },
      normal: { enemyHp: 1.0, damageMultiplier: 1.0 },
      hard: { enemyHp: 1.3, damageMultiplier: 1.3 }
    }

    this.trainingEnemy = null
    this._trainingSpawned = false

    this.effects = {
      _ambientParticles: null,
      _particleVelocities: [],
      _debrisList: [],
      _explosions: null,
      _enemyTrails: null,
      _rusherBeepTimers: {}
    }

    this._datalogTimeout = null

    this._realHealth = 100
    this._realRegenHealed = 0

    this.ending = {
      endingTimer: 0,
      _endingOverlay: null,
      _endingParticles: [],
      _endingCameraPos: null,
      _endingTarget: null,
      _endingOrbitAngle: 0,
      _endingKeyHandler: null,
      _endingClickHandler: null
    }

    this._devCode = []

    this._sharedGeo = {
      box: new THREE.BoxGeometry(0.04, 0.03, 0.02),
      sphere: new THREE.SphereGeometry(1, 6, 6)
    }

    this._bound = {
      mousemove: (e) => { if (this.player && document.pointerLockElement) this.player.onMouseMove(e) },
      keydown: (e) => {
        if (this.narrative.isActive()) return
        if (this.player) this.player.onKeyDown(e)
        if (e.code === 'KeyR' && this.weaponManager) {
          this.weaponManager.currentWeapon.reload()
        }
        if (!this.flags.devMode && !e.repeat) {
          const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','KeyB','KeyA']
          this._devCode.push(e.code)
          if (this._devCode.length > KONAMI.length) this._devCode.shift()
          if (this._devCode.length === KONAMI.length && this._devCode.every((c,i) => c === KONAMI[i])) {
            this.flags.devMode = true
            this._devCode = []
            if (this.player) this.player.health = this.player.maxHealth
            if (this.weaponManager) {
              this.weaponManager.currentWeapon.currentAmmo = this.weaponManager.currentWeapon.magazineSize
              this.weaponManager.currentWeapon.reserveAmmo = Infinity
            }
            this.hud.showDevMode(true)
          }
        }
        if (e.code === 'KeyM' && this.flags.devMode) {
          this.flags.clearReady = false
          this.flags.transitioning = true
          this.hud.showLevelAdvanceHint(false)
          this.advanceLevel()
        }
        if (e.code === 'KeyQ' && !this.narrative.isActive() && !this.flags.transitioning && this.entities.enemies.length === 0) {
          this.flags.clearReady = false
          this.flags.transitioning = true
          this.hud.showLevelAdvanceHint(false)
          this.advanceLevel()
        }
      },
      keyup: (e) => this.player && this.player.onKeyUp(e),
      pointerlockchange: () => this.onPointerLockChange(),
      mousedown: (e) => this.onMouseDown(e),
      mouseup: (e) => this.player && this.player.onMouseUp(e),
      preventComposition: (e) => { if (['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyR'].some(k => e.data?.includes(k))) e.preventDefault() },
      contextmenu: (e) => e.preventDefault(),
      click: () => { if (!document.pointerLockElement) this.lockPointer() },
      fullscreenchange: () => this.resize()
    }

    /* Backward-compatible proxy getters for old flat property access */
    this._installFlatGetters()

    this._preloadAssets()
  }

  _installFlatGetters() {
    for (const k of Object.keys(this.flags)) {
      Object.defineProperty(this, k, {
        get: () => this.flags[k],
        set: (v) => { this.flags[k] = v },
        configurable: true,
        enumerable: true
      })
    }
    for (const k of Object.keys(this.progress)) {
      Object.defineProperty(this, k, {
        get: () => this.progress[k],
        set: (v) => { this.progress[k] = v },
        configurable: true,
        enumerable: true
      })
    }
    for (const k of Object.keys(this.entities)) {
      Object.defineProperty(this, k, {
        get: () => this.entities[k],
        set: (v) => { this.entities[k] = v },
        configurable: true,
        enumerable: true
      })
    }
    for (const k of Object.keys(this.effects)) {
      Object.defineProperty(this, k, {
        get: () => this.effects[k],
        set: (v) => { this.effects[k] = v },
        configurable: true,
        enumerable: true
      })
    }
    for (const k of Object.keys(this.ending)) {
      Object.defineProperty(this, k, {
        get: () => this.ending[k],
        set: (v) => { this.ending[k] = v },
        configurable: true,
        enumerable: true
      })
    }
  }

  static getTexture(key) { return _textureCache.get(key) }
  static getModel(key) { return _modelCache.get(key) }
}

addInitMethods(Game, _textureCache, _modelCache)
addInputMethods(Game)
addLoopMethods(Game, LEVEL_CLASSES, NARRATIVE_INTRO)
addCombatMethods(Game)
addLevelMethods(Game, LEVEL_CLASSES, _textureCache, _modelCache)
addEndingMethods(Game, LEVEL_CLASSES)
addTrainingMethods(Game)
addTransitionMethods(Game)
