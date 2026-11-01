import math
import numpy as np
from typing import List, Dict, Any, Tuple
from .line_detection import LineSegment

def project_point_to_segment(
  px: float,
  pz: float,
  x1: float,
  z1: float,
  x2: float,
  z2: float
) -> Tuple[float, float, float]:
  """
  Calculates the shortest distance from (px, pz) to segment (x1, z1)-(x2, z2)
  and returns (distance, projected_x, projected_z).
  """
  dx = x2 - x1
  dz = z2 - z1
  l2 = dx * dx + dz * dz
  if l2 == 0:
    return math.hypot(px - x1, pz - z1), x1, z1

  t = ((px - x1) * dx + (pz - z1) * dz) / l2
  # Clamp projection parameter strictly between 0 and 1
  t_clamped = max(0.0, min(1.0, t))
  proj_x = x1 + t_clamped * dx
  proj_z = z1 + t_clamped * dz
  dist = math.hypot(px - proj_x, pz - proj_z)
  return dist, proj_x, proj_z

def snap_wall_intersections(
  walls: List[Dict[str, Any]],
  snap_radius: float = 22.0
) -> List[Dict[str, Any]]:
  """
  Snaps wall endpoints that are within snap_radius of each other (corners)
  and projects endpoints onto nearby perpendicular wall lines (T-junctions).
  Creates watertight, topologically connected architectural floor plan envelopes.
  """
  if not walls:
    return []

  # --- Step 1: Endpoint-to-Endpoint Clustering (Corners) ---
  endpoints = []
  for w in walls:
    endpoints.append({"x": w["start"]["x"], "z": w["start"]["z"], "wall_id": w["id"], "type": "start"})
    endpoints.append({"x": w["end"]["x"], "z": w["end"]["z"], "wall_id": w["id"], "type": "end"})

  visited = [False] * len(endpoints)
  for i in range(len(endpoints)):
    if visited[i]:
      continue
    cluster = [endpoints[i]]
    visited[i] = True
    xi, zi = endpoints[i]["x"], endpoints[i]["z"]

    for j in range(i + 1, len(endpoints)):
      if visited[j]:
        continue
      xj, zj = endpoints[j]["x"], endpoints[j]["z"]
      if math.hypot(xj - xi, zj - zi) <= snap_radius:
        cluster.append(endpoints[j])
        visited[j] = True

    if len(cluster) > 1:
      avg_x = sum(p["x"] for p in cluster) / len(cluster)
      avg_z = sum(p["z"] for p in cluster) / len(cluster)
      for p in cluster:
        for w in walls:
          if w["id"] == p["wall_id"]:
            if p["type"] == "start":
              w["start"]["x"] = avg_x
              w["start"]["z"] = avg_z
            else:
              w["end"]["x"] = avg_x
              w["end"]["z"] = avg_z

  # --- Step 2: T-Junction Snapping (Endpoint to intersecting perpendicular segment) ---
  for w in walls:
    for pt_key in ["start", "end"]:
      px = w[pt_key]["x"]
      pz = w[pt_key]["z"]

      best_dist = snap_radius + 1.0
      best_proj = (px, pz)

      for other in walls:
        if other["id"] == w["id"]:
          continue
        ox1, oz1 = other["start"]["x"], other["start"]["z"]
        ox2, oz2 = other["end"]["x"], other["end"]["z"]

        dist, nx, nz = project_point_to_segment(px, pz, ox1, oz1, ox2, oz2)
        if dist < best_dist:
          # Verify that projection doesn't collapse the wall length
          other_pt_key = "end" if pt_key == "start" else "start"
          remaining_len = math.hypot(nx - w[other_pt_key]["x"], nz - w[other_pt_key]["z"])
          if remaining_len > 15.0:
            best_dist = dist
            best_proj = (nx, nz)

      if best_dist <= snap_radius:
        w[pt_key]["x"] = best_proj[0]
        w[pt_key]["z"] = best_proj[1]

  # --- Step 3: Orthogonal rectification & collinearity check ---
  for w in walls:
    dx = abs(w["end"]["x"] - w["start"]["x"])
    dz = abs(w["end"]["z"] - w["start"]["z"])
    # If almost horizontal (height diff < 6px), snap Z to average
    if dz < 6.0 and dx > 20.0:
      avg_z = (w["start"]["z"] + w["end"]["z"]) / 2.0
      w["start"]["z"] = avg_z
      w["end"]["z"] = avg_z
    # If almost vertical (width diff < 6px), snap X to average
    elif dx < 6.0 and dz > 20.0:
      avg_x = (w["start"]["x"] + w["end"]["x"]) / 2.0
      w["start"]["x"] = avg_x
      w["end"]["x"] = avg_x

  return walls

def extract_walls_from_lines(
  lines: List[LineSegment],
  min_length: float = 30.0,
  default_height: float = 2.8,
  default_thickness: float = 0.20
) -> List[Dict[str, Any]]:
  """
  Converts merged 2D line segments into structured architectural wall representations.
  """
  if not lines:
    return []

  walls = []
  wall_idx = 1

  # Compute bounding box of all lines to detect exterior envelope
  min_x = min(min(l[0], l[2]) for l in lines)
  max_x = max(max(l[0], l[2]) for l in lines)
  min_y = min(min(l[1], l[3]) for l in lines)
  max_y = max(max(l[1], l[3]) for l in lines)
  
  width = max_x - min_x or 1.0
  height = max_y - min_y or 1.0
  margin_x = width * 0.08
  margin_y = height * 0.08

  for l in lines:
    x1, y1, x2, y2 = l
    length = math.hypot(x2 - x1, y2 - y1)
    if length < min_length:
      continue

    # Determine if close to outer boundary
    is_exterior = (
      abs(x1 - min_x) < margin_x or abs(x2 - max_x) < margin_x or
      abs(y1 - min_y) < margin_y or abs(y2 - max_y) < margin_y
    )

    thickness = default_thickness if not is_exterior else round(default_thickness * 1.15, 2)

    # Confidence calculation: longer, well-aligned walls receive higher confidence
    conf = min(0.98, max(0.72, 0.78 + (length / (width + height)) * 0.45))

    walls.append({
      "id": f"wall_{wall_idx}",
      "start": {"x": float(x1), "z": float(y1)},
      "end": {"x": float(x2), "z": float(y2)},
      "height": float(default_height),
      "thickness": float(thickness),
      "material": "plaster_white",
      "confidence": round(float(conf), 2),
      "isExterior": bool(is_exterior)
    })
    wall_idx += 1

  # Snap corners and T-junctions together for watertight envelopes
  return snap_wall_intersections(walls)
