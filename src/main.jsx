import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Float, MeshReflectorMaterial, Sparkles, Stars, useGLTF } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette, SMAA } from '@react-three/postprocessing';
import { CapsuleCollider, CuboidCollider, Physics, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import './style.css';

const GLB_URL = 'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF-Binary/DamagedHelmet.glb';
const START_TIME = 90;
const WALK_SPEED = 5.4;
const DASH_SPEED = 14;
const JUMP_SPEED = 7.2;

const CORE_POSITIONS = [
  [-18, 1.1, -18], [-7, 1.1, -21], [7, 1.1, -18], [19, 1.1, -12],
  [24, 1.1, -2], [18, 1.1, 10], [7, 1.1, 19], [-6, 1.1, 21],
  [-18, 1.1, 17], [-24, 1.1, 7], [-24, 1.1, -5], [-14, 1.1, 7],
];

const BLOCKS = [
  [-13, 1.1, -3, [4, 2.2, 2]], [-4, 1.1, -13, [2.4, 2.2, 5]],
  [8, 1.2, -5, [4.3, 2.4, 2.2]], [18, 1.1, 1, [2.4, 2.2, 5]],
  [7, 1.1, 12, [5, 2.2, 2]], [-8, 1.35, 10, [2.2, 2.7, 5]],
  [-18, 1.1, 2, [4, 2.2, 2]], [1, 0.9, 20, [3, 1.8, 3]],
];

const DRONES = [[-14, 4.8, -10], [12, 5.2, -14], [23, 4.8, 5], [-19, 5.1, 12], [5, 5, 15]];

function PBR({ color = '#fff', roughness = 0.75, metalness = 0.1, emissive = '#000', emissiveIntensity = 0, clearcoat = 0.15 }) {
  return <meshPhysicalMaterial color={color} roughness={roughness} metalness={metalness} emissive={emissive} emissiveIntensity={emissiveIntensity} clearcoat={clearcoat} clearcoatRoughness={0.22} />;
}

function Building({ x, z, w, d, h, tint }) {
  return <group position={[x, h / 2, z]}>
    <mesh castShadow receiveShadow><boxGeometry args={[w, h, d]} /><PBR color={tint} roughness={0.67} metalness={0.1} /></mesh>
    {Array.from({ length: Math.max(4, Math.floor(w / 1.7)) }).map((_, i) => (
      <mesh key={i} position={[-w / 2 + 0.7 + i * ((w - 1.4) / Math.max(1, Math.floor(w / 1.7) - 1)), 0.75, d / 2 + 0.02]}>
        <boxGeometry args={[0.55, 0.7, 0.03]} />
        <PBR color="#102239" roughness={0.16} metalness={0.55} emissive={i % 3 ? '#57cfff' : '#ff934d'} emissiveIntensity={0.5} clearcoat={0.3} />
      </mesh>
    ))}
  </group>;
}

function City() {
  const buildings = [
    [-29, -27, 7, 8, 13], [-17, -29, 6, 7, 9], [-6, -29, 7, 6, 16], [10, -28, 8, 7, 11], [24, -28, 7, 8, 15],
    [-29, -16, 7, 7, 10], [-28, -2, 8, 8, 17], [29, -10, 8, 10, 12], [-31, 13, 7, 8, 14],
    [27, 16, 8, 9, 18], [-27, 27, 9, 6, 11], [-14, 29, 7, 8, 15], [1, 29, 8, 7, 12],
    [16, 29, 9, 8, 17], [30, 26, 6, 6, 10],
  ];
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[76, 76]} /><MeshReflectorMaterial blur={[350, 120]} resolution={512} mixBlur={0.72} mixStrength={1.55} roughness={0.27} depthScale={0.8} minDepthThreshold={0.42} maxDepthThreshold={1.15} color="#151a20" metalness={0.42} /></mesh>
    {buildings.map((b, i) => <Building key={i} x={b[0]} z={b[1]} w={b[2]} d={b[3]} h={b[4]} tint={i % 3 === 0 ? '#222b35' : '#2c3541'} />)}
    <mesh position={[0, 0.05, 0]} receiveShadow><boxGeometry args={[62, 0.09, 7]} /><PBR color="#30363e" roughness={0.82} metalness={0.24} /></mesh>
    <mesh position={[0, 0.05, 0]} receiveShadow><boxGeometry args={[7, 0.09, 62]} /><PBR color="#30363e" roughness={0.82} metalness={0.24} /></mesh>
    {[...Array(7)].map((_, i) => { const v = -27 + i * 9; return <React.Fragment key={v}><mesh position={[v, 0.105, 0]}><boxGeometry args={[0.08, 0.025, 62]} /><meshStandardMaterial color="#b5a46d" emissive="#b5a46d" emissiveIntensity={0.15} /></mesh><mesh position={[0, 0.105, v]}><boxGeometry args={[62, 0.025, 0.08]} /><meshStandardMaterial color="#b5a46d" emissive="#b5a46d" emissiveIntensity={0.15} /></mesh></React.Fragment>; })}
  </group>;
}

