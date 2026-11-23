"use client";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Component, useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { Anim, AvatarLook, BodyShape, Measures, MuscleId } from "@/lib/types";
import { buildRig } from "./build";
import { applyPose } from "./poses";

export interface AvatarProps {
  shape: BodyShape;
  look: AvatarLook;
  ratios: Measures;
  goalRatios?: Measures | null;
  muscles?: boolean;
  selected?: MuscleId | null;
  onSelect?: (id: MuscleId) => void;
  anim?: Anim;
  mk?: number;
  def?: number;
  view?: number; // angle cible (rad) : 0 face, π/2 profil, π dos
  autoRotate?: boolean;
  interactive?: boolean;
  className?: string;
}

function Body(p: AvatarProps) {
  const { shape, look, ratios, goalRatios, muscles = false, selected = null, anim = "idle", mk = 1, def = 1 } = p;
  const rig = useMemo(() => buildRig(shape, ratios, look, { muscles, selected, mk, def }), [shape, ratios, look, muscles, selected, mk, def]);
  const ghost = useMemo(() => (goalRatios ? buildRig(shape, goalRatios, look, { muscles: false, selected: null, mk: 1, def: 1, ghost: true }) : null), [shape, goalRatios, look]);
  useEffect(() => () => rig.dispose(), [rig]);
  useEffect(() => () => ghost?.dispose(), [ghost]);
  const spin = useRef<THREE.Group>(null);
  const reduce = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const t0 = useRef(0);
  useEffect(() => { t0.current = -1; }, [anim]);
  useFrame((st, dt) => {
    if (t0.current < 0) t0.current = st.clock.elapsedTime;
    const t = reduce && anim === "idle" ? 0 : st.clock.elapsedTime - t0.current;
    applyPose(rig, anim, t);
    if (ghost) applyPose(ghost, anim === "idle" ? "idle" : anim, t);
    const g = spin.current;
    if (g && p.view !== undefined) {
      let d = p.view - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
      g.rotation.y += d * Math.min(1, dt * 6);
    }
  });
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (!p.onSelect || e.delta > 6) return;
    const id = e.object.userData.muscle as MuscleId | undefined;
    if (id) { e.stopPropagation(); p.onSelect(id); }
  };
  return (
    <group ref={spin}>
      <primitive object={rig.root} onClick={click} />
      {ghost && <primitive object={ghost.root} />}
    </group>
  );
}

class Boundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() {
    return this.state.err ? (
      <div className="grid h-full place-items-center p-6 text-center text-sm text-mute">La 3D n&apos;a pas pu démarrer sur cet appareil (WebGL indisponible).</div>
    ) : this.props.children;
  }
}

export default function Avatar3D(p: AvatarProps) {
  const H = p.shape.H;
  return (
    <div className={`relative ${p.className ?? "h-[420px]"}`}>
      <Boundary>
        <Canvas shadows dpr={[1, 2]} camera={{ fov: 30, position: [0, H * 0.58, H * 2.75], near: 0.05, far: 50 }} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}>
          <hemisphereLight args={["#e9fff2", "#071012", 0.75]} />
          <directionalLight position={[2.2, 4, 3]} intensity={1.35} castShadow shadow-mapSize={[1024, 1024]} />
          <directionalLight position={[-3, 2.2, -2.5]} intensity={0.9} color="#39ff88" />
          <directionalLight position={[3, 1.2, -3]} intensity={0.55} color="#00e0ff" />
          <Body {...p} />
          <ContactShadows position={[0, 0.001, 0]} opacity={0.55} scale={3} blur={2.4} far={2} />
          <mesh rotation-x={-Math.PI / 2} position={[0, -0.002, 0]}>
            <ringGeometry args={[0.62, 0.64, 96]} />
            <meshBasicMaterial color="#39ff88" transparent opacity={0.35} />
          </mesh>
          <OrbitControls
            enabled={p.interactive !== false}
            target={[0, H * 0.5, 0]}
            enablePan
            minDistance={H * 0.8}
            maxDistance={H * 4.5}
            maxPolarAngle={Math.PI * 0.58}
            autoRotate={!!p.autoRotate}
            autoRotateSpeed={0.8}
            makeDefault
          />
        </Canvas>
      </Boundary>
    </div>
  );
}
