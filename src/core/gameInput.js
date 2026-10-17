export function addInputMethods(Game) {

  Game.prototype.listen = function() {
    this.unlisten()
    this.listening = true
    document.addEventListener('mousemove', this._bound.mousemove)
    document.addEventListener('keydown', this._bound.keydown)
    document.addEventListener('keyup', this._bound.keyup)
    document.addEventListener('mousedown', this._bound.mousedown)
    document.addEventListener('mouseup', this._bound.mouseup)
    this.renderer.domElement.addEventListener('compositionstart', this._bound.preventComposition)
    this.renderer.domElement.addEventListener('compositionupdate', this._bound.preventComposition)
    this.renderer.domElement.addEventListener('compositionend', this._bound.preventComposition)
    this.renderer.domElement.addEventListener('contextmenu', this._bound.contextmenu)
    this.renderer.domElement.addEventListener('click', this._bound.click)
    /* unlisten() 會把 fullscreenchange 拔掉，這裡必須加回來，
       否則死亡／退出訓練後再玩，全螢幕狀態變化就不會觸發 resize() */
    document.addEventListener('fullscreenchange', this._bound.fullscreenchange)
  }

  Game.prototype.unlisten = function() {
    this.listening = false
    document.removeEventListener('mousemove', this._bound.mousemove)
    document.removeEventListener('keydown', this._bound.keydown)
    document.removeEventListener('keyup', this._bound.keyup)
    document.removeEventListener('mousedown', this._bound.mousedown)
    document.removeEventListener('mouseup', this._bound.mouseup)
    this.renderer.domElement.removeEventListener('compositionstart', this._bound.preventComposition)
    this.renderer.domElement.removeEventListener('compositionupdate', this._bound.preventComposition)
    this.renderer.domElement.removeEventListener('compositionend', this._bound.preventComposition)
    this.renderer.domElement.removeEventListener('contextmenu', this._bound.contextmenu)
    this.renderer.domElement.removeEventListener('click', this._bound.click)
    document.removeEventListener('fullscreenchange', this._bound.fullscreenchange)
  }

  Game.prototype.setDifficulty = function(diff) {
    this.difficulty = diff
    document.getElementById('difficulty-select').style.display = 'none'
  }

  Game.prototype.lockPointer = function() {
    if (this.isTouch) return
    if (this.player) this.player._pointerLockFrame = 0
    try {
      const r = this.renderer.domElement.requestPointerLock()
      if (r && typeof r.catch === 'function') r.catch(() => {})
    } catch (e) { /* 指標鎖定不可用時略過 */ }
  }

  Game.prototype.openPauseMenu = function() {
    if (!this.running || this.transitioning || this.endingSequence) return
    if (this.narrative && this.narrative.isActive()) return
    this.paused = true
    this.touchFiring = false
    if (this._touchReset) this._touchReset()
    const menu = document.getElementById('pause-menu')
    if (menu) menu.style.display = 'flex'
    document.body.classList.add('ui-paused')
    if (document.pointerLockElement) document.exitPointerLock()
  }

  Game.prototype.closePauseMenu = function() {
    const menu = document.getElementById('pause-menu')
    if (menu) menu.style.display = 'none'
    document.body.classList.remove('ui-paused')
    if (this.running) this.paused = false
    if (this.isTouch) return
    this.lockPointer()
  }

  Game.prototype.resize = function() {
    if (this.camera && this.renderer) {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    }
  }

}
