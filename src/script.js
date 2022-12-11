import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { gsap } from 'gsap'

/**
 * Base
 */

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Organized collections of scenes, cameras, controls, and points of interest
const mapGroup = {}
const streetGroup = {}
const exploreGroup = {}
let currGroup = {}

// Scene
const mapScene = new THREE.Scene()
const streetScene = new THREE.Scene()
const exploreScene = new THREE.Scene()
let prevScene
mapGroup.scene = mapScene
streetGroup.scene = streetScene
exploreGroup.scene = exploreScene

// Changes scene from current scene to new scene
function sceneChange(currentGroup, newGroup) {
    // Cause points of interest to hide upon scene change
    for (const point of points) {
        point.element.classList.remove('visible')
        point.element.classList.add('invisible')
    }
    backButton.classList.remove('visible')
    sceneReady = false
    // Fade overlay to black and commence scene change
    gsap.to(overlayMaterial.uniforms.uAlpha, { duration: 1, value: 1, delay: 0 })
    currentGroup.controls.enabled = false
    currGroup = newGroup
    prevScene = currentGroup.scene
    window.setTimeout(
        () => {
            prevScene.remove(overlay)
            scene = newGroup.scene
            scene.add(overlay)
            camera = newGroup.camera
            controls = newGroup.controls
            controls.reset()
            controls.enabled = true
            points = newGroup.points
        },
        1100
    )
    // Fade out overlay and present new scene
    gsap.to(overlayMaterial.uniforms.uAlpha, { duration: 2, value: 0, delay: 1.2 })
    window.setTimeout(
        () => {
            sceneReady = true
            backButton.classList.add('visible')
        }, 1300
    )
}

//Back Button
const backButton = document.querySelector('.back-button')
backButton.addEventListener('click', () => {
    if (currGroup === exploreGroup)
        sceneChange(exploreGroup, streetGroup)
    else
        sceneChange(streetGroup, mapGroup)
})

/**
 * 3D Title
 */
const fontLoader = new FontLoader()
fontLoader.load(
    '/fonts/gentilis_bold.typeface.json',
    (font) => {
        const textGeometry = new TextGeometry(
            'MKE 3D',
            {
                font: font,
                size: 60,
                height: 4,
                curveSegments: 4,
                bevelEnabled: true,
                bevelThickness: 6,
                bevelSize: 8,
                bevelOffset: 0,
                bevelSegments: 4
            }
        )
        const textMaterial = new THREE.MeshMatcapMaterial({ matcap: matcapTexture })
        const text = new THREE.Mesh(textGeometry, textMaterial)
        text.position.set(-132, 93.5, -60)
        text.rotateX(-0.3)
        mapScene.add(text)
    }
)

const textureLoader = new THREE.TextureLoader()
const matcapTexture = textureLoader.load('/textures/matcaps/3.png')

/**
 * Models and Textures
 */
const loadingBarElement = document.querySelector('.loading-bar')
let sceneReady = false
const loadingManager = new THREE.LoadingManager(
    // Loaded
    () => {
        // Wait a little
        window.setTimeout(() => {
            // Animate overlay
            gsap.to(overlayMaterial.uniforms.uAlpha, { duration: 2, value: 0, delay: 1 })
            // Update loadingBarElement
            loadingBarElement.classList.add('ended')
            loadingBarElement.style.transform = ''
        }, 500)

        window.setTimeout(() => {
            sceneReady = true
        }, 2000)
    },
    // Progress
    (itemUrl, itemsLoaded, itemsTotal) => {
        // Calculate the progress and update the loadingBarElement
        const progressRatio = itemsLoaded / itemsTotal
        loadingBarElement.style.transform = `scaleX(${progressRatio})`
    }
)

const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')

const gltfLoader = new GLTFLoader(loadingManager)
gltfLoader.setDRACOLoader(dracoLoader)

const rgbeLoader = new RGBELoader()

/**
 * Loading functions
 */

// LOAD MAP MODEL
gltfLoader.load(
    '/models/MkeMapCleanerApplyCompressed.glb',
    (gltf) => {
        gltf.scene.position.set(55, 0, 0)
        gltf.scene.castShadow = true
        gltf.scene.receiveShadow = true
        mapScene.add(gltf.scene)
    }
)

//LOAD STREET MODEL
gltfLoader.load(
    '/models/OldWorldThirdCondense2.glb'
    ,
    (gltf) => {
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true
                child.receiveShadow = true
            }
        })
        gltf.scene.position.set(0, -75, 0)
        streetScene.add(gltf.scene)
    }
)

