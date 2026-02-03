/**
 * Pokemon API Service
 * Handles all interactions with the PokeAPI with caching and error handling
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config';
import { pokemonCache } from './cache.service';
import {
  PokemonListResponse,
  PokemonDetail,
  PokemonCardData,
  PokemonDetailData,
  PokemonListItem,
  STAT_NAMES,
  NotFoundError,
  AppError,
} from '../types';

class PokemonService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: config.api.baseUrl,
      timeout: config.api.timeout,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Format Pokemon name for display
   */
  private formatName(name: string): string {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get artwork URL for a Pokemon
   */
  private getArtworkUrl(id: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
  }

  /**
   * Extract Pokemon ID from URL
   */
  private extractIdFromUrl(url: string): number {
    const parts = url.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    return parseInt(lastPart ?? '0', 10);
  }

  /**
   * Transform list item to card data
   */
  private transformToCardData(item: PokemonListItem): PokemonCardData {
    const id = this.extractIdFromUrl(item.url);
    return {
      id,
      name: item.name,
      displayName: this.formatName(item.name),
      imageUrl: this.getArtworkUrl(id),
      types: [], // Types require additional API call, loaded lazily
    };
  }

  /**
   * Transform detail to view data
   */
  private transformToDetailData(detail: PokemonDetail): PokemonDetailData {
    const maxStat = 255; // Maximum possible stat value
    
    return {
      id: detail.id,
      name: detail.name,
      displayName: this.formatName(detail.name),
      imageUrl: detail.sprites.other['official-artwork'].front_default || this.getArtworkUrl(detail.id),
      height: `${(detail.height / 10).toFixed(1)} m`,
      weight: `${(detail.weight / 10).toFixed(1)} kg`,
      baseExperience: detail.base_experience,
      types: detail.types.map(t => t.type.name),
      abilities: detail.abilities.map(a => this.formatName(a.ability.name)),
      stats: detail.stats.map(s => ({
        name: s.stat.name,
        displayName: STAT_NAMES[s.stat.name] || this.formatName(s.stat.name),
        value: s.base_stat,
        percentage: Math.round((s.base_stat / maxStat) * 100),
      })),
    };
  }

  /**
   * Fetch Pokemon list with pagination
   */
  async getList(page: number = 1, limit: number = 20): Promise<{
    pokemons: PokemonCardData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const cacheKey = `list:${page}:${limit}`;
    const cached = pokemonCache.get(cacheKey);
    
    if (cached) {
      return cached as {
        pokemons: PokemonCardData[];
        total: number;
        page: number;
        totalPages: number;
      };
    }

    try {
      const offset = (page - 1) * limit;
      const response = await this.api.get<PokemonListResponse>('/pokemon', {
        params: { offset, limit },
      });

      const result = {
        pokemons: response.data.results.map(item => this.transformToCardData(item)),
        total: Math.min(response.data.count, config.api.maxLimit),
        page,
        totalPages: Math.ceil(Math.min(response.data.count, config.api.maxLimit) / limit),
      };

      pokemonCache.set(cacheKey, result);
      return result;
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }

  /**
   * Fetch single Pokemon by name or ID
   */
  async getByNameOrId(identifier: string | number): Promise<PokemonDetailData> {
    const normalizedId = String(identifier).toLowerCase().trim();
    const cacheKey = `pokemon:${normalizedId}`;
    const cached = pokemonCache.get(cacheKey);
    
    if (cached) {
      return cached as PokemonDetailData;
    }

    try {
      const response = await this.api.get<PokemonDetail>(`/pokemon/${normalizedId}`);
      const result = this.transformToDetailData(response.data);
      
      pokemonCache.set(cacheKey, result);
      return result;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new NotFoundError(`Pokémon "${identifier}" não encontrado`);
      }
      this.handleApiError(error);
      throw error;
    }
  }

  /**
   * Search Pokemon by name (partial match)
   */
  async search(query: string): Promise<PokemonCardData[]> {
    if (!query || query.length < 1) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    
    // Try exact match first
    try {
      const pokemon = await this.getByNameOrId(normalizedQuery);
      return [{
        id: pokemon.id,
        name: pokemon.name,
        displayName: pokemon.displayName,
        imageUrl: pokemon.imageUrl,
        types: pokemon.types,
      }];
    } catch {
      // If not found, search in list
      const { pokemons } = await this.getList(1, config.api.maxLimit);
      return pokemons.filter(p => 
        p.name.includes(normalizedQuery) || 
        p.displayName.toLowerCase().includes(normalizedQuery)
      );
    }
  }

  /**
   * Handle API errors consistently
   */
  private handleApiError(error: unknown): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.response) {
        console.error(`[Pokemon API] Error ${axiosError.response.status}:`, axiosError.message);
      } else if (axiosError.request) {
        console.error('[Pokemon API] Network error:', axiosError.message);
        throw new AppError('Não foi possível conectar à API do Pokemon', 503);
      }
    } else {
      console.error('[Pokemon API] Unexpected error:', error);
    }
  }
}

// Singleton instance
export const pokemonService = new PokemonService();
