import { generateDoubaoSeedText } from '@/lib/ai/providers/doubao-seed';
import type { GenerateTextRequest, GenerateTextResponse } from '@/lib/ai/types';

export type {
  GenerateTextRequest,
  GenerateTextResponse,
  LLMMessage,
  LLMProviderName,
} from '@/lib/ai/types';

export async function generateText(
  request: GenerateTextRequest
): Promise<GenerateTextResponse> {
  return generateDoubaoSeedText(request);
}
