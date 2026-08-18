import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Float, MeshReflectorMaterial, Sparkles, Stars, useGLTF } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette, SMAA } from '@react-three/postprocessing';
import { CuboidCollider, CapsuleCollider, Physics, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import './style.css';

const HDRI_URL = 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/modern_evening_street_2k.hdr';
const GLB_URL = 'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF-Binary/DamagedHelmet.glb';
const WALK_SPEED = 5.5;
const DASH_SPEED = 15;
const JUMP_SPEED = 7.2;
const START_TIME = 90;

const cores = [
  [-18, 1.1, -18], [-7, 1.1, -21], [7, 1.1, -18], [19, 1.1, -12],
  [24, 1.1, -2], [18, 1.1, 10], [7, 1.1, 19], [-6, 1.1, 21],
  [-18, 1.1, 17], [-24, 1.1, 7], [-24, 1.1, -5], [-14, 1.1, 7],
];

const blocks = [
  [-13, 1.1, -3, [4, 2.2, 2]], [-4, 1.1, -13, [2.4, 2.2, 5]],
  [8, 1.2, -5, [4.3, 2.4, 2.2]], [18, 1.1, 1, [2.4, 2.2, 5]],
  [7, 1.1, 12, [5, 2.2, 2]], [-8, 1.35, 10, [2.2, 2.7, 5]],
  [-18, 1.1, 2, [4, 2.2, 2]], [1, 0.9, 20, [3, 1.8, 3]],
];

const drones = [[-14, 4.8, -10], [12, 5.2, -14], [23, 4.8, 5], [-19, 5.1, 12], [5, 5, 15]];

function PBRMaterial({ color = '#ffffff', roughness = 0.75, metalness = 0.1, emissive = '#000000', emissiveIntensity = 0 }) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={roughness}
      metalness={metalness}
      clearcoat={0.15}
      clearcoatRoughness={0.25}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
    />
  );
}

function Building({ x, z, w, d, h, color, windows = true }) {
  return (
    <group position={[x, h / 2, z]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <PBRMaterial color={color} roughness={0.68} metalness={0.08} />
      </mesh>
      {windows && Array.from({ length: Math.max(4, Math.floor(w / 1.7)) }).map((_, i) => (
        <mesh key={i} position={[-w / 2 + 0.7 + i * ((w - 1.4) / Math.max(1, Math.floor(w / 1.7) - 1)), 0.7, d / 2 + 0.018]}>
          <boxGeometry args={[0.55, 0.65, 0.028]} />
          <PBRMaterial
            color="#102337"
            roughness={0.16}
            metalness={0.55}
            emissive={i % 3 === 0 ? '#ff914d' : '#57cfff'}
            emissiveIntensity={0.45}
          />
        </mesh>
      ))}
    </group>
  );
}

function City() {
  const buildings = [
    [-29, -27, 7, 8, 13], [-17, -29, 6, 7, 9], [-6, -29, 7, 6, 16], [10, -28, 8, 7, 11], [24, -28, 7, 8, 15],
    [-29, -16, 7, 7, 10], [-28, -2, 8, 8, 17], [29, -10, 8, 10, 12], [-31, 13, 7, 8, 14],
    [27, 16, 8, 9, 18], [-27, 27, 9, 6, 11], [-14, 29, 7, 8, 15], [1, 29, 8, 7, 12],
    [16, 29, 9, 8, 17], [30, 26, 6, 6, 10],
  ];

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[76, 76]} />
        <MeshReflectorMaterial
          blur={[350, 120]}
          resolution={512}
          mixBlur={0.72}
          mixStrength={1.55}
          roughness={0.28}
          depthScale={0.8}
          minDepthThreshold={0.42}
          maxDepthThreshold={1.15}
          color="#151a20"
          metalness={0.4}
        />
      </mesh>

      {buildings.map((b, i) => (
        <Building key={i} x={b[0]} z={b[1]} w={b[2]} d={b[3]} h={b[4]} color={i % 3 === 0 ? '#222a34' : '#2b3440'} />
      ))}

      <mesh position={[0, 0.045, 0]} receiveShadow>
        <boxGeometry args={[62, 0.09, 7]} />
        <PBRMaterial color="#30363e" roughness={0.82} metalness={0.22} />
      </mesh>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[7, 0.09, 62]} />
        <PBRMaterial color="#30363e" roughness={0.82} metalness={0.22} />
      </mesh>
      {[...Array(7)].map((_, i) => {
        const v = -27 + i * 9;
        return (
          <React.Fragment key={v}>
            <mesh position={[v, 0.1, 0]}>
              <boxGeometry args={[0.08, 0.025, 62]} />
              <meshStandardMaterial color="#b7a66f" emissive="#b7a66f" emissiveIntensity={0.15} />
            </mesh>
            <mesh position={[0, 0.1, v]}>
              <boxGeometry args={[62, 0.025, 0.08]} />
              <meshStandardMaterial color="#b7a66f" emissive="#b7a66f" emissiveIntensity={0.15} />
            </mesh>
          </React.Fragment>
        );
      })}
    </group>
  );
}