function StreetLight({ position }) {
  return <group position={position}>
    <mesh position={[0, 2, 0]} castShadow><cylinderGeometry args={[0.06, 0.09, 4, 12]} /><PBR color="#3d454d" roughness={0.35} metalness={0.82} /></mesh>
    <mesh position={[0, 4, 0]}><sphereGeometry args={[0.18, 20, 16]} /><PBR color="#ffdca0" emissive="#ffac3d" emissiveIntensity={5} roughness={0.2} metalness={0.2} /></mesh>
    <pointLight position={[0, 3.8, 0]} intensity={16} distance={8} color="#ffd18a" castShadow />
  </group>;
}

function NeonPanel({ position, color }) {
  return <group position={position}>
    <mesh castShadow><boxGeometry args={[2.2, 1.15, 0.16]} /><PBR color="#0a1119" roughness={0.3} metalness={0.5} /></mesh>
    <mesh position={[0, 0, -0.1]}><planeGeometry args={[1.92, 0.88]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
    <pointLight position={[0, 0, 0.7]} intensity={5} distance={5} color={color} />
  </group>;
}

function Rain({ count = 1800 }) {
  const ref = useRef();
  const positions = useMemo(() => { const a = new Float32Array(count * 3); for (let i = 0; i < count; i += 1) { a[i * 3] = THREE.MathUtils.randFloatSpread(72); a[i * 3 + 1] = Math.random() * 20 + 3; a[i * 3 + 2] = THREE.MathUtils.randFloatSpread(72); } return a; }, [count]);
  useFrame((_, delta) => { if (!ref.current) return; const attr = ref.current.geometry.attributes.position; for (let i = 0; i < count; i += 1) { const idx = i * 3 + 1; const next = attr.array[idx] - delta * 17; attr.array[idx] = next < 0.2 ? 23 : next; } attr.needsUpdate = true; });
  return <points ref={ref} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#c0dbff" size={0.048} transparent opacity={0.42} depthWrite={false} sizeAttenuation /></points>;
}

function Artifact() {
  const { scene } = useGLTF(GLB_URL);
  const clone = useMemo(() => scene.clone(true), [scene]);
  clone.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return <group position={[2.5, 1.05, 2.5]} rotation={[0.08, -0.75, 0]} scale={1.4}>
    <mesh position={[0, -0.76, 0]} castShadow receiveShadow><cylinderGeometry args={[0.75, 0.86, 0.16, 48]} /><PBR color="#121820" roughness={0.3} metalness={0.75} /></mesh>
    <Float speed={0.7} rotationIntensity={0.08} floatIntensity={0.1}><primitive object={clone} /></Float>
    <pointLight position={[0, 0.5, 0]} color="#56bfff" intensity={4} distance={5} />
  </group>;
}

function Core({ position, taken, onTake }) {
  const ref = useRef();
  useFrame((state, delta) => { if (!ref.current || taken) return; ref.current.rotation.y += delta * 2; ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3 + position[0]) * 0.12; });
  if (taken) return null;
  return <group ref={ref} position={position} onClick={onTake}><mesh castShadow><icosahedronGeometry args={[0.3, 3]} /><PBR color="#b9fcff" emissive="#16dfff" emissiveIntensity={5.5} roughness={0.12} metalness={0.6} /></mesh><pointLight color="#18dfff" intensity={8} distance={4.5} /></group>;
}

