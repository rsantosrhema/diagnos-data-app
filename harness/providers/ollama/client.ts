import { ProviderError } from "../../core/errors";
import type {
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaConfig,
} from "./types";

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RETRIES = 2;

export function loadOllamaConfig(env: NodeJS.ProcessEnv = process.env): OllamaConfig {
  const baseUrl = env.OLLAMA_BASE_URL;
  const model = env.OLLAMA_MODEL;
  if (!baseUrl || !model) {
    throw new ProviderError(
      "OLLAMA_BASE_URL and OLLAMA_MODEL environment variables are required",
    );
  }
  return {
    baseUrl,
    model,
    apiKey: env.OLLAMA_API_KEY,
    timeoutMs: env.OLLAMA_TIMEOUT_MS
      ? Number(env.OLLAMA_TIMEOUT_MS)
      : DEFAULT_TIMEOUT_MS,
    maxRetries: env.OLLAMA_MAX_RETRIES
      ? Number(env.OLLAMA_MAX_RETRIES)
      : DEFAULT_MAX_RETRIES,
  };
}

export class OllamaClient {
  private readonly config: OllamaConfig;

  constructor(config: OllamaConfig) {
    this.config = config;
  }

  async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    const url = `${this.config.baseUrl.replace(/\/$/, "")}/chat`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    const body: OllamaChatRequest = {
      ...request,
      model: this.config.model,
      stream: false,
      format: "json",
    };

    let lastError: unknown;
    const retries = this.config.maxRetries ?? DEFAULT_MAX_RETRIES;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new ProviderError(
            `Ollama request failed with status ${response.status}: ${text}`,
            response.status,
          );
        }

        return (await response.json()) as OllamaChatResponse;
      } catch (error) {
        lastError = error;
        if (error instanceof ProviderError && error.status && error.status < 500) {
          throw error;
        }
        if (attempt < retries) {
          await this.delay(2 ** attempt * 500);
        }
      }
    }

    throw new ProviderError(
      `Ollama request failed after ${retries + 1} attempts: ${String(lastError)}`,
    );
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const timeoutMs = this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