function StreetLight({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.09, 4, 12]} />
        <PBRMaterial color="#3d454d" roughness={0.35} metalness={0.82} />
      </mesh>
      <mesh position={[0, 4, 0]}>
        <sphereGeometry args={[0.18, 20, 16]} />
        <PBRMaterial color="#ffdca0" emissive="#ffac3d" emissiveIntensity={5} roughness={0.2} metalness={0.2} />
      </mesh>
      <pointLight position={[0, 3.8, 0]} intensity={16} distance={8} color="#ffd18a" castShadow />
    </group>
  );
}

function Billboard({ position, color = '#00dcff' }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[2.2, 1.2, 0.16]} />
        <PBRMaterial color="#0b121a" roughness={0.28} metalness={0.42} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <planeGeometry args={[1.9, 0.9]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0, 0.8]} color={color} intensity={5} distance={5} />
    </group>
  );
}

function Artifact() {
  const { scene } = useGLTF(GLB_URL);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  cloned.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return (
    <group position={[2.4, 1.15, 2.2]} rotation={[0.06, -0.8, 0.02]} scale={1.55}>
      <mesh position={[0, -0.75, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.75, 0.85, 0.18, 48]} />
        <PBRMaterial color="#151a20" roughness={0.32} metalness={0.7} />
      </mesh>
      <Float speed={0.7} rotationIntensity={0.08} floatIntensity={0.1}>
        <primitive object={cloned} />
      </Float>
      <pointLight position={[0, 0.6, 0]} intensity={3.5} distance={4} color="#62bfff" />
    </group>
  );
}

function Rain({ count = 1400 }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = THREE.MathUtils.randFloatSpread(72);
      arr[i * 3 + 1] = Math.random() * 20 + 3;
      arr[i * 3 + 2] = THREE.MathUtils.randFloatSpread(72);
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const attr = ref.current.geometry.attributes.position;
    for (let i = 0; i < count; i += 1) {
      const y = attr.array[i * 3 + 1] - delta * 17;
      attr.array[i * 3 + 1] = y < 0.2 ? 23 : y;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.045} color="#b9d7ff" transparent opacity={0.45} depthWrite={false} sizeAttenuation />
    </points>
  );
}

function Core({ position, taken, onTake }) {
  const ref = useRef();
  useFrame((state, delta) => {
    if (!ref.current || taken) return;
    ref.current.rotation.y += delta * 2;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3 + position[0]) * 0.12;
  });
  if (taken) return null;
  return (
    <group ref={ref} position={position} onClick={onTake}>
      <mesh castShadow>
        <icosahedronGeometry args={[0.3, 3]} />
        <PBRMaterial color="#b9fcff" emissive="#16dfff" emissiveIntensity={5.5} roughness={0.12} metalness={0.6} />
      </mesh>
      <pointLight intensity={8} distance={4.5} color="#18dfff" />
    </group>
  );
}

