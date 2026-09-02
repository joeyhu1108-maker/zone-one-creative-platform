import * as THREE from "./three.module.min.js";

const SIGNALS = [
  [121.47, 31.23, 0xff6a35],
  [139.69, 35.68, 0x73e5ee],
  [103.82, 1.35, 0x73e5ee],
  [2.35, 48.86, 0x73e5ee],
  [-74.01, 40.71, 0xff6a35],
  [-118.24, 34.05, 0x73e5ee],
  [-46.63, -23.55, 0x73e5ee],
  [151.21, -33.87, 0x73e5ee],
];

const ART_SIGNALS = [
  [139.69, 35.68, "./art-signal-hokusai.jpg"],
  [2.35, 48.86, "./art-signal-monet.jpg"],
  [-74.01, 40.71, "./art-signal-stieglitz.jpg"],
  [-77.04, -12.05, "./art-signal-inca.jpg"],
  [78.96, 22.59, "./art-signal-shiva.jpg"],
];

function hash01(value) {
  return Math.abs(Math.sin(value * 12.9898 + 78.233) * 43758.5453) % 1;
}

function lonLatToVector(longitude, latitude, radius = 1) {
  const lon = THREE.MathUtils.degToRad(longitude);
  const lat = THREE.MathUtils.degToRad(latitude);
  const cosLat = Math.cos(lat);
  return new THREE.Vector3(
    radius * cosLat * Math.cos(lon),
    radius * Math.sin(lat),
    radius * cosLat * Math.sin(lon),
  );
}

function isLand(mask, longitude, latitude) {
  const x = Math.min(
    mask.width - 1,
    Math.max(0, Math.floor(((longitude + 180) / 360) * mask.width)),
  );
  const y = Math.min(
    mask.height - 1,
    Math.max(0, Math.floor(((90 - latitude) / 180) * mask.height)),
  );
  return mask.bytes[y * mask.width + x] === 1;
}

async function loadMask() {
  const response = await fetch(new URL("./earth-mask.json", import.meta.url));
  if (!response.ok) throw new Error(`Earth mask failed: ${response.status}`);
  const source = await response.json();
  const raw = atob(source.data);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return { width: source.width, height: source.height, bytes };
}

