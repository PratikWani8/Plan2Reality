import json
import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, Body
from typing import Optional, Dict, Any, List

try:
  from ..services.pipeline import process_floor_plan
  from ..services.assistant import execute_ai_chat
except ImportError:
  from app.services.pipeline import process_floor_plan
  from app.services.assistant import execute_ai_chat

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

@router.get("/assistant/status")
async def assistant_status():
  provider = os.getenv("AI_PROVIDER", "gemini").lower()
  key_names = {
    "gemini": "GEMINI_API_KEY",
    "groq": "GROQ_API_KEY",
    "openai": "OPENAI_API_KEY",
  }
  key_name = key_names.get(provider)
  has_key = bool(key_name and os.getenv(key_name))
  return {
    "hasServerKey": has_key,
    "defaultProvider": provider if has_key else None,
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
    return {
      "reply": "Please enter an architectural instruction or question.",
      "actions": [],
      "provider": "none"
    }

  context = payload.get("context", {})
  history = payload.get("history", [])
  provider = payload.get("provider")
  api_key = payload.get("apiKey")
  model_name = payload.get("modelName")
  language = payload.get("language")

  try:
    result = await execute_ai_chat(
      message=message,
      context=context,
      history=history,
      provider=provider,
      api_key=api_key,
      model_name=model_name,
      language=language
    )
    return result
  except Exception as e:
    return {
      "reply": f"AI service error: {str(e)}",
      "actions": [],
      "provider": "error",
      "error": str(e)
    }
