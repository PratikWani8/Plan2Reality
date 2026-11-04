import { Request, Response } from 'express';
import axios from 'axios';
import { executeAssistantChat } from '../services/aiAssistantService.js';

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL || 'http://localhost:8000';

export async function chatWithAssistant(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { message, context, history } = req.body ?? {};

    if (typeof message !== 'string' || !message.trim()) {
      res.status(400).json({
        error: 'A non-empty message string is required.',
      });
      return;
    }

    const result = await executeAssistantChat({
      message: message.trim(),
      context: context ?? {},
      history: Array.isArray(history) ? history : [],
    });

    res.json(result);
  } catch (error: any) {
    console.error('Assistant Controller Error:', error?.message || error);

    res.status(200).json({
      reply:
        'The AI assistant service is currently unreachable. Please ensure the backend AI service is running or check your network connection.',
      actions: [],
      provider: 'offline',
    });
  }
}

export async function checkAssistantStatus(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const response = await axios.get(
      `${AI_SERVICE_URL}/api/v1/assistant/status`,
      { timeout: 4000 }
    );

    res.json(response.data);
  } catch {
    res.json({
      hasServerKey: false,
      defaultProvider: null,
    });
  }
}