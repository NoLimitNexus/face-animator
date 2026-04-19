import './style.css';
import * as THREE from 'three';
import { FaceLandmarker, HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let faceLandmarker;
let handLandmarker;
let runningMode = "VIDEO";
let webcamRunning = false;
const video = document.getElementById("webcam");
const startBtn = document.getElementById("start-btn");
const statusTxt = document.getElementById("status");
const avatarSelect = document.getElementById("avatar-select");

// --- Three.js Setup ---
const canvasContainer = document.getElementById("canvas-container");
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 20;

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
canvasContainer.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1.5);
light.position.set(0, 5, 10);
scene.add(light);
const ambient = new THREE.AmbientLight(0x404040, 3);
scene.add(ambient);

// --- Avatar Construction ---
const avatars = {};

// 1. Robot
const robotGroup = new THREE.Group();
const botHead = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), new THREE.MeshStandardMaterial({color: 0x888888, metalness: 0.8, roughness: 0.2}));
const botEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshBasicMaterial({color: 0x00ffcc}));
botEyeL.position.set(-1, 0.5, 2.05);
const botEyeR = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshBasicMaterial({color: 0x00ffcc}));
botEyeR.position.set(1, 0.5, 2.05);
const botMouthGroup = new THREE.Group();
botMouthGroup.position.set(0, -1, 2.05);
const botMouth = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.2), new THREE.MeshBasicMaterial({color: 0x000000}));
botMouthGroup.add(botMouth);
const botHandL = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), new THREE.MeshStandardMaterial({color: 0x888888, metalness: 0.8, roughness: 0.2}));
const botHandR = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), new THREE.MeshStandardMaterial({color: 0x888888, metalness: 0.8, roughness: 0.2}));
const botBrowL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.2), new THREE.MeshBasicMaterial({color: 0x222222}));
botBrowL.position.set(-1, 1.2, 2.05);
botBrowL.userData.baseY = 1.2;
const botBrowR = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.2), new THREE.MeshBasicMaterial({color: 0x222222}));
botBrowR.position.set(1, 1.2, 2.05);
botBrowR.userData.baseY = 1.2;
robotGroup.add(botHead, botEyeL, botEyeR, botMouthGroup, botHandL, botHandR, botBrowL, botBrowR);
avatars.robot = { root: robotGroup, mouth: botMouth, eyeL: botEyeL, eyeR: botEyeR, handL: botHandL, handR: botHandR, browL: botBrowL, browR: botBrowR };

// 2. Alien
const alienGroup = new THREE.Group();
const alienHead = new THREE.Mesh(
  new THREE.SphereGeometry(2.5, 32, 32), 
  new THREE.MeshStandardMaterial({color: 0x22ff44, roughness: 0.4})
);
alienHead.scale.y = 1.3;
const alienEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), new THREE.MeshBasicMaterial({color: 0x000000}));
alienEyeL.scale.set(1, 1.5, 0.5);
alienEyeL.position.set(-1, 0.8, 2.1);
alienEyeL.rotation.z = -0.2;
const alienEyeR = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), new THREE.MeshBasicMaterial({color: 0x000000}));
alienEyeR.scale.set(1, 1.5, 0.5);
alienEyeR.position.set(1, 0.8, 2.1);
alienEyeR.rotation.z = 0.2;
const alienMouth = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), new THREE.MeshBasicMaterial({color: 0x000000}));
alienMouth.position.set(0, -1.2, 2.25);
const alienHandL = new THREE.Mesh(new THREE.SphereGeometry(1.2, 32, 32), new THREE.MeshStandardMaterial({color: 0x22ff44, roughness: 0.4}));
const alienHandR = new THREE.Mesh(new THREE.SphereGeometry(1.2, 32, 32), new THREE.MeshStandardMaterial({color: 0x22ff44, roughness: 0.4}));
alienHandL.scale.set(1, 1.5, 0.5);
alienHandR.scale.set(1, 1.5, 0.5);
const alienBrowMat = new THREE.MeshBasicMaterial({color: 0x004400});
const alienBrowL = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 0.3), alienBrowMat);
alienBrowL.position.set(-1, 1.8, 2.1);
alienBrowL.userData.baseY = 1.8;
const alienBrowR = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 0.3), alienBrowMat);
alienBrowR.position.set(1, 1.8, 2.1);
alienBrowR.userData.baseY = 1.8;
alienGroup.add(alienHead, alienEyeL, alienEyeR, alienMouth, alienHandL, alienHandR, alienBrowL, alienBrowR);
avatars.alien = { root: alienGroup, mouth: alienMouth, eyeL: alienEyeL, eyeR: alienEyeR, handL: alienHandL, handR: alienHandR, browL: alienBrowL, browR: alienBrowR };

