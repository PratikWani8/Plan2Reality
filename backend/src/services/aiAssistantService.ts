import axios from 'axios';
import { ENV } from '../config/environment.js';

export interface AssistantAction {
  type: string;
  payload: Record<string, any>;
  description: string;
}

export interface AssistantResponse {
  reply: string;
  actions: AssistantAction[];
  modelUsed?: string;
  provider?: string;
}

export interface SpatialContext {
  metadata?: {
    scale?: number;
    units?: string;
    defaultWallHeight?: number;
    defaultWallThickness?: number;
  };
  wallsCount?: number;
  rooms?: Array<{
    id: string;
    name: string;
    area?: number;
    floorMaterial?: string;
    center?: [number, number];
  }>;
  furniture?: Array<{
    id: string;
    name: string;
    type: string;
    position: [number, number, number];
  }>;
  cameraPreset?: string;
  selectedEntity?: {
    type: string | null;
    id: string | null;
    data?: any;
  };
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const ARCHITECTURAL_SYSTEM_PROMPT = `You are Plan2Reality's Senior AI Architectural & Spatial Design Co-Pilot.
You are an expert architect, CAD specialist, and interior designer.

Your goal is to converse with users about their building floor plan, provide insightful architectural advice (space flow, lighting, aesthetics, material harmony, spatial ergonomics), and execute 3D modifications in real time.

When the user asks you to modify the 3D model, change finishes, adjust dimensions, place furniture, switch camera views, or export models, generate appropriate structured actions.
When the user asks design questions, provide thoughtful, professional answers. You can combine conversational explanations with actions.

AVAILABLE ACTIONS SCHEMA:
1. SET_WALL_MATERIAL:
   payload: { "material": "grey" | "white" | "dark" | "brick" | "concrete" | "sage" | "wood", "colorHex": string (optional, e.g. "#8A918E") }
   description: human readable summary (e.g. "Changed wall material to architectural grey")

2. SET_WALL_HEIGHT:
   payload: { "height": number } (in meters, e.g. 2.8, 3.2, 3.5. Default residential is ~2.8m, luxury is 3.0-3.6m)
   description: summary

3. SET_WALL_THICKNESS:
   payload: { "thickness": number } (in meters, typically 0.15 - 0.35m)
   description: summary

4. SET_FLOOR_MATERIAL:
   payload: { "material": "tile_marble" | "hardwood_oak" | "hardwood_walnut" | "polished_concrete" | "carpet_beige" | "tile_slate", "roomId": string | null (optional, target specific room id or null for all rooms) }
   description: summary

5. RENAME_ROOM:
   payload: { "roomId": string (matching room id in context), "newName": string }
   description: summary

6. ADD_FURNITURE:
   payload: { "type": "sofa" | "bed" | "dining_table" | "desk" | "plant" | "tv_unit" | "armchair" | "coffee_table", "name": string, "roomId": string | null, "position": [x, y, z] (optional coordinates. Place y at 0) }
   description: summary

7. DELETE_FURNITURE:
   payload: { "id": string (optional specific furniture id), "all": boolean (optional) }
   description: summary

8. SET_CAMERA_VIEW:
   payload: { "preset": "orbit" | "topDown" | "dollhouse" | "front" | "side" | "firstPerson" }
   description: summary

9. TOGGLE_VISIBILITY:
   payload: { "element": "walls" | "floors" | "furniture" | "grid", "visible": boolean }
   description: summary

10. TOGGLE_WIREFRAME:
    payload: { "enabled": boolean }
    description: summary

11. EXPORT_MODEL:
    payload: { "format": "glb" | "json" }
    description: summary

OUTPUT FORMAT REQUIREMENT:
You MUST ALWAYS respond with a VALID JSON object (and nothing else, no markdown code blocks outside json) matching this exact format:
{
  "reply": "Your clear, articulate architectural answer, design critique, and explanation of modifications made.",
  "actions": [
    {
      "type": "SET_WALL_MATERIAL",
      "payload": { "material": "grey" },
      "description": "Updated wall finish to architectural matte grey"
    }
  ]
}
If no 3D modification is required (e.g. user just asked a question about square footage or design advice), return "actions": [].`;

/**
 * Main entry point: process chat with real LLMs (Gemini, Groq, or OpenAI)
 */
export async function executeAssistantChat(params: {
  message: string;
  context?: SpatialContext;
  history?: ChatHistoryMessage[];
}): Promise<AssistantResponse> {
  const { message, context = {}, history = [] } = params;

  // Resolve developer's API key configured in .env
  let provider: 'gemini' | 'groq' | 'openai' | null = null;
  let apiKey = '';

  if (ENV.GEMINI_API_KEY) {
    provider = 'gemini';
    apiKey = ENV.GEMINI_API_KEY;
  } else if (ENV.GROQ_API_KEY) {
    provider = 'groq';
    apiKey = ENV.GROQ_API_KEY;
  } else if (ENV.OPENAI_API_KEY) {
    provider = 'openai';
    apiKey = ENV.OPENAI_API_KEY;
  }

  if (!apiKey || !provider) {
    return {
      reply:
        'The AI Architectural Assistant is currently offline. Developer setup: Please add GEMINI_API_KEY or GROQ_API_KEY to your project .env file to enable live AI responses.',
      actions: [],
      provider: 'none',
    };
  }

  // Call the developer-configured provider
  if (provider === 'gemini') {
    return callGemini(message, apiKey, context, history);
  } else if (provider === 'groq') {
    return callGroq(message, apiKey, context, history);
  } else if (provider === 'openai') {
    return callOpenAI(message, apiKey, context, history);
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

/**
 * Call Google Gemini API with automated model fallback (gemini-3.5-flash-lite, gemini-3.8-flash, etc.)
 */
async function callGemini(
  userMessage: string,
  apiKey: string,
  context: SpatialContext,
  history: ChatHistoryMessage[],
  modelName?: string
): Promise<AssistantResponse> {
  const candidateModels = modelName
    ? [modelName]
    : ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];

  const spatialContextSummary = JSON.stringify({
    defaultWallHeight: context.metadata?.defaultWallHeight ?? 2.8,
    defaultWallThickness: context.metadata?.defaultWallThickness ?? 0.2,
    units: context.metadata?.units ?? 'meters',
    wallsCount: context.wallsCount ?? 0,
    rooms: context.rooms ?? [],
    existingFurniture: context.furniture ?? [],
    cameraPreset: context.cameraPreset ?? 'orbit',
    currentlySelected: context.selectedEntity ?? null,
  });

  const fullPrompt = `${ARCHITECTURAL_SYSTEM_PROMPT}

CURRENT 3D SCENE CONTEXT:
${spatialContextSummary}

USER REQUEST:
${userMessage}`;

  // Format conversation history for Gemini
  const contents: any[] = [];
  for (const h of history.slice(-6)) {
    contents.push({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: fullPrompt }],
  });

  let lastError: any = null;

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await axios.post(
        url,
        {
          contents,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
          },
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
      );

      const candidate = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidate) {
        throw new Error(`Empty response from Google Gemini model ${model}`);
      }

