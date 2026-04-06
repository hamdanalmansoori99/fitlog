/**
 * Unified AI provider with automatic fallback.
 *
 * Primary:  Gemini 2.5 Flash  ($0.15 / $0.60 per MTok)
 * Fallback: GPT-4o Mini       ($0.15 / $0.60 per MTok)
 *
 * If the primary fails (rate limit, model deprecated, outage),
 * the fallback fires automatically with zero downtime.
 */

import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import OpenAI from "openai";
import { logError } from "./logger";

// ─── Config ──────────────────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// Change this when Google releases the successor to 2.5 Flash
const GEMINI_MODEL = process.env.AI_PRIMARY_MODEL || "gemini-2.5-flash";
const OPENAI_MODEL = process.env.AI_FALLBACK_MODEL || "gpt-4o-mini";

const gemini = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Keep Anthropic as a last-resort fallback if configured
let anthropicFallback: any = null;
try {
  const { anthropic, isAnthropicConfigured } = await import("@workspace/integrations-anthropic-ai");
  if (isAnthropicConfigured()) anthropicFallback = anthropic;
} catch {}

export function isAIConfigured(): boolean {
  return !!(gemini || openai || anthropicFallback);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatCompletionParams {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
}

export interface VisionParams {
  system?: string;
  prompt: string;
  imageBase64: string;
  mimeType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  maxTokens?: number;
}

// ─── Gemini implementation ───────────────────────────────────────────────────

async function geminiChat(params: ChatCompletionParams): Promise<string> {
  if (!gemini) throw new Error("Gemini not configured");

  const model = gemini.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: params.system,
    generationConfig: {
      maxOutputTokens: params.maxTokens || 2048,
    },
  });

  // Convert messages to Gemini format (alternating user/model)
  const history = params.messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" as const : "user" as const,
    parts: [{ text: m.content }] as Part[],
  }));

  const lastMessage = params.messages[params.messages.length - 1];
  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMessage.content);
  return result.response.text().trim();
}

async function geminiVision(params: VisionParams): Promise<string> {
  if (!gemini) throw new Error("Gemini not configured");

  const model = gemini.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: params.system || undefined,
    generationConfig: {
      maxOutputTokens: params.maxTokens || 1024,
    },
  });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: params.mimeType,
        data: params.imageBase64,
      },
    },
    { text: params.prompt },
  ]);

  return result.response.text().trim();
}

// ─── OpenAI implementation ───────────────────────────────────────────────────

async function openaiChat(params: ChatCompletionParams): Promise<string> {
  if (!openai) throw new Error("OpenAI not configured");

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: params.system },
    ...params.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const result = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages,
    max_tokens: params.maxTokens || 2048,
  });

  return result.choices[0]?.message?.content?.trim() || "";
}

async function openaiVision(params: VisionParams): Promise<string> {
  if (!openai) throw new Error("OpenAI not configured");

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (params.system) {
    messages.push({ role: "system", content: params.system });
  }
  messages.push({
    role: "user",
    content: [
      {
        type: "image_url",
        image_url: { url: `data:${params.mimeType};base64,${params.imageBase64}` },
      },
      { type: "text", text: params.prompt },
    ],
  });

  const result = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages,
    max_tokens: params.maxTokens || 1024,
  });

  return result.choices[0]?.message?.content?.trim() || "";
}

// ─── Anthropic fallback implementation ───────────────────────────────────────

async function anthropicChat(params: ChatCompletionParams): Promise<string> {
  if (!anthropicFallback) throw new Error("Anthropic not configured");

  const result = await anthropicFallback.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: params.maxTokens || 2048,
    system: params.system,
    messages: params.messages.map((m: ChatMessage) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  return (result.content[0] as any)?.text?.trim() || "";
}

async function anthropicVision(params: VisionParams): Promise<string> {
  if (!anthropicFallback) throw new Error("Anthropic not configured");

  const result = await anthropicFallback.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: params.maxTokens || 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: params.mimeType,
              data: params.imageBase64,
            },
          },
          { type: "text", text: params.prompt },
        ],
      },
    ],
  });

  return (result.content[0] as any)?.text?.trim() || "";
}

// ─── Public API with automatic fallback ──────────────────────────────────────

/**
 * Send a chat completion with automatic fallback.
 * Tries: Gemini → OpenAI → Anthropic (if configured)
 */
export async function chatCompletion(params: ChatCompletionParams): Promise<string> {
  const providers: { name: string; fn: () => Promise<string> }[] = [];

  if (gemini)            providers.push({ name: "Gemini",   fn: () => geminiChat(params) });
  if (openai)            providers.push({ name: "OpenAI",   fn: () => openaiChat(params) });
  if (anthropicFallback) providers.push({ name: "Anthropic", fn: () => anthropicChat(params) });

  if (providers.length === 0) {
    throw new Error("No AI provider configured. Set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY.");
  }

  for (let i = 0; i < providers.length; i++) {
    try {
      return await providers[i].fn();
    } catch (err: any) {
      const isLast = i === providers.length - 1;
      logError(`AI provider ${providers[i].name} failed${isLast ? " (no more fallbacks)" : ", trying next"}:`, err?.message || err);
      if (isLast) throw err;
    }
  }

  throw new Error("All AI providers failed");
}

/**
 * Analyze an image with automatic fallback.
 * Tries: Gemini → OpenAI → Anthropic (if configured)
 */
export async function visionCompletion(params: VisionParams): Promise<string> {
  const providers: { name: string; fn: () => Promise<string> }[] = [];

  if (gemini)            providers.push({ name: "Gemini",   fn: () => geminiVision(params) });
  if (openai)            providers.push({ name: "OpenAI",   fn: () => openaiVision(params) });
  if (anthropicFallback) providers.push({ name: "Anthropic", fn: () => anthropicVision(params) });

  if (providers.length === 0) {
    throw new Error("No AI provider configured. Set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY.");
  }

  for (let i = 0; i < providers.length; i++) {
    try {
      return await providers[i].fn();
    } catch (err: any) {
      const isLast = i === providers.length - 1;
      logError(`AI vision ${providers[i].name} failed${isLast ? " (no more fallbacks)" : ", trying next"}:`, err?.message || err);
      if (isLast) throw err;
    }
  }

  throw new Error("All AI providers failed");
}
