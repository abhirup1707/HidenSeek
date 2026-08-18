import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import './style.css';

const BASE_COLOR = '#65c466';
const SPEED = 4.2;
const PLAYER_RADIUS = 0.42;
const COLLIDERS = [
  { x: -5, z: -5, hx: 1.5, hz: 0.75 }, { x: 5, z: -5, hx: 1, hz: 1 },
  { x: -6, z: 3, hx: 0.75, hz: 1.5 }, { x: 5.5, z: 3, hx: 1.5, hz: 0.75 },
  { x: 0, z: -2, hx: 0.5, hz: 0.5 }, { x: 2.5, z: 4, hx: 0.75, hz: 0.75 }
];
const PALETTE = ['#111111','#ffffff','#e53935','#ff7a00','#ffd43b','#65c466','#18b66f','#16a5d9','#3267e8','#7d4de8','#d946ef','#ff4f81','#795548','#9e9e9e','#607d8b','#f0c39a'];

function makePaintAsset(base = BASE_COLOR) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 1024, 1024);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return { canvas, ctx, texture };
}

function pushOut(pos, box, radius) {
  const cx = THREE.MathUtils.clamp(pos.x, box.x - box.hx, box.x + box.hx);
  const cz = THREE.MathUtils.clamp(pos.z, box.z - box.hz, box.z + box.hz);
  let dx = pos.x - cx, dz = pos.z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= radius * radius) return;
  if (d2 > 0.000001) {
    const d = Math.sqrt(d2), push = radius - d;
    pos.x += dx / d * push; pos.z += dz / d * push; return;
  }
  const left = Math.abs(pos.x - (box.x - box.hx));
  const right = Math.abs(pos.x - (box.x + box.hx));
  const top = Math.abs(pos.z - (box.z - box.hz));
  const bottom = Math.abs(pos.z - (box.z + box.hz));
  const m = Math.min(left, right, top, bottom);
  if (m === left) pos.x = box.x - box.hx - radius;
  else if (m === right) pos.x = box.x + box.hx + radius;
  else if (m === top) pos.z = box.z - box.hz - radius;
  else pos.z = box.z + box.hz + radius;
}

