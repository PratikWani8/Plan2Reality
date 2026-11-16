import React, { useState } from 'react';
import { FurnitureItem } from '../../types/geometry';

interface FurnitureMeshProps {
  item: FurnitureItem;
  isSelected: boolean;
  onSelect: (itemId: string) => void;
}

export const FurnitureMesh: React.FC<FurnitureMeshProps> = ({
  item,
  isSelected,
  onSelect,
}) => {
  const [hovered, setHovered] = useState(false);

  const { position, rotation, dimensions, type } = item;
  const { width = 1.0, height = 0.8, depth = 0.8 } = dimensions;

  const highlightColor = isSelected ? '#C27D56' : hovered ? '#6E9C88' : null;

  return (
    <group
      position={[position.x, position.y, position.z]}
      rotation={[rotation.x, rotation.y, rotation.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Dynamic Furniture Model based on type */}
      {type === 'sofa' && (
        <group position={[0, height / 2, 0]}>
          {/* Seat Cushion */}
          <mesh position={[0, -height * 0.15, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height * 0.4, depth]} />
            <meshStandardMaterial color={highlightColor || '#D5CEC5'} roughness={0.9} />
          </mesh>
          {/* Backrest */}
          <mesh position={[0, height * 0.2, -depth * 0.35]} castShadow>
            <boxGeometry args={[width, height * 0.65, depth * 0.25]} />
            <meshStandardMaterial color={highlightColor || '#C9C0B5'} roughness={0.9} />
          </mesh>
          {/* Left Armrest */}
          <mesh position={[-width * 0.45, 0, 0]} castShadow>
            <boxGeometry args={[width * 0.12, height * 0.55, depth]} />
            <meshStandardMaterial color={highlightColor || '#C9C0B5'} roughness={0.9} />
          </mesh>
          {/* Right Armrest */}
          <mesh position={[width * 0.45, 0, 0]} castShadow>
            <boxGeometry args={[width * 0.12, height * 0.55, depth]} />
            <meshStandardMaterial color={highlightColor || '#C9C0B5'} roughness={0.9} />
          </mesh>
        </group>
      )}

      {type === 'bed' && (
        <group position={[0, height / 2, 0]}>
          {/* Bed Base Frame */}
          <mesh position={[0, -height * 0.25, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height * 0.35, depth]} />
            <meshStandardMaterial color={highlightColor || '#5C4033'} roughness={0.7} />
          </mesh>
          {/* Mattress */}
          <mesh position={[0, height * 0.05, 0]} castShadow>
            <boxGeometry args={[width * 0.94, height * 0.35, depth * 0.94]} />
            <meshStandardMaterial color={highlightColor || '#FAF8F5'} roughness={0.95} />
          </mesh>
          {/* Headboard */}
          <mesh position={[0, height * 0.35, -depth * 0.46]} castShadow>
            <boxGeometry args={[width, height * 0.9, depth * 0.08]} />
            <meshStandardMaterial color={highlightColor || '#3D5245'} roughness={0.8} />
          </mesh>
          {/* Pillows */}
          <mesh position={[-width * 0.25, height * 0.28, -depth * 0.3]} castShadow>
            <boxGeometry args={[width * 0.35, 0.14, depth * 0.22]} />
            <meshStandardMaterial color="#FAF8F5" roughness={0.9} />
          </mesh>
          <mesh position={[width * 0.25, height * 0.28, -depth * 0.3]} castShadow>
            <boxGeometry args={[width * 0.35, 0.14, depth * 0.22]} />
            <meshStandardMaterial color="#FAF8F5" roughness={0.9} />
          </mesh>
        </group>
      )}

      {type === 'dining_table' && (
        <group position={[0, height / 2, 0]}>
          {/* Tabletop */}
          <mesh position={[0, height * 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, 0.05, depth]} />
            <meshStandardMaterial color={highlightColor || '#B89B72'} roughness={0.6} />
          </mesh>
          {/* 4 Wooden Legs */}
          {[
            [-width * 0.42, -depth * 0.42],
            [width * 0.42, -depth * 0.42],
            [-width * 0.42, depth * 0.42],
            [width * 0.42, depth * 0.42],
          ].map(([lx, lz], i) => (
            <mesh key={i} position={[lx, 0, lz]} castShadow>
              <cylinderGeometry args={[0.03, 0.025, height * 0.9, 12]} />
              <meshStandardMaterial color="#2B2C2B" roughness={0.5} />
            </mesh>
          ))}
        </group>
      )}

      {type === 'coffee_table' && (
        <group position={[0, height / 2, 0]}>
          <mesh position={[0, height * 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, 0.04, depth]} />
            <meshStandardMaterial color={highlightColor || '#E8E6DF'} roughness={0.3} metalness={0.1} />
          </mesh>
          <mesh position={[0, -0.05, 0]} castShadow>
            <boxGeometry args={[width * 0.8, height * 0.7, depth * 0.8]} />
            <meshStandardMaterial color="#1E372D" roughness={0.6} />
          </mesh>
        </group>
      )}

      {type === 'desk' && (
        <group position={[0, height / 2, 0]}>
          {/* Desk Top */}
          <mesh position={[0, height * 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, 0.05, depth]} />
            <meshStandardMaterial color={highlightColor || '#4A3B32'} roughness={0.5} />
          </mesh>
          {/* Minimalist Metal Frame / Legs */}
          <mesh position={[-width * 0.44, 0, 0]} castShadow>
            <boxGeometry args={[0.04, height * 0.9, depth * 0.9]} />
            <meshStandardMaterial color="#1A1C1A" roughness={0.4} />
          </mesh>
          <mesh position={[width * 0.44, 0, 0]} castShadow>
            <boxGeometry args={[0.04, height * 0.9, depth * 0.9]} />
            <meshStandardMaterial color="#1A1C1A" roughness={0.4} />
          </mesh>
        </group>
      )}

      {type === 'plant' && (
        <group position={[0, height / 2, 0]}>
          {/* Terracotta Planter Pot */}
          <mesh position={[0, -height * 0.25, 0]} castShadow>
            <cylinderGeometry args={[width * 0.4, width * 0.3, height * 0.5, 16]} />
            <meshStandardMaterial color={highlightColor || '#C27D56'} roughness={0.8} />
          </mesh>
          {/* Lush Green Architectural Foliage */}
          <mesh position={[0, height * 0.2, 0]} castShadow>
            <dodecahedronGeometry args={[width * 0.48, 1]} />
            <meshStandardMaterial color="#3D5245" roughness={0.7} />
          </mesh>
        </group>
      )}
    </group>
  );
};
