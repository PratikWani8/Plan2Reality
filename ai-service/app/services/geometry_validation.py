import math
from typing import List, Dict, Any, Tuple
from shapely.geometry import Polygon, LineString, Point

def validate_and_sanitize_geometry(
  walls: List[Dict[str, Any]],
  rooms: List[Dict[str, Any]],
  openings: List[Dict[str, Any]],
  min_wall_length_m: float = 0.30,
  min_room_area_m2: float = 1.0
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
  """
  Strict architectural geometry schema validator and sanitizer.
  Ensures:
    1. No NaN, Infinity, or degenerate coordinates exist.
    2. Zero-length or micro-fragment walls (< 0.30m) are eliminated.
    3. Duplicate and overlapping parallel walls are merged.
    4. Room polygons are topologically valid, non-self-intersecting, and have positive area.
    5. Redundant collinear vertices on room boundaries are simplified.
    6. Openings strictly reference legitimate walls and lie within wall bounds.
  """
  stats = {
    "removedDegenerateWalls": 0,
    "removedDuplicateWalls": 0,
    "repairedRoomPolygons": 0,
    "removedInvalidRooms": 0,
    "repairedOpenings": 0,
    "removedOrphanOpenings": 0
  }

  # =========================================================================
  # 1. Wall Validation & Sanitization
  # =========================================================================
  valid_walls: List[Dict[str, Any]] = []

  for w in walls:
    try:
      sx = float(w["start"]["x"])
      sz = float(w["start"]["z"])
      ex = float(w["end"]["x"])
      ez = float(w["end"]["z"])
    except (KeyError, TypeError, ValueError):
      stats["removedDegenerateWalls"] += 1
      continue

    # Finite coordinate check
    if not (math.isfinite(sx) and math.isfinite(sz) and math.isfinite(ex) and math.isfinite(ez)):
      stats["removedDegenerateWalls"] += 1
      continue

    length = math.hypot(ex - sx, ez - sz)
    if length < min_wall_length_m:
      stats["removedDegenerateWalls"] += 1
      continue

    height = float(w.get("height", 2.8))
    if not (2.0 <= height <= 5.0):
      height = 2.8

    thickness = float(w.get("thickness", 0.20))
    if not (0.08 <= thickness <= 0.60):
      thickness = 0.20

    valid_walls.append({
      "id": str(w["id"]),
      "start": {"x": round(sx, 3), "z": round(sz, 3)},
      "end": {"x": round(ex, 3), "z": round(ez, 3)},
      "height": round(height, 2),
      "thickness": round(thickness, 2),
      "material": str(w.get("material", "plaster_white")),
      "confidence": round(float(w.get("confidence", 0.90)), 2),
      "isExterior": bool(w.get("isExterior", False))
    })

  # Wall Deduplication Pass
  deduped_walls: List[Dict[str, Any]] = []
  used_wall = [False] * len(valid_walls)

  for i in range(len(valid_walls)):
    if used_wall[i]:
      continue
    w1 = valid_walls[i]
    p1s = (w1["start"]["x"], w1["start"]["z"])
    p1e = (w1["end"]["x"], w1["end"]["z"])
    len1 = math.hypot(p1e[0] - p1s[0], p1e[1] - p1s[1])

    best_wall = w1
    for j in range(i + 1, len(valid_walls)):
      if used_wall[j]:
        continue
      w2 = valid_walls[j]
      p2s = (w2["start"]["x"], w2["start"]["z"])
      p2e = (w2["end"]["x"], w2["end"]["z"])

      # Forward match
      d_fwd = math.hypot(p1s[0] - p2s[0], p1s[1] - p2s[1]) + math.hypot(p1e[0] - p2e[0], p1e[1] - p2e[1])
      # Reverse match
      d_rev = math.hypot(p1s[0] - p2e[0], p1s[1] - p2e[1]) + math.hypot(p1e[0] - p2s[0], p1e[1] - p2s[1])

      if min(d_fwd, d_rev) < 0.25: # endpoints within 25cm
        used_wall[j] = True
        stats["removedDuplicateWalls"] += 1
        len2 = math.hypot(p2e[0] - p2s[0], p2e[1] - p2s[1])
        if len2 > len1:
          best_wall = w2

    deduped_walls.append(best_wall)

  # Re-index wall IDs sequentially for clean frontend state
  final_walls: List[Dict[str, Any]] = []
  wall_id_map: Dict[str, str] = {}
  for idx, w in enumerate(deduped_walls, start=1):
    new_id = f"wall_{idx}"
    wall_id_map[w["id"]] = new_id
    w_copy = dict(w)
    w_copy["id"] = new_id
    final_walls.append(w_copy)

  # =========================================================================
  # 2. Room Validation & Sanitization
  # =========================================================================
  valid_rooms: List[Dict[str, Any]] = []
  seen_room_centroids: List[Tuple[float, float]] = []

  for r in rooms:
    raw_poly = r.get("polygon", [])
    if len(raw_poly) < 3:
      stats["removedInvalidRooms"] += 1
      continue

    pts = []
    has_nan = False
    for pt in raw_poly:
      try:
        px = float(pt["x"])
        pz = float(pt["z"])
        if math.isfinite(px) and math.isfinite(pz):
          pts.append((px, pz))
        else:
          has_nan = True
      except (KeyError, TypeError, ValueError):
        has_nan = True

    if has_nan or len(pts) < 3:
      stats["removedInvalidRooms"] += 1
      continue

    try:
      poly = Polygon(pts)
      if not poly.is_valid:
        # Auto-repair self-intersecting / bowtie contours
        poly = poly.buffer(0)
        stats["repairedRoomPolygons"] += 1

      if poly.is_empty or poly.area < min_room_area_m2:
        stats["removedInvalidRooms"] += 1
        continue

      # If multipolygon after buffer(0), keep largest sub-polygon
      if poly.geom_type == 'MultiPolygon':
        poly = max(poly.geoms, key=lambda p: p.area)

      # Simplify redundant collinear vertices (tolerance = 3cm)
      poly_simple = poly.simplify(0.03, preserve_topology=True)
      if not poly_simple.is_valid or poly_simple.area < min_room_area_m2:
        poly_simple = poly

      cx, cz = float(poly_simple.centroid.x), float(poly_simple.centroid.y)

      # Deduplicate room if centroid within 1.2m of existing room
      is_dup = False
      for sx, sz in seen_room_centroids:
        if math.hypot(cx - sx, cz - sz) < 1.2:
          is_dup = True
          break
      if is_dup:
        stats["removedInvalidRooms"] += 1
        continue

      seen_room_centroids.append((cx, cz))

      clean_coords = list(poly_simple.exterior.coords)[:-1] # strip duplicated closing vertex
      clean_poly = [{"x": round(float(c[0]), 3), "z": round(float(c[1]), 3)} for c in clean_coords]

      valid_rooms.append({
        "id": f"room_{len(valid_rooms) + 1}",
        "name": str(r.get("name", f"Room {len(valid_rooms) + 1}")),
        "polygon": clean_poly,
        "area": round(float(poly_simple.area), 1),
        "floorMaterial": str(r.get("floorMaterial", "hardwood_oak")),
        "confidence": round(float(r.get("confidence", 0.90)), 2)
      })

    except Exception:
      stats["removedInvalidRooms"] += 1

  # =========================================================================
  # 3. Opening Validation & Sanitization
  # =========================================================================
  valid_openings: List[Dict[str, Any]] = []

  for op in openings:
    try:
      ox = float(op["position"]["x"])
      oz = float(op["position"]["z"])
    except (KeyError, TypeError, ValueError):
      stats["removedOrphanOpenings"] += 1
      continue

    if not (math.isfinite(ox) and math.isfinite(oz)):
      stats["removedOrphanOpenings"] += 1
      continue

    # Find host wall
    target_wall = None
    old_wall_id = op.get("wallId")
    if old_wall_id:
      new_wall_id = wall_id_map.get(old_wall_id, old_wall_id)
      for w in final_walls:
        if w["id"] == new_wall_id:
          target_wall = w
          break

    # If wallId not directly matched, find closest wall within 0.35m
    if target_wall is None:
      best_dist = 0.35
      for w in final_walls:
        sx, sz = w["start"]["x"], w["start"]["z"]
        ex, ez = w["end"]["x"], w["end"]["z"]
        dx, dz = ex - sx, ez - sz
        l2 = dx * dx + dz * dz
        if l2 > 0:
          t = max(0.0, min(1.0, ((ox - sx) * dx + (oz - sz) * dz) / l2))
          proj_x = sx + t * dx
          proj_z = sz + t * dz
          dist = math.hypot(ox - proj_x, oz - proj_z)
          if dist < best_dist:
            best_dist = dist
            target_wall = w

    if target_wall is None:
      stats["removedOrphanOpenings"] += 1
      continue

    # Snap opening position strictly to host wall segment
    wsx, wsz = target_wall["start"]["x"], target_wall["start"]["z"]
    wex, wez = target_wall["end"]["x"], target_wall["end"]["z"]
    wdx, wdz = wex - wsx, wez - wsz
    wl2 = wdx * wdx + wdz * wdz
    wlen = math.sqrt(wl2)

    if wlen < 0.35:
      stats["removedOrphanOpenings"] += 1
      continue

    wt = max(0.06, min(0.94, ((ox - wsx) * wdx + (oz - wsz) * wdz) / wl2))
    snapped_ox = wsx + wt * wdx
    snapped_oz = wsz + wt * wdz

    # Clamp opening width to not exceed 92% of host wall length
    raw_width = float(op.get("width", 0.90))
    width_m = max(0.60, min(raw_width, wlen * 0.92, 3.20))

    op_type = str(op.get("type", "door")).lower()
    if op_type not in ["door", "window"]:
      op_type = "door"

    height_m = float(op.get("height", 2.10 if op_type == "door" else 1.35))
    sill_height_m = float(op.get("sillHeight", 0.0 if op_type == "door" else 0.85))

    valid_openings.append({
      "id": f"opening_{len(valid_openings) + 1}",
      "type": op_type,
      "wallId": target_wall["id"],
      "position": {"x": round(snapped_ox, 3), "z": round(snapped_oz, 3)},
      "width": round(width_m, 2),
      "height": round(height_m, 2),
      "sillHeight": round(sill_height_m, 2),
      "confidence": round(float(op.get("confidence", 0.88)), 2)
    })

  return final_walls, valid_rooms, valid_openings, stats
