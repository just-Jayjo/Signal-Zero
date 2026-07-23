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

    this.running = false
    this.listening = false
    this.paused = false
    this.transitioning = false
    this.clearReady = false
    this.endingSequence = false
    this.devMode = false
    this.trainingMode = false

    this.currentLevel = 0
    this._retryLevel = 0
    this.kills = 0
    this.shotsFired = 0
    this.shotsHit = 0
    this.totalEnemies = 0
    this.startTime = 0
    this.elapsedTime = 0
    this.trainingScore = 0

    this.enemies = []
    this.datalogPickups = []

    this.difficulty = 'normal'
    this.difficultyModifiers = {
      easy: { enemyHp: 0.7, damageMultiplier: 0.5 },
      normal: { enemyHp: 1.0, damageMultiplier: 1.0 },
      hard: { enemyHp: 1.3, damageMultiplier: 1.3 }
    }

    this.trainingEnemy = null
    this._trainingSpawned = false

    this._ambientParticles = null
    this._particleVelocities = []
    this._debrisList = []
    this._explosions = null
    this._enemyTrails = null
    this._rusherBeepTimers = {}

    this._datalogTimeout = null

    this._realHealth = 100
    this._realRegenHealed = 0

    this.endingTimer = 0
    this._endingOverlay = null
    this._endingParticles = []
    this._endingCameraPos = null
    this._endingTarget = null
    this._endingOrbitAngle = 0
    this._endingKeyHandler = null
    this._endingClickHandler = null

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
        if (!this.devMode && !e.repeat) {
          const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','KeyB','KeyA']
          this._devCode.push(e.code)
          if (this._devCode.length > KONAMI.length) this._devCode.shift()
          if (this._devCode.length === KONAMI.length && this._devCode.every((c,i) => c === KONAMI[i])) {
            this.devMode = true
            this._devCode = []
            if (this.player) this.player.health = this.player.maxHealth
            if (this.weaponManager) {
              this.weaponManager.currentWeapon.currentAmmo = this.weaponManager.currentWeapon.magazineSize
              this.weaponManager.currentWeapon.reserveAmmo = Infinity
            }
            this.hud.showDevMode(true)
          }
        }
        if (e.code === 'KeyM' && this.devMode) {
          this.clearReady = false
          this.transitioning = true
          this.hud.showLevelAdvanceHint(false)
          this.advanceLevel()
        }
        if (e.code === 'KeyQ' && !this.narrative.isActive() && !this.transitioning && this.enemies.length === 0) {
          this.clearReady = false
          this.transitioning = true
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

    this._preloadAssets()
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
