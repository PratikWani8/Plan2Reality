import os
import sys
import tempfile
import unittest
import math
import numpy as np
import cv2

# Set ultralytics tempdir to avoid sandbox permission errors
os.environ["ULTRALYTICS_CONFIG_DIR"] = tempfile.gettempdir()
os.environ["YOLO_VERBOSE"] = "False"

sys.path.insert(0, os.path.abspath('.'))
sys.path.insert(0, os.path.abspath('ai-service'))
sys.path.insert(0, os.path.abspath('ai-service/tests'))

from app.services.preprocessing import (
  detect_image_quality,
  detect_and_correct_skew,
  suppress_text_and_dimension_clutter,
  extract_morphological_skeleton,
  preprocess_floor_plan
)
from app.services.line_detection import (
  detect_raw_lines,
  snap_architectural_angles,
  merge_collinear_lines
)
from app.services.geometry_validation import validate_and_sanitize_geometry
from app.services.pipeline import process_floor_plan
try:
  from tests.benchmark_dataset import generate_benchmark_dataset
except ImportError:
  from benchmark_dataset import generate_benchmark_dataset

class TestCVReconstructionPipeline(unittest.TestCase):

  def test_image_quality_blur_and_polarity(self):
    """Tests image quality diagnostics on sharp, blurred, and inverted blueprints."""
    # Sharp image
    sharp_img = np.ones((300, 300), dtype=np.uint8) * 255
    cv2.rectangle(sharp_img, (50, 50), (250, 250), 0, 8)
    q_sharp = detect_image_quality(sharp_img)
    self.assertFalse(q_sharp["isBlurry"])
    self.assertFalse(q_sharp["isInvertedCad"])
    self.assertGreater(q_sharp["blurScore"], 100.0)

    # Blurry image
    blurry_img = cv2.GaussianBlur(sharp_img, (31, 31), 10)
    q_blurry = detect_image_quality(blurry_img)
    self.assertTrue(q_blurry["isBlurry"])

    # Inverted CAD image (black background, white walls)
    cad_img = 255 - sharp_img
    q_cad = detect_image_quality(cad_img)
    self.assertTrue(q_cad["isInvertedCad"])

  def test_deskew_correction(self):
    """Tests deskewing of scanner rotation tilt."""
    base_img = np.ones((600, 600), dtype=np.uint8) * 255
    # Draw horizontal and vertical walls
    cv2.rectangle(base_img, (100, 100), (500, 500), 0, 8)
    cv2.line(base_img, (300, 100), (300, 500), 0, 8)

    # Rotate by +2.5 degrees
    center = (300, 300)
    matrix = cv2.getRotationMatrix2D(center, 2.5, 1.0)
    tilted_img = cv2.warpAffine(base_img, matrix, (600, 600), borderValue=255)

    corrected, detected_angle = detect_and_correct_skew(tilted_img)
    # Detected angle should counteract the 2.5 degree tilt
    self.assertAlmostEqual(abs(detected_angle), 2.5, delta=0.6)

  def test_text_and_dimension_clutter_suppression(self):
    """Tests that text numerals and tiny dimension ticks are filtered while long walls are kept."""
    img = np.zeros((400, 400), dtype=np.uint8)
    # Long wall stroke (width 300, thickness 10)
    cv2.line(img, (50, 100), (350, 100), 255, 10)

    # Small dimension text glyphs (e.g., '14'6"')
    cv2.putText(img, "14'6\"", (150, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.45, 255, 1)
    cv2.putText(img, "BEDROOM", (160, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.45, 255, 1)

    cleaned = suppress_text_and_dimension_clutter(img)

    # Wall stroke must be fully preserved
    self.assertEqual(cleaned[100, 200], 255)
    # Text glyph area should be suppressed (0)
    self.assertEqual(cleaned[80, 150], 0)
    self.assertEqual(cleaned[200, 160], 0)

  def test_morphological_skeleton_centerline(self):
    """Tests that thick walls (12px) are reduced to exactly 1-pixel wide continuous centerlines."""
    thick_wall = np.zeros((200, 200), dtype=np.uint8)
    cv2.line(thick_wall, (20, 100), (180, 100), 255, 14)

    skel = extract_morphological_skeleton(thick_wall)

    # Skeleton should have exactly 1 white pixel along any vertical column through the wall
    col_slice = skel[:, 100]
    num_white = np.count_nonzero(col_slice)
    self.assertEqual(num_white, 1)
    self.assertEqual(skel[100, 100], 255)

  def test_collinear_interval_merging_and_opening_capture(self):
    """Tests that collinear segments with physical door gaps merge into 1 continuous wall and capture the opening."""
    segments = [
      (100.0, 150.0, 240.0, 150.0),
      (280.0, 150.0, 450.0, 150.0), # 40px gap between 240 and 280
    ]
    merged, gaps = merge_collinear_lines(segments, distance_threshold=10.0, gap_threshold=60.0)

    # Segments should merge into 1 continuous wall from 100 to 450
    self.assertEqual(len(merged), 1)
    self.assertAlmostEqual(merged[0][0], 100.0, delta=1.0)
    self.assertAlmostEqual(merged[0][2], 450.0, delta=1.0)

    # Gap must be captured at x=260
    self.assertEqual(len(gaps), 1)
    self.assertAlmostEqual(gaps[0]["x"], 260.0, delta=2.0)
    self.assertAlmostEqual(gaps[0]["gap_px"], 40.0, delta=1.0)

  def test_geometry_schema_validation(self):
    """Tests strict geometry sanitization against micro-walls, invalid polygons, and orphan openings."""
    walls = [
      {"id": "w1", "start": {"x": 0.0, "z": 0.0}, "end": {"x": 5.0, "z": 0.0}, "height": 2.8, "thickness": 0.2},
      {"id": "w2", "start": {"x": 0.0, "z": 0.0}, "end": {"x": 0.05, "z": 0.0}, "height": 2.8, "thickness": 0.2}, # degenerate (<0.3m)
      {"id": "w3", "start": {"x": 0.0, "z": 0.0}, "end": {"x": 5.0, "z": 0.0}, "height": 2.8, "thickness": 0.2}, # duplicate of w1
    ]
    rooms = [
      {
        "id": "r1",
        "name": "Room 1",
        # Self-intersecting bowtie polygon: (0,0)-(4,4)-(0,4)-(4,0)
        "polygon": [{"x": 0.0, "z": 0.0}, {"x": 4.0, "z": 4.0}, {"x": 0.0, "z": 4.0}, {"x": 4.0, "z": 0.0}]
      }
    ]
    openings = [
      {"id": "op1", "type": "door", "wallId": "w1", "position": {"x": 2.5, "z": 0.0}, "width": 0.9, "height": 2.1},
      {"id": "op2", "type": "window", "wallId": "nonexistent_wall", "position": {"x": 100.0, "z": 100.0}, "width": 1.2, "height": 1.4} # orphan
    ]

    clean_walls, clean_rooms, clean_openings, stats = validate_and_sanitize_geometry(walls, rooms, openings)

    # Degenerate micro-wall w2 removed
    self.assertEqual(len(clean_walls), 1)
    self.assertEqual(stats["removedDegenerateWalls"], 1)
    self.assertEqual(stats["removedDuplicateWalls"], 1)

    # Self-intersecting bowtie polygon repaired by buffer(0)
    self.assertEqual(len(clean_rooms), 1)
    self.assertGreater(clean_rooms[0]["area"], 0.0)

    # Orphan opening op2 removed, legitimate opening op1 attached to clean wall
    self.assertEqual(len(clean_openings), 1)
    self.assertEqual(clean_openings[0]["wallId"], "wall_1")
    self.assertEqual(stats["removedOrphanOpenings"], 1)

  def test_pipeline_end_to_end_on_all_benchmark_cases(self):
    """Verifies that full pipeline successfully reconstructs all 5 benchmark cases without errors."""
    dataset = generate_benchmark_dataset()
    self.assertEqual(len(dataset), 5)

    for case in dataset:
      res = process_floor_plan(case.image_bytes, f"{case.name}.png")
      self.assertTrue(res["success"], f"Pipeline failed on case {case.name}")
      self.assertIsNotNone(res["geometry"])

      geom = res["geometry"]
      # Must produce non-empty walls and rooms
      self.assertGreater(len(geom["walls"]), 0, f"No walls on {case.name}")
      self.assertGreater(len(geom["rooms"]), 0, f"No rooms on {case.name}")

      # Confidence must be high
      self.assertGreaterEqual(res["confidence"], 0.70, f"Low confidence on {case.name}")

      # Coordinates must be finite and centered
      for w in geom["walls"]:
        self.assertTrue(math.isfinite(w["start"]["x"]))
        self.assertTrue(math.isfinite(w["start"]["z"]))
        self.assertTrue(math.isfinite(w["end"]["x"]))
        self.assertTrue(math.isfinite(w["end"]["z"]))

if __name__ == "__main__":
  unittest.main()
