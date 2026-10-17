import * as THREE from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js'

const BASE = 'models/survivor/'
const TARGET_HEIGHT = 1.78

let _cache = null

function loadFBX(loader, file) {
  return new Promise((resolve, reject) => {
    loader.load(BASE + file, resolve, undefined, reject)
  })
}

export function loadProtagonist() {
  if (_cache) return _cache
  const loader = new FBXLoader()
  _cache = Promise.all([
    loadFBX(loader, 'characterMedium.fbx'),
    loadFBX(loader, 'idle.fbx'),
    loadFBX(loader, 'run.fbx')
  ]).then(([model, idleFbx, runFbx]) => {
    const tex = new THREE.TextureLoader().load(BASE + 'survivorMaleB.png')
    tex.colorSpace = THREE.SRGBColorSpace
    model.traverse((child) => {
      if (!child.isMesh) return
      child.frustumCulled = false
      child.material = new THREE.MeshStandardMaterial({
        map: tex, color: 0xcfd9e2, roughness: 0.85, metalness: 0.05
      })
    })

    const before = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3()
    before.getSize(size)
    if (size.y > 0.0001) model.scale.setScalar(TARGET_HEIGHT / size.y)

    const after = new THREE.Box3().setFromObject(model)
    const center = new THREE.Vector3()
    after.getCenter(center)
    model.position.x -= center.x
    model.position.y -= after.min.y
    model.position.z -= center.z

    return {
      model,
      idle: idleFbx.animations[0] || null,
      run: runFbx.animations[0] || null
    }
  }).catch((err) => {
    _cache = null
    throw err
  })
  return _cache
}

export function createProtagonist(data) {
  const root = new THREE.Group()
  const model = skeletonClone(data.model)
  root.add(model)

  const mixer = new THREE.AnimationMixer(model)
  const actions = {}
  if (data.idle) actions.idle = mixer.clipAction(data.idle)
  if (data.run) actions.run = mixer.clipAction(data.run)
  if (actions.idle) actions.idle.play()
  else if (actions.run) actions.run.play()

  root.userData.mixer = mixer
  root.userData.actions = actions
  root.userData.model = model
  return root
}
