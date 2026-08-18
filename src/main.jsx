import React from 'react';
import ReactDOM from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { PointerLockControls, Sky } from '@react-three/drei';
import * as THREE from 'three';
import './style.css';

function Player() {
  return (
    <group position={[0, 1, 4]}>
      <mesh castShadow position={[0, 0.55, 0]}>
        <capsuleGeometry args={[0.38, 0.8, 8, 16]} />
        <meshStandardMaterial color="#65c466" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 1.35, 0]}>
        <sphereGeometry args={[0.38, 20, 16]} />
        <meshStandardMaterial color="#65c466" roughness={0.85} />
      </mesh>
      <mesh position={[-0.14, 1.43, -0.34]}>
        <sphereGeometry args={[0.075, 12, 12]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      <mesh position={[0.14, 1.43, -0.34]}>
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

function App() {
  return (
    <div className="game">
      <Canvas
        shadows
        camera={{ position: [0, 3.2, 8], fov: 65, near: 0.1, far: 100 }}
        gl={{ antialias: true }}
      >
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
        <Player />
        <PointerLockControls makeDefault />
      </Canvas>

      <div className="hud">
        <div className="brand">HIDENSEEK <span>3D</span></div>
        <div className="objective">TEST ROOM · CAMOUFLAGE PROTOTYPE</div>
        <div className="controls">
          <b>CLICK</b> to look around&nbsp;&nbsp; <b>WASD</b> movement coming next
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
