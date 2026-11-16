import React, { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { FloorPlanGeometry } from '../../types/geometry';
import { WallMesh } from './WallMesh';
import { FloorMesh } from './FloorMesh';
import { OpeningMesh } from './OpeningMesh';
import { FurnitureMesh } from './FurnitureMesh';
import { SceneLighting } from './SceneLighting';
import { CameraManager } from './CameraManager';
import { ViewerSettings, SelectedEntity } from './types';

// Helper component inside Canvas to export the three.js scene instance to parent
const SceneBridge: React.FC<{ onSceneReady: (scene: THREE.Scene) => void }> = ({ onSceneReady }) => {
  const { scene } = useThree();
  useEffect(() => {
    onSceneReady(scene);
  }, [scene, onSceneReady]);
  return null;
};

interface ViewerCanvasProps {
  geometry: FloorPlanGeometry;
  settings: ViewerSettings;
  selectedEntity: SelectedEntity;
  onSelectEntity: (entity: SelectedEntity) => void;
  resetSignal?: number;
  onSceneReady?: (scene: THREE.Scene) => void;
}

export const ViewerCanvas: React.FC<ViewerCanvasProps> = ({
  geometry,
  settings,
  selectedEntity,
  onSelectEntity,
  resetSignal = 0,
  onSceneReady,
}) => {
  return (
    <div className="w-full h-full relative select-none">
      <Canvas
        shadows
        camera={{ position: [8, 9, 10], fov: 42 }}
        onPointerDown={(e) => {
          // If clicked on canvas background, deselect
          if (e.target === e.currentTarget) {
            onSelectEntity({ type: null, id: null });
          }
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
          preserveDrawingBuffer: true,
        }}
        className="w-full h-full bg-[#0E1210]"
      >
        {onSceneReady && <SceneBridge onSceneReady={onSceneReady} />}

        {/* Dynamic Lighting System */}
        <SceneLighting intensity={settings.sunlightIntensity} />

        {/* Camera Control with Smooth Preset Transitions */}
        <CameraManager preset={settings.cameraPreset} resetSignal={resetSignal} />

        {/* Architectural Ground Plane Grid */}
        {settings.showGrid && (
          <gridHelper
            args={[40, 40, '#34604F', '#1E2B24']}
            position={[0, 0, 0]}
          />
        )}

        {/* Enclosed Room Floors */}
        {settings.showFloors &&
          geometry.rooms.map((room) => (
            <FloorMesh
              key={room.id}
              room={room}
              totalRooms={geometry.rooms.length}
              isSelected={selectedEntity.type === 'room' && selectedEntity.id === room.id}
              onSelect={(id) => onSelectEntity({ type: 'room', id })}
              showLabels={settings.showDimensions}
            />
          ))}

        {/* Parametric Walls */}
        {settings.showWalls &&
          geometry.walls.map((wall) => (
            <WallMesh
              key={wall.id}
              wall={wall}
              openings={geometry.openings}
              isSelected={selectedEntity.type === 'wall' && selectedEntity.id === wall.id}
              onSelect={(id) => onSelectEntity({ type: 'wall', id })}
              wireframe={settings.wireframe}
            />
          ))}

        {/* Doors and Windows */}
        {settings.showOpenings &&
          geometry.openings.map((opening) => (
            <OpeningMesh
              key={opening.id}
              opening={opening}
              walls={geometry.walls}
              isSelected={selectedEntity.type === 'opening' && selectedEntity.id === opening.id}
              onSelect={(id) => onSelectEntity({ type: 'opening', id })}
            />
          ))}

        {/* Architectural Furniture Pieces */}
        {settings.showFurniture &&
          geometry.furniture?.map((furn) => (
            <FurnitureMesh
              key={furn.id}
              item={furn}
              isSelected={selectedEntity.type === 'furniture' && selectedEntity.id === furn.id}
              onSelect={(id) => onSelectEntity({ type: 'furniture', id })}
            />
          ))}
      </Canvas>
    </div>
  );
};
