import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import './style.css';

const PLAYER_RADIUS = 0.42;
const PLAYER_SPEED = 4.2;
const ROOM_LIMIT_X = 11.25;
const ROOM_LIMIT_Z = 9.25;
const BASE_COLOR = '#65c466';

const PROP_COLLIDERS = [
  { x: -5, z: -5, hx: 1.5, hz: 0.75 },
  { x: 5, z: -5, hx: 1, hz: 1 },
  { x: -6, z: 3, hx: 0.75, hz: 1.5 },
  { x: 5.5, z: 3, hx: 1.5, hz: 0.75 },
  { x: 0, z: -2, hx: 0.5, hz: 0.5 },
  { x: 2.5, z: 4, hx: 0.75, hz: 0.75 },
];

const PALETTE = [
  '#111111', '#ffffff', '#e53935', '#ff7a00', '#ffd43b', '#65c466',
  '#18b66f', '#16a5d9', '#3267e8', '#7d4de8', '#d946ef', '#ff4f81',
  '#795548', '#9e9e9e', '#607d8b', '#f0c39a',
];

function resolveCircleVsBox(position, box, radius) {
  const closestX = THREE.MathUtils.clamp(position.x, box.x - box.hx, box.x + box.hx);
  const closestZ = THREE.MathUtils.clamp(position.z, box.z - box.hz, box.z + box.hz);
  const dx = position.x - closestX;
  const dz = position.z - closestZ;
  const distSq = dx * dx + dz * dz;

  if (distSq >= radius * radius) return;

  if (distSq > 0.000001) {
    const distance = Math.sqrt(distSq);
    const push = radius - distance;
    position.x += (dx / distance) * push;
    position.z += (dz / distance) * push;
    return;
  }

  const left = Math.abs(position.x - (box.x - box.hx));
  const right = Math.abs((box.x + box.hx) - position.x);
  const top = Math.abs(position.z - (box.z - box.hz));
  const bottom = Math.abs((box.z + box.hz) - position.z);
  const smallest = Math.min(left, right, top, bottom);

  if (smallest === left) position.x = box.x - box.hx - radius;
  else if (smallest === right) position.x = box.x + box.hx + radius;
  else if (smallest === top) position.z = box.z - box.hz - radius;
  else position.z = box.z + box.hz + radius;
}

function makePaintTexture(size = 512, base = BASE_COLOR) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, ctx, texture };
}