function Drone({ position, index, onHit }) {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.set(
      position[0] + Math.sin(t * 0.7 + index) * 4,
      position[1] + Math.sin(t * 1.3 + index) * 0.65,
      position[2] + Math.cos(t * 0.6 + index) * 3,
    );
    const p = window.__nightshiftPlayer;
    if (p) {
      const distSq = (p.x - ref.current.position.x) ** 2 + (p.z - ref.current.position.z) ** 2;
      if (distSq < 2.25 && Math.abs(p.y - ref.current.position.y) < 1.8) onHit();
    }
  });

  return (
    <group ref={ref} position={position}>
      <mesh castShadow>
        <sphereGeometry args={[0.45, 24, 20]} />
        <PBRMaterial color="#35161b" emissive="#ff1238" emissiveIntensity={3.2} roughness={0.23} metalness={0.58} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle) => (
        <mesh key={angle} position={[Math.cos(angle) * 0.72, 0, Math.sin(angle) * 0.72]} rotation={[0, angle, 0]}>
          <boxGeometry args={[0.5, 0.08, 0.08]} />
          <PBRMaterial color="#bdc7d1" roughness={0.22} metalness={0.9} />
        </mesh>
      ))}
      <pointLight color="#ff244e" intensity={7} distance={4} />
    </group>
  );
}

function Player({ bodyRef }) {
  return (
    <RigidBody ref={bodyRef} position={[0, 1.2, 25]} colliders={false} enabledRotations={[false, false, false]} linearDamping={7} angularDamping={18}>
      <CapsuleCollider args={[0.52, 0.34]} friction={1} restitution={0} />
      <group>
        <mesh position={[0, 0.6, 0]} castShadow>
          <capsuleGeometry args={[0.32, 0.62, 10, 20]} />
          <PBRMaterial color="#dce7ef" roughness={0.34} metalness={0.18} clearcoat={0.7} />
        </mesh>
        <mesh position={[0, 1.38, 0]} castShadow>
          <sphereGeometry args={[0.32, 24, 20]} />
          <PBRMaterial color="#cddbe5" roughness={0.3} metalness={0.2} clearcoat={0.65} />
        </mesh>
        <mesh position={[-0.34, 0.6, 0]} castShadow rotation={[0, 0, -0.12]}>
          <capsuleGeometry args={[0.09, 0.48, 8, 12]} />
          <PBRMaterial color="#91adbf" roughness={0.4} metalness={0.16} />
        </mesh>
        <mesh position={[0.34, 0.6, 0]} castShadow rotation={[0, 0, 0.12]}>
          <capsuleGeometry args={[0.09, 0.48, 8, 12]} />
          <PBRMaterial color="#91adbf" roughness={0.4} metalness={0.16} />
        </mesh>
        <mesh position={[-0.15, 0.02, 0]} castShadow>
          <capsuleGeometry args={[0.1, 0.46, 8, 12]} />
          <PBRMaterial color="#667f90" roughness={0.48} metalness={0.18} />
        </mesh>
        <mesh position={[0.15, 0.02, 0]} castShadow>
          <capsuleGeometry args={[0.1, 0.46, 8, 12]} />
          <PBRMaterial color="#667f90" roughness={0.48} metalness={0.18} />
        </mesh>
      </group>
    </RigidBody>
  );
}

