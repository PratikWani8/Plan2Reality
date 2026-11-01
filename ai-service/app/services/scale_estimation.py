import math
from typing import Dict, Any, Optional, List

def estimate_scale(
  image_width: int,
  image_height: int,
  user_calibration: Optional[Dict[str, Any]] = None,
  walls: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
  """
  Estimates pixels-per-meter scale.
  If user provides calibration { p1: {x, y}, p2: {x, y}, realLengthMeters: float }, computes exact scale.
  Otherwise estimates an intelligent architectural heuristic scale based on the detected wall footprint (~13.5m residential span).
  """
  if user_calibration and "p1" in user_calibration and "p2" in user_calibration and "realLengthMeters" in user_calibration:
    p1 = user_calibration["p1"]
    p2 = user_calibration["p2"]
    real_m = float(user_calibration["realLengthMeters"])
    
    if real_m > 0:
      dx = float(p2["x"] - p1["x"])
      dy = float(p2["y"] - p1["y"])
      dist_px = math.hypot(dx, dy)
      
      if dist_px > 5:
        ppm = dist_px / real_m
        return {
          "pixelsPerMeter": round(ppm, 2),
          "calibrated": True,
          "referenceLineLengthMeters": real_m,
          "confidence": 0.98,
          "method": "user_two_point"
        }

  # Intelligent structural envelope estimation
  if walls and len(walls) >= 4:
    all_x = [w["start"]["x"] for w in walls] + [w["end"]["x"] for w in walls]
    all_z = [w["start"]["z"] for w in walls] + [w["end"]["z"] for w in walls]
    span_x = max(all_x) - min(all_x)
    span_z = max(all_z) - min(all_z)

    # Standard residential building width typically spans 11.5m to 16.0m (average ~13.5m)
    if span_x > 100:
      assumed_meters = 13.5
      estimated_ppm = max(25.0, min(80.0, span_x / assumed_meters))
      return {
        "pixelsPerMeter": round(estimated_ppm, 2),
        "calibrated": False,
        "referenceLineLengthMeters": None,
        "confidence": 0.88,
        "method": "building_envelope_span"
      }

  # Generic fallback based on 70% active canvas width
  active_width_px = image_width * 0.70
  estimated_ppm = max(25.0, min(80.0, active_width_px / 13.0))

  return {
    "pixelsPerMeter": round(estimated_ppm, 2),
    "calibrated": False,
    "referenceLineLengthMeters": None,
    "confidence": 0.85,
    "method": "heuristic_canvas_ratio"
  }