function Player({ playerRef, paint }) {
  const body = useRef();
  const head = useRef();
  const [assets, setAssets] = useState(null);

  useEffect(() => {
    const next = { body: makePaintAsset(), head: makePaintAsset() };
    setAssets(next);
    return () => { next.body.texture.dispose(); next.head.texture.dispose(); };
  }, []);

  const dab = (mesh, uv) => {
    if (!paint.active || !assets || !uv) return;
    const target = mesh === body.current ? assets.body : assets.head;
    const { canvas, ctx, texture } = target;
    const x = THREE.MathUtils.clamp(uv.x, 0, 1) * canvas.width;
    const y = (1 - THREE.MathUtils.clamp(uv.y, 0, 1)) * canvas.height;
    const radius = paint.eraser ? paint.size * 1.8 : paint.size;
    ctx.save();
    ctx.globalAlpha = paint.eraser ? 1 : 0.92;
    ctx.fillStyle = paint.eraser ? BASE_COLOR : paint.color;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    texture.needsUpdate = true;
    paint.onDab();
  };

  useEffect(() => {
    const up = () => { paint.dragging.current = false; };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, [paint.dragging]);

  const down = (e, mesh) => {
    if (!paint.active) return;
    e.stopPropagation(); paint.dragging.current = true; dab(mesh, e.uv);
  };
  const move = (e, mesh) => {
    if (!paint.active || !paint.dragging.current) return;
    e.stopPropagation(); dab(mesh, e.uv);
  };

  return (
    <group ref={playerRef} position={[0,0,4]}>
      <mesh ref={body} castShadow position={[0,0.72,0]} onPointerDown={e => down(e, body.current)} onPointerMove={e => move(e, body.current)}>
        <capsuleGeometry args={[0.38,0.8,16,32]} />
        <meshStandardMaterial map={assets?.body.texture || null} color="#ffffff" roughness={0.82} />
      </mesh>
      <mesh ref={head} castShadow position={[0,1.52,0]} onPointerDown={e => down(e, head.current)} onPointerMove={e => move(e, head.current)}>
        <sphereGeometry args={[0.38,32,24]} />
        <meshStandardMaterial map={assets?.head.texture || null} color="#ffffff" roughness={0.82} />
      </mesh>
      <mesh position={[-0.14,1.6,-0.34]}><sphereGeometry args={[0.075,12,12]} /><meshStandardMaterial color="#111111" /></mesh>
      <mesh position={[0.14,1.6,-0.34]}><sphereGeometry args={[0.075,12,12]} /><meshStandardMaterial color="#111111" /></mesh>
    </group>
  );
}

function Prop({ position, scale, color }) {
  return <mesh castShadow receiveShadow position={position} scale={scale}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>;
}

function Room({ onPick }) {
  const pick = e => { e.stopPropagation(); const c=e.object.material?.color; if(c) onPick('#'+c.getHexString()); };
  return <group>
    <mesh receiveShadow rotation={[-Math.PI/2,0,0]} userData={{camoSurface:true}} onClick={pick}><planeGeometry args={[24,20]} /><meshStandardMaterial color="#6b6256" roughness={1}/></mesh>
    <mesh receiveShadow position={[0,4,-10]} userData={{camoSurface:true}} onClick={pick}><boxGeometry args={[24,8,.5]}/><meshStandardMaterial color="#b7a98e" roughness={.95}/></mesh>
    <mesh receiveShadow position={[-12,4,0]} userData={{camoSurface:true}} onClick={pick}><boxGeometry args={[.5,8,20]}/><meshStandardMaterial color="#a9977b" roughness={.95}/></mesh>
    <mesh receiveShadow position={[12,4,0]} userData={{camoSurface:true}} onClick={pick}><boxGeometry args={[.5,8,20]}/><meshStandardMaterial color="#a9977b" roughness={.95}/></mesh>
    <mesh receiveShadow position={[0,4,10]} userData={{camoSurface:true}} onClick={pick}><boxGeometry args={[24,8,.5]}/><meshStandardMaterial color="#b7a98e" roughness={.95}/></mesh>
    <Prop position={[-5,1,-5]} scale={[3,2,1.5]} color="#79583d"/><Prop position={[5,1.25,-5]} scale={[2,2.5,2]} color="#9c724e"/>
    <Prop position={[-6,.75,3]} scale={[1.5,1.5,3]} color="#6e4d38"/><Prop position={[5.5,1,3]} scale={[3,2,1.5]} color="#806044"/>
    <Prop position={[0,.5,-2]} scale={[1,1,1]} color="#b88759"/><Prop position={[2.5,.75,4]} scale={[1.5,1.5,1.5]} color="#72513a"/>
  </group>;
}

function Controller({ playerRef, paintMode, setLocked, setSample }) {
  const { camera, gl, scene } = useThree();
  const keys=useRef({}), yaw=useRef(0), pitch=useRef(.22);
  const smooth=useRef(new THREE.Vector3(0,3.2,8)), target=useRef(new THREE.Vector3()), look=useRef(new THREE.Vector3());
  const ray=useMemo(()=>new THREE.Raycaster(),[]), center=useMemo(()=>new THREE.Vector2(0,0),[]);
  const sample=()=>{
    ray.setFromCamera(center,camera);
    const hits=ray.intersectObjects(scene.children,true);
    const hit=hits.find(h=>h.object.userData.camoSurface);
    if(hit?.object.material?.color) setSample('#'+hit.object.material.color.getHexString());
  };
  useEffect(()=>{
    const down=e=>{ keys.current[e.code]=true; if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code)) e.preventDefault(); if(e.code==='KeyP'){document.exitPointerLock?.();} if(e.code==='KeyE') sample(); };
    const up=e=>{keys.current[e.code]=false;};
    const move=e=>{if(paintMode||document.pointerLockElement!==gl.domElement)return; yaw.current-=e.movementX*.0022; pitch.current=THREE.MathUtils.clamp(pitch.current-e.movementY*.0017,-.15,.72);};
    const lock=()=>setLocked(document.pointerLockElement===gl.domElement);
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);document.addEventListener('mousemove',move);document.addEventListener('pointerlockchange',lock);
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);document.removeEventListener('mousemove',move);document.removeEventListener('pointerlockchange',lock);};
  },[gl,paintMode,setLocked]);
  useEffect(()=>{const click=()=>{if(!paintMode&&document.pointerLockElement!==gl.domElement)gl.domElement.requestPointerLock();};gl.domElement.addEventListener('click',click);return()=>gl.domElement.removeEventListener('click',click);},[gl,paintMode]);
  useFrame((_,dt)=>{
    const p=playerRef.current;if(!p)return;
    if(!paintMode){const move=new THREE.Vector3(), f=new THREE.Vector3(-Math.sin(yaw.current),0,-Math.cos(yaw.current)), r=new THREE.Vector3(Math.cos(yaw.current),0,-Math.sin(yaw.current));if(keys.current.KeyW)move.add(f);if(keys.current.KeyS)move.sub(f);if(keys.current.KeyD)move.add(r);if(keys.current.KeyA)move.sub(r);if(move.lengthSq()){move.normalize().multiplyScalar(SPEED*Math.min(dt,.05));p.position.add(move);p.position.x=THREE.MathUtils.clamp(p.position.x,-11.25,11.25);p.position.z=THREE.MathUtils.clamp(p.position.z,-9.25,9.25);COLLIDERS.forEach(b=>pushOut(p.position,b,PLAYER_RADIUS));p.rotation.y=THREE.MathUtils.lerp(p.rotation.y,Math.atan2(move.x,move.z),.2);}}
    const d=paintMode?4.2:5.2,h=paintMode?1.6:1.9,cp=Math.cos(pitch.current);target.current.set(p.position.x+Math.sin(yaw.current)*d*cp,p.position.y+h+Math.sin(pitch.current)*d,p.position.z+Math.cos(yaw.current)*d*cp);target.current.x=THREE.MathUtils.clamp(target.current.x,-10.8,10.8);target.current.z=THREE.MathUtils.clamp(target.current.z,-8.8,8.8);target.current.y=THREE.MathUtils.clamp(target.current.y,1.1,7.5);smooth.current.lerp(target.current,1-Math.pow(.001,dt));camera.position.copy(smooth.current);look.current.set(p.position.x,p.position.y+1.05,p.position.z);camera.lookAt(look.current);
  });
  return null;
}

