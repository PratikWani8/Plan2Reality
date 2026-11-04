import json
import os
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
}

ALLOWED_ACTIONS = {
    "SET_WALL_MATERIAL",
    "SET_WALL_HEIGHT",
    "SET_WALL_THICKNESS",
    "SET_FLOOR_MATERIAL",
    "RENAME_ROOM",
    "ADD_FURNITURE",
    "DELETE_FURNITURE",
    "SET_CAMERA_VIEW",
    "RESET_CAMERA",
    "TOGGLE_VISIBILITY",
    "TOGGLE_WIREFRAME",
    "EXPORT_MODEL",
}

ARCHITECTURAL_SYSTEM_PROMPT = """
You are Plan2Reality's Senior AI Architectural & Spatial Design Co-Pilot.
You are an expert architect, CAD specialist, and interior designer.

Help users understand and improve building floor plans. Provide professional
advice about space planning, circulation, lighting, aesthetics, materials,
interior design and ergonomics. Execute supported 3D modifications by
returning structured actions.

SUPPORTED ACTIONS AND PAYLOADS:

1. SET_WALL_MATERIAL
   {"material":"grey|white|dark|brick|concrete|sage|wood|blue|yellow|orange|pink", "colorHex":"#8A918E"}

2. SET_WALL_HEIGHT
   {"height":2.8}
   Numeric height in meters.

3. SET_WALL_THICKNESS
   {"thickness":0.2}
   Numeric thickness in meters.

4. SET_FLOOR_MATERIAL
   {
     "material":"tile_marble|hardwood_oak|hardwood_walnut|polished_concrete|carpet_beige|tile_slate",
     "roomId":null
   }

5. RENAME_ROOM
   {"roomId":"existing_room_id", "newName":"New room name"}

6. ADD_FURNITURE
   {"type":"sofa|bed|dining_table|desk|plant", "name":"Descriptive Label", "position":[0,0,0], "roomId":null}

7. DELETE_FURNITURE
   {"id":"furniture_id_or_null_for_all"}

8. SET_CAMERA_VIEW
   {"preset":"perspective|top|front|isometric|dollhouse"}

9. RESET_CAMERA
   {}

10. TOGGLE_VISIBILITY
    {"element":"grid|walls|floors|furniture", "visible":true|false}

11. TOGGLE_WIREFRAME
    {"enabled":true|false}

12. EXPORT_MODEL
    {"format":"glb|json"}

OUTPUT FORMAT:
You MUST respond with valid JSON only. Do not include markdown code block backticks around JSON.
{
  "reply": "Your clear, professional, helpful response.",
  "actions": [
    {
      "type": "SET_WALL_MATERIAL",
      "payload": {"material": "grey"},
      "description": "Changed all walls to refined concrete grey finish"
    }
  ]
}
"""


def build_language_instruction(language: Optional[str]) -> str:
    if language == "hi":
        return "Respond to the user in Hindi (Devanagari script), keeping architectural terms clear."
    if language == "mr":
        return "Respond to the user in Marathi (Devanagari script), keeping architectural terms clear."
    return "Respond in English."


def clean_json_text(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()


def validate_actions(raw_actions: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw_actions, list):
        return []

    valid_actions = []

    for action in raw_actions:
        if not isinstance(action, dict):
            continue

        action_type = action.get("type")
        if action_type not in ALLOWED_ACTIONS:
            continue

        payload = action.get("payload")
        if not isinstance(payload, dict):
            payload = {}

        description = str(
            action.get(
                "description",
                f"Executed {action_type}"
            )
        )

        valid_actions.append({
            "type": action_type,
            "payload": payload,
            "description": description,
        })

    return valid_actions


def parse_ai_response(text: str) -> Dict[str, Any]:
    cleaned = clean_json_text(text)

    try:
        parsed = json.loads(cleaned)

        if isinstance(parsed, dict):
            reply = str(
                parsed.get(
                    "reply",
                    "I have updated the architectural model as requested."
                )
            )

            actions = validate_actions(
                parsed.get("actions", [])
            )

            return {
                "reply": reply,
                "actions": actions,
            }

    except Exception:
        pass

    return {
        "reply": cleaned,
        "actions": [],
    }


def get_provider_and_key(
    provider: Optional[str] = None,
    api_key: Optional[str] = None,
) -> tuple[str, Optional[str]]:

    selected = (
        provider or os.getenv("AI_PROVIDER", "gemini")
    ).lower()

    if selected not in {"gemini", "groq", "openai"}:
        selected = "gemini"

    env_names = {
        "gemini": "GEMINI_API_KEY",
        "groq": "GROQ_API_KEY",
        "openai": "OPENAI_API_KEY",
    }

    env_key = os.getenv(env_names.get(selected, "GEMINI_API_KEY"))
    return selected, api_key or env_key


async def execute_ai_chat(
    message: str,
    context: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, str]]] = None,
    provider: Optional[str] = None,
    api_key: Optional[str] = None,
    model_name: Optional[str] = None,
    language: Optional[str] = None,
) -> Dict[str, Any]:

    message = (message or "").strip()

    if not message:
        return {
            "reply": "Please enter an architectural instruction or question.",
            "actions": [],
            "provider": "none",
        }

    if language not in SUPPORTED_LANGUAGES:
        language = None

    selected_provider, key = get_provider_and_key(
        provider,
        api_key
    )

    if not key or not str(key).strip():
        return {
            "reply": (
                "The AI architectural assistant is currently offline. "
                "Please configure a valid GEMINI_API_KEY in the .env file. "
                "You can get a free key at https://aistudio.google.com/app/apikey"
            ),
            "actions": [],
            "provider": "none",
        }

    safe_context = (
        context if isinstance(context, dict) else {}
    )

    safe_history = (
        history if isinstance(history, list) else []
    )

    try:
        if selected_provider == "gemini":
            return await _call_gemini(
                message=message,
                api_key=key.strip(),
                context=safe_context,
                history=safe_history,
                model_name=model_name,
                language=language,
            )

        if selected_provider == "groq":
            return await _call_openai_compatible(
                provider="groq",
                message=message,
                api_key=key.strip(),
                context=safe_context,
                history=safe_history,
                model_name=model_name,
                language=language,
            )

        return await _call_openai_compatible(
            provider="openai",
            message=message,
            api_key=key.strip(),
            context=safe_context,
            history=safe_history,
            model_name=model_name,
            language=language,
        )

    except Exception as exc:
        return {
            "reply": f"AI Assistant execution error: {str(exc)}",
            "actions": [],
            "provider": selected_provider,
            "error": str(exc),
        }


