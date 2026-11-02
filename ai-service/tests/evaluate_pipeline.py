import sys
import os
import time
import math
import tempfile
from typing import Dict, Any, List, Tuple
from shapely.geometry import Polygon, LineString, Point
import numpy as np

# Suppress ultralytics cache errors in sandbox
os.environ["ULTRALYTICS_CONFIG_DIR"] = tempfile.gettempdir()
os.environ["YOLO_VERBOSE"] = "False"

# Ensure ai-service root and tests are in sys.path
sys.path.insert(0, os.path.abspath('.'))
sys.path.insert(0, os.path.abspath('ai-service'))
sys.path.insert(0, os.path.abspath('ai-service/tests'))

from app.services.pipeline import process_floor_plan
try:
  from tests.benchmark_dataset import generate_benchmark_dataset, BenchmarkCase
except ImportError:
  from benchmark_dataset import generate_benchmark_dataset, BenchmarkCase

def match_wall_segments(
  detected_walls: List[Dict[str, Any]],
  true_walls: List[Tuple[float, float, float, float]],
  center_x: float,
  center_z: float,
  ppm: float,
  tol_meters: float = 0.40
) -> Tuple[float, float, float, float]:
  """
  Calculates Wall Precision, Wall Recall, F1 Score, and Dimensional Error (MAE in meters).
  """
  if not detected_walls and not true_walls:
    return 1.0, 1.0, 1.0, 0.0
  if not detected_walls:
    return 0.0, 0.0, 0.0, 0.0
  if not true_walls:
    return 0.0, 0.0, 0.0, 0.0

  tol_px = tol_meters * ppm

  # Convert detected walls back to uncentered pixel space for direct comparison
  det_lines = []
  for w in detected_walls:
    sx = w["start"]["x"] * ppm + center_x
    sz = w["start"]["z"] * ppm + center_z
    ex = w["end"]["x"] * ppm + center_x
    ez = w["end"]["z"] * ppm + center_z
    det_lines.append(LineString([(sx, sz), (ex, ez)]))

  true_lines = [LineString([(tw[0], tw[1]), (tw[2], tw[3])]) for tw in true_walls]

  matched_det = set()
  matched_true = set()
  length_errors_m = []

  for d_idx, d_line in enumerate(det_lines):
    best_t_idx = -1
    best_dist = float("inf")

    for t_idx, t_line in enumerate(true_lines):
      h_dist = d_line.hausdorff_distance(t_line)
      if h_dist < tol_px and h_dist < best_dist:
        best_dist = h_dist
        best_t_idx = t_idx

    if best_t_idx != -1:
      matched_det.add(d_idx)
      matched_true.add(best_t_idx)
      t_line = true_lines[best_t_idx]
      err_m = abs(d_line.length - t_line.length) / ppm
      length_errors_m.append(err_m)

  precision = len(matched_det) / len(det_lines) if det_lines else 0.0
  recall = len(matched_true) / len(true_lines) if true_lines else 0.0
  f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
  mae_m = float(np.mean(length_errors_m)) if length_errors_m else 0.0

  return precision, recall, f1, mae_m

def match_room_iou(
  detected_rooms: List[Dict[str, Any]],
  true_rooms: List[Dict[str, Any]],
  center_x: float,
  center_z: float,
  ppm: float
) -> float:
  """
  Calculates mean Room Intersection-over-Union (IoU) across matched rooms.
  """
  if not detected_rooms or not true_rooms:
    return 0.0

  det_polys = []
  for r in detected_rooms:
    pts = [(pt["x"] * ppm + center_x, pt["z"] * ppm + center_z) for pt in r["polygon"]]
    if len(pts) >= 3:
      try:
        p = Polygon(pts)
        if not p.is_valid:
          p = p.buffer(0)
        if p.is_valid and p.area > 0:
          det_polys.append(p)
      except Exception:
        pass

  true_polys = []
  for tr in true_rooms:
    pts = tr["polygon"]
    if len(pts) >= 3:
      try:
        p = Polygon(pts)
        if not p.is_valid:
          p = p.buffer(0)
        if p.is_valid and p.area > 0:
          true_polys.append(p)
      except Exception:
        pass

  if not det_polys or not true_polys:
    return 0.0

  ious = []
  for tp in true_polys:
    best_iou = 0.0
    for dp in det_polys:
      try:
        inter = tp.intersection(dp).area
        union = tp.union(dp).area
        if union > 0:
          iou = inter / union
          if iou > best_iou:
            best_iou = iou
      except Exception:
        pass
    ious.append(best_iou)

  return float(np.mean(ious)) if ious else 0.0

