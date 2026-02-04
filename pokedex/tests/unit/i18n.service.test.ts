/**
 * Unit Tests for I18n Service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  I18nService,
  getTranslations,
  getSupportedLocales,
  getDefaultLocale,
  isLocaleSupported,
  parseAcceptLanguage,
  SupportedLocale,
} from '../../src/services/i18n.service';

describe('I18n Service', () => {
  describe('getDefaultLocale', () => {
    it('should return pt-BR as default locale', () => {
      expect(getDefaultLocale()).toBe('pt-BR');
    });
  });

  describe('getSupportedLocales', () => {
    it('should return array with pt-BR and en', () => {
      const locales = getSupportedLocales();
      expect(locales).toContain('pt-BR');
      expect(locales).toContain('en');
      expect(locales).toHaveLength(2);
    });
  });

  describe('isLocaleSupported', () => {
    it('should return true for pt-BR', () => {
      expect(isLocaleSupported('pt-BR')).toBe(true);
    });

    it('should return true for en', () => {
      expect(isLocaleSupported('en')).toBe(true);
    });

    it('should return false for unsupported locale', () => {
      expect(isLocaleSupported('fr')).toBe(false);
      expect(isLocaleSupported('es')).toBe(false);
      expect(isLocaleSupported('de')).toBe(false);
    });
  });

  describe('parseAcceptLanguage', () => {
    it('should return default locale when header is undefined', () => {
      expect(parseAcceptLanguage(undefined)).toBe('pt-BR');
    });

    it('should return default locale when header is empty', () => {
      expect(parseAcceptLanguage('')).toBe('pt-BR');
    });

    it('should parse exact match for en', () => {
      expect(parseAcceptLanguage('en')).toBe('en');
    });

    it('should parse exact match for pt-BR', () => {
      expect(parseAcceptLanguage('pt-BR')).toBe('pt-BR');
    });

    it('should parse pt to pt-BR', () => {
      expect(parseAcceptLanguage('pt')).toBe('pt-BR');
    });

    it('should parse en-US to en', () => {
      expect(parseAcceptLanguage('en-US')).toBe('en');
    });

    it('should respect quality values', () => {
      expect(parseAcceptLanguage('en;q=0.8,pt-BR;q=0.9')).toBe('pt-BR');
    });

    it('should prefer higher quality', () => {
      expect(parseAcceptLanguage('pt-BR;q=0.5,en;q=0.9')).toBe('en');
    });

    it('should handle complex Accept-Language header', () => {
      expect(parseAcceptLanguage('fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7,pt-BR;q=0.6')).toBe('en');
    });

    it('should return default when no supported language found', () => {
      expect(parseAcceptLanguage('fr-FR,de-DE,es-ES')).toBe('pt-BR');
    });
  });

  describe('getTranslations', () => {
    it('should return pt-BR translations', () => {
      const translations = getTranslations('pt-BR');
      expect(translations.appName).toBe('Pokédex Pro');
      expect(translations.home.searchButton).toBe('Buscar');
      expect(translations.nav.back).toBe('Voltar');
    });

    it('should return en translations', () => {
      const translations = getTranslations('en');
      expect(translations.appName).toBe('Pokédex Pro');
      expect(translations.home.searchButton).toBe('Search');
      expect(translations.nav.back).toBe('Back');
    });

    it('should have all Pokemon type translations', () => {
      const translations = getTranslations('pt-BR');
      const types = translations.pokemon.types;
      
      expect(types.fire).toBe('Fogo');
      expect(types.water).toBe('Água');
      expect(types.grass).toBe('Planta');
      expect(types.electric).toBe('Elétrico');
      expect(types.psychic).toBe('Psíquico');
    });

    it('should have all stat translations', () => {
      const translations = getTranslations('en');
      const stats = translations.pokemon.stats;
      
      expect(stats.hp).toBe('HP');
      expect(stats.attack).toBe('Attack');
      expect(stats.defense).toBe('Defense');
      expect(stats.specialAttack).toBe('Sp. Attack');
      expect(stats.specialDefense).toBe('Sp. Defense');
      expect(stats.speed).toBe('Speed');
    });
  });

  describe('I18nService class', () => {
    let i18n: I18nService;

    describe('with default locale', () => {
      beforeEach(() => {
        i18n = new I18nService();
      });

      it('should initialize with default locale pt-BR', () => {
        expect(i18n.getLocale()).toBe('pt-BR');
      });

      it('should return correct messages', () => {
        const messages = i18n.getMessages();
        expect(messages.appName).toBe('Pokédex Pro');
        expect(messages.nav.back).toBe('Voltar');
      });

      it('should return correct HTML lang', () => {
        expect(i18n.getHtmlLang()).toBe('pt-BR');
      });
    });

    describe('with en locale', () => {
      beforeEach(() => {
        i18n = new I18nService('en');
      });

      it('should initialize with en locale', () => {
        expect(i18n.getLocale()).toBe('en');
      });

      it('should return en messages', () => {
        const messages = i18n.getMessages();
        expect(messages.nav.back).toBe('Back');
        expect(messages.home.searchButton).toBe('Search');
      });

      it('should return correct HTML lang', () => {
        expect(i18n.getHtmlLang()).toBe('en');
      });
    });

    describe('setLocale', () => {
      beforeEach(() => {
        i18n = new I18nService('pt-BR');
      });

      it('should change locale to en', () => {
        i18n.setLocale('en');
        expect(i18n.getLocale()).toBe('en');
        expect(i18n.getMessages().nav.back).toBe('Back');
      });

      it('should not change locale for unsupported locale', () => {
        i18n.setLocale('fr' as SupportedLocale);
        expect(i18n.getLocale()).toBe('pt-BR');
      });
    });

    describe('t() method', () => {
      beforeEach(() => {
        i18n = new I18nService('pt-BR');
      });

      it('should get translation by key path', () => {
        expect(i18n.t('nav.back')).toBe('Voltar');
        expect(i18n.t('home.searchButton')).toBe('Buscar');
        expect(i18n.t('errors.notFound')).toBe('Página não encontrada');
      });

      it('should get nested translation', () => {
        expect(i18n.t('pokemon.types.fire')).toBe('Fogo');
        expect(i18n.t('pokemon.stats.hp')).toBe('HP');
      });

      it('should return key path when translation not found', () => {
        expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
        expect(i18n.t('nav.nonexistent')).toBe('nav.nonexistent');
      });

      it('should return key path for empty string', () => {
        expect(i18n.t('')).toBe('');
      });
    });
  });
});
