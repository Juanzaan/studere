"use client";

import { useEffect, useRef, Suspense, useState } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Float, Text } from "@react-three/drei";
import { useRouter } from "next/navigation";
import * as THREE from "three";

function Floating404() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const router = useRouter();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    router.push('/dashboard');
  };

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
  }, [hovered]);

  return (
    <Float speed={1} rotationIntensity={0.2} floatIntensity={0.2}>
      <group position={[0, 0, 0]}>
        <Text
          ref={meshRef}
          fontSize={6}
          color={hovered ? "#60a5fa" : "#ffffff"}
          anchorX="center"
          anchorY="middle"
          onClick={handleClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          fillOpacity={0.6}
          outlineWidth={0.15}
          outlineOpacity={0.3}
          outlineColor="#ffffff"
        >
          404
        </Text>
        <meshStandardMaterial
          attach="material"
          color={hovered ? "#60a5fa" : "#ffffff"}
          emissive={hovered ? "#60a5fa" : "#ffffff"}
          emissiveIntensity={hovered ? 1.2 : 0.8}
          transparent
          opacity={hovered ? 0.9 : 0.7}
        />
      </group>
    </Float>
  );
}

function Scene() {
  return (
    <>
      <fog attach="fog" args={['#000000', 5, 15]} />
      <ambientLight intensity={0.8} />
      <pointLight position={[5, 5, 5]} intensity={3} color="#ffffff" />
      <pointLight position={[-5, -5, 5]} intensity={2} color="#ffffff" />
      <pointLight position={[0, 0, -5]} intensity={2.5} color="#ffffff" />
      <directionalLight position={[0, 0, 10]} intensity={2} />
      
      <Suspense fallback={null}>
        <Floating404 />
      </Suspense>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  );
}

export function NotFoundScene() {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-black">
      <Canvas 
        camera={{ position: [0, 2, 12], fov: 45 }}
        style={{ width: '100%', height: '100vh' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
