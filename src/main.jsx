import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { CapsuleCollider, CuboidCollider, Physics, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import './style.css';

const COLORS = ['#111111','#ffffff','#e53935','#ff7a00','#ffd43b','#65c466','#18b66f','#16a5d9','#3267e8','#7d4de8','#d946ef','#ff4f81','#795548','#9e9e9e','#607d8b','#f0c39a'];
const BASE_COLOR = '#f3f0ea';
const WALK_SPEED = 3.7;
const JUMP_SPEED = 6.4;

function Material({ color, metalness = 0, roughness = 0.8, map }) {
  return <meshStandardMaterial color={color} map={map} metalness={metalness} roughness={roughness} />;
}

function SolidBox({ position, size, color, rotation = [0, 0, 0], metalness = 0, roughness = 0.8, paintable = true }) {
  return (
    <RigidBody type="fixed" colliders="cuboid" friction={1} restitution={0}>
      <mesh position={position} rotation={rotation} castShadow receiveShadow userData={{ paintSurface: paintable }}>
        <boxGeometry args={size} />
        <Material color={color} metalness={metalness} roughness={roughness} />
      </mesh>
    </RigidBody>
  );
}

function SoftBox({ position, size, color, rotation = [0, 0, 0] }) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow userData={{ paintSurface: true }}>
      <boxGeometry args={size} />
      <Material color={color} roughness={0.98} />
    </mesh>
  );
}

function Sofa({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <SolidBox position={[0, 0.48, 0]} size={[3.6, 0.7, 1.45]} color="#667b4f" />
      <SolidBox position={[0, 1.06, 0.5]} size={[3.6, 0.95, 0.28]} color="#5c7048" />
      <SoftBox position={[-1.05, 0.88, -0.08]} size={[0.92, 0.2, 1.05]} color="#d9c8ae" />
      <SoftBox position={[0, 0.88, -0.08]} size={[0.92, 0.2, 1.05]} color="#cab99f" />
      <SoftBox position={[1.05, 0.88, -0.08]} size={[0.92, 0.2, 1.05]} color="#d9c8ae" />
    </group>
  );
}

function Table({ position, size = [2.4, 0.18, 1.3] }) {
  return (
    <group position={position}>
      <SolidBox position={[0, 0.82, 0]} size={size} color="#6b442c" />
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => (
        <SolidBox key={`${x}-${z}`} position={[x * (size[0] / 2 - 0.12), 0.4, z * (size[2] / 2 - 0.12)]} size={[0.18, 0.82, 0.18]} color="#4a3022" />
      )))}
    </group>
  );
}

function Chair({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <SolidBox position={[0, 0.52, 0]} size={[0.72, 0.16, 0.72]} color="#8b5f42" />
      <SolidBox position={[0, 0.98, 0.28]} size={[0.72, 0.9, 0.14]} color="#8b5f42" />
      {[[-0.25, 0.28, -0.25], [0.25, 0.28, -0.25], [-0.25, 0.28, 0.25], [0.25, 0.28, 0.25]].map(([x, y, z]) => (
        <SolidBox key={`${x}${z}`} position={[x, y, z]} size={[0.12, 0.56, 0.12]} color="#68452f" />
      ))}
    </group>
  );
}

function Bed({ position, rotation = 0, blanket = '#9eb6de' }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <SolidBox position={[0, 0.48, 0]} size={[3.4, 0.65, 5]} color="#765742" />
      <SoftBox position={[0, 0.88, -0.15]} size={[3.18, 0.35, 4.5]} color="#eee7df" />
      <SoftBox position={[0, 1.1, -1.35]} size={[3.08, 0.28, 2.1]} color={blanket} />
      <SoftBox position={[-1.03, 1.16, -1.75]} size={[1.05, 0.18, 0.68]} color="#f3e9dc" />
      <SoftBox position={[1.03, 1.16, -1.75]} size={[1.05, 0.18, 0.68]} color="#f3e9dc" />
      <SolidBox position={[0, 1.52, -2.34]} size={[3.48, 1.75, 0.22]} color="#78533c" />
    </group>
  );
}

