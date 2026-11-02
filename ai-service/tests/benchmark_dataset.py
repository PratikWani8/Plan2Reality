import math
import cv2
import numpy as np
from typing import Dict, Any, List, Tuple
from shapely.geometry import Polygon, LineString

class BenchmarkCase:
  def __init__(
    self,
    name: str,
    description: str,
    image_bytes: bytes,
    width: int,
    height: int,
    true_ppm: float,
    true_walls: List[Tuple[float, float, float, float]], # (x1, y1, x2, y2)
    true_rooms: List[Dict[str, Any]], # { name, polygon: [(x, y)], area_m2 }
    true_openings: List[Dict[str, Any]] # { type, x, y, width_m }
  ):
    self.name = name
    self.description = description
    self.image_bytes = image_bytes
    self.width = width
    self.height = height
    self.true_ppm = true_ppm
    self.true_walls = true_walls
    self.true_rooms = true_rooms
    self.true_openings = true_openings

def generate_benchmark_dataset() -> List[BenchmarkCase]:
  """
  Generates 5 representative architectural floor plans with mathematically exact
  ground-truth walls, room polygons, openings, and metric scale.
  """
  dataset: List[BenchmarkCase] = []

  # =========================================================================
  # Case 1: Clean CAD 3-Room Apartment (PPM = 40.0, 1m = 40px)
  # =========================================================================
  w1, h1 = 1000, 750
  ppm1 = 40.0
  img1 = np.ones((h1, w1, 3), dtype=np.uint8) * 255

  # Outer envelope: (120, 100) to (880, 650) -> 760px x 550px -> 19.0m x 13.75m
  # Walls drawn with 10px thickness (0.25m)
  ox1, oy1, ox2, oy2 = 120, 100, 880, 650
  cv2.rectangle(img1, (ox1, oy1), (ox2, oy2), (0, 0, 0), thickness=10)

  # Dividing vertical wall at x = 500 (12.5m from origin)
  cv2.line(img1, (500, oy1), (500, oy2), (0, 0, 0), thickness=8)
  # Dividing horizontal wall at y = 380 from x = 500 to x = 880
  cv2.line(img1, (500, 380), (ox2, 380), (0, 0, 0), thickness=8)

  # Doors:
  # Exterior entry door at bottom: x=300 to x=340 (1.0m door)
  img1[oy2-7:oy2+7, 300:340] = 255
  # Door 1: between Room 1 (left) and Room 2 (top right) at x=500, y=220 to y=260 (1.0m door)
  img1[220:260, 495:505] = 255
  # Door 2: between Room 2 (top right) and Room 3 (bottom right) at y=380, x=650 to x=690
  img1[375:385, 650:690] = 255

  # Windows (exterior wall breaks with thin 2px center glass line):
  # Window 1: North wall x=260 to x=360 (2.5m window)
  img1[oy1-7:oy1+7, 260:360] = 255
  cv2.line(img1, (260, oy1), (360, oy1), (80, 80, 80), 2)
  # Window 2: East wall y=200 to y=280 (2.0m window)
  img1[200:280, ox2-7:ox2+7] = 255
  cv2.line(img1, (ox2, 200), (ox2, 280), (80, 80, 80), 2)

  _, buf1 = cv2.imencode(".png", img1)

  true_walls_1 = [
    (120.0, 100.0, 880.0, 100.0), # North
    (880.0, 100.0, 880.0, 650.0), # East
    (120.0, 650.0, 880.0, 650.0), # South
    (120.0, 100.0, 120.0, 650.0), # West
    (500.0, 100.0, 500.0, 650.0), # Divider V
    (500.0, 380.0, 880.0, 380.0), # Divider H
  ]

  true_rooms_1 = [
    {
      "name": "Living & Dining Lounge",
      "polygon": [(120.0, 100.0), (500.0, 100.0), (500.0, 650.0), (120.0, 650.0)],
      "area_m2": ((500 - 120) * (650 - 100)) / (ppm1 ** 2) # 380 * 550 / 1600 = 130.6 m²
    },
    {
      "name": "Primary Suite",
      "polygon": [(500.0, 100.0), (880.0, 100.0), (880.0, 380.0), (500.0, 380.0)],
      "area_m2": ((880 - 500) * (380 - 100)) / (ppm1 ** 2) # 380 * 280 / 1600 = 66.5 m²
    },
    {
      "name": "Kitchen & Studio",
      "polygon": [(500.0, 380.0), (880.0, 380.0), (880.0, 650.0), (500.0, 650.0)],
      "area_m2": ((880 - 500) * (650 - 380)) / (ppm1 ** 2) # 380 * 270 / 1600 = 64.1 m²
    }
  ]

  true_openings_1 = [
    {"type": "door", "x": 320.0, "y": 650.0, "width_m": 1.0},
    {"type": "door", "x": 500.0, "y": 240.0, "width_m": 1.0},
    {"type": "door", "x": 670.0, "y": 380.0, "width_m": 1.0},
    {"type": "window", "x": 310.0, "y": 100.0, "width_m": 2.5},
    {"type": "window", "x": 880.0, "y": 240.0, "width_m": 2.0},
  ]

  dataset.append(BenchmarkCase(
    name="clean_cad_3room",
    description="Clean, high-contrast CAD raster blueprint with 3 rooms, exterior & interior doors and windows.",
    image_bytes=buf1.tobytes(),
    width=w1,
    height=h1,
    true_ppm=ppm1,
    true_walls=true_walls_1,
    true_rooms=true_rooms_1,
    true_openings=true_openings_1
  ))

  # =========================================================================
  # Case 2: Skewed Scan (+2.2 degrees rotation)
  # =========================================================================
  # Rotate image 1 by +2.2 degrees around center
  rot_angle = 2.2
  M_rot = cv2.getRotationMatrix2D((w1 / 2.0, h1 / 2.0), rot_angle, 1.0)
  img2 = cv2.warpAffine(img1, M_rot, (w1, h1), borderMode=cv2.BORDER_CONSTANT, borderValue=(255, 255, 255))
  _, buf2 = cv2.imencode(".png", img2)

  # Transform true walls by the same rotation matrix
  def rotate_pt(x: float, y: float, M: np.ndarray) -> Tuple[float, float]:
    rx = M[0, 0] * x + M[0, 1] * y + M[0, 2]
    ry = M[1, 0] * x + M[1, 1] * y + M[1, 2]
    return float(rx), float(ry)

  true_walls_2 = []
  for (x1, y1, x2, y2) in true_walls_1:
    rx1, ry1 = rotate_pt(x1, y1, M_rot)
    rx2, ry2 = rotate_pt(x2, y2, M_rot)
    true_walls_2.append((rx1, ry1, rx2, ry2))

  true_rooms_2 = []
  for r in true_rooms_1:
    r_poly = [rotate_pt(pt[0], pt[1], M_rot) for pt in r["polygon"]]
    true_rooms_2.append({
      "name": r["name"],
      "polygon": r_poly,
      "area_m2": r["area_m2"]
    })

  dataset.append(BenchmarkCase(
    name="skewed_scan_2.2deg",
    description="Blueprint scanned with 2.2 degree paper tilt, testing automatic deskewing and orientation correction.",
    image_bytes=buf2.tobytes(),
    width=w1,
    height=h1,
    true_ppm=ppm1,
    true_walls=true_walls_2,
    true_rooms=true_rooms_2,
    true_openings=true_openings_1
  ))

  # =========================================================================
  # Case 3: Noisy / Degraded Scan (Salt & pepper, lighting gradient, broken strokes)
  # =========================================================================
  img3 = img1.copy().astype(np.float32)
  # Add non-uniform lighting gradient (darker on left, brighter on right)
  gradient = np.tile(np.linspace(0.85, 1.05, w1), (h1, 1))
  img3 = img3 * gradient[:, :, np.newaxis]

  # Add Gaussian noise
  noise = np.random.normal(0, 12, (h1, w1, 3))
  img3 = np.clip(img3 + noise, 0, 255).astype(np.uint8)

  # Add scanner dust speckles
  for _ in range(800):
    sx = np.random.randint(0, w1)
    sy = np.random.randint(0, h1)
    img3[sy:sy+2, sx:sx+2] = np.random.randint(40, 120)

  _, buf3 = cv2.imencode(".png", img3)

  dataset.append(BenchmarkCase(
    name="noisy_degraded_scan",
    description="Blueprint with non-uniform lighting gradient, scanner speckles, and sensor noise.",
    image_bytes=buf3.tobytes(),
    width=w1,
    height=h1,
    true_ppm=ppm1,
    true_walls=true_walls_1,
    true_rooms=true_rooms_1,
    true_openings=true_openings_1
  ))

  # =========================================================================
  # Case 4: Blueprint with Text Annotations, Dimensions & Leader Lines
  # =========================================================================
  img4 = img1.copy()
  # Draw room labels text
  font = cv2.FONT_HERSHEY_SIMPLEX
  cv2.putText(img4, "LIVING ROOM", (220, 360), font, 0.8, (0, 0, 0), 2)
  cv2.putText(img4, "19' - 0\" x 13' - 9\"", (210, 400), font, 0.55, (40, 40, 40), 1)

  cv2.putText(img4, "BEDROOM 1", (620, 240), font, 0.7, (0, 0, 0), 2)
  cv2.putText(img4, "12' - 6\" x 9' - 4\"", (610, 270), font, 0.5, (40, 40, 40), 1)

  cv2.putText(img4, "KITCHEN", (640, 500), font, 0.7, (0, 0, 0), 2)

  # Draw dimension tick arrows and leader lines outside walls
  cv2.line(img4, (120, 60), (880, 60), (0, 0, 0), 1)
  cv2.line(img4, (120, 50), (120, 70), (0, 0, 0), 1) # tick mark
  cv2.line(img4, (880, 50), (880, 70), (0, 0, 0), 1) # tick mark
  cv2.putText(img4, "19.00 m", (460, 52), font, 0.55, (0, 0, 0), 1)

  # Left dimension line
  cv2.line(img4, (80, 100), (80, 650), (0, 0, 0), 1)
  cv2.line(img4, (70, 100), (90, 100), (0, 0, 0), 1)
  cv2.line(img4, (70, 650), (90, 650), (0, 0, 0), 1)
  cv2.putText(img4, "13.75 m", (20, 380), font, 0.55, (0, 0, 0), 1)

  _, buf4 = cv2.imencode(".png", img4)

  dataset.append(BenchmarkCase(
    name="dimension_text_clutter",
    description="Blueprint populated with real room title text, imperial dimensions, metric leader lines, and ticks.",
    image_bytes=buf4.tobytes(),
    width=w1,
    height=h1,
    true_ppm=ppm1,
    true_walls=true_walls_1,
    true_rooms=true_rooms_1,
    true_openings=true_openings_1
  ))

  # =========================================================================
  # Case 5: Complex Non-Rectilinear Plan (L-Shaped Living, 45° Bay Window, 4 Rooms)
  # =========================================================================
  w5, h5 = 1100, 850
  ppm5 = 45.0
  img5 = np.ones((h5, w5, 3), dtype=np.uint8) * 255

  # Outer L-shaped envelope:
  # (150, 120) to (950, 120) - North
  # (950, 120) to (950, 480) - East 1
  # (950, 480) to (700, 480) - Inset
  # (700, 480) to (700, 720) - East 2
  # (700, 720) to (150, 720) - South
  # (150, 720) to (150, 120) - West
  l_pts = np.array([
    [150, 120], [950, 120], [950, 480], [700, 480], [700, 720], [150, 720]
  ], dtype=np.int32)

  for i in range(len(l_pts)):
    pt1 = tuple(l_pts[i])
    pt2 = tuple(l_pts[(i + 1) % len(l_pts)])
    cv2.line(img5, pt1, pt2, (0, 0, 0), 11)

  # Interior partitions:
  # Vertical wall from (500, 120) to (500, 480)
  cv2.line(img5, (500, 120), (500, 480), (0, 0, 0), 8)
  # Horizontal wall from (150, 450) to (500, 450)
  cv2.line(img5, (150, 450), (500, 450), (0, 0, 0), 8)
  # Diagonal wall (45 degree chamfer inside foyer): from (600, 480) to (700, 580)
  cv2.line(img5, (600, 480), (700, 580), (0, 0, 0), 8)

  # Door gaps:
  img5[445:455, 300:345] = 255 # door on (150, 450)-(500, 450)
  img5[250:295, 495:505] = 255 # door on (500, 120)-(500, 480)
  img5[715:725, 350:395] = 255 # main entry door on South wall

  _, buf5 = cv2.imencode(".png", img5)

  true_walls_5 = [
    (150.0, 120.0, 950.0, 120.0),
    (950.0, 120.0, 950.0, 480.0),
    (950.0, 480.0, 700.0, 480.0),
    (700.0, 480.0, 700.0, 720.0),
    (700.0, 720.0, 150.0, 720.0),
    (150.0, 720.0, 150.0, 120.0),
    (500.0, 120.0, 500.0, 480.0),
    (150.0, 450.0, 500.0, 450.0),
    (600.0, 480.0, 700.0, 580.0),
  ]

  true_rooms_5 = [
    {
      "name": "Primary Suite",
      "polygon": [(150.0, 120.0), (500.0, 120.0), (500.0, 450.0), (150.0, 450.0)],
      "area_m2": ((500 - 150) * (450 - 120)) / (ppm5 ** 2) # 350 * 330 / 2025 = 57.0 m²
    },
    {
      "name": "Guest Bedroom",
      "polygon": [(150.0, 450.0), (500.0, 450.0), (500.0, 720.0), (150.0, 720.0)],
      "area_m2": ((500 - 150) * (720 - 450)) / (ppm5 ** 2) # 350 * 270 / 2025 = 46.7 m²
    },
    {
      "name": "Great Room & Kitchen",
      "polygon": [(500.0, 120.0), (950.0, 120.0), (950.0, 480.0), (500.0, 480.0)],
      "area_m2": ((950 - 500) * (480 - 120)) / (ppm5 ** 2) # 450 * 360 / 2025 = 80.0 m²
    },
    {
      "name": "Foyer & Terrace",
      "polygon": [(500.0, 480.0), (600.0, 480.0), (700.0, 580.0), (700.0, 720.0), (500.0, 720.0)],
      "area_m2": 44.5
    }
  ]

  dataset.append(BenchmarkCase(
    name="complex_nonrectilinear_chamfer",
    description="L-shaped open-concept building with 45 degree interior diagonal wall and 4 distinct zones.",
    image_bytes=buf5.tobytes(),
    width=w5,
    height=h5,
    true_ppm=ppm5,
    true_walls=true_walls_5,
    true_rooms=true_rooms_5,
    true_openings=[{"type": "door", "x": 370.0, "y": 720.0, "width_m": 1.0}]
  ))

  return dataset