      const parsed = cleanAndParseJSON(candidate);
      return {
        reply: parsed.reply || 'Modifications processed successfully.',
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        modelUsed: model,
        provider: 'gemini',
      };
    } catch (error: any) {
      lastError = error;
      const errMsg = error.response?.data?.error?.message || error.message || '';
      console.warn(`Gemini attempt with ${model} failed (${errMsg}), trying next candidate model...`);
      // Continue to next model in fallback list
    }
  }

  const finalErrMsg = lastError?.response?.data?.error?.message || lastError?.message || 'Unknown Gemini error';
  console.error('All Gemini candidate models failed:', finalErrMsg);
  throw new Error(`Google Gemini Error: ${finalErrMsg}`);
}

/**
 * Call Groq Cloud API (llama-3.3-70b-versatile / llama-3.1-8b-instant)
 */
async function callGroq(
  userMessage: string,
  apiKey: string,
  context: SpatialContext,
  history: ChatHistoryMessage[],
  modelName?: string
): Promise<AssistantResponse> {
  const model = modelName || 'llama-3.3-70b-versatile';
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const spatialContextSummary = JSON.stringify({
    defaultWallHeight: context.metadata?.defaultWallHeight ?? 2.8,
    defaultWallThickness: context.metadata?.defaultWallThickness ?? 0.2,
    units: context.metadata?.units ?? 'meters',
    wallsCount: context.wallsCount ?? 0,
    rooms: context.rooms ?? [],
    existingFurniture: context.furniture ?? [],
    cameraPreset: context.cameraPreset ?? 'orbit',
    currentlySelected: context.selectedEntity ?? null,
  });

  const messages: any[] = [
    {
      role: 'system',
      content: `${ARCHITECTURAL_SYSTEM_PROMPT}\n\nCURRENT 3D SCENE CONTEXT:\n${spatialContextSummary}`,
    },
  ];

  for (const h of history.slice(-6)) {
    messages.push({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content,
    });
  }

  messages.push({
    role: 'user',
    content: userMessage,
  });

  try {
    const response = await axios.post(
      url,
      {
        model,
        messages,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 30000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from Groq API');
    }

    const parsed = cleanAndParseJSON(content);
    return {
      reply: parsed.reply || 'Spatial modifications complete.',
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      modelUsed: model,
      provider: 'groq',
    };
  } catch (error: any) {
    const errMsg = error.response?.data?.error?.message || error.message || 'Unknown Groq error';
    console.error('Groq API Error:', errMsg);
    throw new Error(`Groq API Error: ${errMsg}`);
  }
}

/**
 * Call OpenAI API (gpt-4o-mini / gpt-4o)
 */
async function callOpenAI(
  userMessage: string,
  apiKey: string,
  context: SpatialContext,
  history: ChatHistoryMessage[],
  modelName?: string
): Promise<AssistantResponse> {
  const model = modelName || 'gpt-4o-mini';
  const url = 'https://api.openai.com/v1/chat/completions';

  const spatialContextSummary = JSON.stringify({
    defaultWallHeight: context.metadata?.defaultWallHeight ?? 2.8,
    defaultWallThickness: context.metadata?.defaultWallThickness ?? 0.2,
    units: context.metadata?.units ?? 'meters',
    wallsCount: context.wallsCount ?? 0,
    rooms: context.rooms ?? [],
    existingFurniture: context.furniture ?? [],
    cameraPreset: context.cameraPreset ?? 'orbit',
    currentlySelected: context.selectedEntity ?? null,
  });

  const messages: any[] = [
    {
      role: 'system',
      content: `${ARCHITECTURAL_SYSTEM_PROMPT}\n\nCURRENT 3D SCENE CONTEXT:\n${spatialContextSummary}`,
    },
  ];

  for (const h of history.slice(-6)) {
    messages.push({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content,
    });
  }

  messages.push({
    role: 'user',
    content: userMessage,
  });

  try {
    const response = await axios.post(
      url,
      {
        model,
        messages,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 30000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI API');
    }

    const parsed = cleanAndParseJSON(content);
    return {
      reply: parsed.reply || 'Architectural updates applied.',
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      modelUsed: model,
      provider: 'openai',
    };
  } catch (error: any) {
    const errMsg = error.response?.data?.error?.message || error.message || 'Unknown OpenAI error';
    console.error('OpenAI API Error:', errMsg);
    throw new Error(`OpenAI API Error: ${errMsg}`);
  }
}

/**
 * Helper to strip markdown codeblocks and parse JSON safely
 */
function cleanAndParseJSON(raw: string): any {
  let text = raw.trim();
  if (text.startsWith('```json')) {
    text = text.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }
  return JSON.parse(text);
}
