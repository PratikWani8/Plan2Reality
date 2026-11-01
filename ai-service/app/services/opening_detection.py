import math
import numpy as np
from typing import List, Dict, Any, Optional

def project_point_to_line_segment(
  px: float,
  pz: float,
  x1: float,
  z1: float,
  x2: float,
  z2: float
):
  dx = x2 - x1
  dz = z2 - z1
  l2 = dx * dx + dz * dz
  if l2 == 0:
    return math.hypot(px - x1, pz - z1), 0.0, x1, z1
  t = ((px - x1) * dx + (pz - z1) * dz) / l2
  t_clamped = max(0.0, min(1.0, t))
  proj_x = x1 + t_clamped * dx
  proj_z = z1 + t_clamped * dz
  dist = math.hypot(px - proj_x, pz - proj_z)
  return dist, t_clamped, proj_x, proj_z

def detect_candidate_openings(
  walls: List[Dict[str, Any]],
  detected_gaps: Optional[List[Dict[str, Any]]] = None,
  binary_image: Optional[np.ndarray] = None,
  pixels_per_meter: float = 45.0
) -> List[Dict[str, Any]]:
  """
  Evidence-based door and window opening detection.
  Only detects openings where physical evidence exists:
    1. Physical wall gaps captured during collinear line segment merging.
    2. Verified pixel dropout spans along wall centerlines in the binary mask.
  Does NOT hallucinate or hardcode openings on continuous solid walls.
  """
  openings: List[Dict[str, Any]] = []
  if not walls:
    return openings

  ppm = max(pixels_per_meter, 15.0)
  op_idx = 1
  assigned_positions = []

  # --- Method 1: Gaps Discovered During Collinear Merging ---
  if detected_gaps:
    for gap in detected_gaps:
      gx = gap["x"]
      gy = gap["y"]
      gap_px = gap["gap_px"]
      gap_m = gap_px / ppm

      # Filter non-architectural gap widths (< 0.65m or > 3.8m)
      if gap_m < 0.60 or gap_m > 3.8:
        continue

      best_wall = None
      best_dist = 20.0 # px
      best_t = 0.0
      best_proj = (gx, gy)

      for w in walls:
        x1 = w["start"]["x"]
        z1 = w["start"]["z"]
        x2 = w["end"]["x"]
        z2 = w["end"]["z"]

        dist, t, px, pz = project_point_to_line_segment(gx, gy, x1, z1, x2, z2)
        # Opening must be strictly interior to the wall segment (not hanging at the very corner)
        if dist < best_dist and 0.08 <= t <= 0.92:
          best_dist = dist
          best_wall = w
          best_t = t
          best_proj = (px, pz)

      if best_wall is not None:
        # Check if already captured an opening at this location
        is_duplicate = False
        for ax, az in assigned_positions:
          if math.hypot(best_proj[0] - ax, best_proj[1] - az) < (0.8 * ppm):
            is_duplicate = True
            break
        if is_duplicate:
          continue

        is_exterior = bool(best_wall.get("isExterior", False))
        width_m = round(max(0.75, min(gap_m, 3.2)), 2)

        if is_exterior:
          # Exterior openings with wider span are typically windows
          if width_m >= 1.1:
            op_type = "window"
            height_m = 1.35
            sill_height_m = 0.85
          else:
            op_type = "door"
            height_m = 2.10
            sill_height_m = 0.0
        else:
          op_type = "door"
          height_m = 2.10
          sill_height_m = 0.0

        openings.append({
          "id": f"opening_{op_idx}",
          "type": op_type,
          "wallId": best_wall["id"],
          "position": {"x": float(best_proj[0]), "z": float(best_proj[1])},
          "width": float(width_m),
          "height": float(height_m),
          "sillHeight": float(sill_height_m),
          "confidence": 0.92
        })
        assigned_positions.append(best_proj)
        op_idx += 1

  # --- Method 2: Centerline Pixel Profile Sampling on Binary Mask ---
  # If a wall segment has an unmerged dropout (gap in the stroke) >= 0.75m
  if binary_image is not None:
    img_h, img_w = binary_image.shape[:2]
    min_gap_samples = int(ppm * 0.75)
    max_gap_samples = int(ppm * 3.2)

    for w in walls:
      x1 = w["start"]["x"]
      z1 = w["start"]["z"]
      x2 = w["end"]["x"]
      z2 = w["end"]["z"]
      w_len = math.hypot(x2 - x1, z2 - z1)

      if w_len < (2.4 * ppm):
        continue

      num_samples = int(w_len)
      if num_samples < 20:
        continue

      # Sample intensity along wall line
      ts = np.linspace(0.10, 0.90, num_samples)
      sample_xs = np.clip(np.round(x1 + ts * (x2 - x1)).astype(int), 0, img_w - 1)
      sample_zs = np.clip(np.round(z1 + ts * (z2 - z1)).astype(int), 0, img_h - 1)
      intensities = binary_image[sample_zs, sample_xs]

      # Find contiguous runs of 0 (dropout gaps in white wall strokes)
      current_run_start = None
      for idx, val in enumerate(intensities):
        if val == 0:
          if current_run_start is None:
            current_run_start = idx
        else:
          if current_run_start is not None:
            run_len = idx - current_run_start
            if min_gap_samples <= run_len <= max_gap_samples:
              mid_idx = (current_run_start + idx) // 2
              mx = float(sample_xs[mid_idx])
              mz = float(sample_zs[mid_idx])

              # Verify not already detected
              already_exists = False
              for ax, az in assigned_positions:
                if math.hypot(mx - ax, mz - az) < (0.9 * ppm):
                  already_exists = True
                  break

              if not already_exists:
                is_exterior = bool(w.get("isExterior", False))
                gap_m = round(run_len / ppm, 2)
                width_m = round(max(0.75, min(gap_m, 3.0)), 2)

                if is_exterior:
                  op_type = "window" if width_m >= 1.05 else "door"
                  height_m = 1.35 if op_type == "window" else 2.10
                  sill_height_m = 0.85 if op_type == "window" else 0.0
                else:
                  op_type = "door"
                  height_m = 2.10
                  sill_height_m = 0.0

                openings.append({
                  "id": f"opening_{op_idx}",
                  "type": op_type,
                  "wallId": w["id"],
                  "position": {"x": mx, "z": mz},
                  "width": float(width_m),
                  "height": float(height_m),
                  "sillHeight": float(sill_height_m),
                  "confidence": 0.88
                })
                assigned_positions.append((mx, mz))
                op_idx += 1

            current_run_start = None

  return openings
