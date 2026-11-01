import os
import time
import tempfile
import cv2
import numpy as np
from typing import Dict, Any, Optional

# Suppress ultralytics cache errors in sandbox
os.environ["ULTRALYTICS_CONFIG_DIR"] = tempfile.gettempdir()
os.environ["YOLO_VERBOSE"] = "False"

from .pdf_converter import render_pdf_to_image
from .preprocessing import preprocess_floor_plan
from .line_detection import detect_raw_lines, merge_collinear_lines
from .wall_detection import extract_walls_from_lines
from .room_detection import extract_rooms_from_binary
from .opening_detection import detect_candidate_openings
from .scale_estimation import estimate_scale
from .geometry_builder import build_metric_geometry
from .confidence import evaluate_pipeline_confidence

def process_floor_plan(
  file_bytes: bytes,
  file_name: str,
  calibration: Optional[Dict[str, Any]] = None,
  pdf_page: int = 0
) -> Dict[str, Any]:
  """
  Full end-to-end computer vision analysis pipeline for raster images and architectural PDFs.
  Integrates deskewing, text suppression, skeleton centerline tracing, collinear gap bridging,
  hybrid room cavity isolation, evidence-based opening detection, and strict geometry validation.
  """
  start_time = time.perf_counter()
  errors = []
  warnings = []
  suggestions = []

  # 1. Image ingestion
  lower_name = file_name.lower()
  is_pdf = lower_name.endswith(".pdf")

  if is_pdf:
    try:
      image_bgr, total_pages = render_pdf_to_image(file_bytes, page_num=pdf_page, dpi=160)
    except Exception as e:
      return {
        "success": False,
        "errors": [f"PDF parsing error: {str(e)}"],
        "warnings": [],
        "suggestions": ["Please verify the PDF is not password-protected and contains 2D vector or raster floor plans."],
        "geometry": None,
        "processingTimeMs": round((time.perf_counter() - start_time) * 1000, 2)
      }
  else:
    # Decode raster format (PNG, JPG, JPEG, WEBP)
    nparr = np.frombuffer(file_bytes, np.uint8)
    image_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image_bgr is None:
      return {
        "success": False,
        "errors": ["Unable to decode image bytes into valid pixel matrix."],
        "warnings": [],
        "suggestions": ["Ensure file is a valid non-corrupted PNG, JPG, or JPEG file."],
        "geometry": None,
        "processingTimeMs": round((time.perf_counter() - start_time) * 1000, 2)
      }

  h, w = image_bgr.shape[:2]
  source_dims = {"width": w, "height": h}

  # 2. Preprocessing & adaptive thresholding
  prep = preprocess_floor_plan(image_bgr)
  binary_mask = prep["binary"]
  skeleton_mask = prep["skeleton"]
  image_quality = prep.get("quality", {})

  if abs(prep.get("skewAngle", 0.0)) > 0.5:
    suggestions.append(f"Auto-deskewed floor plan by {prep['skewAngle']:.1f}° for horizontal alignment.")

  # 3. Centerline Line Detection & Collinear Merging
  # Tracing from skeleton guarantees single 1-pixel centerlines instead of dual Canny edges
  min_line_len = max(24, int(min(h, w) * 0.03))
  raw_lines = detect_raw_lines(skeleton_mask, min_length=min_line_len, max_gap=16)
  merged_lines, detected_gaps = merge_collinear_lines(
    raw_lines,
    distance_threshold=14.0,
    gap_threshold=65.0
  )

  # 4. Wall extraction, envelope identification & corner snapping
  min_wall_len = max(26, int(min(h, w) * 0.035))
  walls = extract_walls_from_lines(merged_lines, min_length=min_wall_len)

  # 5. Scale estimation & calibration
  scale_info = estimate_scale(w, h, user_calibration=calibration, walls=walls)
  ppm = scale_info["pixelsPerMeter"]

  # 6. Room contour extraction (hybrid raster door-bridging + vector planar partitioning)
  rooms = extract_rooms_from_binary(binary_mask, walls=walls, pixels_per_meter=ppm)

  # 7. Evidence-based opening detection (Doors & Windows from collinear gaps and pixel dropouts)
  openings = detect_candidate_openings(
    walls=walls,
    detected_gaps=detected_gaps,
    binary_image=binary_mask,
    pixels_per_meter=ppm
  )

  # 8. Confidence evaluation & Diagnostic advice
  overall_conf, eval_warnings, eval_suggestions = evaluate_pipeline_confidence(
    walls=walls,
    rooms=rooms,
    scale_info=scale_info,
    image_quality=image_quality
  )
  warnings.extend(eval_warnings)
  suggestions.extend(eval_suggestions)

  # 9. Assembly & strict schema validation of centered 3D Metric Geometry
  geometry = build_metric_geometry(
    walls_raw=walls,
    rooms_raw=rooms,
    openings_raw=openings,
    scale_info=scale_info,
    source_dims=source_dims,
    source_file_name=file_name
  )

  elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

  return {
    "success": True,
    "geometry": geometry,
    "confidence": overall_conf,
    "sourceDimensions": source_dims,
    "warnings": warnings,
    "errors": errors,
    "suggestions": suggestions,
    "processingTimeMs": elapsed_ms
  }
