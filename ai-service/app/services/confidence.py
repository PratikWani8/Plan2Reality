import math
from typing import List, Dict, Any, Tuple, Optional

def evaluate_pipeline_confidence(
  walls: List[Dict[str, Any]],
  rooms: List[Dict[str, Any]],
  scale_info: Dict[str, Any],
  image_quality: Optional[Dict[str, Any]] = None
) -> Tuple[float, List[str], List[str]]:
  """
  Computes a measurable, evidence-based confidence score derived from
  structural topology, geometric orthogonality, room coverage, and image quality.
  """
  warnings: List[str] = []
  suggestions: List[str] = []

  # 1. Image Quality Factor (0.0 to 1.0)
  if image_quality:
    blur_score = image_quality.get("blurScore", 100.0)
    contrast_range = image_quality.get("contrastRange", 120.0)
    is_inverted = image_quality.get("isInvertedCad", False)

    # Normalize blur score (typical sharp CAD > 250, blurry scan < 70)
    norm_blur = max(0.40, min(1.0, blur_score / 250.0))
    norm_contrast = max(0.40, min(1.0, contrast_range / 150.0))
    img_quality_factor = (norm_blur * 0.5) + (norm_contrast * 0.5)

    if blur_score < 75.0:
      warnings.append("Floor plan scan has moderate image blur or low sharpness.")
      suggestions.append("Upload a higher-resolution scan or native PDF for crisper line extraction.")
    if is_inverted:
      suggestions.append("Dark-theme CAD blueprint automatically inverted for analysis.")
  else:
    img_quality_factor = 0.88

  # 2. Wall Connectivity & Network Validation (0.0 to 1.0)
  if not walls or len(walls) == 0:
    warnings.append("No continuous wall segments detected. Check image contrast and lighting.")
    suggestions.append("Ensure the floor plan has distinct, visible wall lines.")
    connectivity_score = 0.20
    orthogonality_score = 0.20
  else:
    endpoints = []
    for w in walls:
      endpoints.append((w["start"]["x"], w["start"]["z"]))
      endpoints.append((w["end"]["x"], w["end"]["z"]))

    connected_count = 0
    snap_radius = 28.0 # pixels (~0.6m)

    for ep in endpoints:
      # Check if this endpoint is near another endpoint
      is_connected = False
      for other in endpoints:
        if other is not ep:
          if math.hypot(ep[0] - other[0], ep[1] - other[1]) <= snap_radius:
            is_connected = True
            break
      if is_connected:
        connected_count += 1

    connectivity_score = connected_count / len(endpoints) if endpoints else 0.0

    if connectivity_score < 0.60:
      warnings.append(f"Wall network has open perimeters ({int((1 - connectivity_score) * 100)}% disconnected corners).")
      suggestions.append("Use the 2D blueprint editor to snap open corners together.")

    # 3. Wall Orthogonality (0.0 to 1.0)
    orthogonal_count = 0
    for w in walls:
      dx = w["end"]["x"] - w["start"]["x"]
      dz = w["end"]["z"] - w["start"]["z"]
      deg = abs(math.degrees(math.atan2(dz, dx))) % 90.0
      # Within 5 degrees of horizontal/vertical or 45 degrees
      if deg <= 6.0 or abs(deg - 90.0) <= 6.0 or abs(deg - 45.0) <= 6.0:
        orthogonal_count += 1

    orthogonality_score = orthogonal_count / len(walls) if walls else 0.0

  # 4. Room Coverage & Enclosure (0.0 to 1.0)
  if not rooms or len(rooms) == 0:
    warnings.append("No fully enclosed room boundaries extracted.")
    suggestions.append("Ensure interior wall lines form closed geometric loops.")
    room_score = 0.40
  else:
    # Check average room area reasonableness (3m² to 80m²)
    valid_room_sizes = sum(1 for r in rooms if 2.5 <= r.get("area", 0.0) <= 120.0)
    room_size_ratio = valid_room_sizes / len(rooms)
    room_score = max(0.70, min(0.98, 0.75 + room_size_ratio * 0.23))

  # 5. Scale Calibration Factor (0.0 to 1.0)
  if scale_info.get("calibrated", False):
    scale_score = 1.0
  elif scale_info.get("method") == "building_envelope_span":
    scale_score = 0.88
    warnings.append("Scale estimated from structural footprint (~13.5m residential span).")
    suggestions.append("Calibrate the real scale using a known dimension or 0.9m door in the 2D editor.")
  else:
    scale_score = 0.78
    warnings.append("Scale estimated using canvas ratio fallback.")
    suggestions.append("Draw a 2-point reference line in the editor to accurately set meters per pixel.")

  # Measurable weighted composite score:
  # 30% Wall Connectivity, 25% Orthogonality, 25% Room Enclosure, 10% Image Quality, 10% Scale
  overall = (
    connectivity_score * 0.30 +
    orthogonality_score * 0.25 +
    room_score * 0.25 +
    img_quality_factor * 0.10 +
    scale_score * 0.10
  )

  clamped_overall = round(max(0.35, min(0.98, overall)), 2)
  return clamped_overall, warnings, suggestions
