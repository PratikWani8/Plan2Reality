import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { CameraViewPreset } from './types';

interface CameraManagerProps {
  preset: CameraViewPreset;
  onResetComplete?: () => void;
  resetSignal?: number;
}

export const CameraManager: React.FC<CameraManagerProps> = ({
  preset,
  resetSignal = 0,
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const targetPos = useRef<THREE.Vector3>(new THREE.Vector3(8, 9, 10));
  const targetLook = useRef<THREE.Vector3>(new THREE.Vector3(0, 1, 0));
  const isTransitioning = useRef<boolean>(false);

  useEffect(() => {
    isTransitioning.current = true;

    switch (preset) {
      case 'topDown':
        targetPos.current.set(0, 18, 0.001);
        targetLook.current.set(0, 0, 0);
        break;
      case 'dollhouse':
        targetPos.current.set(9, 7.5, 9);
        targetLook.current.set(0, 1, 0);
        break;
      case 'front':
        targetPos.current.set(0, 2.5, 13);
        targetLook.current.set(0, 1.2, 0);
        break;
      case 'side':
        targetPos.current.set(13, 2.5, 0);
        targetLook.current.set(0, 1.2, 0);
        break;
      case 'firstPerson':
        targetPos.current.set(0, 1.7, 2.2);
        targetLook.current.set(0, 1.6, -1);
        break;
      case 'orbit':
      default:
        targetPos.current.set(8, 9, 10);
        targetLook.current.set(0, 1, 0);
        break;
    }
  }, [preset, resetSignal]);

  // Smooth lerp transition to target camera position
  useFrame((_, delta) => {
    if (!isTransitioning.current || !controlsRef.current) return;

    const lerpSpeed = Math.min(delta * 5, 1);
    camera.position.lerp(targetPos.current, lerpSpeed);
    controlsRef.current.target.lerp(targetLook.current, lerpSpeed);
    controlsRef.current.update();

    if (
      camera.position.distanceTo(targetPos.current) < 0.05 &&
      controlsRef.current.target.distanceTo(targetLook.current) < 0.05
    ) {
      camera.position.copy(targetPos.current);
      controlsRef.current.target.copy(targetLook.current);
      controlsRef.current.update();
      isTransitioning.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={1.2}
      maxDistance={40}
      maxPolarAngle={preset === 'topDown' ? 0.01 : preset === 'firstPerson' ? Math.PI : Math.PI / 2 + 0.05}
      makeDefault
    />
  );
};
