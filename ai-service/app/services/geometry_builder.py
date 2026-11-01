from typing import List, Dict, Any
from datetime import datetime, timezone
from .geometry_validation import validate_and_sanitize_geometry

def build_metric_geometry(
  walls_raw: List[Dict[str, Any]],
  rooms_raw: List[Dict[str, Any]],
  openings_raw: List[Dict[str, Any]],
  scale_info: Dict[str, Any],
  source_dims: Dict[str, int],
  source_file_name: str = "uploaded_floor_plan.png",
  default_height: float = 2.8,
  default_thickness: float = 0.20
) -> Dict[str, Any]:
  """
  Converts pixel-space detections into centered physical meter coordinates (X, 0, Z)
  for direct consumption by the Three.js 3D viewer.
  Applies strict geometry validation and sanitization.
  """
  ppm = scale_info.get("pixelsPerMeter", 45.0)
  if ppm <= 0:
    ppm = 45.0

  # Compute centroid of all wall vertices to center the building at (0, 0)
  all_x = []
  all_z = []

  for w in walls_raw:
    all_x.extend([w["start"]["x"], w["end"]["x"]])
    all_z.extend([w["start"]["z"], w["end"]["z"]])

  if all_x and all_z:
    center_x = (min(all_x) + max(all_x)) / 2.0
    center_z = (min(all_z) + max(all_z)) / 2.0
  else:
    center_x = source_dims.get("width", 800) / 2.0
    center_z = source_dims.get("height", 600) / 2.0

  # Transform walls
  transformed_walls = []
  for w in walls_raw:
    sx = (w["start"]["x"] - center_x) / ppm
    sz = (w["start"]["z"] - center_z) / ppm
    ex = (w["end"]["x"] - center_x) / ppm
    ez = (w["end"]["z"] - center_z) / ppm

    transformed_walls.append({
      "id": w["id"],
      "start": {"x": round(sx, 3), "z": round(sz, 3)},
      "end": {"x": round(ex, 3), "z": round(ez, 3)},
      "height": round(float(w.get("height", default_height)), 2),
      "thickness": round(float(w.get("thickness", default_thickness)), 2),
      "material": w.get("material", "plaster_white"),
      "confidence": round(float(w.get("confidence", 0.9)), 2),
      "isExterior": bool(w.get("isExterior", False))
    })

  # Transform rooms
  transformed_rooms = []
  for r in rooms_raw:
    poly_meter = []
    for pt in r["polygon"]:
      mx = (pt["x"] - center_x) / ppm
      mz = (pt["z"] - center_z) / ppm
      poly_meter.append({"x": round(mx, 3), "z": round(mz, 3)})

    transformed_rooms.append({
      "id": r["id"],
      "name": r["name"],
      "polygon": poly_meter,
      "area": round(float(r.get("area", 0.0)), 1),
      "floorMaterial": r.get("floorMaterial", "hardwood_oak"),
      "confidence": round(float(r.get("confidence", 0.85)), 2)
    })

  # Transform openings
  transformed_openings = []
  for op in openings_raw:
    op_x = (op["position"]["x"] - center_x) / ppm
    op_z = (op["position"]["z"] - center_z) / ppm

    transformed_openings.append({
      "id": op["id"],
      "type": op["type"],
      "wallId": op.get("wallId"),
      "position": {"x": round(op_x, 3), "z": round(op_z, 3)},
      "width": round(float(op.get("width", 0.9)), 2),
      "height": round(float(op.get("height", 2.1)), 2),
      "sillHeight": round(float(op.get("sillHeight", 0.0)), 2),
      "confidence": round(float(op.get("confidence", 0.85)), 2)
    })

  # Apply strict architectural schema validation and sanitization
  final_walls, final_rooms, final_openings, val_stats = validate_and_sanitize_geometry(
    transformed_walls,
    transformed_rooms,
    transformed_openings,
    min_wall_length_m=0.30,
    min_room_area_m2=1.0
  )

  # Sample furniture piece for visual scale
  sample_furniture = [
    {
      "id": "f_init_plant",
      "type": "plant",
      "name": "Entrance Planter",
      "position": {"x": 0.0, "y": 0.0, "z": 0.0},
      "rotation": {"x": 0, "y": 0, "z": 0},
      "dimensions": {"width": 0.5, "height": 1.1, "depth": 0.5}
    }
  ]

  return {
    "version": "1.0.0",
    "metadata": {
      "sourceFileName": source_file_name,
      "sourceDimensions": source_dims,
      "centerOffset": {"x": round(center_x, 2), "z": round(center_z, 2)},
      "scale": scale_info,
      "defaultWallHeight": default_height,
      "defaultWallThickness": default_thickness,
      "units": "meters",
      "processedAt": datetime.now(timezone.utc).isoformat(),
      "validationStats": val_stats
    },
    "walls": final_walls,
    "rooms": final_rooms,
    "openings": final_openings,
    "furniture": sample_furniture
  }
