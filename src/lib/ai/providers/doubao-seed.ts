import {
  ProviderError,
  getErrorCategoryFromStatus,
  toProviderError,
} from '@/lib/provider-errors';
import { logProviderEnd, logProviderStart } from '@/lib/provider-logger';
import type { GenerateTextRequest, GenerateTextResponse } from '@/lib/ai/types';

const DOUBAO_SEED_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const DEFAULT_MODEL = 'doubao-seed-character-251128';

export async function generateDoubaoSeedText({
  messages,
  temperature = 0.8,
  timeoutMs = 60000,
  operation = 'generate_text',
}: GenerateTextRequest): Promise<GenerateTextResponse> {
  const provider = 'doubao-seed';
  const apiKey = process.env.ARK_API_KEY;
  const model = process.env.DOUBAO_SEED_MODEL || DEFAULT_MODEL;

  if (!apiKey) {
    throw new ProviderError({
      provider,
      category: 'configuration',
      message: 'ARK_API_KEY is not set',
    });
  }

  const startedAt = Date.now();
  logProviderStart({ provider, operation, model });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let status: number | undefined;

  try {
    const response = await fetch(DOUBAO_SEED_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
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

    let data: DoubaoSeedResponse;
    try {
      data = JSON.parse(responseText) as DoubaoSeedResponse;
    } catch (error) {
      throw new ProviderError({
        provider,
        category: 'bad_response',
        status: response.status,
        message: 'Doubao Seed returned non-JSON response',
        cause: error,
      });
    }

    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new ProviderError({
        provider,
        category: 'bad_response',
        status: response.status,
        message: 'Doubao Seed response is missing choices[0].message.content',
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

interface DoubaoSeedResponse {
  model?: string;
  choices?: Array<{
    message?: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
  usage?: unknown;
}
