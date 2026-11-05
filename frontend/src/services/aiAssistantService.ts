import axios from 'axios';
import { FloorPlanGeometry } from '../types/geometry';
import { ViewerSettings, SelectedEntity } from '../features/viewer3d/types';

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export type AssistantLanguage = 'en' | 'hi' | 'mr';

export type AssistantActionType =
  | 'SET_WALL_MATERIAL'
  | 'SET_WALL_HEIGHT'
  | 'SET_WALL_THICKNESS'
  | 'SET_FLOOR_MATERIAL'
  | 'RENAME_ROOM'
  | 'ADD_FURNITURE'
  | 'DELETE_FURNITURE'
  | 'SET_CAMERA_VIEW'
  | 'RESET_CAMERA'
  | 'TOGGLE_VISIBILITY'
  | 'TOGGLE_WIREFRAME'
  | 'EXPORT_MODEL';

export interface AssistantAction {
  type: AssistantActionType;
  payload: Record<string, any>;
  description: string;
}

export interface AssistantResponse {
  reply: string;
  actions: AssistantAction[];
  provider?: string;
  modelUsed?: string;
}

export function buildSpatialContext(
  geometry: FloorPlanGeometry,
  settings: ViewerSettings,
  selectedEntity: SelectedEntity
) {
  const roomsSummary = geometry.rooms.map((room) => {
    let centerX = 0;
    let centerZ = 0;

    if (room.polygon?.length) {
      centerX =
        room.polygon.reduce((acc, point) => acc + point.x, 0) /
        room.polygon.length;

      centerZ =
        room.polygon.reduce(
          (acc, point) => acc + (point.z ?? (point as any).y ?? 0),
          0
        ) / room.polygon.length;
    }

    return {
      id: room.id,
      name: room.name,
      area: room.area,
      floorMaterial: room.floorMaterial || 'default',
      center: [Number(centerX.toFixed(2)), Number(centerZ.toFixed(2))],
    };
  });

  return {
    metadata: {
      scale: geometry.metadata.scale,
      units: geometry.metadata.units,
      defaultWallHeight: geometry.metadata.defaultWallHeight,
      defaultWallThickness: geometry.metadata.defaultWallThickness,
    },
    wallsCount: geometry.walls.length,
    rooms: roomsSummary,
    furniture: (geometry.furniture || []).map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      position: item.position,
    })),
    cameraPreset: settings.cameraPreset,
    selectedEntity,
  };
}

export async function checkServerAiStatus(): Promise<{
  hasServerKey: boolean;
  defaultProvider: string | null;
}> {
  try {
    const response = await axios.get(
      `${BACKEND_BASE_URL}/api/v1/assistant/status`,
      { timeout: 5000 }
    );

    return response.data;
  } catch {
    return {
      hasServerKey: false,
      defaultProvider: null,
    };
  }
}

export async function processAssistantCommand(
  userInput: string,
  geometry: FloorPlanGeometry,
  settings: ViewerSettings,
  selectedEntity: SelectedEntity,
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }> = [],
  language?: AssistantLanguage
): Promise<AssistantResponse> {
  const message = userInput.trim();

  if (!message) {
    return {
      reply: 'Please enter an architectural instruction or question.',
      actions: [],
    };
  }

  const payload = {
    message,
    context: buildSpatialContext(geometry, settings, selectedEntity),
    history: conversationHistory,
    language,
  };

  try {
    const response = await axios.post(
      `${BACKEND_BASE_URL}/api/v1/assistant/chat`,
      payload,
      { timeout: 45000 }
    );

    const data = response.data;

    if (!data || typeof data.reply !== 'string') {
      throw new Error('The assistant returned an invalid response.');
    }

    return {
      reply: data.reply,
      actions: Array.isArray(data.actions) ? data.actions : [],
      provider: data.provider,
      modelUsed: data.modelUsed,
    };
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.reply ||
      error.response?.data?.error ||
      error.message ||
      'Unable to reach the AI assistant.';

    return {
      reply: `AI service error: ${errorMessage}`,
      actions: [],
      provider: 'error',
    };
  }
}