function Kitchen() {
  return (
    <group>
      <SolidBox position={[0, 0.7, -10.65]} size={[6.6, 1.4, 1.0]} color="#6f452d" />
      <SolidBox position={[-2.2, 1.46, -10.65]} size={[2.0, 0.16, 1.05]} color="#cfc7b7" />
      <SolidBox position={[1.2, 1.46, -10.65]} size={[1.4, 0.16, 1.05]} color="#cfc7b7" />
      <SolidBox position={[3.0, 1.55, -10.65]} size={[1.35, 2.95, 1.1]} color="#cdd2d5" metalness={0.25} roughness={0.3} />
      <SolidBox position={[-0.2, 0.78, -7.55]} size={[4.4, 1.55, 1.8]} color="#805336" />
      <SolidBox position={[-0.2, 1.59, -7.55]} size={[4.15, 0.18, 1.65]} color="#d6b67f" />
      <Chair position={[-1.45, 0, -6.25]} />
      <Chair position={[1.15, 0, -6.25]} />
      <SolidBox position={[0.8, 2.45, -10.65]} size={[3.9, 0.12, 0.18]} color="#6f452d" />
      <SolidBox position={[-1.6, 1.6, -10.65]} size={[1.4, 0.06, 0.65]} color="#24282b" />
    </group>
  );
}

function House() {
  const wall = '#e7d6bd';
  return (
    <group>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.16, 0]} receiveShadow userData={{ paintSurface: true }}>
          <boxGeometry args={[38, 0.3, 26]} />
          <Material color="#b88d66" roughness={1} />
        </mesh>
      </RigidBody>

      <SolidBox position={[-19, 2, 0]} size={[0.6, 4, 26]} color={wall} />
      <SolidBox position={[19, 2, 0]} size={[0.6, 4, 26]} color={wall} />
      <SolidBox position={[-9.5, 2, -13]} size={[19, 4, 0.6]} color={wall} />
      <SolidBox position={[9.5, 2, -13]} size={[19, 4, 0.6]} color={wall} />
      <SolidBox position={[-9.5, 2, 13]} size={[19, 4, 0.6]} color={wall} />
      <SolidBox position={[9.5, 2, 13]} size={[19, 4, 0.6]} color={wall} />

      <SolidBox position={[-6.4, 2, -9.3]} size={[0.6, 4, 7.0]} color="#f0dfc6" />
      <SolidBox position={[-6.4, 2, 9.3]} size={[0.6, 4, 7.0]} color="#f0dfc6" />
      <SolidBox position={[6.4, 2, -9.3]} size={[0.6, 4, 7.0]} color="#f0dfc6" />
      <SolidBox position={[6.4, 2, 9.3]} size={[0.6, 4, 7.0]} color="#f0dfc6" />

      <Sofa position={[-12, 0, -7]} />
      <SolidBox position={[-16.7, 1.0, -9.8]} size={[3.0, 1.9, 0.4]} color="#3a2924" />
      <SolidBox position={[-16.7, 1.9, -9.55]} size={[2.4, 1.35, 0.08]} color="#15222b" />
      <Table position={[-12, 0, -3.0]} />
      <SolidBox position={[-12, 0.76, -3.0]} size={[1.2, 0.08, 0.7]} color="#ceb07f" />
      <SolidBox position={[-16.3, 1.2, -3.0]} size={[0.18, 2.0, 0.18]} color="#6c6e6d" />
      <SolidBox position={[-16.3, 2.2, -3.0]} size={[0.75, 0.08, 0.75]} color="#ead79b" />
      <Kitchen />

      <Table position={[11, 0, -8]} size={[3.4, 0.18, 1.5]} />
      <Chair position={[8.8, 0, -8]} rotation={Math.PI / 2} />
      <Chair position={[13.2, 0, -8]} rotation={-Math.PI / 2} />
      <Chair position={[11, 0, -6.25]} />
      <Sofa position={[11, 0, -3.2]} rotation={Math.PI} />

      <Bed position={[-12, 0, 7]} />
      <Table position={[-2.7, 0, 9.2]} size={[2.8, 0.18, 1.2]} />
      <SolidBox position={[-2.7, 1.2, 8.82]} size={[1.4, 0.9, 0.08]} color="#20262b" />
      <Chair position={[-2.7, 0, 10.2]} rotation={Math.PI} />
      <Bed position={[10.8, 0, 7.4]} rotation={Math.PI / 2} blanket="#8fa6d5" />
      <Table position={[15.2, 0, 8.3]} size={[2.5, 0.18, 1.15]} />
      <Chair position={[15.2, 0, 9.25]} rotation={Math.PI} />

      <SolidBox position={[-17.2, 1.45, 5.2]} size={[0.35, 2.9, 3.8]} color="#6d432d" />
      <SolidBox position={[17.2, 1.45, -5]} size={[0.35, 2.9, 3.8]} color="#6d432d" />
      <SolidBox position={[-17.9, 2.1, -3.3]} size={[0.06, 2.0, 4.4]} color="#8ecfe3" paintable={false} />
      <SolidBox position={[17.9, 2.1, 3.6]} size={[0.06, 2.0, 4.4]} color="#8ecfe3" paintable={false} />
    </group>
  );
}

