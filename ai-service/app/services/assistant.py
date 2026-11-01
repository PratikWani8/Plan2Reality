import os
import json
import httpx
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

ARCHITECTURAL_SYSTEM_PROMPT = """You are Plan2Reality's Senior AI Architectural & Spatial Design Co-Pilot.
You are an expert architect, CAD specialist, and interior designer.

Your goal is to converse with users about their building floor plan, provide insightful architectural advice (space flow, lighting, aesthetics, material harmony, spatial ergonomics), and execute 3D modifications in real time.

When the user asks you to modify the 3D model, change finishes, adjust dimensions, place furniture, switch camera views, or export models, generate appropriate structured actions.
When the user asks design questions, provide thoughtful, professional answers. You can combine conversational explanations with actions.

AVAILABLE ACTIONS:
- SET_WALL_MATERIAL: { "material": "grey" | "white" | "dark" | "brick" | "concrete" | "sage" | "wood", "colorHex": "#8A918E" }
- SET_WALL_HEIGHT: { "height": number } (in meters, e.g. 2.8, 3.2, 3.5)
- SET_WALL_THICKNESS: { "thickness": number } (in meters, e.g. 0.2)
- SET_FLOOR_MATERIAL: { "material": "tile_marble" | "hardwood_oak" | "hardwood_walnut" | "polished_concrete" | "carpet_beige", "roomId": string | null }
- RENAME_ROOM: { "roomId": string, "newName": string }
- ADD_FURNITURE: { "type": "sofa" | "bed" | "dining_table" | "desk" | "plant" | "tv_unit", "name": string, "roomId": string | null, "position": [x, y, z] }
- DELETE_FURNITURE: { "id": string | null, "all": boolean }
- SET_CAMERA_VIEW: { "preset": "orbit" | "topDown" | "dollhouse" | "front" | "side" | "firstPerson" }
- TOGGLE_VISIBILITY: { "element": "walls" | "floors" | "furniture" | "grid", "visible": boolean }
- TOGGLE_WIREFRAME: { "enabled": boolean }
- EXPORT_MODEL: { "format": "glb" | "json" }

You MUST ALWAYS respond with a VALID JSON object matching this schema:
{
  "reply": "Your clear architectural answer and explanation",
  "actions": [
    {
      "type": "SET_WALL_MATERIAL",
      "payload": { "material": "grey" },
      "description": "Updated walls to architectural grey"
    }
  ]
}
If no 3D modification is requested, set actions to []."""

def clean_json_text(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()

async def execute_ai_chat(
    message: str,
    context: Dict[str, Any],
    history: List[Dict[str, str]],
    provider: str = "gemini",
    api_key: Optional[str] = None,
    model_name: Optional[str] = None
) -> Dict[str, Any]:
    # Resolve key from env if not provided
    key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GROQ_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    if not key:
        return {
            "reply": "Please provide a free Google Gemini or Groq API key to activate the live AI assistant. You can obtain one at https://aistudio.google.com/app/apikey or https://console.groq.com/keys.",
            "actions": [],
            "provider": "none"
        }

    # Determine provider based on key format or explicit choice
    chosen_provider = provider.lower() if provider else ("groq" if os.getenv("GROQ_API_KEY") else "gemini")

    if chosen_provider == "groq" or (key.startswith("gsk_")):
        return await _call_groq(message, key, context, history, model_name)
    elif chosen_provider == "openai" or (key.startswith("sk-") and not key.startswith("gsk_")):
        return await _call_openai(message, key, context, history, model_name)
    else:
        return await _call_gemini(message, key, context, history, model_name)

async def _call_gemini(
    message: str,
    api_key: str,
    context: Dict[str, Any],
    history: List[Dict[str, str]],
    model_name: Optional[str]
) -> Dict[str, Any]:
    candidate_models = [model_name] if model_name else ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-2.5-flash", "gemini-1.5-flash"]

    full_system = f"{ARCHITECTURAL_SYSTEM_PROMPT}\n\nCURRENT 3D SCENE CONTEXT:\n{json.dumps(context)}"
    
    contents = []
    for h in history[-6:]:
        contents.append({
            "role": "user" if h.get("role") == "user" else "model",
            "parts": [{"text": h.get("content", "")}]
        })
    
    contents.append({
        "role": "user",
        "parts": [{"text": f"{full_system}\n\nUSER REQUEST: {message}"}]
    })

    last_error = None
    async with httpx.AsyncClient(timeout=30.0) as client:
        for model in candidate_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                resp = await client.post(
                    url,
                    json={
                        "contents": contents,
                        "generationConfig": {
                            "temperature": 0.3,
                            "responseMimeType": "application/json"
                        }
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(clean_json_text(text))
                    return {
                        "reply": parsed.get("reply", "Done."),
                        "actions": parsed.get("actions", []),
                        "provider": "gemini",
                        "modelUsed": model
                    }
                else:
                    last_error = f"Gemini {model} error ({resp.status_code}): {resp.text}"
            except Exception as e:
                last_error = str(e)

    raise Exception(last_error or "All Gemini models failed")

async def _call_groq(
    message: str,
    api_key: str,
    context: Dict[str, Any],
    history: List[Dict[str, str]],
    model_name: Optional[str]
) -> Dict[str, Any]:
    model = model_name or "llama-3.3-70b-versatile"
    url = "https://api.groq.com/openai/v1/chat/completions"

    system_prompt = f"{ARCHITECTURAL_SYSTEM_PROMPT}\n\nCURRENT 3D SCENE CONTEXT:\n{json.dumps(context)}"
    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-6:]:
        messages.append({
            "role": h.get("role", "user"),
            "content": h.get("content", "")
        })
    messages.append({"role": "user", "content": message})

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            url,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": messages,
                "temperature": 0.3,
                "response_format": {"type": "json_object"}
            }
        )
        if resp.status_code != 200:
            raise Exception(f"Groq API error ({resp.status_code}): {resp.text}")

        data = resp.json()
        text = data["choices"][0]["message"]["content"]
        parsed = json.loads(clean_json_text(text))
        return {
            "reply": parsed.get("reply", "Done."),
            "actions": parsed.get("actions", []),
            "provider": "groq",
            "modelUsed": model
        }

async def _call_openai(
    message: str,
    api_key: str,
    context: Dict[str, Any],
    history: List[Dict[str, str]],
    model_name: Optional[str]
) -> Dict[str, Any]:
    model = model_name or "gpt-4o-mini"
    url = "https://api.openai.com/v1/chat/completions"

    system_prompt = f"{ARCHITECTURAL_SYSTEM_PROMPT}\n\nCURRENT 3D SCENE CONTEXT:\n{json.dumps(context)}"
    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-6:]:
        messages.append({
            "role": h.get("role", "user"),
            "content": h.get("content", "")
        })
    messages.append({"role": "user", "content": message})

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            url,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": messages,
                "temperature": 0.3,
                "response_format": {"type": "json_object"}
            }
        )
        if resp.status_code != 200:
            raise Exception(f"OpenAI API error ({resp.status_code}): {resp.text}")

        data = resp.json()
        text = data["choices"][0]["message"]["content"]
        parsed = json.loads(clean_json_text(text))
        return {
            "reply": parsed.get("reply", "Done."),
            "actions": parsed.get("actions", []),
            "provider": "openai",
            "modelUsed": model
        }
