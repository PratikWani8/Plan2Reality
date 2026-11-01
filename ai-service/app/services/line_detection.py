import math
import cv2
import numpy as np
from typing import List, Tuple, Dict, Any

LineSegment = Tuple[float, float, float, float] # (x1, y1, x2, y2)

def detect_raw_lines(
  skeleton_or_binary: np.ndarray,
  min_length: int = 28,
  max_gap: int = 16
) -> List[LineSegment]:
  """
  Extracts candidate 2D line segments from preprocessed wall skeleton.
  Using the skeleton guarantees single centerline detections instead of dual Canny edges.
  """
  h, w = skeleton_or_binary.shape[:2]
  adaptive_min_len = max(24, int(min(h, w) * 0.03))
  adaptive_max_gap = max(14, int(min(h, w) * 0.02))

  lines = cv2.HoughLinesP(
    skeleton_or_binary,
    rho=1,
    theta=np.pi / 180,
    threshold=max(26, int(min(h, w) * 0.035)),
    minLineLength=adaptive_min_len,
    maxLineGap=adaptive_max_gap
  )

  if lines is None:
    return []

  segments: List[LineSegment] = []
  for line in lines:
    x1, y1, x2, y2 = line[0]
    length = math.hypot(x2 - x1, y2 - y1)
    if length >= adaptive_min_len:
      segments.append((float(x1), float(y1), float(x2), float(y2)))

  return segments

def snap_architectural_angles(line: LineSegment, tolerance_deg: float = 6.0) -> LineSegment:
  """
  Snaps lines near standard architectural orientations:
    - 0° and 180° (Horizontal)
    - 90° (Vertical)
    - 45° and 135° (Chamfers & Bay windows)
    - 30° and 60° (Hexagonal / angled wings)
  """
  x1, y1, x2, y2 = line
  dx = x2 - x1
  dy = y2 - y1
  length = math.hypot(dx, dy)
  if length < 1e-3:
    return line

  raw_angle_deg = math.degrees(math.atan2(dy, dx))
  norm_angle = raw_angle_deg % 180.0

  target_angles = [0.0, 30.0, 45.0, 60.0, 90.0, 120.0, 135.0, 150.0, 180.0]

  best_target = None
  best_diff = tolerance_deg + 1.0

  for target in target_angles:
    diff = abs(norm_angle - target)
    if diff < best_diff:
      best_diff = diff
      best_target = target

  if best_target is not None and best_diff <= tolerance_deg:
    target_rad = math.radians(best_target if raw_angle_deg >= 0 else best_target - 180.0)
    mx = (x1 + x2) / 2.0
    my = (y1 + y2) / 2.0
    half_len = length / 2.0
    nx1 = mx - half_len * math.cos(target_rad)
    ny1 = my - half_len * math.sin(target_rad)
    nx2 = mx + half_len * math.cos(target_rad)
    ny2 = my + half_len * math.sin(target_rad)
    return (nx1, ny1, nx2, ny2)

  return line

