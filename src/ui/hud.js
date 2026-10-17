export class HUD {
  constructor() {
    this.healthFill = document.getElementById('health-fill')
    this.healthNum = document.getElementById('health-num')
    this.realHealthBar = document.getElementById('real-health-bar')
    this.realFill = document.getElementById('real-fill')
    this.realHealthNum = document.getElementById('real-health-num')
    this.ammoDisplay = document.getElementById('ammo-display')
    this.weaponName = document.getElementById('weapon-name')
    this.killFeed = document.getElementById('kill-feed')
    this.hitIndicator = document.getElementById('hit-indicator')
    this.crosshair = document.getElementById('crosshair')
    this.enemyCount = document.getElementById('enemy-count')
    this.reloadIndicator = document.getElementById('reload-indicator')
    this.damageTimeout = null
    this.killTimeouts = []
  }

  update(player, weapon, kills, elapsed, totalEnemies, remainingEnemies, realHealth) {
    /* 數值沒變就不寫 DOM — 這一頁原本每幀都在重建 innerHTML / 改 style */
    if (this.healthFill) {
      const pct = Math.max(0, Math.round(player.health / player.maxHealth * 100))
      if (pct !== this._hpPct) {
        this._hpPct = pct
        this.healthFill.style.width = pct + '%'
        this.healthFill.className = pct > 60 ? 'safe' : pct > 30 ? 'caution' : 'danger'
      }
    }
    if (this.healthNum) {
      const v = Math.ceil(player.health)
      if (v !== this._hpNum) { this._hpNum = v; this.healthNum.textContent = v }
    }
    if (realHealth != null && this.realHealthBar) {
      if (!this._realShown) { this._realShown = true; this.realHealthBar.style.display = 'block' }
      const rp = Math.max(0, Math.round(realHealth / player.maxHealth * 100))
      if (rp !== this._realPct) {
        this._realPct = rp
        if (this.realFill) {
          this.realFill.style.width = rp + '%'
          this.realFill.className = rp > 60 ? 'safe' : rp > 30 ? 'caution' : 'danger'
        }
      }
      if (this.realHealthNum) {
        const v = Math.ceil(realHealth)
        if (v !== this._realNum) { this._realNum = v; this.realHealthNum.textContent = v }
      }
    } else if (this.realHealthBar) {
      if (this._realShown !== false) { this._realShown = false; this.realHealthBar.style.display = 'none' }
    }

    if (this.ammoDisplay && weapon) {
      const key = weapon.currentAmmo + '/' + weapon.reserveAmmo
      if (key !== this._ammoKey) {
        this._ammoKey = key
        this.ammoDisplay.innerHTML = `${weapon.currentAmmo} <span class="reserve">/ ${weapon.reserveAmmo}</span>`
        this.ammoDisplay.style.color = weapon.currentAmmo <= 0 ? '#ff3e3e' : '#fff'
      }
    }

    if (this.weaponName && weapon && weapon.name !== this._weaponKey) {
      this._weaponKey = weapon.name
      this.weaponName.innerHTML = `<span class="ico ico-arrow"></span> ${weapon.name}`
    }

    if (this.enemyCount) {
      const key = remainingEnemies + '/' + totalEnemies
      if (key !== this._enemyKey) {
        this._enemyKey = key
        this.enemyCount.textContent = key
        this.enemyCount.style.color = remainingEnemies <= 0 ? 'rgba(0,242,255,0.4)' : '#fff'
      }
    }

    if (this.reloadIndicator && weapon) {
      const want = weapon.isReloading ? 'block' : 'none'
      if (this._reloadShown !== weapon.isReloading) {
        this._reloadShown = weapon.isReloading
        this.reloadIndicator.style.display = want
      }
    }
  }

  addKillFeed(enemyType) {
    if (!this.killFeed) return
    const names = { patrolBot: '巡邏機兵', drone: '懸浮砲塔', rusher: '突擊無人機', sniper: '狙擊無人機', shieldGuardian: '壁壘守護者', signalCore: '訊號核心' }
    const entry = document.createElement('div')
    entry.textContent = `擊殺 ${names[enemyType] || enemyType}`
    entry.style.opacity = '1'
    this.killFeed.appendChild(entry)

    const timeout = setTimeout(() => {
      entry.style.opacity = '0'
      setTimeout(() => entry.remove(), 300)
    }, 2000)
    this.killTimeouts.push(timeout)
  }

  showLevelAdvanceHint(show) {
    if (this._hintShown === show) return
    this._hintShown = show
    const hint = document.getElementById('level-hint')
    if (!hint) return
    if (show) {
      hint.textContent = document.body.classList.contains('touch-mode')
        ? '點擊這裡前往下一層'
        : '按 Q 前往下一層'
    }
    hint.style.display = show ? 'block' : 'none'
  }

  showDevMode(active) {
    const el = document.getElementById('dev-indicator')
    if (el) el.style.display = active ? 'block' : 'none'
  }

  showDamage() {
    if (!this.hitIndicator) return
    this.hitIndicator.classList.remove('damage')
    void this.hitIndicator.offsetHeight
    this.hitIndicator.classList.add('damage')
    if (this.damageTimeout) clearTimeout(this.damageTimeout)
    this.damageTimeout = setTimeout(() => {
      this.hitIndicator.classList.remove('damage')
    }, 800)
  }

  showHit() {
    if (!this.crosshair) return
    this.crosshair.classList.add('hit')
    setTimeout(() => this.crosshair.classList.remove('hit'), 100)
  }
}