function Drone({ position, index, onHit }) {
  const ref = useRef();
  useFrame((state) => { if (!ref.current) return; const t = state.clock.elapsedTime; ref.current.position.set(position[0] + Math.sin(t * 0.7 + index) * 4, position[1] + Math.sin(t * 1.3 + index) * 0.65, position[2] + Math.cos(t * 0.6 + index) * 3); const p = window.__nightshiftPlayer; if (p && (p.x - ref.current.position.x) ** 2 + (p.z - ref.current.position.z) ** 2 < 2.25 && Math.abs(p.y - ref.current.position.y) < 1.8) onHit(); });
  return <group ref={ref} position={position}>
    <mesh castShadow><sphereGeometry args={[0.45, 24, 20]} /><PBR color="#35161b" emissive="#ff1238" emissiveIntensity={3.2} roughness={0.23} metalness={0.58} /></mesh>
    {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a) => <mesh key={a} position={[Math.cos(a) * 0.72, 0, Math.sin(a) * 0.72]} rotation={[0, a, 0]}><boxGeometry args={[0.5, 0.08, 0.08]} /><PBR color="#bdc7d1" roughness={0.22} metalness={0.9} /></mesh>)}
    <pointLight color="#ff244e" intensity={7} distance={4} />
  </group>;
}

function Player({ bodyRef }) {
  return <RigidBody ref={bodyRef} position={[0, 1.2, 25]} colliders={false} enabledRotations={[false, false, false]} linearDamping={7} angularDamping={18}>
    <CapsuleCollider args={[0.52, 0.34]} friction={1} restitution={0} />
    <group>
      <mesh position={[0, 0.6, 0]} castShadow><capsuleGeometry args={[0.32, 0.62, 10, 20]} /><PBR color="#dce7ef" roughness={0.34} metalness={0.18} clearcoat={0.7} /></mesh>
      <mesh position={[0, 1.38, 0]} castShadow><sphereGeometry args={[0.32, 24, 20]} /><PBR color="#cddbe5" roughness={0.3} metalness={0.2} clearcoat={0.65} /></mesh>
      <mesh position={[-0.34, 0.6, 0]} castShadow rotation={[0, 0, -0.12]}><capsuleGeometry args={[0.09, 0.48, 8, 12]} /><PBR color="#91adbf" roughness={0.4} metalness={0.16} /></mesh>
      <mesh position={[0.34, 0.6, 0]} castShadow rotation={[0, 0, 0.12]}><capsuleGeometry args={[0.09, 0.48, 8, 12]} /><PBR color="#91adbf" roughness={0.4} metalness={0.16} /></mesh>
      <mesh position={[-0.15, 0.02, 0]} castShadow><capsuleGeometry args={[0.1, 0.46, 8, 12]} /><PBR color="#667f90" roughness={0.48} metalness={0.18} /></mesh>
      <mesh position={[0.15, 0.02, 0]} castShadow><capsuleGeometry args={[0.1, 0.46, 8, 12]} /><PBR color="#667f90" roughness={0.48} metalness={0.18} /></mesh>
    </group>
  </RigidBody>;
}

