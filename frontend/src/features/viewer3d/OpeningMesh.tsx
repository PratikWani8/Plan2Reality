import React, { useState } from 'react';
import { Opening, Wall } from '../../types/geometry';

interface OpeningMeshProps {
  opening: Opening;
  walls: Wall[];
  isSelected: boolean;
  onSelect: (openingId: string) => void;
}

export const OpeningMesh: React.FC<OpeningMeshProps> = ({
  opening,
  walls,
  isSelected,
  onSelect,
}) => {
  const [hovered, setHovered] = useState(false);

  // Find wall orientation to rotate opening correctly
  const wall = walls.find((w) => w.id === opening.wallId);
  let wallAngle = 0;
  let wallThickness = 0.2;

  if (wall) {
    const dx = wall.end.x - wall.start.x;
    const dz = wall.end.z - wall.start.z;
    wallAngle = Math.atan2(dz, dx);
    wallThickness = wall.thickness;
  }

  const elevation = (opening.sillHeight || 0) + opening.height / 2;

  return (
    <group
      position={[opening.position.x, elevation, opening.position.z]}
      rotation={[0, -wallAngle, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(opening.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {opening.type === 'door' ? (
        /* Realistic Modern Door with Frame & Handle */
        <group>
          {/* Frame */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[opening.width, opening.height, wallThickness * 1.05]} />
            <meshStandardMaterial
              color={isSelected ? '#C27D56' : hovered ? '#6E9C88' : '#2A362F'}
              roughness={0.7}
            />
          </mesh>

          {/* Door leaf panel (recessed inside frame) */}
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[opening.width * 0.92, opening.height * 0.96, 0.04]} />
            <meshStandardMaterial
              color="#A37C55" // Warm natural wood veneer
              roughness={0.6}
            />
          </mesh>

          {/* Brass Door Handle */}
          <mesh position={[opening.width * 0.35, 0, 0.035]}>
            <cylinderGeometry args={[0.015, 0.015, 0.12, 12]} />
            <meshStandardMaterial color="#D4AF37" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ) : (
        /* Modern Architectural Window with Glass & Dark Aluminium Frame */
        <group>
          {/* Outer Frame */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[opening.width, opening.height, wallThickness * 1.02]} />
            <meshStandardMaterial
              color={isSelected ? '#C27D56' : hovered ? '#6E9C88' : '#1A1C1A'}
              roughness={0.5}
            />
          </mesh>

          {/* Glass Pane */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[opening.width * 0.92, opening.height * 0.92, 0.02]} />
            <meshPhysicalMaterial
              color="#D9EFF5"
              transparent
              opacity={0.35}
              roughness={0.08}
              metalness={0.1}
              transmission={0.85}
              ior={1.5}
            />
          </mesh>

          {/* Center Mullion Divider */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.03, opening.height * 0.92, 0.04]} />
            <meshStandardMaterial color="#1A1C1A" roughness={0.5} />
          </mesh>
        </group>
      )}
    </group>
  );
};
