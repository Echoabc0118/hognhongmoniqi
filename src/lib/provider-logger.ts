import type { ProviderName } from './provider-errors';

interface ProviderLogBase {
  provider: ProviderName;
  operation: string;
  model?: string;
}

interface ProviderLogEnd extends ProviderLogBase {
  durationMs: number;
  status?: number;
  ok: boolean;
  errorCategory?: string;
  errorSummary?: string;
}

export function logProviderStart(details: ProviderLogBase) {
  console.info(
    JSON.stringify({
      event: 'provider_request_start',
      provider: details.provider,
      operation: details.operation,
      model: details.model,
      timestamp: new Date().toISOString(),
    })
  );
}

export function logProviderEnd(details: ProviderLogEnd) {
  console.info(
    JSON.stringify({
      event: 'provider_request_end',
      provider: details.provider,
      operation: details.operation,
      model: details.model,
      durationMs: details.durationMs,
      status: details.status,
      ok: details.ok,
      errorCategory: details.errorCategory,
      errorSummary: details.errorSummary ? sanitizeSummary(details.errorSummary) : undefined,
      timestamp: new Date().toISOString(),
    })
  );
}

function sanitizeSummary(summary: string): string {
  return summary.replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [redacted]').slice(0, 240);
}
