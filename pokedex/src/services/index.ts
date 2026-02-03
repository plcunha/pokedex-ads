/**
 * Services Index
 * Central export point for all application services
 */

export { pokemonService } from './pokemon.service';

// Cache services - Redis with memory fallback
export { pokemonCache, RedisCacheService, CacheService } from './redis-cache.service';

// Legacy cache (kept for backward compatibility)
export { CacheService as LegacyCacheService } from './cache.service';
