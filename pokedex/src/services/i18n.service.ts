/**
 * Internationalization (i18n) Service
 * Provides multi-language support for PT-BR and EN
 */

export type SupportedLocale = 'pt-BR' | 'en';

export interface TranslationMessages {
  // Common
  appName: string;
  footer: {
    copyright: string;
    dataProvidedBy: string;
  };

  // Navigation
  nav: {
    back: string;
    backToPokedex: string;
    home: string;
    search: string;
  };

  // Home page
  home: {
    searchPlaceholder: string;
    searchButton: string;
    page: string;
    of: string;
    previous: string;
    next: string;
  };

  // Pokemon detail page
  pokemon: {
    height: string;
    weight: string;
    baseExperience: string;
    baseStats: string;
    abilities: string;
    types: Record<string, string>;
    stats: {
      hp: string;
      attack: string;
      defense: string;
      specialAttack: string;
      specialDefense: string;
      speed: string;
    };
  };

  // Search page
  search: {
    resultsFor: string;
    pokemonFound: string;
    pokemonFoundPlural: string;
  };

  // Error pages
  errors: {
    notFound: string;
    somethingWentWrong: string;
    backToHome: string;
    pokemonNotFound: string;
    seeAllPokemon: string;
    maybeLookingFor: string;
  };

  // Meta
  meta: {
    description: string;
    pokemonDescription: string;
    searchDescription: string;
  };
}

const translations: Record<SupportedLocale, TranslationMessages> = {
  'pt-BR': {
    appName: 'Pokédex Pro',
    footer: {
      copyright: 'Pokédex Pro',
      dataProvidedBy: 'Dados fornecidos por',
    },

    nav: {
      back: 'Voltar',
      backToPokedex: 'Voltar para Pokédex',
      home: 'Home',
      search: 'Buscar',
    },

    home: {
      searchPlaceholder: 'Buscar Pokémon por nome ou número...',
      searchButton: 'Buscar',
      page: 'Página',
      of: 'de',
      previous: 'Anterior',
      next: 'Próximo',
    },

    pokemon: {
      height: 'Altura',
      weight: 'Peso',
      baseExperience: 'Experiência Base',
      baseStats: 'Estatísticas Base',
      abilities: 'Habilidades',
      types: {
        normal: 'Normal',
        fire: 'Fogo',
        water: 'Água',
        electric: 'Elétrico',
        grass: 'Planta',
        ice: 'Gelo',
        fighting: 'Lutador',
        poison: 'Veneno',
        ground: 'Terra',
        flying: 'Voador',
        psychic: 'Psíquico',
        bug: 'Inseto',
        rock: 'Pedra',
        ghost: 'Fantasma',
        dragon: 'Dragão',
        dark: 'Sombrio',
        steel: 'Metálico',
        fairy: 'Fada',
      },
      stats: {
        hp: 'HP',
        attack: 'Ataque',
        defense: 'Defesa',
        specialAttack: 'Ataque Esp.',
        specialDefense: 'Defesa Esp.',
        speed: 'Velocidade',
      },
    },

    search: {
      resultsFor: 'Resultados para:',
      pokemonFound: 'Pokémon encontrado',
      pokemonFoundPlural: 'Pokémon encontrados',
    },

    errors: {
      notFound: 'Página não encontrada',
      somethingWentWrong: 'Algo deu errado',
      backToHome: 'Voltar para Home',
      pokemonNotFound: 'Pokémon não encontrado',
      seeAllPokemon: 'Ver todos os Pokémon',
      maybeLookingFor: 'Talvez você esteja procurando:',
    },

    meta: {
      description: 'Pokédex Pro - Explore todos os Pokémon com informações detalhadas',
      pokemonDescription: '- Informações detalhadas, stats e habilidades',
      searchDescription: 'Resultados da busca por',
    },
  },

  en: {
    appName: 'Pokédex Pro',
    footer: {
      copyright: 'Pokédex Pro',
      dataProvidedBy: 'Data provided by',
    },

    nav: {
      back: 'Back',
      backToPokedex: 'Back to Pokédex',
      home: 'Home',
      search: 'Search',
    },

    home: {
      searchPlaceholder: 'Search Pokémon by name or number...',
      searchButton: 'Search',
      page: 'Page',
      of: 'of',
      previous: 'Previous',
      next: 'Next',
    },

    pokemon: {
      height: 'Height',
      weight: 'Weight',
      baseExperience: 'Base Experience',
      baseStats: 'Base Stats',
      abilities: 'Abilities',
      types: {
        normal: 'Normal',
        fire: 'Fire',
        water: 'Water',
        electric: 'Electric',
        grass: 'Grass',
        ice: 'Ice',
        fighting: 'Fighting',
        poison: 'Poison',
        ground: 'Ground',
        flying: 'Flying',
        psychic: 'Psychic',
        bug: 'Bug',
        rock: 'Rock',
        ghost: 'Ghost',
        dragon: 'Dragon',
        dark: 'Dark',
        steel: 'Steel',
        fairy: 'Fairy',
      },
      stats: {
        hp: 'HP',
        attack: 'Attack',
        defense: 'Defense',
        specialAttack: 'Sp. Attack',
        specialDefense: 'Sp. Defense',
        speed: 'Speed',
      },
    },

    search: {
      resultsFor: 'Results for:',
      pokemonFound: 'Pokémon found',
      pokemonFoundPlural: 'Pokémon found',
    },

    errors: {
      notFound: 'Page not found',
      somethingWentWrong: 'Something went wrong',
      backToHome: 'Back to Home',
      pokemonNotFound: 'Pokémon not found',
      seeAllPokemon: 'See all Pokémon',
      maybeLookingFor: 'Maybe you are looking for:',
    },

    meta: {
      description: 'Pokédex Pro - Explore all Pokémon with detailed information',
      pokemonDescription: '- Detailed information, stats and abilities',
      searchDescription: 'Search results for',
    },
  },
};