function Player({ playerRef, paintState, onPaintTarget }) {
  const body = useRef();
  const head = useRef();
  const paintAssets = useRef(null);

  useEffect(() => {
    const bodyPaint = makePaintTexture();
    const headPaint = makePaintTexture();
    paintAssets.current = { body: bodyPaint, head: headPaint };
    return () => {
      bodyPaint.texture.dispose();
      headPaint.texture.dispose();
    };
  }, []);

  const paint = (mesh, uv, forceColor = paintState.color) => {
    if (!paintState.paintMode || !uv || !paintAssets.current) return;
    const target = mesh === body.current ? paintAssets.current.body : paintAssets.current.head;
    const { ctx, texture, canvas } = target;
    const x = uv.x * canvas.width;
    const y = (1 - uv.y) * canvas.height;
    const radius = paintState.eraser ? paintState.brushSize * 1.6 : paintState.brushSize;

    ctx.save();
    ctx.globalAlpha = paintState.eraser ? 1 : 0.9;
    ctx.fillStyle = paintState.eraser ? BASE_COLOR : forceColor;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    texture.needsUpdate = true;

    onPaintTarget();
  };

  const paintDown = (event, mesh) => {
    if (!paintState.paintMode) return;
    event.stopPropagation();
    paint(mesh, event.uv);
    paintState.isPainting.current = true;
  };

  const paintMove = (event, mesh) => {
    if (!paintState.paintMode || !paintState.isPainting.current) return;
    event.stopPropagation();
    paint(mesh, event.uv);
  };

  useEffect(() => {
    const up = () => { paintState.isPainting.current = false; };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, [paintState.isPainting]);

  return (
    <group ref={playerRef} position={[0, 0, 4]} userData={{ isPlayer: true }}>
      <mesh
        ref={body}
        castShadow
        position={[0, 0.72, 0]}
        onPointerDown={(e) => paintDown(e, body.current)}
        onPointerMove={(e) => paintMove(e, body.current)}
      >
        <capsuleGeometry args={[0.38, 0.8, 16, 32]} />
        <meshStandardMaterial map={paintAssets.current?.body.texture} color="#ffffff" roughness={0.82} />
      </mesh>
      <mesh
        ref={head}
        castShadow
        position={[0, 1.52, 0]}
        onPointerDown={(e) => paintDown(e, head.current)}
        onPointerMove={(e) => paintMove(e, head.current)}
      >
        <sphereGeometry args={[0.38, 32, 24]} />
        <meshStandardMaterial map={paintAssets.current?.head.texture} color="#ffffff" roughness={0.82} />
      </mesh>
      <mesh position={[-0.14, 1.6, -0.34]}>
        <sphereGeometry args={[0.075, 12, 12]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      <mesh position={[0.14, 1.6, -0.34]}>
        <sphereGeometry args={[0.075, 12, 12]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
    </group>
  );
}

function Prop({ position, scale = [1, 1, 1], color = '#8b6545' }) {
  return (
    <mesh castShadow receiveShadow position={position} scale={scale} userData={{ camoSurface: true }}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

function Room({ onSurfacePick }) {
  const surfaceClick = (event) => {
    if (!onSurfacePick) return;
    event.stopPropagation();
    const color = event.object.material?.color;
    if (color) onSurfacePick(`#${color.getHexString()}`);
  };

  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} userData={{ camoSurface: true }} onClick={surfaceClick}>
        <planeGeometry args={[24, 20]} />
        <meshStandardMaterial color="#6b6256" roughness={1} />
      </mesh>
      <mesh receiveShadow position={[0, 4, -10]} userData={{ camoSurface: true }} onClick={surfaceClick}>
        <boxGeometry args={[24, 8, 0.5]} />
        <meshStandardMaterial color="#b7a98e" roughness={0.95} />
      </mesh>
      <mesh receiveShadow position={[-12, 4, 0]} userData={{ camoSurface: true }} onClick={surfaceClick}>
        <boxGeometry args={[0.5, 8, 20]} />
        <meshStandardMaterial color="#a9977b" roughness={0.95} />
      </mesh>
      <mesh receiveShadow position={[12, 4, 0]} userData={{ camoSurface: true }} onClick={surfaceClick}>
        <boxGeometry args={[0.5, 8, 20]} />
        <meshStandardMaterial color="#a9977b" roughness={0.95} />
      </mesh>
      <mesh receiveShadow position={[0, 4, 10]} userData={{ camoSurface: true }} onClick={surfaceClick}>
        <boxGeometry args={[24, 8, 0.5]} />
        <meshStandardMaterial color="#b7a98e" roughness={0.95} />
      </mesh>

      <Prop position={[-5, 1, -5]} scale={[3, 2, 1.5]} color="#79583d" />
      <Prop position={[5, 1.25, -5]} scale={[2, 2.5, 2]} color="#9c724e" />
      <Prop position={[-6, 0.75, 3]} scale={[1.5, 1.5, 3]} color="#6e4d38" />
      <Prop position={[5.5, 1, 3]} scale={[3, 2, 1.5]} color="#806044" />
      <Prop position={[0, 0.5, -2]} scale={[1, 1, 1]} color="#b88759" />
      <Prop position={[2.5, 0.75, 4]} scale={[1.5, 1.5, 1.5]} color="#72513a" />
    </group>
  );
}

function ThirdPersonController({ playerRef, locked, paintMode, setLocked, setSampleColor }) {
  const { camera, gl, scene } = useThree();
  const keys = useRef({});
  const yaw = useRef(0);
  const pitch = useRef(0.22);
  const smoothCamera = useRef(new THREE.Vector3(0, 3.2, 8));
  const targetCamera = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3());
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const screenCenter = useMemo(() => new THREE.Vector2(0, 0), []);

  const sampleSurface = () => {
    if (!playerRef.current) return;
    raycaster.setFromCamera(screenCenter, camera);
    const intersections = raycaster.intersectObjects(scene.children, true);
    const hit = intersections.find((intersection) => {
      let object = intersection.object;
      while (object) {
        if (object === playerRef.current) return false;
        object = object.parent;
      }
      return intersection.object.userData.camoSurface === true;
    });
    if (!hit || !hit.object.material?.color) return;
    const sampled = hit.object.material.color.clone();
    setSampleColor(`#${sampled.getHexString()}`);
  };

  useEffect(() => {
    const down = (event) => {
      keys.current[event.code] = true;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(event.code)) event.preventDefault();
      if (event.code === 'KeyP') {
        event.preventDefault();
        document.exitPointerLock?.();
      }
      if (event.code === 'KeyE') {
        event.preventDefault();
        sampleSurface();
      }
    };
    const up = (event) => { keys.current[event.code] = false; };
    const mouse = (event) => {
      if (paintMode || document.pointerLockElement !== gl.domElement) return;
      yaw.current -= event.movementX * 0.0022;
      pitch.current = THREE.MathUtils.clamp(pitch.current - event.movementY * 0.0017, -0.15, 0.72);
    };
    const lockChange = () => setLocked(document.pointerLockElement === gl.domElement);

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    document.addEventListener('mousemove', mouse);
    document.addEventListener('pointerlockchange', lockChange);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      document.removeEventListener('mousemove', mouse);
      document.removeEventListener('pointerlockchange', lockChange);
    };
  }, [camera, gl, paintMode, playerRef, raycaster, scene, screenCenter, setLocked, setSampleColor]);

  useEffect(() => {
    const click = () => {
      if (!paintMode && document.pointerLockElement !== gl.domElement) gl.domElement.requestPointerLock();
    };
    gl.domElement.addEventListener('click', click);
    return () => gl.domElement.removeEventListener('click', click);
  }, [gl, paintMode]);

  useFrame((_, delta) => {
    if (!playerRef.current) return;
    const player = playerRef.current;

    if (!paintMode) {
      const move = new THREE.Vector3();
      const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
      const right = new THREE.Vector3(Math.cos(yaw.current), 0, -Math.sin(yaw.current));
      if (keys.current.KeyW) move.add(forward);
      if (keys.current.KeyS) move.sub(forward);
      if (keys.current.KeyD) move.add(right);
      if (keys.current.KeyA) move.sub(right);

      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(PLAYER_SPEED * Math.min(delta, 0.05));
        player.position.x += move.x;
        player.position.z += move.z;
        player.position.x = THREE.MathUtils.clamp(player.position.x, -ROOM_LIMIT_X, ROOM_LIMIT_X);
        player.position.z = THREE.MathUtils.clamp(player.position.z, -ROOM_LIMIT_Z, ROOM_LIMIT_Z);
        PROP_COLLIDERS.forEach((box) => resolveCircleVsBox(player.position, box, PLAYER_RADIUS));
        player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, Math.atan2(move.x, move.z), 0.2);
      }
    }

    const cameraDistance = paintMode ? 4.2 : 5.2;
    const cameraHeight = paintMode ? 1.6 : 1.9;
    const cosPitch = Math.cos(pitch.current);
    targetCamera.current.set(
      player.position.x + Math.sin(yaw.current) * cameraDistance * cosPitch,
      player.position.y + cameraHeight + Math.sin(pitch.current) * cameraDistance,
      player.position.z + Math.cos(yaw.current) * cameraDistance * cosPitch
    );
    targetCamera.current.x = THREE.MathUtils.clamp(targetCamera.current.x, -10.8, 10.8);
    targetCamera.current.z = THREE.MathUtils.clamp(targetCamera.current.z, -8.8, 8.8);
    targetCamera.current.y = THREE.MathUtils.clamp(targetCamera.current.y, 1.1, 7.5);
    smoothCamera.current.lerp(targetCamera.current, 1 - Math.pow(0.001, delta));
    camera.position.copy(smoothCamera.current);
    lookTarget.current.set(player.position.x, player.position.y + 1.05, player.position.z);
    camera.lookAt(lookTarget.current);
  });

  return null;
}

