export interface Point2D {
  x: number;
  z: number;
}

export interface Wall {
  id: string;
  start: Point2D;
  end: Point2D;
  height: number;      // in meters, default ~2.8m
  thickness: number;   // in meters, default ~0.2m
  material?: string;   // e.g. 'plaster_white', 'brick', 'concrete'
  confidence?: number; // 0.0 - 1.0 from CV detection
  isExterior?: boolean;
}

export interface Room {
  id: string;
  name: string;        // 'Living Room', 'Master Bedroom', 'Kitchen', etc.
  polygon: Point2D[];  // Ordered vertices forming the room footprint
  area?: number;       // in square meters
  floorMaterial?: 'hardwood_oak' | 'tile_marble' | 'carpet_beige' | 'polished_concrete' | 'hardwood_walnut';
  wallColor?: string;
  ceilingVisible?: boolean;
  confidence?: number;
}

export interface Opening {
  id: string;
  type: 'door' | 'window' | 'opening';
  wallId?: string;
  position: Point2D;   // center position on the wall
  width: number;       // in meters (e.g. 0.9m for door, 1.4m for window)
  height: number;      // in meters (e.g. 2.1m for door, 1.2m for window)
  sillHeight?: number; // in meters from floor (0 for doors, ~0.9m for windows)
  confidence?: number;
}

export interface FurnitureItem {
  id: string;
  type: 'sofa' | 'bed' | 'dining_table' | 'chair' | 'coffee_table' | 'desk' | 'plant' | 'tv_unit';
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number }; // Euler angles in radians or degrees
  dimensions: { width: number; height: number; depth: number };
}

export interface FloorPlanMetadata {
  sourceFileName?: string;
  sourceDimensions?: { width: number; height: number };
  scale: {
    pixelsPerMeter: number;
    calibrated: boolean;
    referenceLineLengthMeters?: number;
  };
  defaultWallHeight: number;
  defaultWallThickness: number;
  units: 'meters' | 'feet';
  processedAt?: string;
}

export interface FloorPlanGeometry {
  version: string;
  metadata: FloorPlanMetadata;
  walls: Wall[];
  rooms: Room[];
  openings: Opening[];
  furniture: FurnitureItem[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string;
  originalImageUrl?: string;
  geometry: FloorPlanGeometry;
  status: 'draft' | 'analyzing' | 'calibrated' | 'completed';
}

export type ViewerCameraMode = 'orbit' | 'topDown' | 'dollhouse' | 'firstPerson';