function createPaintAsset() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = BASE_COLOR;
  ctx.fillRect(0, 0, 512, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { canvas, ctx, texture };
}

function Player({ bodyRef, assets }) {
  const a = assets.current;
  return (
    <RigidBody ref={bodyRef} position={[0, 1.05, 4]} colliders={false} enabledRotations={[false, false, false]} linearDamping={12} angularDamping={20}>
      <CapsuleCollider args={[0.42, 0.25]} friction={1} restitution={0} />
      <group scale={0.58}>
        <mesh position={[0, 0.58, 0]} castShadow userData={{ paintTarget: 'body' }}>
          <capsuleGeometry args={[0.22, 0.55, 8, 16]} />
          <Material map={a.body.texture} color="#ffffff" roughness={1} />
        </mesh>
        <mesh position={[0, 1.28, 0]} castShadow userData={{ paintTarget: 'head' }}>
          <sphereGeometry args={[0.23, 20, 14]} />
          <Material map={a.head.texture} color="#ffffff" roughness={1} />
        </mesh>
        <mesh position={[-0.27, 0.62, 0]} castShadow userData={{ paintTarget: 'armL' }}>
          <capsuleGeometry args={[0.065, 0.32, 6, 8]} />
          <Material map={a.armL.texture} color="#ffffff" roughness={1} />
        </mesh>
        <mesh position={[0.27, 0.62, 0]} castShadow userData={{ paintTarget: 'armR' }}>
          <capsuleGeometry args={[0.065, 0.32, 6, 8]} />
          <Material map={a.armR.texture} color="#ffffff" roughness={1} />
        </mesh>
        <mesh position={[-0.11, 0.12, 0]} castShadow userData={{ paintTarget: 'legL' }}>
          <capsuleGeometry args={[0.075, 0.36, 6, 8]} />
          <Material map={a.legL.texture} color="#ffffff" roughness={1} />
        </mesh>
        <mesh position={[0.11, 0.12, 0]} castShadow userData={{ paintTarget: 'legR' }}>
          <capsuleGeometry args={[0.075, 0.36, 6, 8]} />
          <Material map={a.legR.texture} color="#ffffff" roughness={1} />
        </mesh>
      </group>
    </RigidBody>
  );
}

