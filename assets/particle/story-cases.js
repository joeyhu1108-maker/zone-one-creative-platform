import * as THREE from "./three.module.min.js";

const LIME = new THREE.Color(0xd7ff63);
const CYAN = new THREE.Color(0x73e5ee);
const PAPER = new THREE.Color(0xf1f0e7);
const MUTED = new THREE.Color(0x355c57);

function randomFactory(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function pushColor(target, color, strength = 1) {
  target.push(color.r * strength, color.g * strength, color.b * strength);
}

function pushSphere(positions, colors, center, radius, count, color, random, spread = 0.08) {
  for (let index = 0; index < count; index += 1) {
    const y = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const radial = Math.sqrt(Math.max(0, 1 - y * y));
    const shell = radius * (1 - random() * spread);
    positions.push(
      center.x + Math.cos(angle) * radial * shell,
      center.y + y * shell,
      center.z + Math.sin(angle) * radial * shell,
    );
    pushColor(colors, color, 0.68 + random() * 0.32);
  }
}

function pointMaterial(size = 2.25, opacity = 0.9) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.35) },
      uSize: { value: size },
      uOpacity: { value: opacity },
      uTime: { value: 0 },
      uScatter: { value: 0 },
    },
    vertexShader: `
      uniform float uPixelRatio;
      uniform float uSize;
      uniform float uTime;
      uniform float uScatter;
      attribute float aScale;
      attribute float aPhase;
      varying vec3 vColor;
      varying float vGlow;

      void main() {
        vColor = color;
        vGlow = 0.78 + 0.22 * sin(uTime * 1.45 + aPhase);
        vec3 scatterDirection = normalize(position + vec3(sin(aPhase), cos(aPhase * 1.37), sin(aPhase * 0.73)) * 0.42);
        vec3 displaced = position + scatterDirection * uScatter * (0.42 + aScale * 0.62);
        vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = clamp(uSize * uPixelRatio * aScale * (4.8 / max(1.0, -mvPosition.z)), 1.0, 5.8);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vGlow;

      void main() {
        float distanceToCenter = length(gl_PointCoord - vec2(0.5));
        float alpha = 1.0 - smoothstep(0.2, 0.5, distanceToCenter);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(vColor * vGlow, alpha * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

function pointsFromArrays(positions, colors, random, material) {
  const count = positions.length / 3;
  const scales = new Float32Array(count);
  const phases = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    scales[index] = 0.62 + random() * 0.78;
    phases[index] = random() * Math.PI * 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  return new THREE.Points(geometry, material);
}

function ellipsePoint(angle, radiusX, radiusY, rotationX, rotationY) {
  const point = new THREE.Vector3(Math.cos(angle) * radiusX, Math.sin(angle) * radiusY, 0);
  point.applyEuler(new THREE.Euler(rotationX, rotationY, 0));
  return point;
}

function createObserveScene(isMobile) {
  const random = randomFactory(1108);
  const positions = [];
  const colors = [];
  const personCount = isMobile ? 2550 : 4850;
  const orbitCount = isMobile ? 850 : 1650;
  const fieldCount = isMobile ? 500 : 1050;

  pushSphere(
    positions,
    colors,
    new THREE.Vector3(0, 0.72, 0),
    0.52,
    Math.floor(personCount * 0.39),
    PAPER,
    random,
    0.12,
  );

  for (let index = 0; index < Math.floor(personCount * 0.61); index += 1) {
    const progress = random();
    const y = -1.63 + progress * 1.72;
    const shoulder = Math.exp(-Math.pow((progress - 0.74) / 0.18, 2));
    const neck = Math.exp(-Math.pow((progress - 1) / 0.1, 2));
    const radiusX = 0.53 + shoulder * 0.74 - neck * 0.33;
    const radiusZ = 0.3 + shoulder * 0.17 - neck * 0.12;
    const angle = random() * Math.PI * 2;
    const shell = 0.9 + random() * 0.1;
    positions.push(Math.cos(angle) * radiusX * shell, y, Math.sin(angle) * radiusZ * shell);
    pushColor(colors, random() > 0.84 ? LIME : PAPER, 0.62 + random() * 0.35);
  }

  const rings = [
    [1.48, 0.76, -0.28, 0.3],
    [1.72, 1.04, 0.38, -0.24],
    [1.27, 1.42, 1.02, 0.08],
  ];
  for (let index = 0; index < orbitCount; index += 1) {
    const ring = rings[index % rings.length];
    const angle = (index / orbitCount) * Math.PI * 6 + (random() - 0.5) * 0.04;
    const point = ellipsePoint(angle, ring[0], ring[1], ring[2], ring[3]);
    point.multiplyScalar(0.98 + random() * 0.04);
    positions.push(point.x, point.y - 0.18, point.z);
    pushColor(colors, index % 7 === 0 ? LIME : CYAN, 0.42 + random() * 0.46);
  }

  for (let index = 0; index < fieldCount; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 0.6 + Math.pow(random(), 0.55) * 1.65;
    positions.push(Math.cos(angle) * radius, -1.68 + (random() - 0.5) * 0.045, Math.sin(angle) * radius * 0.68);
    pushColor(colors, MUTED, 0.35 + random() * 0.48);
  }

  const group = new THREE.Group();
  const material = pointMaterial(isMobile ? 2.5 : 2.2, 0.94);
  group.add(pointsFromArrays(positions, colors, random, material));
  group.rotation.x = -0.08;

  return {
    root: group,
    update(time) {
      material.uniforms.uTime.value = time;
      group.rotation.y = Math.sin(time * 0.24) * 0.15;
      group.position.y = Math.sin(time * 0.58) * 0.025;
    },
  };
}

function targetFramePoint(random) {
  const choice = random();
  const width = 3.1;
  const height = 2.24;
  let x = 0;
  let y = 0;
  let z = 0;

  if (choice < 0.46) {
    const perimeter = random() * (width * 2 + height * 2);
    if (perimeter < width) {
      x = perimeter - width / 2;
      y = height / 2;
    } else if (perimeter < width + height) {
      x = width / 2;
      y = height / 2 - (perimeter - width);
    } else if (perimeter < width * 2 + height) {
      x = width / 2 - (perimeter - width - height);
      y = -height / 2;
    } else {
      x = -width / 2;
      y = -height / 2 + (perimeter - width * 2 - height);
    }
    z = -0.16;
  } else if (choice < 0.68) {
    const line = Math.floor(random() * 4);
    if (line === 0) {
      x = -1.28 + random() * 2.56;
      y = 0.75;
    } else if (line === 1) {
      x = -1.28 + random() * 2.56;
      y = -0.63;
    } else {
      x = line === 2 ? -0.48 : 0.53;
      y = -0.48 + random() * 1.08;
    }
    z = 0.08;
  } else if (choice < 0.84) {
    const angle = random() * Math.PI * 2;
    const radius = 0.34 + (random() - 0.5) * 0.035;
    x = Math.cos(angle) * radius + 0.03;
    y = Math.sin(angle) * radius - 0.02;
    z = 0.3;
  } else {
    const row = Math.floor(random() * 3);
    x = -1.18 + random() * 0.58;
    y = 0.38 - row * 0.32 + (random() - 0.5) * 0.015;
    z = 0.18;
  }

  return new THREE.Vector3(x, y, z + (random() - 0.5) * 0.045);
}

function createMakeScene(isMobile) {
  const random = randomFactory(2026);
  const count = isMobile ? 3650 : 7100;
  const positions = new Float32Array(count * 3);
  const targets = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const phases = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(random() * 2 - 1);
    const radius = 0.22 + Math.pow(random(), 0.58) * 1.78;
    positions[index * 3] = Math.sin(phi) * Math.cos(theta) * radius - 0.28;
    positions[index * 3 + 1] = Math.cos(phi) * radius;
    positions[index * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius * 0.74;

    const target = targetFramePoint(random);
    targets[index * 3] = target.x;
    targets[index * 3 + 1] = target.y;
    targets[index * 3 + 2] = target.z;

    const color = index % 9 < 2 ? LIME : index % 9 < 5 ? CYAN : PAPER;
    colors[index * 3] = color.r * (0.64 + random() * 0.36);
    colors[index * 3 + 1] = color.g * (0.64 + random() * 0.36);
    colors[index * 3 + 2] = color.b * (0.64 + random() * 0.36);
    scales[index] = 0.55 + random() * 0.92;
    phases[index] = random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aTarget", new THREE.BufferAttribute(targets, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.35) },
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uScatter: { value: 0 },
    },
    vertexShader: `
      uniform float uPixelRatio;
      uniform float uTime;
      uniform float uMorph;
      uniform float uScatter;
      attribute vec3 aTarget;
      attribute float aScale;
      attribute float aPhase;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        float eased = uMorph * uMorph * (3.0 - 2.0 * uMorph);
        vec3 cloud = position;
        cloud.x += sin(uTime * 0.6 + aPhase) * 0.08;
        cloud.y += cos(uTime * 0.48 + aPhase * 1.3) * 0.06;
        vec3 formed = aTarget;
        formed.z += sin(uTime * 0.75 + aPhase) * 0.012;
        vec3 current = mix(cloud, formed, eased);
        vec3 scatterDirection = normalize(current + vec3(sin(aPhase), cos(aPhase * 1.37), sin(aPhase * 0.73)) * 0.42);
        current += scatterDirection * uScatter * (0.42 + aScale * 0.62);
        vec4 mvPosition = modelViewMatrix * vec4(current, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = clamp(2.35 * uPixelRatio * aScale * (4.8 / max(1.0, -mvPosition.z)), 1.0, 5.5);
        vColor = color;
        vAlpha = 0.7 + eased * 0.25;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        float distanceToCenter = length(gl_PointCoord - vec2(0.5));
        float alpha = 1.0 - smoothstep(0.18, 0.5, distanceToCenter);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(vColor, alpha * vAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });

  const points = new THREE.Points(geometry, material);
  points.rotation.x = -0.06;
  points.rotation.y = -0.16;

  return {
    root: points,
    update(time) {
      material.uniforms.uTime.value = time;
      material.uniforms.uMorph.value = Math.min(1, time / 2.7);
      points.rotation.y = -0.16 + Math.sin(time * 0.3) * 0.045;
    },
  };
}

