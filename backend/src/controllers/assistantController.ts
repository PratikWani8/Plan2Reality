import { Request, Response } from 'express';
import { executeAssistantChat } from '../services/aiAssistantService.js';
import { ENV } from '../config/environment.js';

export async function chatWithAssistant(req: Request, res: Response): Promise<void> {
  try {
    const { message, context, history } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message string is required.' });
      return;
    }

    const result = await executeAssistantChat({
      message,
      context,
      history,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Assistant Controller Error:', error);
    res.json({
      reply: `AI service error: ${error.message || 'Unable to process AI command'}. Please verify your .env configuration.`,
      actions: [],
      provider: 'error',
    });
  }
}

export async function checkAssistantStatus(_req: Request, res: Response): Promise<void> {
  res.json({
    hasServerKey: !!(ENV.GEMINI_API_KEY || ENV.GROQ_API_KEY || ENV.OPENAI_API_KEY),
    defaultProvider: ENV.GEMINI_API_KEY
      ? 'gemini'
      : ENV.GROQ_API_KEY
      ? 'groq'
      : ENV.OPENAI_API_KEY
      ? 'openai'
      : null,
  });
}
