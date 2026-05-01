import {
  ProviderError,
  getErrorCategoryFromStatus,
  toProviderError,
} from '@/lib/provider-errors';
import { logProviderEnd, logProviderStart } from '@/lib/provider-logger';

export interface SynthesizeSpeechRequest {
  text: string;
  speaker: string;
  format?: 'mp3';
  sampleRate?: number;
  timeoutMs?: number;
}

export interface SynthesizeSpeechResponse {
  audioUrl: string;
  audioSize: number;
  provider: 'doubao-tts';
}

const DEFAULT_ENDPOINT = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';
const DEFAULT_RESOURCE_ID = 'seed-tts-2.0';

export async function synthesizeSpeech({
  text,
  speaker,
  format = 'mp3',
  sampleRate = 24000,
  timeoutMs = 60000,
}: SynthesizeSpeechRequest): Promise<SynthesizeSpeechResponse> {
  const provider = 'doubao-tts';
  const apiKey = process.env.DOUBAO_TTS_API_KEY;
  const endpoint = process.env.DOUBAO_TTS_ENDPOINT || DEFAULT_ENDPOINT;
  const resourceId = process.env.DOUBAO_TTS_RESOURCE_ID || DEFAULT_RESOURCE_ID;

  if (!apiKey) {
    throw new ProviderError({
      provider,
      category: 'configuration',
      message: 'DOUBAO_TTS_API_KEY is not set',
    });
  }

  const startedAt = Date.now();
  logProviderStart({ provider, operation: 'synthesize_speech', model: speaker });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let status: number | undefined;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Connection: 'keep-alive',
        'x-api-key': apiKey,
        'X-Api-Resource-Id': resourceId,
      },
      body: JSON.stringify({
        req_params: {
          text,
          speaker,
          additions: JSON.stringify({
            disable_markdown_filter: true,
            enable_language_detector: true,
            enable_latex_tn: true,
            disable_default_bit_rate: true,
            max_length_to_filter_parenthesis: 0,
            cache_config: {
              text_type: 1,
              use_cache: true,
            },
          }),
          audio_params: {
            format,
            sample_rate: sampleRate,
          },
        },
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

    const chunks = parseDoubaoResponse(responseText);
    const audioBase64 = chunks
      .filter(chunk => chunk.code === 0 && typeof chunk.data === 'string')
      .map(chunk => chunk.data)
      .join('');

    if (!audioBase64) {
      const errorChunk = chunks.find(chunk => chunk.code !== 0 && chunk.code !== 20000000);
      throw new ProviderError({
        provider,
        category: 'bad_response',
        status: response.status,
        message: errorChunk?.message || 'Doubao TTS response did not include audio data',
      });
    }

    logProviderEnd({
      provider,
      operation: 'synthesize_speech',
      model: speaker,
      durationMs: Date.now() - startedAt,
      status,
      ok: true,
    });

    return {
      audioUrl: `data:audio/${format};base64,${audioBase64}`,
      audioSize: getBase64ByteLength(audioBase64),
      provider,
    };
  } catch (error) {
    const providerError = toProviderError(error, provider, 'network');
    logProviderEnd({
      provider,
      operation: 'synthesize_speech',
      model: speaker,
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

interface DoubaoTTSChunk {
  code: number;
  message?: string;
  data?: string | null;
}

function parseDoubaoResponse(responseText: string): DoubaoTTSChunk[] {
  try {
    return [JSON.parse(responseText) as DoubaoTTSChunk];
  } catch {
    const objects = extractJsonObjects(responseText);
    if (objects.length > 0) return objects;
  }

  throw new ProviderError({
    provider: 'doubao-tts',
    category: 'bad_response',
    message: 'Doubao TTS returned non-JSON response',
  });
}

function extractJsonObjects(input: string): DoubaoTTSChunk[] {
  const objects: DoubaoTTSChunk[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        const raw = input.slice(start, i + 1);
        try {
          objects.push(JSON.parse(raw) as DoubaoTTSChunk);
        } catch {
          // Ignore malformed fragments and let the caller handle missing audio.
        }
        start = -1;
      }
    }
  }

  return objects;
}

function getBase64ByteLength(value: string): number {
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  return Math.floor((value.length * 3) / 4) - padding;
}
