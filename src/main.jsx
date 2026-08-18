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

const PROP_COLLIDERS = [
  { x: -5, z: -5, hx: 1.5, hz: 0.75 },
  { x: 5, z: -5, hx: 1, hz: 1 },
  { x: -6, z: 3, hx: 0.75, hz: 1.5 },
  { x: 5.5, z: 3, hx: 1.5, hz: 0.75 },
  { x: 0, z: -2, hx: 0.5, hz: 0.5 },
  { x: 2.5, z: 4, hx: 0.75, hz: 0.75 },
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

function Player({ playerRef }) {
  return (
    <group ref={playerRef} position={[0, 0, 4]}>
      <mesh castShadow position={[0, 0.72, 0]}>
        <capsuleGeometry args={[0.38, 0.8, 8, 16]} />
        <meshStandardMaterial color="#65c466" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 1.52, 0]}>
        <sphereGeometry args={[0.38, 20, 16]} />
        <meshStandardMaterial color="#65c466" roughness={0.85} />
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
    <mesh castShadow receiveShadow position={position} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

function Room() {
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[24, 20]} />
        <meshStandardMaterial color="#6b6256" roughness={1} />
      </mesh>

      <mesh receiveShadow position={[0, 4, -10]}>
        <boxGeometry args={[24, 8, 0.5]} />
        <meshStandardMaterial color="#b7a98e" roughness={0.95} />
      </mesh>
      <mesh receiveShadow position={[-12, 4, 0]}>
        <boxGeometry args={[0.5, 8, 20]} />
        <meshStandardMaterial color="#a9977b" roughness={0.95} />
      </mesh>
      <mesh receiveShadow position={[12, 4, 0]}>
        <boxGeometry args={[0.5, 8, 20]} />
        <meshStandardMaterial color="#a9977b" roughness={0.95} />
      </mesh>
      <mesh receiveShadow position={[0, 4, 10]}>
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

function ThirdPersonController({ playerRef, setLocked }) {
  const { camera, gl } = useThree();
  const keys = useRef({});
  const yaw = useRef(0);
  const pitch = useRef(0.22);
  const smoothCamera = useRef(new THREE.Vector3(0, 3.2, 8));
  const targetCamera = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const down = (event) => {
      keys.current[event.code] = true;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(event.code)) event.preventDefault();
    };
    const up = (event) => {
      keys.current[event.code] = false;
    };
    const mouse = (event) => {
      if (document.pointerLockElement !== gl.domElement) return;
      yaw.current -= event.movementX * 0.0022;
      pitch.current = THREE.MathUtils.clamp(pitch.current - event.movementY * 0.0017, -0.15, 0.72);
    };
    const lockChange = () => {
      const locked = document.pointerLockElement === gl.domElement;
      setLocked(locked);
      setReady(locked);
    };

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
  }, [gl, setLocked]);

  useEffect(() => {
    const click = () => {
      if (document.pointerLockElement !== gl.domElement) gl.domElement.requestPointerLock();
    };
    gl.domElement.addEventListener('click', click);
    return () => gl.domElement.removeEventListener('click', click);
  }, [gl]);

  useFrame((_, delta) => {
    if (!playerRef.current) return;

    const player = playerRef.current;
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

      player.rotation.y = THREE.MathUtils.lerp(
        player.rotation.y,
        Math.atan2(move.x, move.z),
        0.2
      );
    }

    const cameraDistance = 5.2;
    const cameraHeight = 1.9;
    const cosPitch = Math.cos(pitch.current);
    targetCamera.current.set(
      player.position.x + Math.sin(yaw.current) * cameraDistance * cosPitch,
      player.position.y + cameraHeight + Math.sin(pitch.current) * cameraDistance,
      player.position.z + Math.cos(yaw.current) * cameraDistance * cosPitch
    );

    // Keep the third-person camera inside the room.
    targetCamera.current.x = THREE.MathUtils.clamp(targetCamera.current.x, -10.8, 10.8);
    targetCamera.current.z = THREE.MathUtils.clamp(targetCamera.current.z, -8.8, 8.8);
    targetCamera.current.y = THREE.MathUtils.clamp(targetCamera.current.y, 1.1, 7.5);

    smoothCamera.current.lerp(targetCamera.current, 1 - Math.pow(0.001, delta));
    camera.position.copy(smoothCamera.current);

    lookTarget.current.set(player.position.x, player.position.y + 1.15, player.position.z);
    camera.lookAt(lookTarget.current);
  });

  return null;
}

function App() {
  const playerRef = useRef();
  const [locked, setLocked] = useState(false);

  const camera = useMemo(() => ({ position: [0, 3.2, 9], fov: 65, near: 0.1, far: 100 }), []);

  return (
    <div className="game">
      <Canvas shadows camera={camera} gl={{ antialias: true }}>
        <color attach="background" args={['#9ba7b1']} />
        <fog attach="fog" args={['#9ba7b1', 18, 55]} />
        <ambientLight intensity={1.8} />
        <directionalLight
          castShadow
          position={[6, 12, 5]}
          intensity={3}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <Sky sunPosition={[100, 20, 50]} turbidity={7} rayleigh={1.2} />
        <Room />
        <Player playerRef={playerRef} />
        <ThirdPersonController playerRef={playerRef} setLocked={setLocked} />
      </Canvas>

      <div className="hud">
        <div className="brand">HIDENSEEK <span>3D</span></div>
        <div className="objective">TEST ROOM · MOVEMENT PROTOTYPE</div>
        {!locked && (
          <div className="start-card">
            <div className="start-title">ENTER THE ROOM</div>
            <div className="start-subtitle">Click anywhere to capture the mouse</div>
            <div className="key-row"><span>W A S D</span> Move <span>MOUSE</span> Look</div>
          </div>
        )}
        <div className="controls">
          <b>WASD</b> move&nbsp;&nbsp; <b>MOUSE</b> look&nbsp;&nbsp; <b>ESC</b> release mouse
        </div>
      </div>
      <div className="crosshair">+</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