// 3. Ghost
const ghostGroup = new THREE.Group();
const ghostHead = new THREE.Mesh(
  new THREE.ConeGeometry(2.5, 6, 32), 
  new THREE.MeshStandardMaterial({color: 0xffffff, transparent: true, opacity: 0.6})
);
ghostHead.position.y = -1;
const ghostEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.4), new THREE.MeshBasicMaterial({color: 0x00ffff}));
ghostEyeL.position.set(-0.8, 0.5, 1.3);
const ghostEyeR = new THREE.Mesh(new THREE.SphereGeometry(0.4), new THREE.MeshBasicMaterial({color: 0x00ffff}));
ghostEyeR.position.set(0.8, 0.5, 1.3);
const ghostMouth = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial({color: 0x001133}));
ghostMouth.position.set(0, -0.8, 1.6);
ghostMouth.scale.set(2, 0.5, 1);
const ghostHandL = new THREE.Mesh(new THREE.SphereGeometry(0.8), new THREE.MeshStandardMaterial({color: 0xffffff, transparent: true, opacity: 0.6}));
const ghostHandR = new THREE.Mesh(new THREE.SphereGeometry(0.8), new THREE.MeshStandardMaterial({color: 0xffffff, transparent: true, opacity: 0.6}));
ghostHandL.scale.set(1, 0.5, 1);
ghostHandR.scale.set(1, 0.5, 1);
ghostGroup.add(ghostHead, ghostEyeL, ghostEyeR, ghostMouth, ghostHandL, ghostHandR);
avatars.ghost = { root: ghostGroup, mouth: ghostMouth, eyeL: ghostEyeL, eyeR: ghostEyeR, handL: ghostHandL, handR: ghostHandR };

// Initialize hands to be hidden by default
Object.values(avatars).forEach(avatar => {
    if (avatar.handL) avatar.handL.visible = false;
    if (avatar.handR) avatar.handR.visible = false;
});

let currentAvatar = avatars.robot;
scene.add(currentAvatar.root);

avatarSelect.addEventListener('change', (e) => {
  scene.remove(currentAvatar.root);
  currentAvatar = avatars[e.target.value];
  scene.add(currentAvatar.root);
  currentAvatar.root.rotation.set(0,0,0);
  currentAvatar.root.position.set(0,0,0);
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Added scroll to zoom in/out
window.addEventListener('wheel', (e) => {
    camera.position.z += Math.sign(e.deltaY) * 2;
    camera.position.z = Math.max(5, Math.min(100, camera.position.z));
});

// For rendering fallback when camera not started
renderer.render(scene, camera);

// --- MediaPipe Setup ---
async function setupMediaPipe() {
  statusTxt.innerText = "Downloading Face Landmarker model...";
  try {
    const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: runningMode,
        numFaces: 1
    });
    
    handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
        },
        runningMode: runningMode,
        numHands: 2
    });

    statusTxt.innerText = "Model loaded. Ready!";
    statusTxt.style.color = "#00ffcc";
    startBtn.disabled = false;
  } catch(e) {
    console.error(e);
    statusTxt.innerText = "Failed to load model.";
    statusTxt.style.color = "#ff3366";
  }
}

setupMediaPipe();

const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;
if (hasGetUserMedia()) {
  startBtn.addEventListener("click", enableCam);
} else {
  statusTxt.innerText = "Webcam not supported!";
  statusTxt.style.color = "#ff3366";
  startBtn.disabled = true;
}

