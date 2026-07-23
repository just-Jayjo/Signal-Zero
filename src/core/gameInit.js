import * as THREE from 'three'
import { Player } from './player.js'
import { WeaponManager } from './weapon.js'
import { HUD } from '../ui/hud.js'
import { AudioManager } from './audio.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export function addInitMethods(Game, _textureCache, _modelCache) {

  Game.prototype._preloadAssets = function() {
    this._gltfLoader = new GLTFLoader()
    this._texLoader = new THREE.TextureLoader()
    const modelUrls = [
      './models/shipping_crate.glb',
      './models/robot_polygonal_mind.glb',
      './models/robot_drone.glb',
      './models/sci-fi_turret_animated_by_get3dmodels.glb',
      './models/robot_-_runaway_boy_stealth_escape_by_get3dmodels.glb',
      './models/cyberpunk_drone_concept_design_by_get3dmodels.glb',
      './models/abandoned_mecha_by_get3dmodels.glb',
      './models/babys_first_mecha_by_get3dmodels.glb'
    ]
    for (const url of modelUrls) {
      this._gltfLoader.load(url, gltf => {
        const key = url.split('/').pop().replace('.glb', '')
        _modelCache.set(key, gltf.scene.clone())
      })
    }
    const texUrls = [
      { key: 'floorColor', url: './textures/Metal009/Metal009_2K-JPG_Color.jpg' },
      { key: 'floorNormal', url: './textures/Metal009/Metal009_2K-JPG_NormalGL.jpg' },
      { key: 'floorRoughness', url: './textures/Metal009/Metal009_2K-JPG_Roughness.jpg' },
      { key: 'floorMetalness', url: './textures/Metal009/Metal009_2K-JPG_Metalness.jpg' },
      { key: 'wallColor', url: './textures/Metal022/Metal022_2K-JPG_Color.jpg' },
      { key: 'wallNormal', url: './textures/Metal022/Metal022_2K-JPG_NormalGL.jpg' },
      { key: 'wallRoughness', url: './textures/Metal022/Metal022_2K-JPG_Roughness.jpg' },
      { key: 'wallMetalness', url: './textures/Metal022/Metal022_2K-JPG_Metalness.jpg' }
    ]
    for (const { key, url } of texUrls) {
      this._texLoader.load(url, tex => _textureCache.set(key, tex))
    }
  }

  Game.prototype.init = function() {
    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100)
    const spawn = this._getSpawnPosition(0)
    this.camera.position.set(spawn.x, 1.6, spawn.z)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.renderer.domElement.setAttribute('inputmode', 'none')
    document.body.prepend(this.renderer.domElement)

    const ambientLight = new THREE.AmbientLight(0xaaccee, 2.5)
    this.scene.add(ambientLight)
    const hemiLight = new THREE.HemisphereLight(0xccddff, 0x88aacc, 1.5)
    this.scene.add(hemiLight)
    const dirLight = new THREE.DirectionalLight(0xddeeff, 3.0)
    dirLight.position.set(10, 20, 10)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 512
    dirLight.shadow.mapSize.height = 512
    this.scene.add(dirLight)
    const pointLight = new THREE.PointLight(0x00aaff, 1.2, 25)
    pointLight.position.set(0, 3, 0)
    this.scene.add(pointLight)

    this.player = new Player(this.camera, this.scene)
    this.audio = new AudioManager()
    this.weaponManager = new WeaponManager(this.scene, this.camera)
    this.weaponManager.weapons.forEach(w => {
      if (w.setPlayer) w.setPlayer(this.player)
    })
    this.weaponManager.setAudio(this.audio)
    this.hud = new HUD()

    document.addEventListener('pointerlockchange', this._bound.pointerlockchange)
    document.addEventListener('fullscreenchange', this._bound.fullscreenchange)
  }

}
