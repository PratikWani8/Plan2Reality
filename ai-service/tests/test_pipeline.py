import os
import sys
import cv2
import numpy as np
import pytest

sys.path.insert(0, os.path.abspath('.'))
sys.path.insert(0, os.path.abspath('ai-service'))

from app.services.pipeline import process_floor_plan

def create_synthetic_floor_plan_bytes() -> bytes:
  """
  Draws a synthetic 2D architectural blueprint with exterior walls,
  interior partition, and room cavity.
  """
  # 800 x 600 canvas (white background)
  img = np.ones((600, 800, 3), dtype=np.uint8) * 255

  # Draw black exterior walls (thickness ~12px)
  # Outer box: (100, 100) to (700, 500)
  cv2.rectangle(img, (100, 100), (700, 500), (0, 0, 0), thickness=12)

  # Draw interior dividing wall: (400, 100) to (400, 500)
  cv2.line(img, (400, 100), (400, 500), (0, 0, 0), thickness=8)

  # Encode to PNG bytes
  _, buf = cv2.imencode(".png", img)
  return buf.tobytes()

def test_synthetic_pipeline_execution():
  plan_bytes = create_synthetic_floor_plan_bytes()
  result = process_floor_plan(plan_bytes, "test_plan.png")

  assert result["success"] is True
  assert "geometry" in result
  geom = result["geometry"]

  # Check metadata
  assert geom["version"] == "1.0.0"
  assert geom["metadata"]["units"] == "meters"
  assert geom["metadata"]["scale"]["pixelsPerMeter"] > 0

  # Check walls were extracted
  walls = geom["walls"]
  assert len(walls) >= 4, f"Expected at least 4 walls, got {len(walls)}"

  for w in walls:
    assert "start" in w and "end" in w
    assert isinstance(w["height"], (int, float)) and w["height"] > 0
    assert isinstance(w["thickness"], (int, float)) and w["thickness"] > 0

  # Check rooms were extracted
  rooms = geom["rooms"]
  assert len(rooms) >= 1, f"Expected at least 1 room, got {len(rooms)}"

  # Check confidence calculation is present and reasoned
  assert 0.0 <= result["confidence"] <= 1.0

def test_user_calibration():
  plan_bytes = create_synthetic_floor_plan_bytes()
  # Calibrate: distance from x=100 to x=700 (600px) represents 12 meters
  calibration = {
    "p1": {"x": 100, "y": 100},
    "p2": {"x": 700, "y": 100},
    "realLengthMeters": 12.0
  }

  result = process_floor_plan(plan_bytes, "test_calibrated.png", calibration=calibration)
  assert result["success"] is True
  scale_info = result["geometry"]["metadata"]["scale"]
  assert scale_info["calibrated"] is True
  assert abs(scale_info["pixelsPerMeter"] - 50.0) < 1.0  # 600px / 12m = 50 ppm

if __name__ == "__main__":
  test_synthetic_pipeline_execution()
  test_user_calibration()
  print("All Phase 3 Computer Vision pipeline tests passed successfully!")