function MovementController({ bodyRef, painting }) {
  const { camera, gl } = useThree();
  const keys = useRef({});
  const yaw = useRef(0);
  const pitch = useRef(0.16);
  const wasGrounded = useRef(true);
  const spaceLatch = useRef(false);

  useEffect(() => {
    const down = (e) => {
      keys.current[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
    };
    const up = (e) => {
      keys.current[e.code] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useEffect(() => {
    const canvas = gl.domElement;
    const click = () => {
      if (!painting && document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
    };
    const move = (e) => {
      if (painting || document.pointerLockElement !== canvas) return;
      yaw.current -= e.movementX * 0.0023;
      pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * 0.0018, -0.55, 0.55);
    };
    const esc = (e) => {
      if (e.code === 'Escape') document.exitPointerLock?.();
    };
    canvas.addEventListener('click', click);
    document.addEventListener('mousemove', move);
    window.addEventListener('keydown', esc);
    return () => {
      canvas.removeEventListener('click', click);
      document.removeEventListener('mousemove', move);
      window.removeEventListener('keydown', esc);
    };
  }, [gl, painting]);

  useFrame((_, delta) => {
    if (painting || !bodyRef.current) return;
    const body = bodyRef.current;
    const vel = body.linvel();
    const move = new THREE.Vector3();
    if (keys.current.KeyW) move.z -= 1;
    if (keys.current.KeyS) move.z += 1;
    if (keys.current.KeyA) move.x -= 1;
    if (keys.current.KeyD) move.x += 1;
    if (move.lengthSq() > 0) {
      move.normalize();
      const sy = Math.sin(yaw.current);
      const cy = Math.cos(yaw.current);
      const wx = move.x * cy - move.z * sy;
      const wz = move.x * sy + move.z * cy;
      body.setLinvel({ x: wx * WALK_SPEED, y: vel.y, z: wz * WALK_SPEED }, true);
      const rot = Math.atan2(wx, wz);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0));
      body.setRotation(q, true);
    } else {
      body.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
    }

    const pos = body.translation();
    const grounded = pos.y <= 1.08;
    if (keys.current.Space && !spaceLatch.current) {
      spaceLatch.current = true;
      if (grounded) body.setLinvel({ x: vel.x, y: JUMP_SPEED, z: vel.z }, true);
    }
    if (!keys.current.Space) spaceLatch.current = false;
    wasGrounded.current = grounded;

    const target = new THREE.Vector3(pos.x, pos.y + 0.85, pos.z);
    const distance = 4.4;
    const offset = new THREE.Vector3(
      Math.sin(yaw.current) * distance * Math.cos(pitch.current),
      2.0 + Math.sin(pitch.current) * distance,
      Math.cos(yaw.current) * distance * Math.cos(pitch.current)
    );
    camera.position.lerp(target.clone().add(offset), 1 - Math.pow(0.001, delta));
    camera.lookAt(target);
  });

  return null;
}

function PaintController({ bodyRef, assets, color, brushSize, eraser, onSample }) {
  const { camera, gl, scene } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);
  const drawing = useRef(false);
  const lastPoint = useRef(null);

  const cast = (clientX, clientY) => {
    const rect = gl.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    raycaster.setFromCamera(pointer, camera);
  };

  const playerHit = (x, y) => {
    cast(x, y);
    return raycaster.intersectObject(bodyRef.current, true).find((h) => h.object.userData.paintTarget && h.uv);
  };

  const sample = (x, y) => {
    cast(x, y);
    const hits = raycaster.intersectObjects(scene.children, true);
    const hit = hits.find((h) => h.object.userData.paintSurface && h.object.material?.color);
    if (hit) onSample(`#${hit.object.material.color.getHexString()}`);
  };

  const dab = (hit) => {
    if (!hit) return;
    const part = assets.current[hit.object.userData.paintTarget];
    if (!part) return;
    const radius = THREE.MathUtils.lerp(3, 140, brushSize / 100);
    const x = hit.uv.x * part.canvas.width;
    const y = (1 - hit.uv.y) * part.canvas.height;
    part.ctx.fillStyle = eraser ? BASE_COLOR : color;
    part.ctx.beginPath();
    part.ctx.arc(x, y, radius, 0, Math.PI * 2);
    part.ctx.fill();
    part.texture.needsUpdate = true;
  };

  useEffect(() => {
    const down = (e) => {
      if (e.button !== 0) return;
      const hit = playerHit(e.clientX, e.clientY);
      drawing.current = !!hit;
      lastPoint.current = { x: e.clientX, y: e.clientY };
      if (hit) dab(hit);
      else sample(e.clientX, e.clientY);
    };
    const move = (e) => {
      if (!drawing.current || !lastPoint.current) return;
      const a = lastPoint.current;
      const b = { x: e.clientX, y: e.clientY };
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 5));
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        const hit = playerHit(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
        if (hit) dab(hit);
      }
      lastPoint.current = b;
    };
    const up = () => { drawing.current = false; lastPoint.current = null; };
    gl.domElement.addEventListener('pointerdown', down);
    gl.domElement.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      gl.domElement.removeEventListener('pointerdown', down);
      gl.domElement.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [gl, bodyRef, assets, color, brushSize, eraser, camera, scene]);

  return null;
}

