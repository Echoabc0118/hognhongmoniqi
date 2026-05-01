import {
  ProviderError,
  getErrorCategoryFromStatus,
  toProviderError,
} from '@/lib/provider-errors';
import { logProviderEnd, logProviderStart } from '@/lib/provider-logger';

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateTextRequest {
  messages: OpenRouterMessage[];
  temperature?: number;
  reasoning?: boolean;
  timeoutMs?: number;
  operation?: string;
}

export interface GenerateTextResponse {
  content: string;
  model: string;
  provider: 'openrouter';
  usage?: unknown;
}

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek/deepseek-chat-v3.1';

export async function generateText({
  messages,
  temperature = 0.8,
  reasoning = true,
  timeoutMs = 60000,
  operation = 'generate_text',
}: GenerateTextRequest): Promise<GenerateTextResponse> {
  const provider = 'openrouter';
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  if (!apiKey) {
    throw new ProviderError({
      provider,
      category: 'configuration',
      message: 'OPENROUTER_API_KEY is not set',
    });
  }

  const startedAt = Date.now();
  logProviderStart({ provider, operation, model });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let status: number | undefined;

  try {
    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        reasoning: reasoning ? { enabled: true } : undefined,
      }),
      signal: controller.signal,
    });

    status = response.status;
    const responseText = await response.text();

    if (!response.ok) {
      throw new ProviderError({
        provider,
        category: getErrorCategoryFromStatus(response.status),
        status: response.status,
        message: responseText || response.statusText,
      });
    }

    let data: OpenRouterResponse;
    try {
      data = JSON.parse(responseText) as OpenRouterResponse;
    } catch (error) {
      throw new ProviderError({
        provider,
        category: 'bad_response',
        status: response.status,
        message: 'OpenRouter returned non-JSON response',
        cause: error,
      });
    }

    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new ProviderError({
        provider,
        category: 'bad_response',
        status: response.status,
        message: 'OpenRouter response is missing choices[0].message.content',
      });
    }

    logProviderEnd({
      provider,
      operation,
      model: data.model || model,
      durationMs: Date.now() - startedAt,
      status,
      ok: true,
    });

    return {
      content: content.trim(),
      model: data.model || model,
      provider,
      usage: data.usage,
    };
  } catch (error) {
    const providerError = toProviderError(error, provider, 'network');
    logProviderEnd({
      provider,
      operation,
      model,
      durationMs: Date.now() - startedAt,
      status: providerError.status ?? status,
      ok: false,
      errorCategory: providerError.category,
      errorSummary: providerError.message,
    });
    throw providerError;
  } finally {
    clearTimeout(timeout);
  }
}

interface OpenRouterResponse {
  model?: string;
  choices?: Array<{
    message?: {
      role?: string;
      content?: string;
      reasoning?: unknown;
    };
    finish_reason?: string;
  }>;
  usage?: unknown;
}