/**
 * Get the default locale
 */
export function getDefaultLocale(): SupportedLocale {
  return 'pt-BR';
}

/**
 * Get all supported locales
 */
export function getSupportedLocales(): SupportedLocale[] {
  return ['pt-BR', 'en'];
}

/**
 * Check if a locale is supported
 */
export function isLocaleSupported(locale: string): locale is SupportedLocale {
  return getSupportedLocales().includes(locale as SupportedLocale);
}

/**
 * Parse Accept-Language header and return best matching locale
 */
export function parseAcceptLanguage(acceptLanguage: string | undefined): SupportedLocale {
  if (!acceptLanguage) {
    return getDefaultLocale();
  }

  // Parse Accept-Language header (e.g., "en-US,en;q=0.9,pt-BR;q=0.8")
  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const parts = lang.trim().split(';q=');
      const code = parts[0]?.trim() || '';
      const qValue = parts[1];
      return {
        code,
        quality: qValue ? parseFloat(qValue) : 1.0,
      };
    })
    .filter((lang) => lang.code) // Filter out empty codes
    .sort((a, b) => b.quality - a.quality);

  // Find the first matching supported locale
  for (const { code } of languages) {
    // Exact match
    if (isLocaleSupported(code)) {
      return code;
    }
    // Language code match (e.g., "en" matches "en")
    const baseCode = code.split('-')[0];
    if (baseCode === 'pt' && isLocaleSupported('pt-BR')) {
      return 'pt-BR';
    }
    if (baseCode === 'en' && isLocaleSupported('en')) {
      return 'en';
    }
  }

  return getDefaultLocale();
}

/**
 * Get translations for a specific locale
 */
export function getTranslations(locale: SupportedLocale): TranslationMessages {
  return translations[locale] || translations[getDefaultLocale()];
}

/**
 * I18n Service class for dependency injection
 */
export class I18nService {
  private currentLocale: SupportedLocale;
  private messages: TranslationMessages;

  constructor(locale?: SupportedLocale) {
    this.currentLocale = locale || getDefaultLocale();
    this.messages = getTranslations(this.currentLocale);
  }

  /**
   * Get current locale
   */
  getLocale(): SupportedLocale {
    return this.currentLocale;
  }

  /**
   * Set locale and update messages
   */
  setLocale(locale: SupportedLocale): void {
    if (isLocaleSupported(locale)) {
      this.currentLocale = locale;
      this.messages = getTranslations(locale);
    }
  }

  /**
   * Get all messages for current locale
   */
  getMessages(): TranslationMessages {
    return this.messages;
  }

  /**
   * Get a specific translation by key path
   * @example t('nav.back') returns 'Voltar' for pt-BR
   */
  t(keyPath: string): string {
    const keys = keyPath.split('.');
    let result: unknown = this.messages;

    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = (result as Record<string, unknown>)[key];
      } else {
        return keyPath; // Return the key if translation not found
      }
    }

    return typeof result === 'string' ? result : keyPath;
  }

  /**
   * Get HTML lang attribute value
   */
  getHtmlLang(): string {
    return this.currentLocale === 'pt-BR' ? 'pt-BR' : 'en';
  }
}

// Default export for convenience
export default I18nService;