function PaintHUD({ active, color, setColor, brushSize, setBrushSize, eraser, setEraser }) {
  if (!active) return null;
  return (
    <div className="paint-tools">
      <div className="paint-wheel">
        <div className="wheel-ring">
          {COLORS.map((c, i) => {
            const angle = (i / COLORS.length) * Math.PI * 2 - Math.PI / 2;
            return (
              <button key={c} className={`color-dot ${color.toLowerCase() === c ? 'selected' : ''}`} style={{ background: c, transform: `translate(${Math.cos(angle) * 50}px, ${Math.sin(angle) * 50}px)` }} onClick={() => { setColor(c); setEraser(false); }} />
            );
          })}
          <div className="wheel-center" style={{ background: eraser ? BASE_COLOR : color }} />
        </div>
      </div>
      <label className="picker-button">
        <span style={{ background: eraser ? BASE_COLOR : color }} />
        <input type="color" value={color} onChange={(e) => { setColor(e.target.value); setEraser(false); }} />
      </label>
      <div className="size-control">
        <span className="size-value">{brushSize}</span>
        <input aria-label="Brush size" type="range" min="1" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} />
      </div>
      <div className={`eraser-badge ${eraser ? 'active' : ''}`}><b>E</b><span>ERASER</span></div>
    </div>
  );
}

function App() {
  const bodyRef = useRef();
  const assets = useRef(null);
  if (!assets.current) {
    assets.current = {
      body: createPaintAsset(), head: createPaintAsset(), armL: createPaintAsset(), armR: createPaintAsset(), legL: createPaintAsset(), legR: createPaintAsset(),
    };
  }
  const [painting, setPainting] = useState(false);
  const [color, setColor] = useState('#65c466');
  const [brushSize, setBrushSize] = useState(100);
  const [eraser, setEraser] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'KeyP') {
        e.preventDefault();
        document.exitPointerLock?.();
        setPainting((v) => !v);
      }
      if (e.code === 'Enter' && painting) {
        e.preventDefault();
        setPainting(false);
      }
      if (e.code === 'KeyE' && painting) {
        e.preventDefault();
        setEraser((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [painting]);

  return (
    <div className="app">
      <Canvas shadows camera={{ position: [0, 3, 8], fov: 58 }} dpr={[1, 1.6]}>
        <color attach="background" args={['#9bc1d2']} />
        <fog attach="fog" args={['#9bc1d2', 28, 70]} />
        <Sky sunPosition={[60, 25, 25]} turbidity={7} rayleigh={1.2} />
        <ambientLight intensity={2.0} />
        <directionalLight castShadow position={[8, 14, 6]} intensity={3.3} shadow-mapSize={[2048, 2048]} />
        <Physics gravity={[0, -16, 0]}>
          <House />
          <Player bodyRef={bodyRef} assets={assets} />
          <MovementController bodyRef={bodyRef} painting={painting} />
          {painting && <PaintController bodyRef={bodyRef} assets={assets} color={color} brushSize={brushSize} eraser={eraser} onSample={(c) => { setColor(c); setEraser(false); }} />}
          <CuboidCollider position={[0, -0.15, 0]} args={[19, 0.15, 13]} friction={1} restitution={0} />
        </Physics>
      </Canvas>

      <div className="crosshair">+</div>
      <div className="brand">HIDENSEEK <span>3D</span></div>
      <div className="status">HOUSE · CAMOUFLAGE TEST</div>
      <div className="help">CLICK · LOOK &nbsp; WASD · MOVE &nbsp; SPACE · JUMP &nbsp; P · PAINT &nbsp; ESC · RELEASE</div>
      <PaintHUD active={painting} color={color} setColor={setColor} brushSize={brushSize} setBrushSize={setBrushSize} eraser={eraser} setEraser={setEraser} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
