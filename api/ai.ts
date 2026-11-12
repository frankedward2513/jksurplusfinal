import type { IncomingMessage, ServerResponse } from 'node:http';

interface OpenRouterRequest extends IncomingMessage {
  body?: unknown;
}

interface OpenRouterResponse extends ServerResponse {
  status(code: number): OpenRouterResponse;
  json(body: unknown): void;
}

export default async function handler(req: OpenRouterRequest, res: OpenRouterResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { handleOpenRouterRequest } = await import('../src/server/openrouter');
    const result = await handleOpenRouterRequest(req.body);
    res.status(result.status).json(result.body);
  } catch (error: unknown) {
    console.error('OpenRouter serverless function failed:', error);
    res.status(500).json({
      error: 'The OpenRouter server function failed. Check the Vercel function logs for details.',
    });
  }
}