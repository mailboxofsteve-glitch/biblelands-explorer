import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Center, useGLTF } from "@react-three/drei";
import * as THREE from "three";
// Configure Draco for useGLTF (drei uses three-stdlib internally)
const DRACO_CDN = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";
useGLTF.preload("/models/default-city.gltf");

const DEFAULT_MODEL = "/models/default-city.gltf";

interface ModelPreviewProps {
  modelUrl: string | null;
  scale?: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  isCity?: boolean;
}

function Model({
  url,
  rotationX = 0,
  rotationY = 0,
  rotationZ = 0,
}: {
  url: string;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
}) {
  const { scene } = useGLTF(url, DRACO_CDN);
  const cloned = React.useMemo(() => {
    const c = scene.clone();
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => m.clone());
          mesh.material.forEach((m) => { m.side = THREE.DoubleSide; });
        } else {
          mesh.material = mesh.material.clone();
          mesh.material.side = THREE.DoubleSide;
        }
      }
    });
    return c;
  }, [scene]);

  const rx = THREE.MathUtils.degToRad(rotationX);
  const ry = THREE.MathUtils.degToRad(rotationY);
  const rz = THREE.MathUtils.degToRad(rotationZ);

  return (
    <Center>
      <primitive object={cloned} rotation={[rx, ry, rz]} />
    </Center>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#c8a020" wireframe />
    </mesh>
  );
}

export default function ModelPreview({
  modelUrl,
  rotationX = 0,
  rotationY = 0,
  rotationZ = 0,
  isCity = false,
}: ModelPreviewProps) {
  const url = modelUrl || (isCity ? DEFAULT_MODEL : null);

  if (!url) {
    return (
      <div className="h-[200px] rounded-md border border-border bg-muted/50 flex items-center justify-center text-xs text-muted-foreground">
        No model selected
      </div>
    );
  }

  return (
    <div className="h-[200px] rounded-md border border-border bg-black/80 overflow-hidden">
      <Canvas camera={{ position: [3, 2, 3], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 3, 1]} intensity={1.0} />
        <hemisphereLight args={[0xfdfcfa, 0x473b2b, 0.4]} />
        <Suspense fallback={<LoadingFallback />}>
          <Model
            url={url}
            rotationX={rotationX}
            rotationY={rotationY}
            rotationZ={rotationZ}
          />
        </Suspense>
        <OrbitControls autoRotate autoRotateSpeed={2} enableZoom enablePan={false} />
      </Canvas>
    </div>
  );
}
