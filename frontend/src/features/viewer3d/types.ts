import { FloorPlanGeometry, Wall, Room, Opening, FurnitureItem, ViewerCameraMode } from '../../types/geometry';

export type CameraViewPreset = 'orbit' | 'topDown' | 'dollhouse' | 'front' | 'side' | 'firstPerson';

export interface SelectedEntity {
  type: 'wall' | 'room' | 'opening' | 'furniture' | null;
  id: string | null;
}

export interface ViewerSettings {
  showFloors: boolean;
  showWalls: boolean;
  showOpenings: boolean;
  showFurniture: boolean;
  showGrid: boolean;
  showDimensions: boolean;
  wireframe: boolean;
  sunlightIntensity: number;
  cameraPreset: CameraViewPreset;
}

export const DEFAULT_VIEWER_SETTINGS: ViewerSettings = {
  showFloors: true,
  showWalls: true,
  showOpenings: true,
  showFurniture: true,
  showGrid: true,
  showDimensions: true,
  wireframe: false,
  sunlightIntensity: 1.2,
  cameraPreset: 'orbit',
};