def _history_for_openai(
    history: List[Dict[str, str]]
) -> List[Dict[str, str]]:

    messages: List[Dict[str, str]] = []

    for item in history[-6:]:
        role = item.get("role", "user")
        content = item.get("content", "")

        if (
            role not in {"user", "assistant"}
            or not isinstance(content, str)
            or not content.strip()
        ):
            continue

        messages.append({
            "role": role,
            "content": content,
        })

    return messages


_MODEL_CACHE: Dict[str, List[str]] = {}


async def _get_gemini_candidate_models(
    api_key: str,
    client: httpx.AsyncClient,
    preferred_model: Optional[str] = None,
) -> List[str]:
    candidates: List[str] = []
    if preferred_model:
        candidates.append(preferred_model)

    env_model = os.getenv("GEMINI_MODEL")
    if env_model and env_model not in candidates:
        candidates.append(env_model)

    # Check cache for previously discovered models under this key
    cached = _MODEL_CACHE.get(api_key)
    if cached:
        for m in cached:
            if m not in candidates:
                candidates.append(m)
        return candidates

    # Query ListModels from Google Generative Language API
    discovered: List[str] = []
    try:
        resp = await client.get(
            "https://generativelanguage.googleapis.com/v1beta/models",
            params={"key": api_key},
            timeout=4.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            raw_models = data.get("models", [])
            valid_names = [
                m["name"].replace("models/", "")
                for m in raw_models
                if "generateContent" in m.get("supportedGenerationMethods", [])
            ]

            # Priority preference for models with high capacity and low latency
            priority_order = [
                "gemini-3.5-flash",
                "gemini-3.5-flash-lite",
                "gemini-3.6-flash",
                "gemini-flash-latest",
                "gemini-flash-lite-latest",
                "gemini-3.8-flash",
                "gemini-3.7-flash",
                "gemini-2.5-flash",
                "gemini-2.0-flash",
                "gemini-1.5-flash",
            ]
            for p in priority_order:
                if p in valid_names and p not in discovered:
                    discovered.append(p)
            for name in valid_names:
                if "flash" in name.lower() and name not in discovered:
                    discovered.append(name)
            for name in valid_names:
                if name not in discovered:
                    discovered.append(name)

            if discovered:
                _MODEL_CACHE[api_key] = discovered
    except Exception:
        pass

    if discovered:
        for m in discovered:
            if m not in candidates:
                candidates.append(m)
    else:
        fallback_models = [
            "gemini-3.5-flash",
            "gemini-3.5-flash-lite",
            "gemini-3.6-flash",
            "gemini-flash-latest",
            "gemini-3.8-flash",
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-flash",
        ]
        for f in fallback_models:
            if f not in candidates:
                candidates.append(f)

    return candidates


async def _call_gemini(
    message: str,
    api_key: str,
    context: Dict[str, Any],
    history: List[Dict[str, str]],
    model_name: Optional[str],
    language: Optional[str],
) -> Dict[str, Any]:

    system_instruction = (
        ARCHITECTURAL_SYSTEM_PROMPT
        + "\n\n"
        + build_language_instruction(language)
        + "\n\nCURRENT 3D SCENE CONTEXT:\n"
        + json.dumps(context, ensure_ascii=False)
    )

    contents: List[Dict[str, Any]] = []

    for item in history[-6:]:
        role = item.get("role", "user")
        content = item.get("content", "")

        if (
            role not in {"user", "assistant"}
            or not isinstance(content, str)
            or not content.strip()
        ):
            continue

        contents.append({
            "role": "user" if role == "user" else "model",
            "parts": [{"text": content}],
        })

    contents.append({
        "role": "user",
        "parts": [{"text": message}],
    })

    last_error: Optional[str] = None

    client_timeout = httpx.Timeout(20.0, connect=5.0)
    async with httpx.AsyncClient(timeout=client_timeout) as client:
        # Dynamically discover candidate models from Google API
        models = await _get_gemini_candidate_models(
            api_key=api_key,
            client=client,
            preferred_model=model_name,
        )

        for model in models:
            url = (
                "https://generativelanguage.googleapis.com/"
                f"v1beta/models/{model}:generateContent"
            )

            try:
                response = await client.post(
                    url,
                    params={"key": api_key},
                    json={
                        "systemInstruction": {
                            "parts": [
                                {"text": system_instruction}
                            ]
                        },
                        "contents": contents,
                        "generationConfig": {
                            "temperature": 0.3,
                            "maxOutputTokens": 2048,
                            "responseMimeType": "application/json",
                        },
                    },
                )

                if response.status_code != 200:
                    try:
                        err_data = response.json()
                        err_msg = err_data.get("error", {}).get("message", response.text)
                    except Exception:
                        err_msg = response.text
                    last_error = f"HTTP {response.status_code}: {err_msg}"
                    if response.status_code in {400, 401, 403}:
                        # Auth/Key failure affects all models under this key, no need to retry
                        break
                    continue

                data = response.json()
                candidates = data.get("candidates", [])
                if not candidates or "content" not in candidates[0]:
                    last_error = "Gemini response did not contain content candidates."
                    continue

                text = candidates[0]["content"]["parts"][0]["text"]

                return {
                    **parse_ai_response(text),
                    "provider": "gemini",
                    "modelUsed": model,
                }

            except (httpx.ConnectError, httpx.ConnectTimeout, httpx.RequestError) as exc:
                last_error = f"Network request error: {str(exc)}"
                break
            except Exception as exc:
                last_error = str(exc)
                break

    hint = ""
    if "API key not valid" in (last_error or ""):
        hint = " Note: Please verify your Gemini API key at https://aistudio.google.com/app/apikey."

    return {
        "reply": f"Gemini API request failed ({last_error or 'Unknown error'}).{hint}",
        "actions": [],
        "provider": "gemini",
        "error": last_error,
    }


async def _call_openai_compatible(
    provider: str,
    message: str,
    api_key: str,
    context: Dict[str, Any],
    history: List[Dict[str, str]],
    model_name: Optional[str],
    language: Optional[str],
) -> Dict[str, Any]:

    if provider == "groq":
        url = "https://api.groq.com/openai/v1/chat/completions"
        model = (
            model_name
            or os.getenv(
                "GROQ_MODEL",
                "llama-3.3-70b-versatile"
            )
        )
    else:
        url = "https://api.openai.com/v1/chat/completions"
        model = (
            model_name
            or os.getenv(
                "OPENAI_MODEL",
                "gpt-4o-mini"
            )
        )

    system_prompt = (
        ARCHITECTURAL_SYSTEM_PROMPT
        + "\n\n"
        + build_language_instruction(language)
        + "\n\nCURRENT 3D SCENE CONTEXT:\n"
        + json.dumps(context, ensure_ascii=False)
    )

    messages = [
        {
            "role": "system",
            "content": system_prompt,
        }
    ]

    messages.extend(
        _history_for_openai(history)
    )

    messages.append({
        "role": "user",
        "content": message,
    })

    async with httpx.AsyncClient(timeout=35.0) as client:
        try:
            response = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": 0.3,
                    "max_tokens": 2048,
                    "response_format": {
                        "type": "json_object"
                    },
                },
            )

            if response.status_code != 200:
                try:
                    err_data = response.json()
                    err_msg = err_data.get("error", {}).get("message", response.text)
                except Exception:
                    err_msg = response.text
                return {
                    "reply": f"{provider.capitalize()} API error (HTTP {response.status_code}): {err_msg}. Please check your {provider.upper()}_API_KEY in .env.",
                    "actions": [],
                    "provider": provider,
                    "error": err_msg,
                }

            data = response.json()
            text = data["choices"][0]["message"]["content"]

            return {
                **parse_ai_response(text),
                "provider": provider,
                "modelUsed": model,
            }

        except Exception as exc:
            return {
                "reply": f"{provider.capitalize()} connection error: {str(exc)}. Please check your network connection and API key.",
                "actions": [],
                "provider": provider,
                "error": str(exc),
            }
