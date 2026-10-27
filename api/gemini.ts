import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleGeminiRequest } from '../src/server/gemini';

interface GeminiRequest extends IncomingMessage {
  body?: unknown;
}

interface GeminiResponse extends ServerResponse {
  status(code: number): GeminiResponse;
  json(body: unknown): void;
}

export default async function handler(req: GeminiRequest, res: GeminiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const result = await handleGeminiRequest(req.body);
  res.status(result.status).json(result.body);
}
