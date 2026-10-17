import * as THREE from 'three'

export function addLoopMethods(Game, LEVEL_CLASSES, NARRATIVE_INTRO) {

  Game.prototype.start = function() {
    if (this.running) return
    window.__game = this
    this.running = true
    this.startTime = performance.now()
    document.getElementById('blocker').style.display = 'none'
    document.getElementById('hud').style.display = 'block'
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    }
    if (this.difficulty !== 'easy') this.lockPointer()
    this.listen()
    this.kills = 0
    this.shotsFired = 0
    this.shotsHit = 0
    this.enemies = []
    this.transitioning = true
    this.clearReady = false
    this.datalogPickups = []
    this._devCode = []
    this._trainingSpawned = false
    this.player.reset()
    this.weaponManager.reset()
    this.weaponManager.onShoot = (hit) => {
      this.shotsFired++
      if (hit) { this.shotsHit++; this.hud.showHit() }
    }
    const rifle = this.weaponManager.weapons.find(w => w.name === '連發步槍')
    if (rifle) {
      rifle._reportShot = () => this.shotsFired++
    }

    if (this.difficulty === 'easy') {
      this._startTrainingMode()
    } else {
      this.narrative.show(NARRATIVE_INTRO, () => {
        this._buildCurrentLevel()
        this.transitioning = false
        this.lockPointer()
        this._showControlsHint()
      })
    }
    this.animate()
  }

  Game.prototype.animate = function() {
    if (!this.running) return
    requestAnimationFrame(() => this.animate())

    const rawDelta = this.clock.getDelta()
    if (this.paused) {
      this.renderer.render(this.scene, this.camera)
      return
    }
    const delta = Math.min(rawDelta, 0.05)
    if (this.trainingMode && this.player) {
      this.player.health = this.player.maxHealth
    }
    if (this.devMode && this.player) {
      const damageTaken = Math.max(0, this.player.maxHealth - this.player.health)
      this._realHealth = Math.max(0, (this._realHealth ?? this.player.maxHealth) - damageTaken)
      if (damageTaken > 0) this._realRegenHealed = 0
      if (this._realHealth < this.player.maxHealth && this.player.lastDamageTime) {
        const timeSinceDamage = (performance.now() - this.player.lastDamageTime) / 1000
        if (timeSinceDamage > 3 && this._realRegenHealed < this.player.segmentSize) {
          const healAmt = delta * 6
          this._realHealth = Math.min(this.player.maxHealth, this._realHealth + healAmt)
          this._realRegenHealed += healAmt
        }
      }
      this.player.health = this.player.maxHealth
      if (this.weaponManager) {
        this.weaponManager.currentWeapon.currentAmmo = this.weaponManager.currentWeapon.magazineSize
        this.weaponManager.currentWeapon.reserveAmmo = Infinity
      }
    }
    this.elapsedTime = (performance.now() - this.startTime) / 1000

    if (this.endingSequence) {
      this.updateEndingSequence(delta)
      this.renderer.render(this.scene, this.camera)
      return
    }

    if (this._transition) {
      this._updateLevelTransition(delta)
      this.renderer.render(this.scene, this.camera)
      return
    }

    if (this.narrative.isActive() || this.transitioning) {
      this.renderer.render(this.scene, this.camera)
      return
    }

    this.player.update(delta, this.level)
    if (this.player.health <= 0 && !this.trainingMode) {
      if (this.audio) this.audio.playDeath()
      this.showResults()
      return
    }
    this.weaponManager.update(delta)

    const bossLevel = this.currentLevel === 2 || this.currentLevel === 4
    if (bossLevel) {
      const boss = this.enemies.find(e => (e.type === 'shieldGuardian' || e.type === 'signalCore'))
      if (boss && boss.dead && !boss._killOthersDone) {
        boss._killOthersDone = true
        for (const other of this.enemies) {
          if (other !== boss && !other.dead) {
            other.hp = 0
            other.die()
          }
        }
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]
      enemy.update(delta, this.player, this.level)
      if (enemy.dead) {
        if (!enemy._debrisSpawned) {
          this._createDeathDebris(enemy.mesh.position.clone())
          enemy._debrisSpawned = true
          enemy.deathTimer = 0.5
        }
        if (!enemy.deathDone) continue
        if (enemy.type === 'shieldGuardian' || enemy.type === 'signalCore') {
          this._lastBossPos = enemy.mesh.position.clone()
        }
        this.scene.remove(enemy.mesh)
        this.enemies.splice(i, 1)
        this.kills++
        this.hud.addKillFeed(enemy.type)
        if (this.audio) this.audio.playDeath()
      }
    }

    this._enemyMeshes = new Array(this.enemies.length)
    for (let i = 0; i < this.enemies.length; i++) {
      this._enemyMeshes[i] = this.enemies[i].mesh
    }

    if (this.touchFiring) {
      this.weaponManager.shoot(this.enemies, this.camera, this.level, this._enemyMeshes)
    }

    if (this.trainingMode && this.enemies.length === 0 && this.trainingEnemy && this.trainingEnemy !== 'targetDummy') {
      this._spawnTrainingEnemies()
    }

    const boss = this.enemies.find(e => e.type === 'shieldGuardian' || e.type === 'signalCore')
    if (boss) {
      if (boss.dead && boss.deathDone) {
        this.showBossHealthBar(false)
      } else {
        const pct = (boss.hp / boss.maxHp) * 100
        const label = boss.type === 'shieldGuardian' ? '<span class="ico ico-diamond"></span> 封鎖單位' : '<span class="ico ico-diamond"></span> 訊號核心'
        if (label !== this._bossLabel) {
          this._bossLabel = label
          const labelEl = document.querySelector('#boss-health-container .boss-label')
          if (labelEl) labelEl.innerHTML = label
        }
        this.updateBossHealthBar(pct)
      }
    } else {
      this.showBossHealthBar(false)
    }

    for (const enemy of this.enemies) {
      if (enemy.type === 'signalCore' && !enemy.dead) {
        enemy.updateProjectiles(delta, this.level ? this.level.collisionBoxes : null)
      }
    }

    this.checkEnemyCollisions(delta)
    this.checkAmmoPickups()
    this.checkHealthPickups()
    this.checkGrenadePickups()
    this.checkDataLogs()
    this.updateEnemyTrails()
    this.updateExplosions()
    this._updateDebris(delta)
    this._updateAmbientParticles(delta)
    if (this.level && this.level.updateFlicker) this.level.updateFlicker(delta)
    if (this.level && this.level.updatePulse) this.level.updatePulse(delta)

    if (!this.trainingMode) {
      this.waveSystem.update(delta)
    }

    if (this.weaponManager.currentWeapon && this.weaponManager.currentWeapon.setBobPhase) {
      this.weaponManager.currentWeapon.setBobPhase(this.player.weaponBob)
    }

    const waveTotal = (this.waveSystem.waves.length > 0 && this.waveSystem.currentWaveTotal > 0)
      ? this.waveSystem.currentWaveTotal
      : this.totalEnemies
    this.hud.update(this.player, this.weaponManager.currentWeapon, this.kills, this.elapsedTime, Math.max(waveTotal, this.enemies.length), this.enemies.length, this.devMode ? this._realHealth : null)

    for (let i = this.datalogPickups.length - 1; i >= 0; i--) {
      this.datalogPickups[i].update(delta, this.camera.position)
    }

    if (this.level && this.level.updatePickups) this.level.updatePickups(delta)

    if (!this.trainingMode && !this.transitioning && !this.clearReady && this.player.health > 0) {
      const bossAlive = this.enemies.find(e => (e.type === 'shieldGuardian' || e.type === 'signalCore') && !e.dead)
      if (this.currentLevel === 2 || this.currentLevel === 4) {
        if (!bossAlive) {
          this.clearReady = true
        }
      } else if (this.currentLevel < 2 || this.currentLevel === 3) {
        if (this.waveSystem.isComplete()) {
          this.clearReady = true
        }
      } else {
        this.clearReady = true
      }
    }

    if (this.clearReady && this.player.health > 0 && !this.endingSequence && !this.trainingMode) {
      if (this.currentLevel >= LEVEL_CLASSES.length - 1) {
        this.startEndingSequence()
      } else {
        this.hud.showLevelAdvanceHint(true)
      }
    }

    this.renderer.render(this.scene, this.camera)
  }

  Game.prototype.restart = function() {
    this.running = false
    if (this.audio) this.audio.stopBGM()
    this.clock.stop()
    this.clock = new THREE.Clock()

    if (this._explosions) {
      for (const e of this._explosions) {
        for (const p of e.particles) { this.scene.remove(p); p.geometry.dispose(); p.material.dispose() }
      }
      this._explosions = []
    }
    if (this._enemyTrails) {
      for (const t of this._enemyTrails) { this.scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose() }
      this._enemyTrails = []
    }
    if (this._datalogTimeout) { clearTimeout(this._datalogTimeout); this._datalogTimeout = null }
    this._devCode = []
    this._particleVelocities = []
    for (const d of this._debrisList) { this.scene.remove(d.mesh); d.mesh.material.dispose() }
    this._debrisList = []

    if (this._endingParticles) {
      for (const p of this._endingParticles) { this.scene.remove(p); p.geometry.dispose(); p.material.dispose() }
      this._endingParticles = []
    }
    if (this._endingKeyHandler) {
      document.removeEventListener('keydown', this._endingKeyHandler)
      this._endingKeyHandler = null
    }
    if (this._endingClickHandler) {
      document.removeEventListener('mousedown', this._endingClickHandler)
      document.removeEventListener('touchend', this._endingClickHandler)
      this._endingClickHandler = null
    }
    if (this._endingOverlay) {
      this._endingOverlay.remove()
      this._endingOverlay = null
    }
    document.body.classList.remove('ending-cinema')
    document.body.classList.remove('ui-paused')
    const pm = document.getElementById('pause-menu')
    if (pm) pm.style.display = 'none'

    for (const enemy of this.enemies) {
      this.scene.remove(enemy.mesh)
    }
    this.enemies = []
    this.waveSystem.reset()
    if (this.level) this.level.clear()

    this.camera.position.set(0, 1.6, 0)
    this.camera.rotation.set(0, 0, 0)
    this.player.reset()

    document.getElementById('results-screen').style.display = 'none'
    document.getElementById('training-select').style.display = 'none'
    document.getElementById('blocker').style.display = 'flex'
    this.kills = 0
    this.shotsFired = 0
    this.shotsHit = 0
    const retry = this._retryLevel
    this.currentLevel = retry
    this._retryLevel = 0
    this.transitioning = false
    this.paused = false
    this.touchFiring = false
    if (this._touchReset) this._touchReset()
    this.devMode = false
    if (this.hud) this.hud.showDevMode(false)
    this.endingSequence = false
    this.trainingMode = false
    this.trainingEnemy = null
    this._trainingSpawned = false
    this.trainingScore = 0
    this._realHealth = 100
    this._realRegenHealed = 0

    if (retry > 0) {
      document.getElementById('difficulty-select').style.display = 'none'
      document.getElementById('blocker').querySelector('h1').textContent = '訊號：零層'
      const subEl = document.getElementById('blocker').querySelector('.sub')
      if (subEl) subEl.textContent = 'SIGNAL ZERO'
      document.getElementById('blocker').querySelector('.flash').textContent = '點擊繼續'
    } else {
      document.getElementById('difficulty-select').style.display = 'flex'
      document.getElementById('blocker').querySelector('h1').textContent = '訊號：零層'
      const subEl = document.getElementById('blocker').querySelector('.sub')
      if (subEl) subEl.textContent = 'SIGNAL ZERO'
      document.getElementById('blocker').querySelector('.flash').textContent = '點擊開始'
    }
  }

  Game.prototype.restartContinue = function() {
    document.getElementById('blocker').style.display = 'none'
    if (this.audio) this.audio.resumeContext()
    this.start()
  }

}
