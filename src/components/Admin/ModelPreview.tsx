import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Center, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { Badge } from "@/components/ui/badge";

const DRACO_CDN = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";
useGLTF.preload("/models/default-city.gltf");

const DEFAULT_MODEL = "/models/default-city.gltf";

interface ModelPreviewProps {
  modelUrl: string | null;
  scale?: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  altitude?: number;
  isCity?: boolean;
}

function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#8B7355" transparent opacity={0.4} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Model({
  url,
  rotationX = 0,
  rotationY = 0,
  rotationZ = 0,
  previewScale = 1,
  yOffset = 0,
}: {
  url: string;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  previewScale?: number;
  yOffset?: number;
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
    <Center position={[0, yOffset, 0]}>
      <primitive
        object={cloned}
        rotation={[rx, ry, rz]}
        scale={[previewScale, previewScale, previewScale]}
      />
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
  scale = 2000,
  rotationX = 0,
  rotationY = 0,
  rotationZ = 0,
  altitude = 0,
  isCity = false,
}: ModelPreviewProps) {
  const url = modelUrl || (isCity ? DEFAULT_MODEL : null);
  const previewScale = Math.min(5, Math.max(0.1, scale / 2000));
  const yOffset = altitude / 500;
  const showWarning = altitude < -100;

  if (!url) {
    return (
      <div className="h-[280px] rounded-md border border-border bg-muted/50 flex items-center justify-center text-xs text-muted-foreground">
        No model selected
      </div>
    );
  }

  return (
    <div className="relative h-[280px] rounded-md border border-border bg-black/80 overflow-hidden">
      {showWarning && (
        <div className="absolute top-2 left-2 z-10">
          <Badge className="bg-amber-600 text-white text-[10px] px-2 py-0.5">
            ⚠ Model may be below terrain — increase altitude offset
          </Badge>
        </div>
      )}
      <Canvas camera={{ position: [3, 2, 3], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 3, 1]} intensity={1.0} />
        <hemisphereLight args={[0xfdfcfa, 0x473b2b, 0.4]} />
        <pointLight position={[-2, 3, 2]} intensity={0.6} />
        <GroundPlane />
        <Suspense fallback={<LoadingFallback />}>
          <Model
            url={url}
            rotationX={rotationX}
            rotationY={rotationY}
            rotationZ={rotationZ}
            previewScale={previewScale}
            yOffset={yOffset}
          />
        </Suspense>
        <OrbitControls autoRotate autoRotateSpeed={2} enableZoom enablePan={false} />
      </Canvas>
    </div>
  );
}
