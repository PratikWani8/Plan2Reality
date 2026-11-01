from typing import List, Optional, Literal
from pydantic import BaseModel, Field

class Point2DModel(BaseModel):
  x: float
  z: float

class WallModel(BaseModel):
  id: str
  start: Point2DModel
  end: Point2DModel
  height: float = 2.8
  thickness: float = 0.2
  material: Optional[str] = "plaster_white"
  confidence: float = 0.9
  isExterior: bool = False

class RoomModel(BaseModel):
  id: str
  name: str
  polygon: List[Point2DModel]
  area: Optional[float] = None
  floorMaterial: Optional[str] = "hardwood_oak"
  wallColor: Optional[str] = "#FAF8F5"
  ceilingVisible: bool = False
  confidence: float = 0.85

class OpeningModel(BaseModel):
  id: str
  type: Literal["door", "window", "opening"]
  wallId: Optional[str] = None
  position: Point2DModel
  width: float = 0.9
  height: float = 2.1
  sillHeight: Optional[float] = 0.0
  confidence: float = 0.85

class FurnitureModel(BaseModel):
  id: str
  type: str
  name: str
  position: dict
  rotation: dict
  dimensions: dict

class ScaleMetadata(BaseModel):
  pixelsPerMeter: float
  calibrated: bool = False
  referenceLineLengthMeters: Optional[float] = None
  confidence: float = 0.8

class FloorPlanMetadataModel(BaseModel):
  sourceFileName: Optional[str] = None
  sourceDimensions: Optional[dict] = None
  scale: ScaleMetadata
  defaultWallHeight: float = 2.8
  defaultWallThickness: float = 0.20
  units: str = "meters"
  processedAt: Optional[str] = None

class FloorPlanGeometryModel(BaseModel):
  version: str = "1.0.0"
  metadata: FloorPlanMetadataModel
  walls: List[WallModel]
  rooms: List[RoomModel]
  openings: List[OpeningModel]
  furniture: List[FurnitureModel] = []

class AnalysisResponse(BaseModel):
  success: bool
  geometry: FloorPlanGeometryModel
  warnings: List[str] = []
  errors: List[str] = []
  suggestions: List[str] = []
  processingTimeMs: float
