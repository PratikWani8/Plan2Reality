import math
import cv2
import numpy as np
from typing import Tuple, Dict, Any

def detect_image_quality(gray: np.ndarray) -> Dict[str, Any]:
  """
  Analyzes image quality metrics: blur (Laplacian variance), contrast (dynamic range),
  and background polarity (CAD inverted dark mode vs traditional paper).
  """
  # 1. Blur score via variance of Laplacian
  laplacian = cv2.Laplacian(gray, cv2.CV_64F)
  blur_var = float(laplacian.var())
  is_blurry = blur_var < 80.0

  # 2. Contrast and background polarity
  mean_val = float(np.mean(gray))
  p10 = float(np.percentile(gray, 10))
  p90 = float(np.percentile(gray, 90))
  contrast_ratio = (p90 - p10) / 255.0

  # Traditional paper blueprints have high mean (> 140, white paper with dark ink)
  # Dark-mode CAD files have low mean (< 110, black screen with white lines)
  is_inverted_cad = mean_val < 115.0

  return {
    "blurVariance": round(blur_var, 1),
    "blurScore": round(blur_var, 1),
    "isBlurry": is_blurry,
    "meanIntensity": round(mean_val, 1),
    "contrastRatio": round(contrast_ratio, 2),
    "contrastRange": round(p90 - p10, 1),
    "isInvertedCad": is_inverted_cad
  }

def detect_and_correct_skew(
  gray: np.ndarray,
  max_skew_deg: float = 12.0
) -> Tuple[np.ndarray, float]:
  """
  Detects dominant paper tilt or scanner skew angle within [-max_skew_deg, +max_skew_deg]
  using Hough transform angle histograms and applies affine deskewing.
  """
  h, w = gray.shape[:2]
  edges = cv2.Canny(gray, 50, 150)
  
  # Adaptive line length based on resolution
  min_line_len = max(35, int(min(h, w) * 0.05))
  lines = cv2.HoughLinesP(
    edges,
    rho=1,
    theta=np.pi / 180,
    threshold=max(40, int(min(h, w) * 0.06)),
    minLineLength=min_line_len,
    maxLineGap=12
  )

  if lines is None or len(lines) < 4:
    return gray, 0.0

  deviations = []
  for l in lines:
    x1, y1, x2, y2 = l[0]
    angle_rad = math.atan2(y2 - y1, x2 - x1)
    angle_deg = math.degrees(angle_rad)
    
    # Map to deviation from nearest orthogonal axis (0, 90, 180, -90)
    dev = ((angle_deg + 45.0) % 90.0) - 45.0
    if abs(dev) <= max_skew_deg:
      length = math.hypot(x2 - x1, y2 - y1)
      deviations.extend([dev] * max(1, int(length // 15)))

  if not deviations or len(deviations) < 4:
    return gray, 0.0

  skew_angle = float(np.median(deviations))

  # Only deskew if skew is perceptible (> 0.25 deg)
  if abs(skew_angle) > 0.25:
    center = (w / 2.0, h / 2.0)
    M = cv2.getRotationMatrix2D(center, skew_angle, 1.0)
    deskewed = cv2.warpAffine(
      gray,
      M,
      (w, h),
      flags=cv2.INTER_LINEAR,
      borderMode=cv2.BORDER_CONSTANT,
      borderValue=255
    )
    return deskewed, round(skew_angle, 2)

  return gray, 0.0

def suppress_text_and_dimension_clutter(
  binary_inv: np.ndarray,
  min_stroke_length: int = 35
) -> np.ndarray:
  """
  Separates solid architectural wall strokes from text annotations, dimension tick marks,
  and room title characters using connected component geometry and aspect ratio analysis.
  """
  num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(binary_inv, connectivity=8)
  if num_labels <= 1:
    return binary_inv

  wall_mask = np.zeros_like(binary_inv)

  for i in range(1, num_labels):
    area = stats[i, cv2.CC_STAT_AREA]
    cw = stats[i, cv2.CC_STAT_WIDTH]
    ch = stats[i, cv2.CC_STAT_HEIGHT]

    # Dimension numbers and title letters have small bounding boxes (w < 32 and h < 32)
    # or small pixel areas with low elongation.
    is_small_glyph = (cw < 36 and ch < 36 and area < 420)
    # Isolated tiny speckles
    is_speckle = (area < 25)

    if not is_small_glyph and not is_speckle:
      wall_mask[labels == i] = 255

  # Ensure long strokes that may have had a break are preserved
  return wall_mask

def extract_morphological_skeleton(binary_walls: np.ndarray) -> np.ndarray:
  """
  Extracts 1-pixel wide centerline wall skeletons from thick wall strokes using standard
  morphological thinning. Guarantees 1 centerline per physical wall instead of dual Canny edges.
  """
  skel = np.zeros(binary_walls.shape, dtype=np.uint8)
  element = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
  temp = binary_walls.copy()

  max_iters = 35
  for _ in range(max_iters):
    eroded = cv2.erode(temp, element)
    opened = cv2.dilate(eroded, element)
    diff = cv2.subtract(temp, opened)
    skel = cv2.bitwise_or(skel, diff)
    temp = eroded
    if cv2.countNonZero(temp) == 0:
      break

  return skel

def preprocess_floor_plan(image_bgr: np.ndarray) -> Dict[str, Any]:
  """
  Full architectural preprocessing pipeline:
    1. Grayscale & contrast standardization (handles inverted CAD files).
    2. Image quality diagnostics (blur, contrast).
    3. Automatic deskewing for paper/camera tilt.
    4. Bilateral edge-preserving denoising.
    5. Adaptive thresholding with resolution-aware block sizing.
    6. Text and dimension annotation suppression.
    7. Centerline morphological skeleton extraction.
  """
  h, w = image_bgr.shape[:2]

  # 1. Grayscale conversion
  if len(image_bgr.shape) == 3:
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
  else:
    gray = image_bgr.copy()

  # 2. Quality diagnostics & background polarity
  quality = detect_image_quality(gray)
  if quality["isInvertedCad"]:
    gray = cv2.bitwise_not(gray)

  # 3. Deskewing
  gray_deskewed, skew_angle = detect_and_correct_skew(gray)

  # 4. Bilateral filtering for scanner noise & paper texture smoothing
  denoised = cv2.bilateralFilter(gray_deskewed, d=7, sigmaColor=45, sigmaSpace=45)

  # 5. Adaptive thresholding with resolution-aware block size
  block_size = int(max(15, min(35, (min(h, w) // 50) | 1))) # must be odd
  binary_inv = cv2.adaptiveThreshold(
    denoised,
    maxValue=255,
    adaptiveMethod=cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
    thresholdType=cv2.THRESH_BINARY_INV,
    blockSize=block_size,
    C=7
  )

  # 6. Text and dimension clutter suppression
  clean_walls = suppress_text_and_dimension_clutter(binary_inv)

  # 7. Morphological closing to bridge microscopic ink gaps in strokes
  close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
  walls_closed = cv2.morphologyEx(clean_walls, cv2.MORPH_CLOSE, close_kernel)

  # 8. Centerline skeleton extraction for single-line wall tracing
  wall_skeleton = extract_morphological_skeleton(walls_closed)

  return {
    "gray": gray_deskewed,
    "denoised": denoised,
    "binary": walls_closed,
    "skeleton": wall_skeleton,
    "skewAngle": skew_angle,
    "quality": quality,
    "height": h,
    "width": w
  }
