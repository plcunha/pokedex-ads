/**
 * Pokedex Pro - API Service
 * Handles all Pokemon API interactions
 */

const API_BASE_URL = 'https://pokeapi.co/api/v2';
const MAX_POKEMON = 151; // Gen 1
const ITEMS_PER_PAGE = 20;

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Stat name translations
 */
const STAT_NAMES = {
  'hp': 'HP',
  'attack': 'Ataque',
  'defense': 'Defesa',
  'special-attack': 'Atq. Especial',
  'special-defense': 'Def. Especial',
  'speed': 'Velocidade'
};

/**
 * Format Pokemon name for display
 */
function formatName(name) {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get artwork URL for a Pokemon
 */
function getArtworkUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

/**
 * Get cached data or null if expired
 */
function getFromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

/**
 * Set data in cache
 */
function setInCache(key, data) {
  // Limit cache size
  if (cache.size > 500) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Fetch Pokemon list with pagination
 */
async function getPokemonList(page = 1, limit = ITEMS_PER_PAGE) {
  const cacheKey = `list:${page}:${limit}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const offset = (page - 1) * limit;
  const response = await fetch(`${API_BASE_URL}/pokemon?offset=${offset}&limit=${limit}`);
  
  if (!response.ok) {
    throw new Error('Falha ao carregar lista de Pokémon');
  }
  
  const data = await response.json();
  
  // Fetch details for each Pokemon to get types
  const pokemonsWithDetails = await Promise.all(
    data.results.map(async (pokemon) => {
      const id = extractIdFromUrl(pokemon.url);
      
      // Try to get from cache first
      const detailCacheKey = `pokemon:${id}`;
      let details = getFromCache(detailCacheKey);
      
      if (!details) {
        try {
          const detailResponse = await fetch(pokemon.url);
          if (detailResponse.ok) {
            details = await detailResponse.json();
            setInCache(detailCacheKey, details);
          }
        } catch (e) {
          console.warn(`Failed to fetch details for ${pokemon.name}`);
        }
      }
      
      return {
        id,
        name: pokemon.name,
        displayName: formatName(pokemon.name),
        imageUrl: getArtworkUrl(id),
        types: details?.types?.map(t => t.type.name) || []
      };
    })
  );
  
  const result = {
    pokemons: pokemonsWithDetails,
    total: Math.min(data.count, MAX_POKEMON),
    page,
    totalPages: Math.ceil(Math.min(data.count, MAX_POKEMON) / limit)
  };
  
  setInCache(cacheKey, result);
  return result;
}

/**
 * Fetch single Pokemon by name or ID
 */
async function getPokemon(identifier) {
  const normalizedId = String(identifier).toLowerCase().trim();
  const cacheKey = `pokemon:${normalizedId}`;
  const cached = getFromCache(cacheKey);
  if (cached) return transformPokemonDetail(cached);

  const response = await fetch(`${API_BASE_URL}/pokemon/${normalizedId}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Pokémon "${identifier}" não encontrado`);
    }
    throw new Error('Falha ao carregar dados do Pokémon');
  }
  
  const data = await response.json();
  setInCache(cacheKey, data);
  
  return transformPokemonDetail(data);
}

/**
 * Transform API response to view data
 */
function transformPokemonDetail(data) {
  const maxStat = 255;
  
  // Get shiny sprite (official artwork or fallback)
  const shinyUrl = data.sprites?.other?.['official-artwork']?.front_shiny || 
                   data.sprites?.front_shiny || 
                   null;
  
  // Get cry/sound URL
  const cryUrl = data.cries?.latest || data.cries?.legacy || null;
  
  // Get moves learned by level-up (limited to first 8)
  const levelUpMoves = data.moves
    ?.filter(m => m.version_group_details?.some(
      v => v.move_learn_method?.name === 'level-up'
    ))
    ?.slice(0, 8)
    ?.map(m => ({
      name: formatName(m.move.name),
      level: m.version_group_details
        .filter(v => v.move_learn_method?.name === 'level-up')
        .sort((a, b) => a.level_learned_at - b.level_learned_at)[0]?.level_learned_at || 0
    }))
    ?.sort((a, b) => a.level - b.level) || [];
  
  return {
    id: data.id,
    name: data.name,
    displayName: formatName(data.name),
    imageUrl: data.sprites?.other?.['official-artwork']?.front_default || getArtworkUrl(data.id),
    shinyUrl,
    cryUrl,
    height: `${(data.height / 10).toFixed(1)} m`,
    weight: `${(data.weight / 10).toFixed(1)} kg`,
    baseExperience: data.base_experience || 0,
    types: data.types?.map(t => t.type.name) || [],
    abilities: data.abilities?.map(a => formatName(a.ability.name)) || [],
    moves: levelUpMoves,
    stats: data.stats?.map(s => ({
      name: s.stat.name,
      displayName: STAT_NAMES[s.stat.name] || formatName(s.stat.name),
      value: s.base_stat,
      percentage: Math.round((s.base_stat / maxStat) * 100)
    })) || []
  };
}

/**
 * Extract Pokemon ID from URL
 */
function extractIdFromUrl(url) {
  const parts = url.split('/').filter(Boolean);
  return parseInt(parts[parts.length - 1], 10);
}

/**
 * Search Pokemon by name (partial match)
 */
async function searchPokemon(query) {
  if (!query || query.length < 1) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  
  // Try exact match first
  try {
    const pokemon = await getPokemon(normalizedQuery);
    return [pokemon];
  } catch {
    // If not found, search in all Pokemon
    const { pokemons } = await getPokemonList(1, MAX_POKEMON);
    return pokemons.filter(p => 
      p.name.includes(normalizedQuery) || 
      p.displayName.toLowerCase().includes(normalizedQuery) ||
      String(p.id) === normalizedQuery
    );
  }
}

/**
 * Get URL parameters
 */
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    page: parseInt(params.get('page')) || 1,
    query: params.get('query') || '',
    pokemon: params.get('pokemon') || ''
  };
}

/**
 * Update URL without page reload
 */
function updateUrl(params) {
  const url = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
  });
  window.history.pushState({}, '', url);
}

// Export for use in other scripts
window.PokedexAPI = {
  getPokemonList,
  getPokemon,
  getPokemonByIdOrName: getPokemon, // Alias for arena.js
  searchPokemon,
  formatName,
  getArtworkUrl,
  getUrlParams,
  updateUrl,
  ITEMS_PER_PAGE,
  MAX_POKEMON,
  STAT_NAMES
};
