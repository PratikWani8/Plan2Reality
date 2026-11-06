import React, { useState, useMemo } from 'react';
import * as THREE from 'three';
import { Wall, Opening } from '../../types/geometry';

interface WallMeshProps {
  wall: Wall;
  openings?: Opening[];
  isSelected: boolean;
  onSelect: (wallId: string) => void;
  wireframe?: boolean;
}

export const WallMesh: React.FC<WallMeshProps> = ({
  wall,
  openings = [],
  isSelected,
  onSelect,
  wireframe = false,
}) => {
  const [hovered, setHovered] = useState(false);

  const { length, angle, center, wallOpenings } = useMemo(() => {
    const dx = wall.end.x - wall.start.x;
    const dz = wall.end.z - wall.start.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    const ang = Math.atan2(dz, dx);
    const mx = (wall.start.x + wall.end.x) / 2;
    const mz = (wall.start.z + wall.end.z) / 2;

    // Filter openings attached or closest to this wall
    const relevantOpenings = openings.filter((op) => {
      if (op.wallId === wall.id) return true;
      // Alternatively check distance to segment
      const px = op.position.x;
      const pz = op.position.z;
      const d1 = Math.sqrt((px - wall.start.x) ** 2 + (pz - wall.start.z) ** 2);
      const d2 = Math.sqrt((px - wall.end.x) ** 2 + (pz - wall.end.z) ** 2);
      return Math.abs(d1 + d2 - len) < 0.25;
    });

    return {
      length: len,
      angle: ang,
      center: new THREE.Vector3(mx, wall.height / 2, mz),
      wallOpenings: relevantOpenings,
    };
  }, [wall, openings]);

  // Don't render degenerate walls with zero length
  if (length < 0.05) return null;

  // Visual materials
  const getWallBaseColor = () => {
    switch (wall.material) {
      case 'grey':
      case 'gray':
      case 'plaster_grey':
        return '#8A918E';
      case 'charcoal':
      case 'dark':
        return '#2B2C2B';
      case 'brick':
        return '#9E5B42';
      case 'concrete':
        return '#A6A49F';
      case 'sage':
        return '#6E9C88';
      case 'white':
      case 'plaster_white':
        return '#FAF8F5';
      case 'blue':
        return '#4287f5';
      case 'yellow':
        return '#faf482';
      case 'orange':
        return '#ffa74a';
      case 'pink':
        return '#fda1ff';
      default:
        if (wall.material && wall.material.startsWith('#')) return wall.material;
        return wall.isExterior ? '#EAE2D8' : '#FAF8F5';
    }
  };

  const wallColor = isSelected ? '#467A65' : hovered ? '#CAD6CE' : getWallBaseColor();
  const roughness = wall.material === 'concrete' ? 0.95 : 0.85;

  return (
    <group
      position={[center.x, 0, center.z]}
      rotation={[0, -angle, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(wall.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* If wall has no cutouts, render a single solid extruded box */}
      {wallOpenings.length === 0 ? (
        <mesh position={[0, wall.height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[length, wall.height, wall.thickness]} />
          <meshStandardMaterial
            color={wallColor}
            roughness={roughness}
            metalness={0.05}
            wireframe={wireframe}
          />
        </mesh>
      ) : (
        /* If wall has openings, segment into left, right, lintel and sill portions */
        <group>
          {(() => {
            const sortedOpenings = [...wallOpenings].sort((a, b) => {
              const dAx = a.position.x - wall.start.x;
              const dAz = a.position.z - wall.start.z;
              const distA = Math.sqrt(dAx * dAx + dAz * dAz);
              const dBx = b.position.x - wall.start.x;
              const dBz = b.position.z - wall.start.z;
              const distB = Math.sqrt(dBx * dBx + dBz * dBz);
              return distA - distB;
            });

            const segments: React.ReactNode[] = [];
            let currentLocalX = -length / 2;

            sortedOpenings.forEach((op, idx) => {
              const dOpX = op.position.x - wall.start.x;
              const dOpZ = op.position.z - wall.start.z;
              const opDist = Math.sqrt(dOpX * dOpX + dOpZ * dOpZ);
              const opLocalX = opDist - length / 2;
              const halfOpWidth = op.width / 2;

              const opStartX = Math.max(-length / 2, opLocalX - halfOpWidth);
              const opEndX = Math.min(length / 2, opLocalX + halfOpWidth);

              // Solid segment before opening
              if (opStartX > currentLocalX + 0.05) {
                const segLen = opStartX - currentLocalX;
                const segMidX = currentLocalX + segLen / 2;
                segments.push(
                  <mesh key={`solid_${idx}`} position={[segMidX, wall.height / 2, 0]} castShadow receiveShadow>
                    <boxGeometry args={[segLen, wall.height, wall.thickness]} />
                    <meshStandardMaterial color={wallColor} roughness={roughness} wireframe={wireframe} />
                  </mesh>
                );
              }

              // Lintel above opening
              const lintelHeight = wall.height - (op.height + (op.sillHeight || 0));
              if (lintelHeight > 0.05) {
                const lintelY = wall.height - lintelHeight / 2;
                const opLen = opEndX - opStartX;
                const opMidX = (opStartX + opEndX) / 2;
                segments.push(
                  <mesh key={`lintel_${idx}`} position={[opMidX, lintelY, 0]} castShadow receiveShadow>
                    <boxGeometry args={[opLen, lintelHeight, wall.thickness]} />
                    <meshStandardMaterial color={wallColor} roughness={roughness} wireframe={wireframe} />
                  </mesh>
                );
              }

              // Sill below window
              const sillH = op.sillHeight || 0;
              if (op.type === 'window' && sillH > 0.05) {
                const opLen = opEndX - opStartX;
                const opMidX = (opStartX + opEndX) / 2;
                segments.push(
                  <mesh key={`sill_${idx}`} position={[opMidX, sillH / 2, 0]} castShadow receiveShadow>
                    <boxGeometry args={[opLen, sillH, wall.thickness]} />
                    <meshStandardMaterial color={wallColor} roughness={roughness} wireframe={wireframe} />
                  </mesh>
                );
              }

              currentLocalX = opEndX;
            });

            // Final trailing solid segment after last opening
            if (currentLocalX < length / 2 - 0.05) {
              const segLen = length / 2 - currentLocalX;
              const segMidX = currentLocalX + segLen / 2;
              segments.push(
                <mesh key="solid_tail" position={[segMidX, wall.height / 2, 0]} castShadow receiveShadow>
                  <boxGeometry args={[segLen, wall.height, wall.thickness]} />
                  <meshStandardMaterial color={wallColor} roughness={roughness} wireframe={wireframe} />
                </mesh>
              );
            }

            return segments;
          })()}
        </group>
      )}

      {/* Selected Accent Base Trim */}
      {isSelected && (
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[length + 0.02, 0.08, wall.thickness + 0.04]} />
          <meshBasicMaterial color="#C27D56" wireframe />
        </mesh>
      )}
    </group>
  );
};
