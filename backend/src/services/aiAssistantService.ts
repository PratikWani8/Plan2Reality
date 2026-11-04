import axios from 'axios';

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL || 'http://localhost:8000';

export interface AssistantAction {
  type: string;
  payload: Record<string, any>;
  description: string;
}

export interface AssistantResponse {
  reply: string;
  actions: AssistantAction[];
  provider?: string;
  modelUsed?: string;
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantChatParams {
  message: string;
  context?: Record<string, any>;
  history?: ChatHistoryMessage[];
  language?: 'en' | 'hi' | 'mr';
}

/**
 * Express is the public API layer.
 * Python FastAPI is the single LLM execution layer.
 * This avoids duplicating provider calls in Node and Python.
 */
export async function executeAssistantChat(
  params: AssistantChatParams
): Promise<AssistantResponse> {
  const response = await axios.post(
    `${AI_SERVICE_URL}/api/v1/assistant/chat`,
    {
      message: params.message,
      context: params.context ?? {},
      history: params.history ?? [],
      language: params.language,
    },
    { timeout: 40000 }
  );

  const data = response.data;

  if (!data || typeof data.reply !== 'string') {
    throw new Error('Python AI service returned an invalid response.');
  }

  return {
    reply: data.reply,
    actions: Array.isArray(data.actions) ? data.actions : [],
    provider: data.provider,
    modelUsed: data.modelUsed,
  };
}