//LOAD STREET ENVIRONMENT MAP
rgbeLoader.load(
    '/textures/the_sky_is_on_fire_2k.hdr',
    (texture) => {
        const gen = new THREE.PMREMGenerator(renderer)
        const envMap = gen.fromEquirectangular(texture).texture
        streetScene.environment = envMap
        streetScene.background = envMap
        texture.dispose()
        gen.dispose()
    }
)

//CONSTRUCT EXPLORE SPHERE AND TEXTURES
const exploreGeometry = new THREE.SphereGeometry(500, 60, 40)
const exploreMaterial = new THREE.MeshBasicMaterial()
const exploreMesh = new THREE.Mesh(exploreGeometry, exploreMaterial)
exploreGeometry.scale(-1, 1, 1)
exploreScene.add(exploreMesh)

const bratHouse360 = textureLoader.load('/textures/SMpretendBratHouse.jpg')
const whosOnThird360 = textureLoader.load('textures/SMpretendWhosOnThird.jpg')
const maders360 = textureLoader.load('/textures/SMpretendMaders.jpg')

/**
 * Points of interest
 */
const raycaster = new THREE.Raycaster()
const mapPoints = [
    {   //Old World Third
        position: new THREE.Vector3(-166, 12, 90),
        element: document.querySelector('.point-M0')
    },
    {   //Brady St
        position: new THREE.Vector3(-25, 17, -20),
        element: document.querySelector('.point-M1')
    },
    {   //Bradford Beach
        position: new THREE.Vector3(184.3, 16.8, -108.9),
        element: document.querySelector('.point-M2')
    }
]

for (const point of mapPoints) {
    point.element.addEventListener('click', () => {
        //Only change scene if Old World Third selected as rest under construction
        if (point.element === document.querySelector('.point-M0'))
            sceneChange(mapGroup, streetGroup)
    })
}

const streetPoints = [
    {  //Brat House
        position: new THREE.Vector3(-58, 4.7, - 54),
        element: document.querySelector('.point-S0')
    },
    {  //Who's On Third
        position: new THREE.Vector3(19.3, 12.5, - 54),
        element: document.querySelector('.point-S1')
    },
    {  //Mader's
        position: new THREE.Vector3(114.6, 4.7, - 54),
        element: document.querySelector('.point-S2')
    }
]

for (const point of streetPoints) {
    //Adjust spotlight
    point.element.addEventListener('mouseover', () => {
        spotLight.intensity = 6
        if (point.element === document.querySelector('.point-S0'))
            spotLight.target.position.set(-48.97, -19.47, -34.22)
        if (point.element === document.querySelector('.point-S1'))
            spotLight.target.position.set(11.5, -19.47, -34.22)
        if (point.element === document.querySelector('.point-S2'))
            spotLight.target.position.set(83.77, -19.47, -34.22)
    })
    point.element.addEventListener('mouseout', () => {
        spotLight.intensity = 0
    })
    //Change scene to explore 360 scenes
    point.element.addEventListener('click', () => {
        if (point.element === document.querySelector('.point-S0')) {
            exploreMaterial.map = bratHouse360
            exploreMesh.rotation.y = 0.05
        }
        if (point.element === document.querySelector('.point-S1')) {
            exploreMaterial.map = whosOnThird360
            exploreMesh.rotation.y = 1.804
        }
        if (point.element === document.querySelector('.point-S2')) {
            exploreMaterial.map = maders360
            exploreMesh.rotation.y = -5.4
        }
        sceneChange(streetGroup, exploreGroup)
    })
}
//Empty placeholder for scene change function
const explorePoints = []
mapGroup.points = mapPoints
streetGroup.points = streetPoints
exploreGroup.points = explorePoints

/**
 * Lights
 */
//LIGHT FOR MAP
const mapAmbientLight = new THREE.AmbientLight(0xffffff, 4.6)
mapScene.add(mapAmbientLight)

//LIGHTS FOR STREET
const streetAmbientLight = new THREE.AmbientLight(0xffffff, 0.48)
streetScene.add(streetAmbientLight)

