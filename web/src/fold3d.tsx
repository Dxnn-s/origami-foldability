// 3D fold visualization (roadmap P2b).
//
// A single-vertex crease pattern is a disc split into angular sectors. To fold it
// flat you pleat the sectors: each crease is a hinge, and neighboring sectors rotate
// in opposite directions (mountain one way, valley the other). We model that literally
// as a chain of nested hinge groups, group i is a child of group i-1 and rotates about
// crease i's original direction. Because each sector mesh is drawn undeformed in its own
// local frame, rotating a child about the *original* crease direction is exactly a hinge
// along that crease, no matter how the ancestors are already folded.
//
// This is an illustrative fold, not a certified layer ordering (that's the NP-hard part
// the app is honest about). It shows the pleating a valid flat fold would perform.

import { useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { sortedCreases, type Crease } from "./foldability";

const R = 1.35;
const FOLD_MAX = 2.62; // ~150 degrees of dihedral at full fold
const DEG = Math.PI / 180;

const PAPER_A = new THREE.Color("#efe7d3");
const PAPER_B = new THREE.Color("#ddd0b4");
const AMBER = new THREE.Color("#fbbf24");
const CYAN = new THREE.Color("#22d3ee");
const GREY = new THREE.Color("#6b7280");

function creaseColor(a: Crease["assignment"]): THREE.Color {
  return a === "M" ? AMBER : a === "V" ? CYAN : GREY;
}

// Fan geometry for one sector, from the vertex out across its arc.
function sectorGeometry(a0: number, a1: number): THREE.BufferGeometry {
  const seg = Math.max(2, Math.ceil((a1 - a0) / (12 * DEG)));
  const pos: number[] = [0, 0, 0];
  for (let k = 0; k <= seg; k++) {
    const a = a0 + ((a1 - a0) * k) / seg;
    pos.push(R * Math.cos(a), R * Math.sin(a), 0);
  }
  const idx: number[] = [];
  for (let k = 1; k <= seg; k++) idx.push(0, k, k + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

interface Hinge {
  group: THREE.Group;
  axis: THREE.Vector3;
  sign: number;
}

interface Built {
  root: THREE.Group;
  hinges: Hinge[];
  dispose: () => void;
}

// Build the nested hinge chain as a plain three.js hierarchy so we can animate it
// imperatively in useFrame without re-reconciling React on every frame.
function buildHierarchy(creases: Crease[]): Built {
  const root = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];

  let sorted: Crease[];
  try {
    sorted = sortedCreases(creases);
  } catch {
    sorted = [];
  }
  const n = sorted.length;
  if (n < 2) return { root, hinges: [], dispose: () => {} };

  const angles = sorted.map((c) => c.angle * DEG);
  const hinges: Hinge[] = [];
  let parent: THREE.Group = root;

  for (let i = 0; i < n; i++) {
    const a0 = angles[i];
    const a1 = i < n - 1 ? angles[i + 1] : angles[0] + 2 * Math.PI;

    const geo = sectorGeometry(a0, a1);
    const mat = new THREE.MeshStandardMaterial({
      color: i % 2 === 0 ? PAPER_A : PAPER_B,
      roughness: 0.82,
      metalness: 0.02,
      side: THREE.DoubleSide,
      flatShading: true,
    });
    disposables.push(geo, mat);

    const g = new THREE.Group();
    if (i > 0) {
      const axis = new THREE.Vector3(Math.cos(a0), Math.sin(a0), 0).normalize();
      const sign = sorted[i].assignment === "M" ? 1 : sorted[i].assignment === "V" ? -1 : i % 2 ? -1 : 1;
      hinges.push({ group: g, axis, sign });
    }

    g.add(new THREE.Mesh(geo, mat));

    // Bright emissive crease line at the leading edge, bloom picks these up so the
    // folds glow amber/cyan/grey to match the 2D mountain/valley legend.
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0.004),
      new THREE.Vector3(R * Math.cos(a0), R * Math.sin(a0), 0.004),
    ]);
    const lineMat = new THREE.LineBasicMaterial({ color: creaseColor(sorted[i].assignment) });
    disposables.push(lineGeo, lineMat);
    g.add(new THREE.Line(lineGeo, lineMat));

    parent.add(g);
    parent = g;
  }

  return {
    root,
    hinges,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function FoldingVertex({
  creases,
  auto,
  foldRef,
}: {
  creases: Crease[];
  auto: boolean;
  foldRef?: React.MutableRefObject<number>;
}) {
  const built = useMemo(() => buildHierarchy(creases), [creases]);
  useEffect(() => built.dispose, [built]);

  useFrame((state) => {
    const t = auto
      ? easeInOut((Math.sin(state.clock.elapsedTime * 0.55) + 1) / 2)
      : easeInOut(foldRef?.current ?? 0);
    for (const h of built.hinges) {
      h.group.quaternion.setFromAxisAngle(h.axis, t * h.sign * FOLD_MAX);
    }
    if (auto) built.root.rotation.z = state.clock.elapsedTime * 0.28;
  });

  return <primitive object={built.root} />;
}

export function FoldCanvas({
  creases,
  auto = false,
  foldRef,
  className,
}: {
  creases: Crease[];
  auto?: boolean;
  foldRef?: React.MutableRefObject<number>;
  className?: string;
}) {
  return (
    <Canvas
      className={className}
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: auto ? [0, -3.4, 2.6] : [0, -3.2, 3.0], fov: 42 }}
    >
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 4, 6]} intensity={1.5} color="#fff4e0" />
      <directionalLight position={[-4, -2, 3]} intensity={0.5} color="#22d3ee" />
      <group rotation={[-Math.PI / 2.5, 0, 0]}>
        <FoldingVertex creases={creases} auto={auto} foldRef={foldRef} />
      </group>
      {!auto && (
        <OrbitControls
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.6}
          minDistance={2.4}
          maxDistance={6}
          enableDamping
        />
      )}
      <EffectComposer>
        <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.5} luminanceSmoothing={0.3} />
      </EffectComposer>
    </Canvas>
  );
}
