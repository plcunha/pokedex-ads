/**
 * Pokemon Controller
 * Handles HTTP requests for Pokemon resources
 */

import { Request, Response, NextFunction } from 'express';
import { pokemonService } from '../services';
import { ValidationError, PaginationQuery, SearchQuery, TYPE_COLORS } from '../types';

export class PokemonController {
  /**
   * Render home page with Pokemon list
   */
  async index(
    req: Request<unknown, unknown, unknown, PaginationQuery>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page || '1', 10));
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));

      const data = await pokemonService.getList(page, limit);

      res.render('index', {
        pokemons: data.pokemons,
        pagination: {
          current: data.page,
          total: data.totalPages,
          hasNext: data.page < data.totalPages,
          hasPrev: data.page > 1,
        },
        typeColors: TYPE_COLORS,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Render Pokemon detail page
   */
  async show(
    req: Request<{ name: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { name } = req.params;

      if (!name || name.trim().length === 0) {
        throw new ValidationError('Nome do Pokémon é obrigatório');
      }

      const pokemon = await pokemonService.getByNameOrId(name);

      res.render('pokemon', {
        pokemon,
        typeColors: TYPE_COLORS,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Pokemon search
   */
  async search(
    req: Request<unknown, unknown, unknown, SearchQuery>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { query } = req.query;

      if (!query || query.trim().length === 0) {
        return res.redirect('/');
      }

      // Try to get exact match first for better UX
      try {
        const pokemon = await pokemonService.getByNameOrId(query);
        return res.redirect(`/pokemon/${pokemon.name}`);
      } catch {
        // If not found, search and show results or redirect to home
        const results = await pokemonService.search(query);
        
        if (results.length === 1 && results[0]) {
          res.redirect(`/pokemon/${results[0].name}`);
          return;
        } else if (results.length > 1) {
          res.render('search', {
            query,
            results,
            typeColors: TYPE_COLORS,
          });
          return;
        } else {
          res.render('not-found', {
            query,
            message: `Nenhum Pokémon encontrado para "${query}"`,
          });
          return;
        }
      }
    } catch (error) {
      next(error);
    }
  }
}

// Singleton instance
export const pokemonController = new PokemonController();