function PaintUI({ paintMode, setPaintMode, color, setColor, brushSize, setBrushSize, eraser, setEraser, sampleColor, setColorFromSurface }) {
  return (
    <>
      <div className={`paint-dock ${paintMode ? 'visible' : ''}`}>
        <div className="paint-topline">
          <div>
            <div className="paint-title">PAINT YOUR CHAMELEON</div>
            <div className="paint-subtitle">Click + drag directly over the character</div>
          </div>
          <button className="close-paint" onClick={() => setPaintMode(false)}>DONE</button>
        </div>

        <div className="paint-tools">
          <div className="palette-wheel" aria-label="Color palette">
            {PALETTE.map((swatch, index) => {
              const angle = (index / PALETTE.length) * Math.PI * 2 - Math.PI / 2;
              const radius = 56;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              return (
                <button
                  key={swatch}
                  className={`palette-dot ${color.toLowerCase() === swatch.toLowerCase() ? 'selected' : ''}`}
                  style={{ background: swatch, transform: `translate(${x}px, ${y}px)` }}
                  onClick={() => { setColor(swatch); setEraser(false); }}
                  aria-label={`Choose ${swatch}`}
                />
              );
            })}
            <div className="palette-center" style={{ background: eraser ? BASE_COLOR : color }}>
              <span>{eraser ? 'ERASE' : 'COLOR'}</span>
            </div>
          </div>

          <div className="tool-column">
            <label className="color-picker-button">
              <span className="tool-icon" style={{ background: color }} />
              COLOR PICKER
              <input type="color" value={color} onChange={(e) => { setColor(e.target.value); setEraser(false); }} />
            </label>
            <button className="tool-button" onClick={setColorFromSurface}>
              <span className="eyedropper-icon">⌖</span>
              EYEDROPPER <small>E</small>
            </button>
            <button className={`tool-button ${eraser ? 'active' : ''}`} onClick={() => setEraser(!eraser)}>
              <span className="eraser-icon">◐</span>
              ERASER
            </button>
          </div>

          <div className="brush-column">
            <div className="brush-label">BRUSH</div>
            {[8, 18, 34].map((size) => (
              <button key={size} className={`brush-button ${brushSize === size ? 'active' : ''}`} onClick={() => { setBrushSize(size); setEraser(false); }}>
                <span style={{ width: Math.min(size, 30), height: Math.min(size, 30) }} />
                {size === 8 ? 'S' : size === 18 ? 'M' : 'L'}
              </button>
            ))}
          </div>
        </div>

        <div className="selected-color-row">
          <span className="selected-color" style={{ background: color }} />
          <span>SELECTED <b>{color.toUpperCase()}</b></span>
          <span className="sampled-color" style={{ background: sampleColor }} />
          <span>ENVIRONMENT SAMPLE</span>
        </div>
      </div>

      {!paintMode && (
        <button className="paint-open" onClick={() => setPaintMode(true)}>
          🖌️ PAINT <span>P</span>
        </button>
      )}
    </>
  );
}