function PaintUI({ active,setActive,color,setColor,size,setSize,eraser,setEraser,sampleColor,setColorFromSurface }) {
  return <>
    <div className={`paint-dock ${active?'visible':''}`}>
      <div className="paint-topline"><div><div className="paint-title">PAINT YOUR CHAMELEON</div><div className="paint-subtitle">Click + drag directly over the character</div></div><button className="close-paint" onClick={()=>setActive(false)}>DONE</button></div>
      <div className="paint-tools">
        <div className="palette-wheel">{PALETTE.map((c,i)=>{const a=i/PALETTE.length*Math.PI*2-Math.PI/2,r=56;return <button key={c} className={`palette-dot ${color.toLowerCase()===c?'selected':''}`} style={{background:c,transform:`translate(${Math.cos(a)*r}px,${Math.sin(a)*r}px)`}} onClick={()=>{setColor(c);setEraser(false)}}/>})}<div className="palette-center" style={{background:eraser?BASE_COLOR:color}}><span>{eraser?'ERASE':'COLOR'}</span></div></div>
        <div className="tool-column"><label className="color-picker-button"><span className="tool-icon" style={{background:color}}/>COLOR PICKER<input type="color" value={color} onChange={e=>{setColor(e.target.value);setEraser(false)}}/></label><button className="tool-button" onClick={setColorFromSurface}><span className="eyedropper-icon">⌖</span>EYEDROPPER <small>E</small></button><button className={`tool-button ${eraser?'active':''}`} onClick={()=>setEraser(v=>!v)}><span className="eraser-icon">◐</span>ERASER</button></div>
        <div className="brush-column"><div className="brush-label">BRUSH</div>{[8,18,34].map(s=><button key={s} className={`brush-button ${size===s?'active':''}`} onClick={()=>{setSize(s);setEraser(false)}}><span style={{width:Math.min(s,30),height:Math.min(s,30)}}/>{s===8?'S':s===18?'M':'L'}</button>)}</div>
      </div>
      <div className="selected-color-row"><span className="selected-color" style={{background:color}}/><span>SELECTED <b>{color.toUpperCase()}</b></span><span className="sampled-color" style={{background:sampleColor}}/><span>ENVIRONMENT SAMPLE</span></div>
    </div>
    {!active&&<button className="paint-open" onClick={()=>setActive(true)}>🖌️ PAINT <span>P</span></button>}
  </>;
}