// Simulated sunlight
const streetDirectionalLight = new THREE.DirectionalLight(0xd98c20, 4.5)
streetDirectionalLight.position.set(0, 120, -80)
streetDirectionalLight.castShadow = true
streetDirectionalLight.shadow.mapSize.set(4096, 4096)
streetDirectionalLight.shadow.camera.far = 1000
streetDirectionalLight.shadow.camera.left = - 1000
streetDirectionalLight.shadow.camera.top = 1000
streetDirectionalLight.shadow.camera.right = 1000
streetDirectionalLight.shadow.camera.bottom = - 1000
streetScene.add(streetDirectionalLight)

// Street spotlight
const spotLight = new THREE.SpotLight(0xf9b806, 0, 600, 0.18, 0.5, 0)
spotLight.position.set(0, 50, 50)
spotLight.target.position.set(0, 0, 0)
spotLight.castShadow = true
spotLight.shadow.mapSize.set(1024, 1024)
spotLight.shadow.camera.far = 500
spotLight.shadow.camera.left = - 500
spotLight.shadow.camera.top = 500
spotLight.shadow.camera.right = 500
spotLight.shadow.camera.bottom = - 500
spotLight.shadow.bias = 0.005
streetScene.add(spotLight)
streetScene.add(spotLight.target)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
//HANDLES WINDOW RESIZING
window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    mapCamera.aspect = sizes.width / sizes.height
    mapCamera.updateProjectionMatrix()

    streetCamera.aspect = sizes.width / sizes.height
    streetCamera.updateProjectionMatrix()

    exploreCamera.aspect = sizes.width / sizes.height
    exploreCamera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
//CAMERA FOR MAP
const mapCamera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 700)
mapCamera.position.set(0, 205, 205)
mapScene.add(mapCamera)

//CAMERA FOR STREET
const streetCamera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 400)
streetCamera.position.set(0, 40, 140)
streetScene.add(streetCamera)

//CAMERA FOR EXPLORE
const exploreCamera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000)
exploreCamera.position.set(0, 0, 0.1)
exploreScene.add(exploreCamera)

mapGroup.camera = mapCamera
streetGroup.camera = streetCamera
exploreGroup.camera = exploreCamera

/**
 * Controls
 */
//CONTROLS FOR MAP
const mapControls = new OrbitControls(mapCamera, canvas)
mapControls.target.set(0, 1, 0)
mapControls.enableDamping = true
mapControls.enabled = false
mapControls.saveState()

//CONTROLS FOR STREET
const streetControls = new OrbitControls(streetCamera, canvas)
streetControls.enableDamping = true
streetControls.enabled = false
streetControls.saveState()

//CONTROLS FOR BRAT HOUSE
const exploreControls = new OrbitControls(exploreCamera, canvas)
exploreControls.enableDamping = true
exploreControls.enabled = false
exploreControls.saveState()

mapGroup.controls = mapControls
streetGroup.controls = streetControls
exploreGroup.controls = exploreControls

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.physicallyCorrectLights = true

//SET STARTING SCENE AS MAP
let scene = mapScene
let camera = mapCamera
let controls = mapControls
controls.enabled = true
let points = mapPoints

/**
 * Overlay
 */
const overlayGeometry = new THREE.PlaneGeometry(2, 2, 1, 1)
const overlayMaterial = new THREE.ShaderMaterial({
    // wireframe: true,
    transparent: true,
    uniforms:
    {
        uAlpha: { value: 1 }
    },
    vertexShader: `
         void main()
         {
             gl_Position = vec4(position, 1.0);
         }
     `,
    fragmentShader: `
         uniform float uAlpha;
 
         void main()
         {
             gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha);
         }
     `
})
const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial)
scene.add(overlay)

/**
 * Animate
 */
const clock = new THREE.Clock()
let previousTime = 0

const tick = () => {
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime
    controls.update()

    // Update points only when the scene is ready
    if (sceneReady) {
        // Go through each point
        for (const point of points) {
            // Get 2D screen position
            const screenPosition = point.position.clone()
            screenPosition.project(camera)

            point.element.classList.add('visible')
            point.element.classList.remove('invisible')

            const translateX = screenPosition.x * sizes.width * 0.5
            const translateY = - screenPosition.y * sizes.height * 0.5
            point.element.style.transform = `translateX(${translateX}px) translateY(${translateY}px)`
            if (scene === mapScene)
                backButton.classList.remove('visible')
            else
                backButton.classList.add('visible')
        }
    }

    // Render
    if (scene === mapScene) {
        renderer.outputEncoding = THREE.LinearEncoding
    }
    else {
        renderer.outputEncoding = THREE.sRGBEncoding
    }

    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()

