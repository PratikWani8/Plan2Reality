import fitz  # PyMuPDF
import cv2
import numpy as np
from typing import Tuple

def render_pdf_to_image(pdf_bytes: bytes, page_num: int = 0, dpi: int = 150) -> Tuple[np.ndarray, int]:
  """
  Renders a page of a PDF document into a standard OpenCV BGR numpy image.
  Returns:
    (image_bgr, total_pages)
  """
  try:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    total_pages = len(doc)
    
    if page_num < 0 or page_num >= total_pages:
      page_num = 0
      
    page = doc.load_page(page_num)
    # Scale matrix for target DPI (standard PDF point is 72 dpi)
    zoom = dpi / 72.0
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    
    # Convert PyMuPDF pixmap to numpy array
    img_data = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.h, pix.w, 3))
    # PyMuPDF outputs RGB, OpenCV expects BGR
    img_bgr = cv2.cvtColor(img_data, cv2.COLOR_RGB2BGR)
    doc.close()
    return img_bgr, total_pages
  except Exception as e:
    raise RuntimeError(f"Failed to render PDF: {str(e)}")
