function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function readAiApiResponse(response: Response): Promise<Record<string, unknown>> {
  const body = await response.text();
  let data: unknown;

  try {
    data = JSON.parse(body) as unknown;
  } catch {
    throw new Error(
      `The AI endpoint returned a non-JSON response (HTTP ${response.status}). Ensure the latest deployment includes the /api/ai function, then check its server logs.`
    );
  }

  if (!isRecord(data)) {
    throw new Error(`The AI endpoint returned an unexpected JSON response (HTTP ${response.status}).`);
  }

  return data;
}
