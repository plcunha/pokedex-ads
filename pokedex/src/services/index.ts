/**
 * Services Index
 * Central export point for all application services
 */

export { pokemonService } from './pokemon.service';
export { pokemonCache, CacheService } from './cache.service';
export {
  I18nService,
  getTranslations,
  getSupportedLocales,
  getDefaultLocale,
  isLocaleSupported,
  parseAcceptLanguage,
} from './i18n.service';
export type { SupportedLocale, TranslationMessages } from './i18n.service';