function quadraticPoint(from, control, to, progress, target) {
  const inverse = 1 - progress;
  target.set(
    inverse * inverse * from.x + 2 * inverse * progress * control.x + progress * progress * to.x,
    inverse * inverse * from.y + 2 * inverse * progress * control.y + progress * progress * to.y,
    inverse * inverse * from.z + 2 * inverse * progress * control.z + progress * progress * to.z,
  );
}

function createShareScene(isMobile) {
  const random = randomFactory(31415);
  const positions = [];
  const colors = [];
  const center = new THREE.Vector3(0, -0.04, 0);
  const nodes = [
    new THREE.Vector3(-1.58, 0.94, -0.08),
    new THREE.Vector3(-0.42, 1.4, 0.18),
    new THREE.Vector3(0.82, 1.24, -0.16),
    new THREE.Vector3(1.67, 0.55, 0.08),
    new THREE.Vector3(1.52, -0.83, -0.1),
    new THREE.Vector3(0.35, -1.38, 0.16),
    new THREE.Vector3(-0.94, -1.22, -0.14),
    new THREE.Vector3(-1.72, -0.38, 0.1),
  ];
  const controls = nodes.map((node, nodeIndex) => {
    const control = node.clone().multiplyScalar(0.48);
    control.z += (nodeIndex % 2 ? -1 : 1) * 0.74;
    control.y += 0.22;
    return control;
  });
  const centerCount = isMobile ? 720 : 1320;
  const nodeCount = isMobile ? 115 : 230;
  const pathCount = isMobile ? 78 : 145;

  pushSphere(positions, colors, center, 0.34, centerCount, LIME, random, 0.28);
  nodes.forEach((node, nodeIndex) => {
    pushSphere(positions, colors, node, 0.12 + (nodeIndex % 3) * 0.018, nodeCount, nodeIndex % 2 ? PAPER : CYAN, random, 0.32);
    const control = controls[nodeIndex];
    const point = new THREE.Vector3();
    for (let index = 0; index < pathCount; index += 1) {
      const progress = index / Math.max(1, pathCount - 1);
      quadraticPoint(center, control, node, progress, point);
      positions.push(point.x, point.y, point.z);
      pushColor(colors, progress > 0.72 ? CYAN : LIME, 0.36 + progress * 0.54);
    }
  });

  const group = new THREE.Group();
  const staticMaterial = pointMaterial(isMobile ? 2.4 : 2.15, 0.92);
  group.add(pointsFromArrays(positions, colors, random, staticMaterial));

  const trailsPerPath = isMobile ? 10 : 18;
  const movingCount = nodes.length * trailsPerPath;
  const movingPositions = new Float32Array(movingCount * 3);
  const movingColors = new Float32Array(movingCount * 3);
  const movingScales = new Float32Array(movingCount);
  const movingPhases = new Float32Array(movingCount);
  const travelOffsets = new Float32Array(movingCount);
  const pathIndexes = new Uint8Array(movingCount);
  for (let index = 0; index < movingCount; index += 1) {
    const color = index % 3 === 0 ? PAPER : LIME;
    movingColors[index * 3] = color.r;
    movingColors[index * 3 + 1] = color.g;
    movingColors[index * 3 + 2] = color.b;
    movingScales[index] = 1.1 + random() * 0.85;
    movingPhases[index] = random() * Math.PI * 2;
    travelOffsets[index] = random();
    pathIndexes[index] = index % nodes.length;
  }
  const movingGeometry = new THREE.BufferGeometry();
  movingGeometry.setAttribute("position", new THREE.BufferAttribute(movingPositions, 3));
  movingGeometry.setAttribute("color", new THREE.BufferAttribute(movingColors, 3));
  movingGeometry.setAttribute("aScale", new THREE.BufferAttribute(movingScales, 1));
  movingGeometry.setAttribute("aPhase", new THREE.BufferAttribute(movingPhases, 1));
  const movingMaterial = pointMaterial(isMobile ? 3.4 : 3.0, 1);
  group.add(new THREE.Points(movingGeometry, movingMaterial));

  const point = new THREE.Vector3();
  return {
    root: group,
    update(time) {
      staticMaterial.uniforms.uTime.value = time;
      movingMaterial.uniforms.uTime.value = time;
      group.rotation.y = Math.sin(time * 0.18) * 0.12;
      for (let index = 0; index < movingCount; index += 1) {
        const nodeIndex = pathIndexes[index];
        const node = nodes[nodeIndex];
        const control = controls[nodeIndex];
        const progress = (travelOffsets[index] + time * 0.12) % 1;
        quadraticPoint(center, control, node, progress, point);
        movingPositions[index * 3] = point.x;
        movingPositions[index * 3 + 1] = point.y;
        movingPositions[index * 3 + 2] = point.z;
      }
      movingGeometry.attributes.position.needsUpdate = true;
    },
  };
}

