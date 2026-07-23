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
    if (this.player) this.player._pointerLockFrame = 0
    this.renderer.domElement.requestPointerLock()
  }

  Game.prototype.resize = function() {
    if (this.camera && this.renderer) {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    }
  }

}
