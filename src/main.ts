import * as THREE from 'three';
//import { ShaderMaterial, Color } from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/examples/jsm/libs/stats.module'
//import { SkeletonHelper } from 'three';

const outfitColors = [
  ['red', 'green', 'blue'],
  ['orange', 'purple', 'cyan'],
  ['pink', 'gray', 'black'],
  ['yellow', 'teal', 'magenta'],
  ['lime', 'navy', 'brown'],
  ['white', 'darkgreen', 'gold']
];

const hairColors = [
  'black',
  'brown',
  'yellow',
  'red',
  'gray',
  'white'
];

const scene = new THREE.Scene();

// Uncomment to add axes helper
//scene.add(new THREE.AxesHelper(5))

const sun = new THREE.DirectionalLight('white', 1); // softer intensity
sun.position.set(10, 10, 7.5);
sun.castShadow = true;
scene.add(sun);


const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
scene.add(ambientLight)

scene.background = new THREE.Color(0xbfd1e5); // light blue-gray

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
)
camera.position.set(0.3, 1.5, 2.2)

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.physicallyCorrectLights = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // optional for softer shadows
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 1, 0)

const platformRadius = 2.5;
const platformHeight = 0.2;
const platformGeometry = new THREE.CylinderGeometry(platformRadius, platformRadius, platformHeight, 32);
const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
const platform = new THREE.Mesh(platformGeometry, platformMaterial);
platform.position.set(0, -(platformHeight / 2), 0);
platform.receiveShadow = true;
scene.add(platform);


const textureLoader = new THREE.TextureLoader();
const maskTexture = textureLoader.load('/textures/pete_texture_mask.png');
const albedoTexture = textureLoader.load('/textures/pete_texture.png');

const material = new THREE.MeshStandardMaterial({
  map: albedoTexture,
});

material.onBeforeCompile = (shader) => {
  material.userData.shader = shader;
  console.log('material.userData.shader');
  console.log(material.userData.shader);

  shader.uniforms.maskTex = { value: maskTexture };
  shader.uniforms.swapColor1 = { value: new THREE.Color(outfitColors[0][0]) };
  shader.uniforms.swapColor2 = { value: new THREE.Color(outfitColors[0][1]) };
  shader.uniforms.swapColor3 = { value: new THREE.Color(outfitColors[0][2]) };
  shader.uniforms.swapColor4 = { value: new THREE.Color(hairColors[0]) };

  //3b. Declare the sampler2D in fragment shader
  shader.fragmentShader = shader.fragmentShader.replace(
    /* glsl */`#include <common>`,
    /* glsl */`#include <common>
      uniform sampler2D maskTex;
      uniform vec3 swapColor1;
      uniform vec3 swapColor2;
      uniform vec3 swapColor3;
      uniform vec3 swapColor4;
  `);

  shader.fragmentShader = shader.fragmentShader.replace(
    /* glsl */`#include <color_fragment>`,
    /* glsl */`#include <color_fragment>
    vec4 mask = texture(maskTex, vMapUv);
    
    vec3 nonMasked = diffuseColor.rgb * (1.0 - (mask.r + mask.g + mask.b + mask.a));
    vec3 tint =
      swapColor1 * mask.r +
      swapColor2 * mask.g + 
      swapColor3 * mask.b +
      swapColor4 * mask.a;
    
    diffuseColor.rgb = nonMasked + (diffuseColor.rgb * tint);
  `);

  // todo: Uncomment to debug generated shader code
  /*
  console.log('vertex shader');
  console.log(shader.vertexShader);
  console.log('fragment shader');
  console.log(shader.fragmentShader);
  */
}

material.needsUpdate = true;

// todo: Uncomment when ready to add animation back in
//let mixer: THREE.AnimationMixer;