let lastVideoTime = -1;
let animationId;

function enableCam(event) {
  if (!faceLandmarker) return;

  if (webcamRunning === true) {
    webcamRunning = false;
    startBtn.innerText = "Start Camera";
    statusTxt.innerText = "Camera stopped.";
    if (video.srcObject) {
       video.srcObject.getTracks().forEach(track => track.stop());
    }
  } else {
    webcamRunning = true;
    startBtn.innerText = "Stop Camera";
    statusTxt.innerText = "Camera active. Try moving your face and opening your mouth.";
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } }).then((stream) => {
      video.srcObject = stream;
      video.addEventListener("loadeddata", () => {
         requestAnimationFrame(predictWebcam);
      });
    }).catch(err => {
      statusTxt.innerText = "Webcam permission denied.";
      statusTxt.style.color = "#ff3366";
      webcamRunning = false;
      startBtn.innerText = "Start Camera";
    });
  }
}

function updateAvatarTransform(matrixData) {
  // Convert mediapipe row-major matrix to Three.js column-major matrix
  // MediaPipe uses a +y down, +x right, +z away coordinate system for the camera
  // But the facial transformation matrix format returns a 4x4 transposed.
  
  const m = new THREE.Matrix4().fromArray(matrixData).transpose();
  
  const tr = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  m.decompose(tr, quat, sc);

  // Apply rotation
  // Invert axes so movements are not backwards
  const euler = new THREE.Euler().setFromQuaternion(quat);
  currentAvatar.root.rotation.set(-euler.x, euler.y, euler.z);

  // Update position (invert X and Y to not be backward)
  // Mediapipe returns cm or normalized coordinates. Multiply to scale the movement.
  currentAvatar.root.position.x = -tr.x * 0.2;
  currentAvatar.root.position.y = tr.y * 0.2;
}

