import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { AsciiEffect } from 'three/addons/effects/AsciiEffect.js';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { InteractionManager } from 'three.interactive';

/*

IDEAS: ON SPACEBAR PRESS: Remove scattered text and display social media icons like LinkedIn, GitHub, etc.
After pressing space, fix the camera to the front.

*/

let camera, controls, scene, renderer, effect;
const world = new CANNON.World();
world.gravity.set(0, -250, 0);

let letters = [];
let socialIcons = [];
let danielcuestaDevMesh; // Reference to 'danielcuesta.dev' mesh
let interactionManager; // Declare interactionManager globally

init();

function init() {
    camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        1,
        2000
    );
    camera.position.y = 250;
    camera.position.z = 450;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0, 0, 0);

    const pointLight1 = new THREE.PointLight(0xffffff, 3, 0, 0);
    pointLight1.position.set(500, 500, 500);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffffff, 1, 0, 0);
    pointLight2.position.set(-500, -500, -500);
    scene.add(pointLight2);

    const loader = new FontLoader();
    loader.load(
        'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
        function (font) {
            createTextPhysics('Daniel Cuesta', font, -400, 100);
            createTextPhysics('Desarrollador', font, -500, 0);
        }
    );

    const planeBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Plane(),
    });
    planeBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(planeBody);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Create AsciiEffect with increased resolution for smaller characters
    effect = new AsciiEffect(renderer, ' abcdef.:-|/', {
        invert: true,
        resolution: 0.3, // Adjust this value for character size
    });
    effect.setSize(window.innerWidth, window.innerHeight);
    effect.domElement.style.color = 'white';
    effect.domElement.style.backgroundColor = 'black';
    effect.domElement.style.width = '100%';
    effect.domElement.style.height = '100%';

    // Append effect.domElement instead of renderer.domElement
    document.body.appendChild(effect.domElement);

    controls = new TrackballControls(camera, effect.domElement);

    window.addEventListener('resize', onWindowResize);

    // Event listener for keydown events
    window.addEventListener('keydown', onKeyDown);

    interactionManager = new InteractionManager(
        effect,
        camera,
        effect.domElement
    );

    setTimeout(() => {
        letters.forEach((letter) => {
            letter.body.position.set(
                letter.mesh.position.x,
                letter.mesh.position.y,
                letter.mesh.position.z
            );
            world.addBody(letter.body);
        });

        // Display "danielcuesta.dev" 2 seconds after the initial text explodes
        setTimeout(() => {
            letters.forEach((letter) => {
                scene.remove(letter.mesh); // Remove the initial text
                world.removeBody(letter.body);
            });
            letters = []; // Clear the letters array
            loader.load(
                'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
                function (font) {
                    danielcuestaDevMesh = createText('hevcuesta.github.io', font, -400, 100);
                }
            );
        }, 4000);
    }, 5000);

    animate();
}

function createText(text, font, offsetX, offsetY) {
    const textGeometry = new TextGeometry(text, {
        font: font,
        size: 80,
        height: 20,
        curveSegments: 12,
        bevelEnabled: false, // Disable bevel for simpler geometry
    });

    const textMaterial = new THREE.MeshPhongMaterial({ flatShading: true });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(offsetX, offsetY, 0);
    scene.add(textMesh);

    return textMesh; // Return the mesh for reference
}

function createTextPhysics(text, font, offsetX, offsetY) {
    const textGeometry = new TextGeometry(text, {
        font: font,
        size: 80,
        height: 20,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 5,
        bevelSize: 2,
        bevelOffset: 0,
        bevelSegments: 5,
    });

    const textMaterial = new THREE.MeshPhongMaterial({ flatShading: true });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(offsetX, offsetY + 500, 0); // Starts higher up

    scene.add(textMesh);

    // Create a physical body for the entire text block
    const textBox = new CANNON.Box(
        new CANNON.Vec3(40 * text.length, 40, 10)
    );
    const textBody = new CANNON.Body({ mass: 1 });
    textBody.addShape(textBox);
    textBody.material = new CANNON.Material({
        friction: 0.1,
        restitution: 0.6,
    });

    // Position and rotate the physical body above the plane
    textBody.position.set(offsetX, offsetY + 500, 0);

    world.addBody(textBody);

    // Link the Three.js object with the Cannon.js object
    letters.push({ mesh: textMesh, body: textBody });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    effect.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    if (controls) controls.update();
    world.step(1 / 120);

    letters.forEach((letter) => {
        letter.mesh.position.copy(letter.body.position);
        letter.mesh.quaternion.copy(letter.body.quaternion);
    });

    // Update the InteractionManager
    interactionManager.update();

    // Use effect.render instead of renderer.render
    effect.render(scene, camera);
    requestAnimationFrame(animate);
}

// New function to handle keydown events
function onKeyDown(event) {
    if (!danielcuestaDevMesh) {
        return; // Exit if 'danielcuesta.dev' has not loaded yet
    }
    if (event.code === 'Space') {
        onSpacebarPress();
    }
}

function onSpacebarPress() {
    // Remove existing text and physics bodies
    letters.forEach((letter) => {
        scene.remove(letter.mesh);
        world.removeBody(letter.body);
    });
    letters = [];

    // Remove 'danielcuesta.dev' mesh
    if (danielcuestaDevMesh) {
        scene.remove(danielcuestaDevMesh);
        danielcuestaDevMesh = null;
    }

    // Fix the camera to the front
    //fixCameraToFront();

    // Remove controls
    //controls.dispose();
    //controls = null;

    // Load and display social media icons
    loadSocialIcons();
}

function fixCameraToFront() {
    // Position the camera directly in front of the scene
    camera.position.set(0, 0, 500); // Adjust the Z value as needed
    camera.lookAt(0, 0, 0); // Look at the center of the scene

    // Update the camera projection matrix
    camera.updateProjectionMatrix();
}

function loadSocialIcons() {
    const gltfLoader = new GLTFLoader();

    // Array de íconos de redes sociales con sus URLs respectivas
    const icons = [
        {
            name: 'LinkedIn',
            url: '/hevcuesta.github.io/assets/models/linkedin.gltf',
            link: 'https://www.linkedin.com/in/daniel-cuesta-moreno/', // Tu URL de LinkedIn
        },
        {
            name: 'GitHub',
            url: '/hevcuesta.github.io/assets/models/github.gltf',
            link: 'https://github.com/tuusuario', // Tu URL de GitHub
        },
        // Agrega más íconos si es necesario
    ];

    const startX = -400;
    const spacing = 600;

    icons.forEach((icon, index) => {
        gltfLoader.load(
            icon.url,
            (gltf) => {
                const iconMesh = gltf.scene;
                iconMesh.position.set(startX + index * spacing, -50, 0);
                iconMesh.scale.set(100, 100, 100);
                scene.add(iconMesh);

                // Habilitar 'name' para identificación
                iconMesh.name = icon.name;

                // Almacenar referencia para interacciones futuras
                socialIcons.push({ mesh: iconMesh, link: icon.link });

                // Añadir el icono al InteractionManager
                interactionManager.add(iconMesh);

                // Añadir evento de clic
                iconMesh.addEventListener('click', (event) => {
                    onIconClick(event);
                });
            },
            undefined,
            (error) => {
                console.error(`Error al cargar el modelo ${icon.name}:`, error);
            }
        );
    });

    // Añadir listener para eventos de clic en el renderer.domElement
}

// Ajusta la función onIconClick usando three.interactive:
function onIconClick(event) {
    window.open('google.es', '_blank');
}