function Controller({ bodyRef, active }) {
  const { camera, gl } = useThree();
  const keys = useRef({});
  const yaw = useRef(0);
  const pitch = useRef(0.15);
  const jumping = useRef(false);

  useEffect(() => {
    const down = (e) => {
      keys.current[e.code] = true;
      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') e.preventDefault();
    };
    const up = (e) => { keys.current[e.code] = false; };
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
      if (active && document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
    };
    const mouse = (e) => {
      if (!active || document.pointerLockElement !== canvas) return;
      yaw.current -= e.movementX * 0.0025;
      pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * 0.0018, -0.55, 0.58);
    };
    canvas.addEventListener('click', click);
    document.addEventListener('mousemove', mouse);
    return () => {
      canvas.removeEventListener('click', click);
      document.removeEventListener('mousemove', mouse);
    };
  }, [gl, active]);

  useFrame((_, delta) => {
    if (!active || !bodyRef.current) return;
    const body = bodyRef.current;
    const vel = body.linvel();
    const input = new THREE.Vector3();
    if (keys.current.KeyW) input.z -= 1;
    if (keys.current.KeyS) input.z += 1;
    if (keys.current.KeyA) input.x -= 1;
    if (keys.current.KeyD) input.x += 1;

    if (input.lengthSq()) {
      input.normalize();
      const sy = Math.sin(yaw.current);
      const cy = Math.cos(yaw.current);
      const wx = input.x * cy - input.z * sy;
      const wz = input.x * sy + input.z * cy;
      const sprint = keys.current.ShiftLeft || keys.current.ShiftRight;
      const speed = sprint ? DASH_SPEED : WALK_SPEED;
      body.setLinvel({ x: wx * speed, y: vel.y, z: wz * speed }, true);
      body.setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(wx, wz), 0)), true);
    } else {
      body.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
    }

    const p = body.translation();
    const grounded = p.y <= 1.17;
    if (keys.current.Space && !jumping.current) {
      jumping.current = true;
      if (grounded) body.setLinvel({ x: vel.x, y: JUMP_SPEED, z: vel.z }, true);
    }
    if (!keys.current.Space) jumping.current = false;

    window.__nightshiftPlayer = { x: p.x, y: p.y, z: p.z };

    const target = new THREE.Vector3(p.x, p.y + 0.9, p.z);
    const distance = 6.1;
    const offset = new THREE.Vector3(
      Math.sin(yaw.current) * distance * Math.cos(pitch.current),
      2.4 + Math.sin(pitch.current) * distance,
      Math.cos(yaw.current) * distance * Math.cos(pitch.current),
    );
    camera.position.lerp(target.clone().add(offset), 1 - Math.pow(0.001, delta));
    camera.lookAt(target);
  });

  return null;
}

function Scene({ active, coresTaken, onCore, onDroneHit, round }) {
  return (
    <>
      <Environment files={HDRI_URL} background={false} intensity={0.65} />
      <color attach="background" args={['#060b13']} />
      <fog attach="fog" args={['#070c14', 14, 78]} />

      <ambientLight intensity={0.65} color="#9bb8d6" />
      <hemisphereLight intensity={0.7} color="#9fc7ff" groundColor="#161920" />
      <directionalLight
        castShadow
        position={[14, 24, 8]}
        intensity={1.8}
        color="#cad8ff"
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
        shadow-bias={-0.00012}
      />

      <City />
      <Rain count={1700} />
      <StreetLight position={[-5, 0, -5]} />
      <StreetLight position={[5, 0, 5]} />
      <StreetLight position={[-5, 0, 20]} />
      <StreetLight position={[20, 0, -5]} />
      <StreetLight position={[-22, 0, 10]} />
      <StreetLight position={[22, 0, 10]} />
      <Billboard position={[-3, 2.2, -8]} color="#2deaff" />
      <Billboard position={[8, 2.1, 5]} color="#ff4e9c" />
      <Artifact />

      <Sparkles count={70} scale={[60, 10, 60]} size={1.2} speed={0.1} color="#65dfff" />
      <Stars radius={85} depth={42} count={2400} factor={2.1} fade speed={0.12} />

      <Physics gravity={[0, -18, 0]} key={round}>
        <CuboidCollider position={[0, -0.9, 0]} args={[38, 0.9, 38]} friction={1} restitution={0} />
        {blocks.map((b, i) => (
          <RigidBody key={i} type="fixed" colliders="cuboid" friction={1} restitution={0}>
            <mesh position={b.slice(0, 3)} castShadow receiveShadow>
              <boxGeometry args={b[3]} />
              <PBRMaterial color="#45515e" roughness={0.72} metalness={0.28} clearcoat={0.25} />
            </mesh>
          </RigidBody>
        ))}
        <Player bodyRef={window.__nightshiftBodyRef || { current: null }} />
      </Physics>
    </>
  );
}

