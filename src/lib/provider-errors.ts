export type ProviderName = 'doubao-seed' | 'doubao-tts';

export type ProviderErrorCategory =
  | 'configuration'
  | 'auth'
  | 'forbidden'
  | 'rate_limit'
  | 'server'
  | 'timeout'
  | 'network'
  | 'bad_response'
  | 'unknown';

const DEFAULT_MESSAGES: Record<ProviderErrorCategory, string> = {
  configuration: '服务端 AI 配置不完整，请检查环境变量。',
  auth: 'AI 服务认证失败，请检查服务端 API Key。',
  forbidden: 'AI 服务拒绝访问，请检查权限或模型可用性。',
  rate_limit: 'AI 服务请求过于频繁，请稍后再试。',
  server: 'AI 服务暂时不可用，请稍后再试。',
  timeout: 'AI 服务响应超时，请稍后再试。',
  network: 'AI 服务网络请求失败，请稍后再试。',
  bad_response: 'AI 服务返回格式异常，请稍后再试。',
  unknown: 'AI 服务调用失败，请稍后再试。',
};

export class ProviderError extends Error {
  provider: ProviderName;
  category: ProviderErrorCategory;
  status?: number;
  retryable: boolean;
  publicMessage: string;
  cause?: unknown;

  constructor(params: {
    provider: ProviderName;
    category: ProviderErrorCategory;
    message?: string;
    publicMessage?: string;
    status?: number;
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(params.message ?? DEFAULT_MESSAGES[params.category]);
    this.name = 'ProviderError';
    this.provider = params.provider;
    this.category = params.category;
    this.status = params.status;
    this.retryable = params.retryable ?? isRetryable(params.category);
    this.publicMessage = params.publicMessage ?? DEFAULT_MESSAGES[params.category];
    this.cause = params.cause;
  }
}

export function getErrorCategoryFromStatus(status: number): ProviderErrorCategory {
  if (status === 401) return 'auth';
  if (status === 403) return 'forbidden';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'server';
  return 'unknown';
}

export function getHttpStatusForProviderError(error: ProviderError): number {
  if (error.category === 'configuration') return 500;
  if (error.category === 'auth') return 502;
  if (error.category === 'forbidden') return 502;
  if (error.category === 'rate_limit') return 429;
  if (error.category === 'timeout') return 504;
  if (error.category === 'server') return 502;
  return 500;
}

export function toProviderError(
  error: unknown,
  provider: ProviderName,
  fallbackCategory: ProviderErrorCategory = 'unknown'
): ProviderError {
  if (error instanceof ProviderError) return error;

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ProviderError({
      provider,
      category: 'timeout',
      message: error.message,
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new ProviderError({
      provider,
      category: fallbackCategory,
      message: error.message,
      cause: error,
    });
  }

  return new ProviderError({
    provider,
    category: fallbackCategory,
    message: String(error),
    cause: error,
  });
}

function isRetryable(category: ProviderErrorCategory): boolean {
  return category === 'rate_limit' || category === 'server' || category === 'timeout' || category === 'network';
}