def match_openings(
  detected_openings: List[Dict[str, Any]],
  true_openings: List[Dict[str, Any]],
  center_x: float,
  center_z: float,
  ppm: float,
  tol_meters: float = 0.85
) -> Tuple[float, float, float]:
  """
  Calculates Opening Precision, Recall, and F1 score.
  """
  if not true_openings and not detected_openings:
    return 1.0, 1.0, 1.0
  if not true_openings:
    return (1.0 if not detected_openings else 0.0), 1.0, 1.0
  if not detected_openings:
    return 0.0, 0.0, 0.0

  tol_px = tol_meters * ppm
  matched_det = set()
  matched_true = set()

  for d_idx, dop in enumerate(detected_openings):
    d_px = dop["position"]["x"] * ppm + center_x
    d_pz = dop["position"]["z"] * ppm + center_z

    best_dist = float("inf")
    best_t_idx = -1

    for t_idx, top in enumerate(true_openings):
      tx = top["x"]
      tz = top["y"]
      dist = math.hypot(d_px - tx, d_pz - tz)
      if dist <= tol_px and dist < best_dist:
        best_dist = dist
        best_t_idx = t_idx

    if best_t_idx != -1:
      matched_det.add(d_idx)
      matched_true.add(best_t_idx)

  precision = len(matched_det) / len(detected_openings) if detected_openings else 0.0
  recall = len(matched_true) / len(true_openings) if true_openings else 0.0
  f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
  return precision, recall, f1

def evaluate_dataset() -> Dict[str, Any]:
  dataset = generate_benchmark_dataset()

  print("\n" + "=" * 90)
  print(f"{'CASE NAME':<32} | {'WALL P':<7} | {'WALL R':<7} | {'F1':<6} | {'ROOM IoU':<8} | {'MAE (m)':<7} | {'OP F1':<6} | {'TIME'}")
  print("-" * 90)

  precisions = []
  recalls = []
  f1s = []
  ious = []
  maes = []
  op_f1s = []
  times = []

  for case in dataset:
    t0 = time.perf_counter()
    res = process_floor_plan(case.image_bytes, f"{case.name}.png")
    elapsed_ms = (time.perf_counter() - t0) * 1000

    geom = res.get("geometry")
    if not geom:
      print(f"{case.name:<32} | FAILED PIPELINE")
      continue

    det_walls = geom["walls"]
    det_rooms = geom["rooms"]
    det_openings = geom["openings"]
    ppm = geom["metadata"]["scale"]["pixelsPerMeter"]
    offset = geom["metadata"].get("centerOffset", {"x": case.width / 2.0, "z": case.height / 2.0})
    center_x = offset["x"]
    center_z = offset["z"]

    p, r, f1, mae = match_wall_segments(det_walls, case.true_walls, center_x, center_z, ppm)
    room_iou = match_room_iou(det_rooms, case.true_rooms, center_x, center_z, ppm)
    op_p, op_r, op_f1 = match_openings(det_openings, case.true_openings, center_x, center_z, ppm)

    precisions.append(p)
    recalls.append(r)
    f1s.append(f1)
    ious.append(room_iou)
    maes.append(mae)
    op_f1s.append(op_f1)
    times.append(elapsed_ms)

    print(f"{case.name:<32} | {p*100:>6.1f}% | {r*100:>6.1f}% | {f1*100:>5.1f}% | {room_iou*100:>7.1f}% | {mae:>6.2f}m | {op_f1*100:>5.1f}% | {elapsed_ms:>5.1f}ms")

  print("=" * 90)
  avg_p = float(np.mean(precisions)) * 100
  avg_r = float(np.mean(recalls)) * 100
  avg_f1 = float(np.mean(f1s)) * 100
  avg_iou = float(np.mean(ious)) * 100
  avg_mae = float(np.mean(maes))
  avg_op_f1 = float(np.mean(op_f1s)) * 100
  avg_t = float(np.mean(times))

  print(f"{'OVERALL AVERAGE':<32} | {avg_p:>6.1f}% | {avg_r:>6.1f}% | {avg_f1:>5.1f}% | {avg_iou:>7.1f}% | {avg_mae:>6.2f}m | {avg_op_f1:>5.1f}% | {avg_t:>5.1f}ms")
  print("=" * 90 + "\n")

  return {
    "precision": avg_p,
    "recall": avg_r,
    "f1": avg_f1,
    "room_iou": avg_iou,
    "mae_meters": avg_mae,
    "opening_f1": avg_op_f1,
    "latency_ms": avg_t,
  }

if __name__ == "__main__":
  evaluate_dataset()
