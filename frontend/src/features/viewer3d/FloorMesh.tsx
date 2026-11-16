import React, { useState, useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Room } from '../../types/geometry';

interface FloorMeshProps {
  room: Room;
  totalRooms?: number;
  isSelected: boolean;
  onSelect: (roomId: string) => void;
  showLabels?: boolean;
}

export const FloorMesh: React.FC<FloorMeshProps> = ({
  room,
  totalRooms = 1,
  isSelected,
  onSelect,
  showLabels = true,
}) => {
  const [hovered, setHovered] = useState(false);

  // Build the 2D polygon shape and centroid
  const { shape, centroid, outlinePoints } = useMemo(() => {
    const s = new THREE.Shape();
    let cx = 0;
    let cz = 0;
    const pts = room.polygon;

    if (!pts || pts.length < 3) {
      return { shape: null, centroid: new THREE.Vector3(0, 0, 0), outlinePoints: [] };
    }

    pts.forEach((pt, idx) => {
      cx += pt.x;
      cz += pt.z;
      // Note: Map 2D (x, z) to shape (x, -y)
      if (idx === 0) s.moveTo(pt.x, -pt.z);
      else s.lineTo(pt.x, -pt.z);
    });
    s.closePath();

    cx /= pts.length;
    cz /= pts.length;

    // Line points for room perimeter outline
    const linePts = pts.map((p) => new THREE.Vector3(p.x, 0.03, p.z));
    linePts.push(new THREE.Vector3(pts[0].x, 0.03, pts[0].z));

    return {
      shape: s,
      centroid: new THREE.Vector3(cx, 0.04, cz),
      outlinePoints: linePts,
    };
  }, [room.polygon]);

  if (!shape) return null;

  // Material color palette
  const getFloorColor = () => {
    if (isSelected) return '#34604F';
    if (hovered) return '#CAD6CE';
    switch (room.floorMaterial) {
      case 'hardwood_walnut':
        return '#654B38';
      case 'tile_marble':
        return '#EBECEE';
      case 'polished_concrete':
        return '#9B9B97';
      case 'carpet_beige':
        return '#DCD3C6';
      case 'hardwood_oak':
      default:
        return '#C2A37E';
    }
  };

  // Only display label badge if labels enabled AND (selected, hovered, or major room when room count is small)
  const shouldRenderLabel =
    showLabels &&
    (isSelected ||
      hovered ||
      (totalRooms <= 5 && room.area !== undefined && room.area >= 6.0));

  return (
    <group>
      {/* Floor Polygon Mesh */}
      <mesh
        position={[0, 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect(room.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial
          color={getFloorColor()}
          roughness={room.floorMaterial === 'tile_marble' ? 0.2 : 0.75}
          metalness={room.floorMaterial === 'tile_marble' ? 0.1 : 0.02}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>

      {/* Selected / Hovered Perimeter Highlight */}
      {(isSelected || hovered) && outlinePoints.length > 0 && (
        <line>
          <bufferGeometry attach="geometry">
            <bufferAttribute
              attach="attributes-position"
              count={outlinePoints.length}
              array={new Float32Array(outlinePoints.flatMap((p) => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial attach="material" color={isSelected ? '#C27D56' : '#2A4D3F'} linewidth={3} />
        </line>
      )}

      {/* Compact Architectural Room Label Badge */}
      {shouldRenderLabel && (
        <Html
          position={[centroid.x, 0.15, centroid.z]}
          center
          distanceFactor={22}
          zIndexRange={[0, 10]}
          className="pointer-events-none select-none transition-opacity duration-200"
        >
          <div
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium backdrop-blur-md transition-all whitespace-nowrap shadow-sm border flex items-center gap-1.5 ${
              isSelected
                ? 'bg-[#1E372D] text-white border-[#C27D56] shadow-md scale-105'
                : hovered
                ? 'bg-[#FAF8F5] text-[#13241E] border-[#467A65] shadow-md'
                : 'bg-[#141614]/90 text-[#E1EBE6] border-[#34604F]/60'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#C27D56] shrink-0" />
            <span className="font-semibold">{room.name}</span>
            {room.area && (
              <span className="text-[#9DBEB0] font-mono pl-1 border-l border-[#34604F]/60">
                {room.area.toFixed(1)}m²
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