function createPointEarth(mask, variant, count = 52000) {
  const positions = [];
  const colors = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let index = 0; index < count; index += 1) {
    const y = 1 - ((index + 0.5) / count) * 2;
    const radial = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * index;
    const x = Math.cos(theta) * radial;
    const z = Math.sin(theta) * radial;
    const longitude = THREE.MathUtils.radToDeg(Math.atan2(z, x));
    const latitude = THREE.MathUtils.radToDeg(Math.asin(y));
    const land = isLand(mask, longitude, latitude);
    const seed = hash01(index + 9.31);
    if (!land && seed > 0.026) continue;

    const radius = land ? 1.006 : 0.982;
    positions.push(x * radius, y * radius, z * radius);

    if (land) {
      const polar = Math.abs(latitude) / 90;
      const variation = 0.78 + hash01(index * 0.41) * 0.22;
      if (variant === "paper") {
        colors.push(
          (0.13 + polar * 0.045) * variation,
          (0.105 + polar * 0.035) * variation,
          (0.078 + polar * 0.028) * variation,
        );
      } else if (variant === "art") {
        colors.push(
          (0.3 + polar * 0.13) * variation,
          (0.82 + polar * 0.08) * variation,
          (0.86 + polar * 0.1) * variation,
        );
      } else {
        colors.push(
          (0.2 + polar * 0.12) * variation,
          (0.52 + polar * 0.12) * variation,
          (0.56 + polar * 0.14) * variation,
        );
      }
    } else if (variant === "paper") {
      colors.push(0.48, 0.425, 0.34);
    } else {
      colors.push(0.035, 0.075, 0.085);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  const material = variant === "paper"
    ? new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.35) },
      },
      vertexShader: `
        uniform float uPixelRatio;
        varying vec3 vColor;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = clamp(2.15 * uPixelRatio * (3.1 / max(1.0, -mvPosition.z)), 1.15, 3.4);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          vec2 centered = gl_PointCoord - vec2(0.5);
          float alpha = 1.0 - smoothstep(0.34, 0.5, length(centered));
          if (alpha < 0.02) discard;
          gl_FragColor = vec4(vColor, alpha * 0.9);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      vertexColors: true,
      toneMapped: false,
    })
    : new THREE.PointsMaterial({
      size: 0.016,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });

  return new THREE.Points(geometry, material);
}

function addSignal(world, longitude, latitude, color) {
  const normal = lonLatToVector(longitude, latitude).normalize();
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.014, 10, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.98 }),
  );
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.026, 0.031, 28),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  group.add(core, ring);
  group.position.copy(normal.multiplyScalar(1.035));
  world.add(group);
  return { core, ring };
}

function addOrbit(world, radius, rotation, opacity, color = 0x6c9aa3) {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2);
  const points = curve.getPoints(180).map(({ x, y }) => new THREE.Vector3(x, y, 0));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const line = new THREE.LineLoop(geometry, material);
  line.rotation.set(...rotation);
  world.add(line);
}

function addArtworkSignals(world) {
  const loader = new THREE.TextureLoader();
  ART_SIGNALS.forEach(([longitude, latitude, source]) => {
    const texture = loader.load(new URL(source, import.meta.url).href);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.96,
      depthTest: true,
      depthWrite: false,
    }));
    sprite.position.copy(lonLatToVector(longitude, latitude, 1.055));
    sprite.scale.set(0.29, 0.2, 1);
    world.add(sprite);
  });
}

function addArtSignalCloud(world) {
  const positions = [];
  const colors = [];
  for (let index = 0; index < 720; index += 1) {
    const angle = index * 2.39996;
    const shell = 0.58 + hash01(index * 4.17) * 0.78;
    const flatten = 0.34 + hash01(index * 1.93) * 0.3;
    positions.push(
      Math.cos(angle) * shell,
      Math.sin(angle * 0.73) * shell * flatten,
      Math.sin(angle) * shell * 0.46,
    );
    const accent = index % 41 === 0;
    colors.push(...(accent ? [0.86, 1, 0.52] : [0.5, 0.86, 0.88]));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  world.add(new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.012,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    }),
  ));
}

export async function mountMiniEarth(canvas) {
  if (!canvas || canvas.dataset.earthMounted === "true") return null;
  canvas.dataset.earthMounted = "true";
  const variant = canvas.dataset.earthVariant || "system";
  const isPaper = variant === "paper";
  const isMobile = window.matchMedia("(max-width: 720px)").matches;
  const listenerController = new AbortController();
  let destroyed = false;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isPaper ? (isMobile ? 1 : 1.35) : 1.65));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  if (variant !== "art" && !isPaper) scene.fog = new THREE.FogExp2(0x091014, 0.075);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.04, isPaper ? 3.38 : 3.15);

  const world = new THREE.Group();
  const initialYaw = isPaper ? 0.56 : -0.58;
  world.rotation.x = -0.08;
  world.rotation.y = initialYaw;
  scene.add(world);

  if (variant === "art") {
    addArtSignalCloud(world);
  } else {
    if (!isPaper) {
      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.08, 36, 24),
        new THREE.MeshBasicMaterial({
          color: 0x4fb8c5,
          transparent: true,
          opacity: 0.035,
          side: THREE.BackSide,
          depthWrite: false,
        }),
      );
      world.add(atmosphere);
    }

    let mask;
    try {
      mask = await loadMask();
    } catch (error) {
      renderer.dispose();
      delete canvas.dataset.earthMounted;
      throw error;
    }
    if (destroyed || !canvas.isConnected) {
      renderer.dispose();
      delete canvas.dataset.earthMounted;
      return null;
    }
    world.add(createPointEarth(mask, variant, isPaper ? (isMobile ? 26000 : 46000) : 52000));

    if (!isPaper) {
      const wireframe = new THREE.LineSegments(
        new THREE.WireframeGeometry(new THREE.SphereGeometry(0.986, 28, 18)),
        new THREE.LineBasicMaterial({
          color: 0x71929a,
          transparent: true,
          opacity: 0.055,
          depthWrite: false,
        }),
      );
      world.add(wireframe);
    }
  }

  const activeSignals = isPaper ? SIGNALS.slice(0, 1) : SIGNALS;
  const signalVisuals = activeSignals.map(([longitude, latitude, color], index) => (
    addSignal(
      world,
      longitude,
      latitude,
      isPaper ? 0xdf4a25 : variant === "art" ? (index % 3 === 0 ? 0xdfff86 : 0xd9ffff) : color,
    )
  ));
  if (isPaper) {
    addOrbit(world, 1.14, [1.08, 0.08, -0.34], 0.11, 0x5c4935);
  } else {
    addOrbit(world, 1.18, [1.1, 0.12, -0.38], 0.18);
    addOrbit(world, 1.3, [0.28, -0.62, 1.03], 0.1);
  }
  if (variant === "art") addArtworkSignals(world);

  const container = canvas.closest(".object-media");
  if (container) container.dataset.earthReady = "true";
  canvas.dataset.earthReady = "true";
  canvas.setAttribute("aria-busy", "false");

  let targetYaw = initialYaw;
  let targetPitch = -0.08;
  let yaw = targetYaw;
  let pitch = targetPitch;
  let pointerX = 0;
  let pointerY = 0;
  let dragging = false;
  let frame = 0;
  let visible = true;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clock = new THREE.Clock();

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    renderer.setSize(bounds.width, bounds.height, false);
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();
    world.scale.setScalar(bounds.width < 360 ? 0.86 : 1);
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const finishPointer = (event) => {
    dragging = false;
    canvas.dataset.interacting = "false";
    if (event.pointerId !== undefined && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    dragging = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
    canvas.dataset.interacting = "true";
    canvas.setPointerCapture(event.pointerId);
    canvas.focus({ preventScroll: true });
    event.stopPropagation();
  }, { signal: listenerController.signal });

  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    targetYaw += (event.clientX - pointerX) * 0.006;
    targetPitch += (event.clientY - pointerY) * 0.0035;
    targetPitch = THREE.MathUtils.clamp(targetPitch, -0.55, 0.55);
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (reducedMotion) render();
    event.stopPropagation();
  }, { signal: listenerController.signal });

  canvas.addEventListener("pointerup", finishPointer, { signal: listenerController.signal });
  canvas.addEventListener("pointercancel", finishPointer, { signal: listenerController.signal });
  canvas.addEventListener("click", (event) => event.stopPropagation(), { signal: listenerController.signal });
  canvas.addEventListener("dblclick", (event) => {
    targetYaw = initialYaw;
    targetPitch = -0.08;
    if (reducedMotion) render();
    event.preventDefault();
    event.stopPropagation();
  }, { signal: listenerController.signal });

  canvas.addEventListener("keydown", (event) => {
    const step = 0.16;
    if (event.key === "ArrowLeft") targetYaw -= step;
    else if (event.key === "ArrowRight") targetYaw += step;
    else if (event.key === "ArrowUp") targetPitch = Math.max(-0.55, targetPitch - step);
    else if (event.key === "ArrowDown") targetPitch = Math.min(0.55, targetPitch + step);
    else return;
    if (reducedMotion) render();
    event.preventDefault();
  }, { signal: listenerController.signal });

  const render = () => {
    if (destroyed || !visible) {
      frame = 0;
      return;
    }

    frame = reducedMotion ? 0 : requestAnimationFrame(render);
    const elapsed = clock.getElapsedTime();
    if (!dragging && !reducedMotion) targetYaw += isPaper ? 0.00034 : 0.0007;
    if (reducedMotion) {
      yaw = targetYaw;
      pitch = targetPitch;
    } else {
      yaw += (targetYaw - yaw) * 0.07;
      pitch += (targetPitch - pitch) * 0.07;
    }
    world.rotation.y = yaw;
    world.rotation.x = pitch;
    canvas.earthYaw = yaw;

    signalVisuals.forEach(({ core, ring }, index) => {
      const pulse = reducedMotion ? 0.34 : 0.5 + 0.5 * Math.sin(elapsed * 1.8 + index * 0.72);
      ring.scale.setScalar(0.88 + pulse * 0.8);
      ring.material.opacity = 0.22 + pulse * 0.25;
      core.scale.setScalar(0.9 + pulse * 0.3);
    });

    renderer.render(scene, camera);
  };

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!destroyed && visible && !frame) render();
  }, { rootMargin: "180px" });
  visibilityObserver.observe(canvas);
  render();

  const disposeMaterial = (material) => {
    if (!material) return;
    material.map?.dispose?.();
    material.dispose?.();
  };

  return {
    setActive(active) {
      if (destroyed) return;
      visible = Boolean(active);
      if (visible && !frame) render();
      if (!visible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      listenerController.abort();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      if (frame) cancelAnimationFrame(frame);
      scene.traverse((object) => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach(disposeMaterial);
        else disposeMaterial(object.material);
      });
      renderer.dispose();
      delete canvas.dataset.earthMounted;
      delete canvas.dataset.earthReady;
      delete canvas.earthYaw;
      if (container) container.dataset.earthReady = "false";
    },
  };
}