function Controller({ bodyRef, active }) {
  const { camera, gl } = useThree(); const keys = useRef({}); const yaw = useRef(0); const pitch = useRef(0.15); const jumpLatch = useRef(false);
  useEffect(() => { const down = (e) => { keys.current[e.code] = true; if (['Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) e.preventDefault(); }; const up = (e) => { keys.current[e.code] = false; }; window.addEventListener('keydown', down); window.addEventListener('keyup', up); return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); }; }, []);
  useEffect(() => { const canvas = gl.domElement; const click = () => { if (active && document.pointerLockElement !== canvas) canvas.requestPointerLock?.(); }; const move = (e) => { if (!active || document.pointerLockElement !== canvas) return; yaw.current -= e.movementX * 0.0025; pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * 0.0018, -0.55, 0.58); }; canvas.addEventListener('click', click); document.addEventListener('mousemove', move); return () => { canvas.removeEventListener('click', click); document.removeEventListener('mousemove', move); }; }, [gl, active]);
  useFrame((_, delta) => { if (!active || !bodyRef.current) return; const body = bodyRef.current, vel = body.linvel(), input = new THREE.Vector3(); if (keys.current.KeyW) input.z -= 1; if (keys.current.KeyS) input.z += 1; if (keys.current.KeyA) input.x -= 1; if (keys.current.KeyD) input.x += 1; if (input.lengthSq()) { input.normalize(); const sy = Math.sin(yaw.current), cy = Math.cos(yaw.current); const wx = input.x * cy - input.z * sy; const wz = input.x * sy + input.z * cy; const speed = keys.current.ShiftLeft || keys.current.ShiftRight ? DASH_SPEED : WALK_SPEED; body.setLinvel({ x: wx * speed, y: vel.y, z: wz * speed }, true); body.setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(wx, wz), 0)), true); } else body.setLinvel({ x: 0, y: vel.y, z: 0 }, true); const pos = body.translation(), grounded = pos.y <= 1.17; if (keys.current.Space && !jumpLatch.current) { jumpLatch.current = true; if (grounded) body.setLinvel({ x: vel.x, y: JUMP_SPEED, z: vel.z }, true); } if (!keys.current.Space) jumpLatch.current = false; window.__nightshiftPlayer = { x: pos.x, y: pos.y, z: pos.z }; const target = new THREE.Vector3(pos.x, pos.y + 0.9, pos.z), distance = 6.1; const offset = new THREE.Vector3(Math.sin(yaw.current) * distance * Math.cos(pitch.current), 2.4 + Math.sin(pitch.current) * distance, Math.cos(yaw.current) * distance * Math.cos(pitch.current)); camera.position.lerp(target.clone().add(offset), 1 - Math.pow(0.001, delta)); camera.lookAt(target); });
  return null;
}

function World({ bodyRef, active, taken, onTake, onDroneHit, round }) {
  return <>
    <Environment preset="city" environmentIntensity={0.55} background={false} />
    <color attach="background" args={['#060b13']} />
    <fog attach="fog" args={['#070c14', 14, 78]} />
    <ambientLight intensity={0.65} color="#9bb8d6" />
    <hemisphereLight intensity={0.7} color="#9fc7ff" groundColor="#161920" />
    <directionalLight castShadow position={[14, 24, 8]} intensity={1.8} color="#cad8ff" shadow-mapSize={[4096, 4096]} shadow-camera-left={-35} shadow-camera-right={35} shadow-camera-top={35} shadow-camera-bottom={-35} shadow-bias={-0.00012} />
    <City /><Rain count={1800} />
    {[-5, 5, -22, 22].map((x, i) => <StreetLight key={i} position={[x, 0, i % 2 ? 5 : -5]} />)}
    <NeonPanel position={[-3, 2.2, -8]} color="#2deaff" /><NeonPanel position={[8, 2.1, 5]} color="#ff4e9c" />
    <Suspense fallback={null}><Artifact /></Suspense>
    <Sparkles count={75} scale={[60, 10, 60]} size={1.2} speed={0.1} color="#65dfff" /><Stars radius={85} depth={42} count={2400} factor={2.1} fade speed={0.12} />
    <Physics gravity={[0, -18, 0]} key={round}>
      <CuboidCollider position={[0, -0.9, 0]} args={[38, 0.9, 38]} friction={1} restitution={0} />
      {BLOCKS.map((b, i) => <RigidBody key={i} type="fixed" colliders="cuboid" friction={1} restitution={0}><mesh position={b.slice(0, 3)} castShadow receiveShadow><boxGeometry args={b[3]} /><PBR color="#45515e" roughness={0.72} metalness={0.28} clearcoat={0.25} /></mesh></RigidBody>)}
      <Player bodyRef={bodyRef} />
    </Physics>
    {CORE_POSITIONS.map((p, i) => <Core key={i} position={p} taken={taken[i]} onTake={() => onTake(i)} />)}
    {DRONES.map((p, i) => <Drone key={i} position={p} index={i} onHit={onDroneHit} />)}
    <Controller bodyRef={bodyRef} active={active} />
  </>;
}

function App() {
  const bodyRef = useRef(); const hitLock = useRef(0); const [running, setRunning] = useState(false); const [result, setResult] = useState(''); const [time, setTime] = useState(START_TIME); const [round, setRound] = useState(0); const [taken, setTaken] = useState(Array(CORE_POSITIONS.length).fill(false)); const [hp, setHp] = useState(100);
  useEffect(() => { if (!running || result) return undefined; const timer = setInterval(() => setTime((t) => { if (t <= 1) { setResult('TIME'); setRunning(false); return 0; } return t - 1; }), 1000); return () => clearInterval(timer); }, [running, result]);
  const start = () => { setResult(''); setTime(START_TIME); setTaken(Array(CORE_POSITIONS.length).fill(false)); setHp(100); hitLock.current = 0; setRound((r) => r + 1); setRunning(true); };
  const take = (index) => setTaken((prev) => { if (prev[index]) return prev; const next = [...prev]; next[index] = true; if (next.every(Boolean)) { setResult('WIN'); setRunning(false); } return next; });
  const hitDrone = () => { if (performance.now() < hitLock.current) return; hitLock.current = performance.now() + 1100; setHp((value) => { const next = Math.max(0, value - 20); if (!next) { setResult('LOSE'); setRunning(false); } return next; }); };
  return <div className="game">
    <Canvas shadows camera={{ position: [0, 4, 10], fov: 58, near: 0.05, far: 120 }} gl={{ antialias: true, powerPreference: 'high-performance', depth: true }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.1; gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap; }}>
      <World bodyRef={bodyRef} active={running && !result} taken={taken} onTake={take} onDroneHit={hitDrone} round={round} />
      <EffectComposer multisampling={0}><Bloom intensity={1.05} luminanceThreshold={0.6} luminanceSmoothing={0.82} mipmapBlur /><Vignette eskil={false} offset={0.15} darkness={0.78} /><Noise opacity={0.028} /><SMAA /></EffectComposer>
    </Canvas>
    <div className="shade" />
    <header><div className="logo">NIGHTSHIFT <b>RAIN RUN</b></div><div className="tag">PBR · HDRI · WET STREET · REAL GLB</div></header>
    {running && !result && <div className="hud-panel"><div><small>TIME</small><strong>{String(time).padStart(2, '0')}</strong></div><div><small>CORES</small><strong>{taken.filter(Boolean).length}/12</strong></div><div><small>HEALTH</small><strong>{hp}</strong></div></div>}
    {!running && !result && <section className="menu"><div className="eyebrow">REAL-TIME WEB 3D / RAIN CITY</div><h1>NIGHTSHIFT<br /><i>RAIN RUN</i></h1><p>Collect every energy core before the district clock hits zero. Dash through wet streets, neon reflections and drifting rain while security drones patrol the block.</p><button onClick={start}>ENTER THE NIGHT</button><div className="controls"><span>WASD</span> MOVE <span>MOUSE</span> LOOK <span>SPACE</span> JUMP <span>SHIFT</span> DASH</div></section>}
    {result && <section className="result"><div className="eyebrow">{result === 'WIN' ? 'CITY SECURED' : 'RUN FAILED'}</div><h2>{result === 'WIN' ? 'THE DISTRICT IS ALIVE.' : result === 'TIME' ? 'THE CLOCK WON.' : 'THE DRONES FOUND YOU.'}</h2><button onClick={start}>RUN AGAIN</button></section>}
    <div className="cross">+</div><footer>CLICK TO CAPTURE MOUSE · ESC TO RELEASE</footer>
  </div>;
}

useGLTF.preload(GLB_URL);
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