function App() {
  const playerRef = useRef();
  const isPainting = useRef(false);
  const [locked, setLocked] = useState(false);
  const [paintMode, setPaintMode] = useState(false);
  const [color, setColor] = useState('#9c724e');
  const [brushSize, setBrushSize] = useState(18);
  const [eraser, setEraser] = useState(false);
  const [sampleColor, setSampleColor] = useState(BASE_COLOR);
  const [paintCount, setPaintCount] = useState(0);

  useEffect(() => {
    if (paintMode) document.exitPointerLock?.();
  }, [paintMode]);

  const paintState = useMemo(() => ({
    paintMode,
    color,
    brushSize,
    eraser,
    isPainting,
  }), [paintMode, color, brushSize, eraser]);

  const paintTarget = () => setPaintCount((count) => count + 1);
  const setColorFromSurface = () => setColor(sampleColor);

  return (
    <div className={`game ${paintMode ? 'painting-mode' : ''}`}>
      <Canvas shadows camera={{ position: [0, 3.2, 9], fov: 65, near: 0.1, far: 100 }} gl={{ antialias: true }}>
        <color attach="background" args={['#9ba7b1']} />
        <fog attach="fog" args={['#9ba7b1', 18, 55]} />
        <ambientLight intensity={1.8} />
        <directionalLight castShadow position={[6, 12, 5]} intensity={3} shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
        <Sky sunPosition={[100, 20, 50]} turbidity={7} rayleigh={1.2} />
        <Room onSurfacePick={setSampleColor} />
        <Player playerRef={playerRef} paintState={paintState} onPaintTarget={paintTarget} />
        <ThirdPersonController playerRef={playerRef} locked={locked} paintMode={paintMode} setLocked={setLocked} setSampleColor={setSampleColor} />
      </Canvas>

      <div className="hud">
        <div className="brand">HIDENSEEK <span>3D</span></div>
        <div className="objective">TEST ROOM · 3D PAINT PROTOTYPE</div>

        {!paintMode && !locked && (
          <div className="start-card">
            <div className="start-title">ENTER THE ROOM</div>
            <div className="start-subtitle">Click anywhere to capture the mouse</div>
            <div className="key-row"><span>W A S D</span> Move <span>MOUSE</span> Look <span>P</span> Paint</div>
          </div>
        )}

        {paintMode && (
          <div className="paint-instruction">PAINT MODE · DRAG YOUR BRUSH OVER THE 3D CHARACTER</div>
        )}

        {!paintMode && locked && (
          <div className="camo-panel compact">
            <div className="camo-heading"><span>PAINT COVERAGE</span><strong>{Math.min(100, Math.round(paintCount / 2))}%</strong></div>
            <div className="camo-bar"><div className="camo-fill" style={{ width: `${Math.min(100, Math.round(paintCount / 2))}%` }} /></div>
            <div className="camo-status"><span className="sample-swatch" style={{ background: sampleColor }} /><span>READY TO HIDE</span><span className="camo-help">P · PAINT</span></div>
          </div>
        )}

        {!paintMode && <div className="controls"><b>WASD</b> move&nbsp;&nbsp; <b>MOUSE</b> look&nbsp;&nbsp; <b>P</b> paint&nbsp;&nbsp; <b>E</b> sample</div>}
        {!paintMode && <div className="crosshair">+</div>}
      </div>

      <PaintUI
        paintMode={paintMode}
        setPaintMode={setPaintMode}
        color={color}
        setColor={setColor}
        brushSize={brushSize}
        setBrushSize={setBrushSize}
        eraser={eraser}
        setEraser={setEraser}
        sampleColor={sampleColor}
        setColorFromSurface={setColorFromSurface}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);
