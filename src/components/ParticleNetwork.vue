<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import * as THREE from "three";

const canvas = ref(null);

let renderer, scene, camera, points, linesMesh;
let animationId = null;
let mouseX = 0;
let mouseY = 0;

const PARTICLE_COUNT = 120;
const CONNECTION_DISTANCE = 150;
const PRIMARY_COLOR = new THREE.Color(0xd4483b);
const DIM_COLOR = new THREE.Color(0x332525);

function onMouseMove(e) {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
}

/**
 * Bootstraps the Three.js scene: camera, particles, and a pre-allocated
 * LineSegments geometry used to draw connections between nearby particles.
 */
function init() {
  const el = canvas.value;
  if (!el) return;

  const width = el.clientWidth;
  const height = el.clientHeight;

  renderer = new THREE.WebGLRenderer({ canvas: el, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, width / height, 1, 1000);
  camera.position.z = 300;

  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const velocities = new Float32Array(PARTICLE_COUNT * 3);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 500;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 500;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    velocities[i * 3] = (Math.random() - 0.5) * 0.3;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
  }

  const pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const pointsMat = new THREE.PointsMaterial({
    color: PRIMARY_COLOR,
    size: 2.5,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
  });

  points = new THREE.Points(pointsGeo, pointsMat);
  points.userData.velocities = velocities;
  scene.add(points);

  // Pre-allocate the maximum possible line segments to avoid per-frame allocation
  const maxLines = PARTICLE_COUNT * PARTICLE_COUNT;
  const linePositions = new Float32Array(maxLines * 6);
  const lineColors = new Float32Array(maxLines * 6);
  const linesGeo = new THREE.BufferGeometry();
  linesGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
  linesGeo.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));

  const linesMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
  });

  linesMesh = new THREE.LineSegments(linesGeo, linesMat);
  scene.add(linesMesh);

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("resize", onResize);

  animate();
}

/**
 * Main render loop: moves particles, bounces them off boundaries,
 * rebuilds connection lines between close particles, and applies
 * a subtle parallax from the mouse position.
 */
function animate() {
  animationId = requestAnimationFrame(animate);

  const posAttr = points.geometry.attributes.position;
  const pos = posAttr.array;
  const vel = points.userData.velocities;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const ix = i * 3;
    pos[ix] += vel[ix];
    pos[ix + 1] += vel[ix + 1];
    pos[ix + 2] += vel[ix + 2];

    if (Math.abs(pos[ix]) > 250) vel[ix] *= -1;
    if (Math.abs(pos[ix + 1]) > 250) vel[ix + 1] *= -1;
    if (Math.abs(pos[ix + 2]) > 100) vel[ix + 2] *= -1;
  }
  posAttr.needsUpdate = true;

  // Rebuild connection lines: O(n^2) but acceptable for ~120 particles
  const linePos = linesMesh.geometry.attributes.position.array;
  const lineCol = linesMesh.geometry.attributes.color.array;
  let lineIdx = 0;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    for (let j = i + 1; j < PARTICLE_COUNT; j++) {
      const dx = pos[i * 3] - pos[j * 3];
      const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
      const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < CONNECTION_DISTANCE) {
        const alpha = 1 - dist / CONNECTION_DISTANCE;
        const color = DIM_COLOR.clone().lerp(PRIMARY_COLOR, alpha * 0.6);
        const vi = lineIdx * 6;
        linePos[vi] = pos[i * 3];
        linePos[vi + 1] = pos[i * 3 + 1];
        linePos[vi + 2] = pos[i * 3 + 2];
        linePos[vi + 3] = pos[j * 3];
        linePos[vi + 4] = pos[j * 3 + 1];
        linePos[vi + 5] = pos[j * 3 + 2];
        lineCol[vi] = color.r;
        lineCol[vi + 1] = color.g;
        lineCol[vi + 2] = color.b;
        lineCol[vi + 3] = color.r;
        lineCol[vi + 4] = color.g;
        lineCol[vi + 5] = color.b;
        lineIdx++;
      }
    }
  }

  linesMesh.geometry.setDrawRange(0, lineIdx * 2);
  linesMesh.geometry.attributes.position.needsUpdate = true;
  linesMesh.geometry.attributes.color.needsUpdate = true;

  // Subtle camera parallax driven by mouse position
  camera.position.x += (mouseX * 30 - camera.position.x) * 0.02;
  camera.position.y += (mouseY * 20 - camera.position.y) * 0.02;
  camera.lookAt(scene.position);

  renderer.render(scene, camera);
}

function onResize() {
  const el = canvas.value;
  if (!el || !renderer) return;
  const width = el.clientWidth;
  const height = el.clientHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function cleanup() {
  if (animationId) cancelAnimationFrame(animationId);
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("resize", onResize);
  if (renderer) renderer.dispose();
}

onMounted(init);
onUnmounted(cleanup);
</script>

<template>
  <canvas ref="canvas" class="absolute inset-0 w-full h-full" />
</template>
