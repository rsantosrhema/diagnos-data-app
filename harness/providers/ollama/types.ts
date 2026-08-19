export interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OllamaChatRequest {
  messages: OllamaChatMessage[];
  stream?: boolean;
  format?: "json";
  options?: {
    temperature?: number;
    top_p?: number;
  };
}

export interface OllamaChatRequestInternal extends OllamaChatRequest {
  model: string;
}

export interface OllamaChatResponse {
  model: string;
  message: OllamaChatMessage;
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
}
