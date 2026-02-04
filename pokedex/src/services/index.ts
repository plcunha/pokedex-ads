/**
 * Services Index
 * Central export point for all application services
 */

export { pokemonService } from './pokemon.service';

// Cache services - Redis with memory fallback
export { pokemonCache, RedisCacheService, CacheService } from './redis-cache.service';

// Legacy cache (kept for backward compatibility)
export { CacheService as LegacyCacheService } from './cache.service';

// Metrics and monitoring
export { metricsService } from './metrics.service';

// Rate limiting
export { rateLimiter, RateLimiterService } from './rate-limiter.service';
export type { RateLimitConfig, RateLimitInfo } from './rate-limiter.service';

// Redis Rate Limiter Store (distributed rate limiting)
export { RateLimiterRedisStore } from './rate-limiter-redis.store';

// Internationalization (i18n)
export {
  I18nService,
  getTranslations,
  getSupportedLocales,
  getDefaultLocale,
  isLocaleSupported,
  parseAcceptLanguage,
} from './i18n.service';
export type { SupportedLocale, TranslationMessages } from './i18n.service';