def merge_collinear_lines(
  lines: List[LineSegment],
  distance_threshold: float = 14.0,
  gap_threshold: float = 75.0
) -> Tuple[List[LineSegment], List[Dict[str, float]]]:
  """
  Cluster collinear line segments, project them onto a 1D reference axis,
  sort intervals, and merge across gaps <= gap_threshold.
  Simultaneously extracts physical wall openings (doors/windows) from the bridged gaps.
  """
  if not lines:
    return [], []

  # Pre-snap lines to architectural angles
  snapped_lines = [snap_architectural_angles(l) for l in lines]

  merged_segments: List[LineSegment] = []
  detected_gaps: List[Dict[str, float]] = []
  used = [False] * len(snapped_lines)

  for i in range(len(snapped_lines)):
    if used[i]:
      continue

    x1, y1, x2, y2 = snapped_lines[i]
    dx = x2 - x1
    dy = y2 - y1
    length = math.hypot(dx, dy)
    if length < 5.0:
      continue

    # Unit vector along line direction and normal vector
    ux, uy = dx / length, dy / length
    nx, ny = -uy, ux

    # Normal offset
    c_ref = x1 * nx + y1 * ny

    # Cluster all lines collinear with line i
    cluster_indices = [i]
    used[i] = True

    for j in range(i + 1, len(snapped_lines)):
      if used[j]:
        continue

      jx1, jy1, jx2, jy2 = snapped_lines[j]
      jdx = jx2 - jx1
      jdy = jy2 - jy1
      jlen = math.hypot(jdx, jdy)
      if jlen < 5.0:
        continue

      jux, juy = jdx / jlen, jdy / jlen
      # Parallelism check: dot product near 1.0 (within ~6 degrees)
      dot = abs(ux * jux + uy * juy)
      if dot < 0.985:
        continue

      # Perpendicular distance check
      jc1 = abs(jx1 * nx + jy1 * ny - c_ref)
      jc2 = abs(jx2 * nx + jy2 * ny - c_ref)
      if max(jc1, jc2) <= distance_threshold:
        cluster_indices.append(j)
        used[j] = True

    # Calculate weighted average normal offset across the whole collinear cluster
    total_len = 0.0
    weighted_c = 0.0
    intervals = []

    for idx in cluster_indices:
      cx1, cy1, cx2, cy2 = snapped_lines[idx]
      clen = math.hypot(cx2 - cx1, cy2 - cy1)
      total_len += clen
      weighted_c += (cx1 * nx + cy1 * ny) * clen

      # 1D projection onto line direction
      s1 = cx1 * ux + cy1 * uy
      s2 = cx2 * ux + cy2 * uy
      intervals.append((min(s1, s2), max(s1, s2), clen))

    if not intervals or total_len == 0:
      continue

    avg_c = weighted_c / total_len

    # Sort intervals along the 1D line direction
    intervals.sort(key=lambda item: item[0])

    # 1D Interval Merging with gap bridging
    cur_start, cur_end, _ = intervals[0]

    for next_start, next_end, _ in intervals[1:]:
      gap = next_start - cur_end
      if gap <= gap_threshold:
        # Check if gap represents a real physical opening (e.g. 14px to gap_threshold)
        if 14.0 <= gap <= gap_threshold:
          mid_s = (cur_end + next_start) / 2.0
          gx = avg_c * nx + mid_s * ux
          gy = avg_c * ny + mid_s * uy
          detected_gaps.append({
            "x": float(gx),
            "y": float(gy),
            "gap_px": float(gap),
            "dir_x": float(ux),
            "dir_y": float(uy)
          })
        cur_end = max(cur_end, next_end)
      else:
        # Commit previous merged segment
        mx1 = avg_c * nx + cur_start * ux
        my1 = avg_c * ny + cur_start * uy
        mx2 = avg_c * nx + cur_end * ux
        my2 = avg_c * ny + cur_end * uy
        merged_segments.append((float(mx1), float(my1), float(mx2), float(my2)))
        cur_start, cur_end = next_start, next_end

    # Commit final merged segment
    mx1 = avg_c * nx + cur_start * ux
    my1 = avg_c * ny + cur_start * uy
    mx2 = avg_c * nx + cur_end * ux
    my2 = avg_c * ny + cur_end * uy
    merged_segments.append((float(mx1), float(my1), float(mx2), float(my2)))

  # Duplicate removal pass: filter any segment completely contained in a longer segment
  unique_segments: List[LineSegment] = []
  for i, s_a in enumerate(merged_segments):
    ax1, ay1, ax2, ay2 = s_a
    len_a = math.hypot(ax2 - ax1, ay2 - ay1)
    is_subset = False

    for j, s_b in enumerate(merged_segments):
      if i == j:
        continue
      bx1, by1, bx2, by2 = s_b
      len_b = math.hypot(bx2 - bx1, by2 - by1)
      if len_b >= len_a - 1.0:
        dist1, _, _ = project_point_to_line(ax1, ay1, bx1, by1, bx2, by2)
        dist2, _, _ = project_point_to_line(ax2, ay2, bx1, by1, bx2, by2)
        if dist1 <= distance_threshold and dist2 <= distance_threshold:
          is_subset = True
          break

    if not is_subset:
      unique_segments.append(s_a)

  return unique_segments, detected_gaps

def project_point_to_line(
  px: float,
  py: float,
  x1: float,
  y1: float,
  x2: float,
  y2: float
) -> Tuple[float, float, float]:
  dx = x2 - x1
  dy = y2 - y1
  l2 = dx * dx + dy * dy
  if l2 == 0:
    return math.hypot(px - x1, py - y1), x1, y1
  t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / l2))
  proj_x = x1 + t * dx
  proj_y = y1 + t * dy
  return math.hypot(px - proj_x, py - proj_y), proj_x, proj_y
