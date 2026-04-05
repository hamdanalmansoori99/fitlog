import Anthropic from "@anthropic-ai/sdk";

const apiKey =
  process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ??
  process.env.ANTHROPIC_API_KEY ??
  "";

if (!apiKey) {
  console.warn(
    "[integrations-anthropic-ai] No API key found. Set ANTHROPIC_API_KEY in your .env file. AI features will return 503."
  );
}

export function isAnthropicConfigured(): boolean {
  return apiKey.length > 0;
}

export const anthropic = new Anthropic({
  apiKey: apiKey || "not-configured",
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || undefined,
});