function GameWorld({ active, onWin, onLose, round }) {
  const bodyRef = useRef();
  const [taken, setTaken] = useState(Array(cores.length).fill(false));
  const [hp, setHp] = useState(100);
  const hitLock = useRef(0);

  useEffect(() => {
    window.__nightshiftBodyRef = bodyRef;
    return () => { window.__nightshiftBodyRef = null; };
  }, []);

  useFrame((_, delta) => {
    if (hitLock.current > 0) hitLock.current -= delta;
  });

  const takeCore = (index) => {
    setTaken((prev) => {
      if (prev[index]) return prev;
      const next = [...prev];
      next[index] = true;
      if (next.every(Boolean)) onWin();
      return next;
    });
  };

  const hitDrone = () => {
    if (hitLock.current > 0) return;
    hitLock.current = 1.1;
    setHp((value) => {
      const next = Math.max(0, value - 20);
      if (next === 0) onLose('DRONE');
      return next;
    });
  };

  return (
    <>
      <Scene active={active} coresTaken={taken} onCore={takeCore} onDroneHit={hitDrone} round={round} />
      {cores.map((p, i) => <Core key={i} position={p} taken={taken[i]} onTake={() => takeCore(i)} />)}
      {drones.map((p, i) => <Drone key={i} position={p} index={i} onHit={hitDrone} />)}
      <Controller bodyRef={bodyRef} active={active} />
      <div className="internal-hud">
        <span>CORES {taken.filter(Boolean).length}/12</span>
        <span>HP {hp}</span>
      </div>
    </>
  );
}

function App() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState('');
  const [time, setTime] = useState(START_TIME);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!running || result) return undefined;
    const id = window.setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          setResult('TIME');
          setRunning(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, result]);

  const start = () => {
    setResult('');
    setTime(START_TIME);
    setRound((r) => r + 1);
    setRunning(true);
  };

  return (
    <div className="game">
      <Canvas
        shadows
        camera={{ position: [0, 4, 10], fov: 58, near: 0.05, far: 120 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <Suspense fallback={null}>
          <GameWorld
            active={running && !result}
            round={round}
            onWin={() => { setResult('WIN'); setRunning(false); }}
            onLose={() => { setResult('LOSE'); setRunning(false); }}
          />
          <EffectComposer multisampling={0}>
            <Bloom intensity={1.05} luminanceThreshold={0.6} luminanceSmoothing={0.82} mipmapBlur />
            <Vignette eskil={false} offset={0.15} darkness={0.78} />
            <Noise opacity={0.028} />
            <SMAA />
          </EffectComposer>
        </Suspense>
      </Canvas>

      <div className="shade" />
      <header>
        <div className="logo">NIGHTSHIFT <b>RAIN RUN</b></div>
        <div className="tag">PHOTOREAL 3D TEST</div>
      </header>

      {running && !result && (
        <div className="hud-panel">
          <div><small>TIME</small><strong>{String(time).padStart(2, '0')}</strong></div>
          <div><small>OBJECTIVE</small><strong>12 CORES</strong></div>
        </div>
      )}

      {!running && !result && (
        <section className="menu">
          <div className="eyebrow">WEB 3D / REAL-TIME RAIN CITY</div>
          <h1>NIGHTSHIFT<br /><i>RAIN RUN</i></h1>
          <p>Collect every energy core while rain, wet streets, neon reflections and security drones turn the blackout district into a moving obstacle course.</p>
          <button onClick={start}>ENTER THE NIGHT</button>
          <div className="controls"><span>WASD</span> MOVE <span>MOUSE</span> LOOK <span>SPACE</span> JUMP <span>SHIFT</span> DASH</div>
        </section>
      )}

      {result && (
        <section className="result">
          <div className="eyebrow">{result === 'WIN' ? 'CITY SECURED' : 'SYSTEM FAILURE'}</div>
          <h2>{result === 'WIN' ? 'THE DISTRICT IS ALIVE.' : result === 'TIME' ? 'THE CLOCK WON.' : 'THE DRONES FOUND YOU.'}</h2>
          <button onClick={start}>RUN AGAIN</button>
        </section>
      )}

      <div className="cross">+</div>
      <footer>CLICK TO CAPTURE MOUSE · ESC TO RELEASE</footer>
    </div>
  );
}

useGLTF.preload(GLB_URL);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