function predictWebcam() {
  if (!webcamRunning) {
    return;
  }
  
  if (lastVideoTime !== video.currentTime && video.readyState >= 2) {
    lastVideoTime = video.currentTime;
    try {
        const results = faceLandmarker.detectForVideo(video, performance.now());
        
        if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
        updateAvatarTransform(results.facialTransformationMatrixes[0].data);
        } else {
            // Smoothly return to center if no face
            currentAvatar.root.rotation.x *= 0.9;
            currentAvatar.root.rotation.y *= 0.9;
            currentAvatar.root.rotation.z *= 0.9;
        }

        if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
        const shapes = results.faceBlendshapes[0].categories;
        
        // Jaw
        const jawOpenRaw = shapes.find(s => s.categoryName === "jawOpen")?.score || 0;
        const jawOpen = jawOpenRaw > 0.05 ? jawOpenRaw : 0;
        
        const eyeBlinkL = shapes.find(s => s.categoryName === "eyeBlinkLeft")?.score || 0;
        const eyeBlinkR = shapes.find(s => s.categoryName === "eyeBlinkRight")?.score || 0;
        
        // Smile/Frown
        const smileL = shapes.find(s => s.categoryName === "mouthSmileLeft")?.score || 0;
        const smileR = shapes.find(s => s.categoryName === "mouthSmileRight")?.score || 0;
        const frownL = shapes.find(s => s.categoryName === "mouthFrownLeft")?.score || 0;
        const frownR = shapes.find(s => s.categoryName === "mouthFrownRight")?.score || 0;
        
        // Brows with deadzones to stop "terrified/angry" resting face
        const threshold = (val, t) => val > t ? (val - t) * (1 / (1 - t)) : 0;
        const browInnerUp = threshold(shapes.find(s => s.categoryName === "browInnerUp")?.score || 0, 0.15);
        const browOuterUpL = threshold(shapes.find(s => s.categoryName === "browOuterUpLeft")?.score || 0, 0.15);
        const browOuterUpR = threshold(shapes.find(s => s.categoryName === "browOuterUpRight")?.score || 0, 0.15);
        // Requires more extreme muscle to register as angry
        const browDownL = threshold(shapes.find(s => s.categoryName === "browDownLeft")?.score || 0, 0.25);
        const browDownR = threshold(shapes.find(s => s.categoryName === "browDownRight")?.score || 0, 0.25);
        
        // Expressions & Mouth
        if (currentAvatar.mouth) {
            // Set base Y if not set
            if (currentAvatar.mouth.userData.baseY === undefined) {
               currentAvatar.mouth.userData.baseY = currentAvatar.mouth.position.y;
            }
            
            currentAvatar.mouth.scale.y = 1 + (jawOpen * 6);
            
            // Apply smiles and frowns via width and Y position
            const smile = smileL + smileR;
            const frown = frownL + frownR;
            
            // Amplify smile drastically so it's easier to hit
            const smileFactor = Math.min(3.0, smile * 2.5);
            const frownFactor = Math.min(1.0, frown * 1.5);
            
            currentAvatar.mouth.scale.x = 1 + smileFactor - (frownFactor * 0.5);
            
            // Smile pulls mouth up, frown pulls mouth down
            currentAvatar.mouth.position.y = currentAvatar.mouth.userData.baseY + (smileFactor * 0.15) - (frownFactor * 0.1);
        }
        
        // Brows
        if (currentAvatar.browL) {
            // Mirror left and right in camera logic
            currentAvatar.browL.position.y = currentAvatar.browL.userData.baseY + (browInnerUp * 0.25) + (browOuterUpR * 0.2) - (browDownR * 0.4);
            currentAvatar.browL.rotation.z = (browDownR * 0.5) - (browOuterUpR * 0.3) - (smileL * 0.2); // Smoothly relax brow when smiling
        }
        if (currentAvatar.browR) {
            currentAvatar.browR.position.y = currentAvatar.browR.userData.baseY + (browInnerUp * 0.25) + (browOuterUpL * 0.2) - (browDownL * 0.4);
            currentAvatar.browR.rotation.z = -(browDownL * 0.5) + (browOuterUpL * 0.3) + (smileR * 0.2); // Smoothly relax brow when smiling
        }
        
        // Eye blinking
        if (currentAvatar.eyeL) {
            currentAvatar.eyeL.scale.y = Math.max(0.1, 1 - (eyeBlinkR * 1.5));
        }
        if (currentAvatar.eyeR) {
            currentAvatar.eyeR.scale.y = Math.max(0.1, 1 - (eyeBlinkL * 1.5));
        }
        }
        
        // --- Hand Tracking ---
        const handResults = handLandmarker.detectForVideo(video, performance.now());
        
        if (currentAvatar.handL) currentAvatar.handL.visible = false;
        if (currentAvatar.handR) currentAvatar.handR.visible = false;

        if (handResults.landmarks && handResults.landmarks.length > 0) {
            for (let i = 0; i < handResults.landmarks.length; i++) {
                const landmarks = handResults.landmarks[i];
                const handedness = handResults.handednesses[i][0].categoryName; // "Left" or "Right"
                
                // Use index 9 (Middle Finger MCP) as the center of the hand
                const lm = landmarks[9];
                
                // Map to ThreeJS space (invert axes to fix backward direction)
                const x = (lm.x - 0.5) * 40;
                const y = (lm.y - 0.5) * 30;
                // keep z relative naturally
                const z = -lm.z * 50;

                // Match mirrored hands
                if (handedness === "Left") { 
                    if (currentAvatar.handR) {
                       currentAvatar.handR.position.set(x, y, z);
                       currentAvatar.handR.visible = true;
                    }
                } else {
                    if (currentAvatar.handL) {
                       currentAvatar.handL.position.set(x, y, z);
                       currentAvatar.handL.visible = true;
                    }
                }
            }
        }
    } catch(e) {
        // Handle error quietly after reporting once
    }
  }

  // Add small idle animation just so it looks alive when paused/no face
  if (!webcamRunning || currentAvatar.root.position.x === 0) {
      const t = performance.now() * 0.001;
      currentAvatar.root.position.y = Math.sin(t * 2) * 0.5;
  }

  renderer.render(scene, camera);
  
  if(webcamRunning) {
      animationId = requestAnimationFrame(predictWebcam);
  }
}