function App(){
  const playerRef=useRef(),dragging=useRef(false);
  const [locked,setLocked]=useState(false),[paintMode,setPaintMode]=useState(false),[color,setColor]=useState('#9c724e'),[size,setSize]=useState(18),[eraser,setEraser]=useState(false),[sampleColor,setSampleColor]=useState(BASE_COLOR),[count,setCount]=useState(0);
  useEffect(()=>{if(paintMode)document.exitPointerLock?.();},[paintMode]);
  const paint=useMemo(()=>({active:paintMode,color,size,eraser,dragging,onDab:()=>setCount(v=>v+1)}),[paintMode,color,size,eraser]);
  return <div className={`game ${paintMode?'painting-mode':''}`}>
    <Canvas shadows camera={{position:[0,3.2,9],fov:65,near:.1,far:100}} gl={{antialias:true}}><color attach="background" args={['#9ba7b1']}/><fog attach="fog" args={['#9ba7b1',18,55]}/><ambientLight intensity={1.8}/><directionalLight castShadow position={[6,12,5]} intensity={3} shadow-mapSize-width={2048} shadow-mapSize-height={2048}/><Sky sunPosition={[100,20,50]} turbidity={7} rayleigh={1.2}/><Room onPick={setSampleColor}/><Player playerRef={playerRef} paint={paint}/><Controller playerRef={playerRef} paintMode={paintMode} setLocked={setLocked} setSample={setSampleColor}/></Canvas>
    <div className="hud"><div className="brand">HIDENSEEK <span>3D</span></div><div className="objective">TEST ROOM · 3D PAINT PROTOTYPE</div>
      {!paintMode&&!locked&&<div className="start-card"><div className="start-title">ENTER THE ROOM</div><div className="start-subtitle">Click anywhere to capture the mouse</div><div className="key-row"><span>W A S D</span> Move <span>MOUSE</span> Look <span>P</span> Paint</div></div>}
      {paintMode&&<div className="paint-instruction">PAINT MODE · DRAG YOUR BRUSH OVER THE 3D CHARACTER</div>}
      {!paintMode&&locked&&<div className="camo-panel compact"><div className="camo-heading"><span>PAINT COVERAGE</span><strong>{Math.min(100,Math.round(count/2))}%</strong></div><div className="camo-bar"><div className="camo-fill style" style={{width:`${Math.min(100,Math.round(count/2))}%`}}/></div><div className="camo-status"><span className="sample-swatch" style={{background:sampleColor}}/><span>READY TO HIDE</span><span className="camo-help">P · PAINT</span></div></div>}
      {!paintMode&&<div className="controls"><b>WASD</b> move&nbsp;&nbsp; <b>MOUSE</b> look&nbsp;&nbsp; <b>P</b> paint&nbsp;&nbsp; <b>E</b> sample</div>}{!paintMode&&<div className="crosshair">+</div>}
    </div>
    <PaintUI active={paintMode} setActive={setPaintMode} color={color} setColor={setColor} size={size} setSize={setSize} eraser={eraser} setEraser={setEraser} sampleColor={sampleColor} setColorFromSurface={()=>setColor(sampleColor)}/>
  </div>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