function createCaseScene(type, isMobile) {
  if (type === "observe") return createObserveScene(isMobile);
  if (type === "make") return createMakeScene(isMobile);
  return createShareScene(isMobile);
}

export async function mountStoryParticles(canvas) {
  if (!(canvas instanceof HTMLCanvasElement) || canvas.dataset.particleMounted === "true") return null;
  canvas.dataset.particleMounted = "true";

  const figure = canvas.closest(".particle-case");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 680px)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.35));
  renderer.setClearColor(0x070b0a, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
  camera.position.set(0, 0, isMobile ? 5.25 : 4.8);
  const caseScene = createCaseScene(canvas.dataset.particleCase, isMobile);
  scene.add(caseScene.root);

  let frame = 0;
  let destroyed = false;
  let active = false;
  let activeSince = performance.now();
  let scatterStarted = -Infinity;
  let reducedScatter = 0;
  let zoom = 1;
  let zoomTarget = 1;
  const listenerController = new AbortController();

  const resize = () => {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    const pixelRatio = renderer.getPixelRatio();
    if (canvas.width !== Math.round(width * pixelRatio) || canvas.height !== Math.round(height * pixelRatio)) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  };

  const setScatter = (value) => {
    caseScene.root.traverse((object) => {
      if (object.material?.uniforms?.uScatter) object.material.uniforms.uScatter.value = value;
    });
  };

  const updateInteraction = (timestamp) => {
    let scatter = reducedScatter;
    if (!reducedMotion) {
      const elapsed = (timestamp - scatterStarted) / 1000;
      if (elapsed >= 0 && elapsed < 0.55) {
        const progress = elapsed / 0.55;
        scatter = 1 - Math.pow(1 - progress, 3);
      } else if (elapsed < 1.05) {
        scatter = 1;
      } else if (elapsed < 2.25) {
        const progress = (elapsed - 1.05) / 1.2;
        scatter = 1 - progress * progress * (3 - 2 * progress);
      } else {
        scatter = 0;
      }
    }
    setScatter(scatter);
    canvas.dataset.scatterState = scatter > 0.01 ? "active" : "idle";
    zoom = reducedMotion ? zoomTarget : zoom + (zoomTarget - zoom) * 0.09;
    caseScene.root.scale.setScalar(zoom);
  };

  const render = (timestamp = performance.now()) => {
    frame = 0;
    if (destroyed || !active) return;
    resize();
    const time = reducedMotion ? 4 : Math.max(0, (timestamp - activeSince) / 1000);
    caseScene.update(time);
    updateInteraction(timestamp);
    renderer.render(scene, camera);
    if (!reducedMotion) frame = requestAnimationFrame(render);
  };

  const syncActive = () => {
    const nextActive = Boolean(figure?.classList.contains("is-active"));
    if (nextActive && !active) activeSince = performance.now();
    active = nextActive;
    if (active && !frame) frame = requestAnimationFrame(render);
    if (!active && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };

  const requestRender = () => {
    if (active && !frame) frame = requestAnimationFrame(render);
  };

  const triggerScatter = () => {
    if (!active) return;
    if (reducedMotion) reducedScatter = reducedScatter > 0 ? 0 : 1;
    else scatterStarted = performance.now();
    canvas.dataset.scatterState = "active";
    requestRender();
  };

  const adjustZoom = (delta) => {
    zoomTarget = THREE.MathUtils.clamp(zoomTarget + delta, 0.7, 1.55);
    canvas.dataset.particleZoom = zoomTarget.toFixed(2);
    requestRender();
  };

  canvas.addEventListener("click", triggerScatter, { signal: listenerController.signal });
  canvas.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") triggerScatter();
    else if (event.key === "+" || event.key === "=") adjustZoom(0.15);
    else if (event.key === "-") adjustZoom(-0.15);
    else if (event.key === "0") {
      zoomTarget = 1;
      canvas.dataset.particleZoom = "1.00";
      requestRender();
    } else return;
    event.preventDefault();
  }, { signal: listenerController.signal });
  canvas.addEventListener("wheel", (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    adjustZoom(event.deltaY < 0 ? 0.08 : -0.08);
    event.preventDefault();
  }, { passive: false, signal: listenerController.signal });
  figure?.querySelectorAll("[data-particle-zoom]").forEach((button) => {
    button.addEventListener("click", () => adjustZoom(button.dataset.particleZoom === "in" ? 0.15 : -0.15), {
      signal: listenerController.signal,
    });
  });

  const resizeObserver = new ResizeObserver(() => {
    resize();
    if (active && reducedMotion) render();
  });
  resizeObserver.observe(figure || canvas);
  const classObserver = new MutationObserver(syncActive);
  if (figure) classObserver.observe(figure, { attributes: true, attributeFilter: ["class"] });

  resize();
  caseScene.update(reducedMotion ? 4 : 0);
  setScatter(0);
  renderer.render(scene, camera);
  canvas.dataset.particleReady = "true";
  canvas.dataset.particleZoom = "1.00";
  canvas.dataset.scatterState = "idle";
  syncActive();

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (frame) cancelAnimationFrame(frame);
      listenerController.abort();
      resizeObserver.disconnect();
      classObserver.disconnect();
      scene.traverse((object) => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
        else object.material?.dispose?.();
      });
      renderer.dispose();
      delete canvas.dataset.particleMounted;
      delete canvas.dataset.particleReady;
    },
  };
}
