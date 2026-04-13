import { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

interface Particle3D {
  position: THREE.Vector3;
  target: THREE.Vector3;
  base: THREE.Vector3;
  velocity: THREE.Vector3;
  opacity: number;
}

type NarrativePhase = 'showing404' | 'fragmenting' | 'formingPerson' | 'walking' | 'crashed' | 'sitting';

function ParticleSystem({ phase, onPhaseChange }: { phase: NarrativePhase; onPhaseChange: (phase: NarrativePhase) => void }) {
  const particlesRef = useRef<Particle3D[]>([]);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const personXRef = useRef(-5);
  const walkTimeRef = useRef(0);
  const idleTimeRef = useRef(0);
  const bodyRotationRef = useRef(0);
  const phaseStartTimeRef = useRef(0);
  const tempObject = new THREE.Object3D();
  const tempColor = new THREE.Color();

  useEffect(() => {
    if (phase === 'fragmenting' && particlesRef.current.length === 0) {
      const particles: Particle3D[] = [];
      for (let i = 0; i < 300; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const speed = 3 + Math.random() * 6;
        
        particles.push({
          position: new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
          ),
          target: new THREE.Vector3(),
          base: new THREE.Vector3(),
          velocity: new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta) * speed,
            Math.sin(phi) * Math.sin(theta) * speed,
            Math.cos(phi) * speed - 1
          ),
          opacity: 0.9 + Math.random() * 0.1
        });
      }
      particlesRef.current = particles;
      phaseStartTimeRef.current = Date.now();
      
      setTimeout(() => {
        formPerson();
        onPhaseChange('formingPerson');
      }, 1800);
    }
  }, [phase, onPhaseChange]);

  const formPerson = () => {
    const personShape: THREE.Vector3[] = [];
    
    for (let i = 0; i < 50; i++) {
      const theta = (i / 50) * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 0.4 * (0.6 + Math.random() * 0.4);
      personShape.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * r,
        2 + Math.cos(phi) * r,
        Math.sin(phi) * Math.sin(theta) * r
      ));
    }
    
    for (let i = 0; i < 80; i++) {
      personShape.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.6,
        0.5 + Math.random() * 1.3,
        (Math.random() - 0.5) * 0.4
      ));
    }
    
    for (let i = 0; i < 35; i++) {
      const t = i / 35;
      personShape.push(new THREE.Vector3(
        -0.3 - t * 0.6 + (Math.random() - 0.5) * 0.15,
        1.5 - t * 0.6 + (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15
      ));
    }
    
    for (let i = 0; i < 35; i++) {
      const t = i / 35;
      personShape.push(new THREE.Vector3(
        0.3 + t * 0.6 + (Math.random() - 0.5) * 0.15,
        1.5 - t * 0.6 + (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15
      ));
    }
    
    for (let i = 0; i < 50; i++) {
      const t = i / 50;
      personShape.push(new THREE.Vector3(
        -0.2 - t * 0.15 + (Math.random() - 0.5) * 0.15,
        0.5 - t * 1.2 + (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15
      ));
    }
    
    for (let i = 0; i < 50; i++) {
      const t = i / 50;
      personShape.push(new THREE.Vector3(
        0.2 + t * 0.15 + (Math.random() - 0.5) * 0.15,
        0.5 - t * 1.2 + (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15
      ));
    }
    
    particlesRef.current.slice(0, personShape.length).forEach((p, i) => {
      p.target.copy(personShape[i]);
      p.base.copy(personShape[i]);
    });
    
    phaseStartTimeRef.current = Date.now();
    
    setTimeout(() => {
      onPhaseChange('walking');
      phaseStartTimeRef.current = Date.now();
    }, 2200);
  };

  useFrame((state, delta) => {
    if (!meshRef.current || particlesRef.current.length === 0) return;
    
    const mesh = meshRef.current;
    if (!mesh || !mesh.instanceMatrix) return;
    
    const now = Date.now();
    
    if (phase === 'fragmenting') {
      particlesRef.current.forEach((p, i) => {
        p.position.add(p.velocity.clone().multiplyScalar(delta));
        p.velocity.y -= 0.3 * delta * 60;
        p.opacity *= 0.995;
        
        tempObject.position.copy(p.position);
        tempObject.updateMatrix();
        mesh.setMatrixAt(i, tempObject.matrix);
        
        tempColor.setRGB(1, 1, 1);
        if (mesh.instanceColor) {
          mesh.setColorAt(i, tempColor);
        }
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    
    else if (phase === 'formingPerson') {
      const mesh = meshRef.current;
      if (!mesh) return;
      
      particlesRef.current.forEach((p, i) => {
        const diff = p.target.clone().sub(p.position.clone().setX(p.position.x - personXRef.current));
        p.position.add(diff.multiplyScalar(0.12));
        
        const dist = diff.length();
        if (dist < 0.05) {
          p.position.add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.006,
            (Math.random() - 0.5) * 0.006,
            (Math.random() - 0.5) * 0.006
          ));
        }
        
        tempObject.position.set(
          p.position.x + personXRef.current,
          p.position.y,
          p.position.z
        );
        tempObject.updateMatrix();
        mesh.setMatrixAt(i, tempObject.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
    
    else if (phase === 'walking') {
      const mesh = meshRef.current;
      if (!mesh) return;
      
      const walkDuration = 5000;
      const elapsed = now - phaseStartTimeRef.current;
      const progress = Math.min(elapsed / walkDuration, 1);
      
      personXRef.current = -5 + progress * 8;
      walkTimeRef.current += delta * 4;
      
      particlesRef.current.forEach((p, i) => {
        const bounceFreq = 3;
        const bounce = Math.sin(walkTimeRef.current * bounceFreq) * 0.06;
        
        const isLeg = i >= 200;
        let legOffset = 0;
        if (isLeg) {
          const isLeftLeg = i >= 200 && i < 250;
          const legPhase = isLeftLeg ? 0 : Math.PI;
          legOffset = Math.sin(walkTimeRef.current * bounceFreq + legPhase) * 0.15;
        }
        
        const isArm = (i >= 120 && i < 170) || (i >= 170 && i < 200);
        let armOffset = 0;
        if (isArm) {
          const isLeftArm = i >= 120 && i < 155;
          const armPhase = isLeftArm ? Math.PI : 0;
          armOffset = Math.sin(walkTimeRef.current * bounceFreq + armPhase) * 0.1;
        }
        
        const targetPos = p.base.clone();
        targetPos.y += bounce + legOffset;
        targetPos.x += armOffset;
        
        const diff = targetPos.clone().sub(p.position.clone().setX(p.position.x - personXRef.current));
        p.position.add(diff.multiplyScalar(0.15));
        
        p.position.add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.004,
          (Math.random() - 0.5) * 0.004,
          (Math.random() - 0.5) * 0.004
        ));
        
        tempObject.position.set(
          p.position.x + personXRef.current,
          p.position.y,
          p.position.z
        );
        tempObject.updateMatrix();
        mesh.setMatrixAt(i, tempObject.matrix);
      });
      
      if (progress >= 1) {
        onPhaseChange('crashed');
        phaseStartTimeRef.current = now;
        
        setTimeout(() => {
          bodyRotationRef.current = -0.3;
          onPhaseChange('sitting');
          phaseStartTimeRef.current = now;
        }, 500);
      }
      
      mesh.instanceMatrix.needsUpdate = true;
    }
    
    else if (phase === 'sitting') {
      const mesh = meshRef.current;
      if (!mesh) return;
      idleTimeRef.current += delta;
      const breatheAmp = 0.03;
      const breathe = Math.sin(idleTimeRef.current * 2) * breatheAmp;
      const headTilt = Math.sin(idleTimeRef.current * 0.8) * 0.05;
      
      particlesRef.current.forEach((p, i) => {
        const isHead = i < 50;
        let targetPos = p.base.clone();
        targetPos.y += breathe;
        
        if (isHead) {
          targetPos.y += headTilt * 0.5;
          targetPos.x += Math.sin(idleTimeRef.current * 0.8) * 0.04;
        }
        
        const diff = targetPos.clone().sub(p.position.clone().setX(p.position.x - personXRef.current));
        p.position.add(diff.multiplyScalar(0.1));
        
        p.position.add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.003,
          (Math.random() - 0.5) * 0.003,
          (Math.random() - 0.5) * 0.003
        ));
        
        const cos = Math.cos(bodyRotationRef.current);
        const sin = Math.sin(bodyRotationRef.current);
        const rotatedX = p.position.x * cos - p.position.y * sin;
        const rotatedY = p.position.x * sin + p.position.y * cos;
        
        tempObject.position.set(
          rotatedX + personXRef.current,
          rotatedY,
          p.position.z
        );
        tempObject.updateMatrix();
        mesh.setMatrixAt(i, tempObject.matrix);
      });
      
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 300]}>
      <sphereGeometry args={[0.04, 8, 8]} />
      <meshStandardMaterial color="white" />
    </instancedMesh>
  );
}

function Door({ phase }: { phase: NarrativePhase }) {
  const doorRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (doorRef.current && phase === 'crashed') {
      doorRef.current.position.x = Math.sin(Date.now() * 0.05) * 0.02;
    } else if (doorRef.current) {
      doorRef.current.position.x = 0;
    }
  });

  if (phase !== 'walking' && phase !== 'crashed' && phase !== 'sitting') return null;

  return (
    <group ref={doorRef} position={[5, 0, 0]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.1, 3, 1.5]} />
        <meshStandardMaterial color="#ffffff" wireframe />
      </mesh>
      <mesh position={[-0.3, 0, 0.4]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

export default function Scene3D({ phase, onPhaseChange }: { phase: NarrativePhase; onPhaseChange: (phase: NarrativePhase) => void }) {
  return (
    <Canvas>
      <PerspectiveCamera makeDefault position={[0, 2, 12]} fov={50} />
      <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI / 2} />
      
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, 5, -5]} intensity={0.5} />
      
      {phase === 'showing404' && (
        <Text
          fontSize={2}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          404
        </Text>
      )}
      
      {phase !== 'showing404' && (
        <>
          <ParticleSystem phase={phase} onPhaseChange={onPhaseChange} />
          <Door phase={phase} />
        </>
      )}
    </Canvas>
  );
}
