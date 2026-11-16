import React from 'react';

interface SceneLightingProps {
  intensity?: number;
}

export const SceneLighting: React.FC<SceneLightingProps> = ({ intensity = 1.2 }) => {
  return (
    <>
      {/* Warm Ambient Fill */}
      <ambientLight intensity={0.45 * intensity} color="#FAF8F5" />

      {/* Natural Daylight Hemisphere Sky/Ground */}
      <hemisphereLight
        color="#F0F4F8"
        groundColor="#CAD6CE"
        intensity={0.4 * intensity}
      />

      {/* Primary Sunlight casting crisp architectural shadows */}
      <directionalLight
        position={[14, 20, 10]}
        intensity={1.0 * intensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-bias={-0.0002}
      />

      {/* Soft Secondary Fill Light */}
      <directionalLight position={[-10, 12, -10]} intensity={0.3 * intensity} color="#F4EFEA" />
    </>
  );
};
