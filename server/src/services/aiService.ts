const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || "http://localhost:8001").replace(/\/$/, "");
const AI_SERVICE_SHARED_SECRET = process.env.AI_SERVICE_SHARED_SECRET;

const aiHeaders = (): Record<string, string> =>
  AI_SERVICE_SHARED_SECRET
    ? { "x-ai-service-key": AI_SERVICE_SHARED_SECRET }
    : {};

export const aiServiceUrl = (path: string) => `${AI_SERVICE_URL}${path}`;

export const aiServiceHeaders = aiHeaders;

export const readAiError = async (response: Response) => {
  const body = await response.text();
  return body.slice(0, 500) || `AI service returned ${response.status}`;
};
