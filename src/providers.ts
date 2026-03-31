import type { LLMProvider } from "./types.js";

export interface ProviderConfig {
  name: string;
  baseURL?: string;
  verifyModel: string;
  cheapModel: string;
}

export const PROVIDER_CONFIGS: Record<Exclude<LLMProvider, "other">, ProviderConfig> = {
  anthropic: {
    name: "Anthropic",
    verifyModel: "claude-haiku-4-5-20251001",
    cheapModel: "claude-haiku-4-5-20251001",
  },
  openai: {
    name: "OpenAI",
    verifyModel: "gpt-4.1-nano",
    cheapModel: "gpt-4.1-nano",
  },
  google: {
    name: "Google Gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    verifyModel: "gemini-2.5-flash",
    cheapModel: "gemini-2.5-flash",
  },
  xai: {
    name: "xAI (Grok)",
    baseURL: "https://api.x.ai/v1",
    verifyModel: "grok-4-1-fast-non-reasoning",
    cheapModel: "grok-4-1-fast-non-reasoning",
  },
  deepseek: {
    name: "DeepSeek",
    baseURL: "https://api.deepseek.com",
    verifyModel: "deepseek-chat",
    cheapModel: "deepseek-chat",
  },
  mistral: {
    name: "Mistral",
    baseURL: "https://api.mistral.ai/v1",
    verifyModel: "mistral-small-latest",
    cheapModel: "mistral-small-latest",
  },
  groq: {
    name: "Groq (open-source models)",
    baseURL: "https://api.groq.com/openai/v1",
    verifyModel: "meta-llama/llama-4-scout-17b-16e-instruct",
    cheapModel: "meta-llama/llama-4-scout-17b-16e-instruct",
  },
};

export const PROVIDER_MODELS: Record<Exclude<LLMProvider, "other">, { name: string; value: string }[]> = {
  anthropic: [
    { name: "Claude Sonnet 4.6 (recommended)", value: "claude-sonnet-4-6" },
    { name: "Claude Opus 4.6 (highest quality)", value: "claude-opus-4-6" },
    { name: "Claude Haiku 4.5 (fastest, cheapest)", value: "claude-haiku-4-5-20251001" },
  ],
  openai: [
    { name: "GPT-4.1 (recommended — smartest non-reasoning)", value: "gpt-4.1" },
    { name: "GPT-4.1 mini (faster, cheaper)", value: "gpt-4.1-mini" },
    { name: "o4-mini (reasoning, cost-efficient)", value: "o4-mini" },
    { name: "GPT-5 mini (frontier)", value: "gpt-5-mini" },
  ],
  google: [
    { name: "Gemini 2.5 Flash (recommended — best value)", value: "gemini-2.5-flash" },
    { name: "Gemini 3 Flash (newest frontier)", value: "gemini-3-flash" },
    { name: "Gemini 2.5 Pro (highest quality)", value: "gemini-2.5-pro" },
    { name: "Gemini 3.1 Pro Preview (most advanced)", value: "gemini-3.1-pro-preview" },
  ],
  xai: [
    { name: "Grok 4.1 Fast (recommended — $0.20/M, very fast)", value: "grok-4-1-fast-non-reasoning" },
    { name: "Grok 4.20 (frontier quality, 2M context)", value: "grok-4.20-0309-non-reasoning" },
  ],
  deepseek: [
    { name: "DeepSeek V3.2 Chat (recommended — cheapest good model)", value: "deepseek-chat" },
    { name: "DeepSeek V3.2 Reasoner (with chain-of-thought)", value: "deepseek-reasoner" },
  ],
  mistral: [
    { name: "Mistral Large 3 (recommended — open-weight flagship)", value: "mistral-large-latest" },
    { name: "Codestral (code-optimized, 256K context)", value: "codestral-latest" },
    { name: "Mistral Small 4 (cheapest)", value: "mistral-small-latest" },
  ],
  groq: [
    { name: "Llama 4 Maverick (recommended — free, fast)", value: "meta-llama/llama-4-maverick-17b-128e-instruct" },
    { name: "Llama 4 Scout (free, fast)", value: "meta-llama/llama-4-scout-17b-16e-instruct" },
    { name: "DeepSeek R1 70B (free reasoning)", value: "deepseek-r1-distill-llama-70b" },
    { name: "Qwen 3 32B (free, multilingual)", value: "qwen/qwen3-32b" },
  ],
};

export const PROVIDER_CHOICES: { name: string; value: LLMProvider }[] = [
  { name: "Anthropic (Claude) — recommended", value: "anthropic" },
  { name: "OpenAI (GPT)", value: "openai" },
  { name: "Google (Gemini)", value: "google" },
  { name: "xAI (Grok)", value: "xai" },
  { name: "DeepSeek — cheapest", value: "deepseek" },
  { name: "Mistral — open-weight", value: "mistral" },
  { name: "Groq — free tier, open-source models", value: "groq" },
  { name: "Other (OpenAI-compatible endpoint)", value: "other" },
];

export function getProviderName(provider: LLMProvider): string {
  if (provider === "other") return "Custom endpoint";
  return PROVIDER_CONFIGS[provider].name;
}

export function getBaseURL(provider: LLMProvider, customBaseURL?: string): string | undefined {
  if (provider === "other") return customBaseURL;
  return PROVIDER_CONFIGS[provider]?.baseURL;
}

export function getCheapModel(provider: LLMProvider, fallbackModel: string): string {
  if (provider === "other") return fallbackModel;
  return PROVIDER_CONFIGS[provider].cheapModel;
}

export function getVerifyModel(provider: LLMProvider, fallbackModel: string): string {
  if (provider === "other") return fallbackModel;
  return PROVIDER_CONFIGS[provider].verifyModel;
}
