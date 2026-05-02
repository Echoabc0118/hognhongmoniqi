export type LLMProviderName = 'doubao-seed';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateTextRequest {
  messages: LLMMessage[];
  temperature?: number;
  timeoutMs?: number;
  operation?: string;
}

export interface GenerateTextResponse {
  content: string;
  model: string;
  provider: LLMProviderName;
  usage?: unknown;
}
