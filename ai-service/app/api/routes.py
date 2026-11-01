import json
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, Body
from typing import Optional, Dict, Any, List
from ..services.pipeline import process_floor_plan
from ..services.assistant import execute_ai_chat
import cv2

router = APIRouter(prefix="/api/v1", tags=["Analysis"])

@router.get("/health")
def health_check():
  return {
    "status": "online",
    "service": "Plan2Reality Computer Vision Microservice",
    "opencvVersion": cv2.__version__,
    "supportedFormats": ["png", "jpg", "jpeg", "webp", "pdf"]
  }

@router.post("/analyze")
async def analyze_floor_plan(
  file: UploadFile = File(...),
  calibration: Optional[str] = Form(None),
  page: int = Form(0)
):
  """
  Analyzes an uploaded floor plan image or PDF, extracting parametric walls,
  rooms, openings, and calibrated Three.js geometry.
  """
  if not file.filename:
    raise HTTPException(status_code=400, detail="Missing file name.")

  contents = await file.read()
  if len(contents) == 0:
    raise HTTPException(status_code=400, detail="Uploaded file is empty.")

  calibration_dict = None
  if calibration:
    try:
      calibration_dict = json.loads(calibration)
    except Exception:
      pass

  result = process_floor_plan(
    file_bytes=contents,
    file_name=file.filename,
    calibration=calibration_dict,
    pdf_page=page
  )

  if not result["success"]:
    raise HTTPException(status_code=422, detail=result["errors"])

  return result

@router.post("/assistant/chat")
async def assistant_chat(payload: Dict[str, Any] = Body(...)):
  """
  AI Architectural & Spatial Assistant endpoint.
  Translates natural language architectural intent into structured 3D modifications
  using real LLM providers (Gemini, Groq, OpenAI).
  """
  message = payload.get("message")
  if not message:
    raise HTTPException(status_code=400, detail="Field 'message' is required.")

  context = payload.get("context", {})
  history = payload.get("history", [])
  provider = payload.get("provider", "gemini")
  api_key = payload.get("apiKey")
  model_name = payload.get("modelName")

  try:
    result = await execute_ai_chat(
      message=message,
      context=context,
      history=history,
      provider=provider,
      api_key=api_key,
      model_name=model_name
    )
    return result
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))