// todo: Replace fbx with glb
const loader = new FBXLoader();
loader.load('/models/prototype_pete.fbx', (object) => {
  
  object.scale.set(0.01, 0.01, 0.01); // Scale down to 1% of original size
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      if (child.name.includes('Pete')) {
        console.log('child.name', child.name);
        child.castShadow = true;
        const mesh = child as THREE.Mesh;
        mesh.material = material;
      }
    }
  });

  scene.add(object);
  
  // todo: Uncomment when ready to add animation back in
  /*
  // Create an AnimationMixer, which controls animations for this model
  mixer = new THREE.AnimationMixer(object);

  const helper = new SkeletonHelper(object);
  scene.add(helper);

  // Look for animation named "Idle"
  const idleAnim = object.animations.find(clip => clip.name.endsWith('|Idle'));

  if (idleAnim) {
    console.log('Idle animation found:', idleAnim);

    const action = mixer.clipAction(idleAnim);
    action.play();
    action.setLoop(THREE.LoopRepeat); // loop forever

    console.log('Action playing:', action.isRunning()); // should be true

  } else {
    console.warn('Idle animation not found!');
  }*/
}, 
// onProgress
(xhr) => {
  console.log(`FBX ${xhr.loaded / xhr.total * 100}% loaded`);
},
// onError
(error) => {
  console.error('Error loading FBX:', error);
});


window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}

// -- Setup Outfit buttons
let buttons: HTMLButtonElement[] = [];
const colorButtonsContainer = document.getElementById('colorButtons');
outfitColors.forEach((colorSet, index) => {
  const button = document.createElement('button');
  button.classList.add('colorButton');
  button.setAttribute('data-index', index.toString());
  buttons.push(button);
  
  colorSet.forEach(color => {
    const swatch = document.createElement('div');
    swatch.classList.add('swatch');
    swatch.style.backgroundColor = color;
    button.appendChild(swatch);
  });

  colorButtonsContainer?.appendChild(button);
});

function handleButtonClick(event: Event) {
  // Remove the 'active' class from all buttons
  buttons.forEach(button => button.classList.remove('active'));
  
  // Add the 'active' class to the clicked button
  // and update the shader uniforms with the selected colors
  const clickedButton = event.currentTarget as HTMLButtonElement;
  clickedButton.classList.add('active');
  const buttonIndex = parseInt(clickedButton.getAttribute('data-index') || '0', 10);
  
  material.userData.shader.uniforms.swapColor1.value = new THREE.Color(outfitColors[buttonIndex][0]);
  material.userData.shader.uniforms.swapColor2.value = new THREE.Color(outfitColors[buttonIndex][1]);
  material.userData.shader.uniforms.swapColor3.value = new THREE.Color(outfitColors[buttonIndex][2]);
}

// Add click event listener to each button and set first button active
buttons.forEach(button => { button.addEventListener('click', handleButtonClick);});
buttons[0].classList.add('active');

// -- Set up Hair Buttons
let hairButtons: HTMLButtonElement[] = [];
const hairButtonsContainer = document.getElementById('hairButtons');
hairColors.forEach((color, index) => {
  const button = document.createElement('button');
  button.classList.add('hairButton');
  button.setAttribute('data-index', index.toString());
  hairButtons.push(button);

  const swatch = document.createElement('div');
  swatch.classList.add('swatch');
  swatch.style.backgroundColor = color;
  button.appendChild(swatch);

  hairButtonsContainer?.appendChild(button);
});

function handleHairButtonClick(event: Event) {
  // Remove the 'active' class from all buttons
  hairButtons.forEach(button => button.classList.remove('active'));

  // Add the 'active' class to the clicked button
  // and update the shader uniforms with the selected colors
  const clickedButton = event.currentTarget as HTMLButtonElement;  
  clickedButton.classList.add('active');
  const buttonIndex = parseInt(clickedButton.getAttribute('data-index') || '0', 10);
  material.userData.shader.uniforms.swapColor4.value = new THREE.Color(hairColors[buttonIndex]);
}

// Add click event listener to each button and set first button active
hairButtons.forEach(button => { button.addEventListener('click', handleHairButtonClick); });
hairButtons[0].classList.add('active');
// ----

const stats = new Stats()
document.body.appendChild(stats.dom)

function animate() {
  requestAnimationFrame(animate);
  controls.update()
  render()
  stats.update()
}

const clock = new THREE.Clock();

function render() {
  // todo: Uncomment when ready to add animation back in
  /*
  if (mixer) {
    mixer.update(clock.getDelta()); // Use a clock to get the time difference between frames
  }*/

  renderer.render(scene, camera)
}

animate();
