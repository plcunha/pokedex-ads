/**
 * PokemonController Unit Tests
 * Tests the controller layer handling of HTTP requests
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { PokemonController } from '../../src/controllers/pokemon.controller';
import { pokemonService } from '../../src/services';
import { ValidationError, NotFoundError, TYPE_COLORS } from '../../src/types';

// Mock the pokemon service
vi.mock('../../src/services', () => ({
  pokemonService: {
    getList: vi.fn(),
    getByNameOrId: vi.fn(),
    search: vi.fn(),
  },
}));

describe('PokemonController', () => {
  let controller: PokemonController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    controller = new PokemonController();
    vi.clearAllMocks();

    mockRequest = {
      query: {},
      params: {},
    };

    mockResponse = {
      render: vi.fn(),
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('index', () => {
    const mockListData = {
      pokemons: [
        { id: 1, name: 'bulbasaur', displayName: 'Bulbasaur', imageUrl: 'url', types: [] },
      ],
      total: 100,
      page: 1,
      totalPages: 5,
    };

    it('should render index page with pokemon list', async () => {
      (pokemonService.getList as Mock).mockResolvedValue(mockListData);

      await controller.index(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(pokemonService.getList).toHaveBeenCalledWith(1, 20);
      expect(mockResponse.render).toHaveBeenCalledWith('index', {
        pokemons: mockListData.pokemons,
        pagination: {
          current: 1,
          total: 5,
          hasNext: true,
          hasPrev: false,
        },
        typeColors: TYPE_COLORS,
      });
    });

    it('should handle pagination query params', async () => {
      mockRequest.query = { page: '2', limit: '10' };
      (pokemonService.getList as Mock).mockResolvedValue({
        ...mockListData,
        page: 2,
      });

      await controller.index(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(pokemonService.getList).toHaveBeenCalledWith(2, 10);
    });

    it('should handle negative page number by defaulting to 1', async () => {
      mockRequest.query = { page: '-5' };
      (pokemonService.getList as Mock).mockResolvedValue(mockListData);

      await controller.index(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(pokemonService.getList).toHaveBeenCalledWith(1, 20);
    });

    it('should cap limit at 50', async () => {
      mockRequest.query = { limit: '100' };
      (pokemonService.getList as Mock).mockResolvedValue(mockListData);

      await controller.index(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(pokemonService.getList).toHaveBeenCalledWith(1, 50);
    });

    it('should handle minimum limit of 1', async () => {
      mockRequest.query = { limit: '0' };
      (pokemonService.getList as Mock).mockResolvedValue(mockListData);

      await controller.index(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(pokemonService.getList).toHaveBeenCalledWith(1, 1);
    });

    it('should call next with error on service failure', async () => {
      const error = new Error('API Error');
      (pokemonService.getList as Mock).mockRejectedValue(error);

      await controller.index(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('show', () => {
    const mockPokemonData = {
      id: 25,
      name: 'pikachu',
      displayName: 'Pikachu',
      imageUrl: 'url',
      height: '0.4 m',
      weight: '6.0 kg',
      baseExperience: 112,
      types: ['electric'],
      abilities: ['Static'],
      stats: [],
    };

    it('should render pokemon detail page', async () => {
      mockRequest.params = { name: 'pikachu' };
      (pokemonService.getByNameOrId as Mock).mockResolvedValue(mockPokemonData);

      await controller.show(
        mockRequest as Request<{ name: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(pokemonService.getByNameOrId).toHaveBeenCalledWith('pikachu');
      expect(mockResponse.render).toHaveBeenCalledWith('pokemon', {
        pokemon: mockPokemonData,
        typeColors: TYPE_COLORS,
      });
    });

    it('should throw ValidationError for empty name', async () => {
      mockRequest.params = { name: '' };

      await controller.show(
        mockRequest as Request<{ name: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Nome do Pokémon é obrigatório');
    });

    it('should throw ValidationError for whitespace-only name', async () => {
      mockRequest.params = { name: '   ' };

      await controller.show(
        mockRequest as Request<{ name: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(ValidationError);
    });

    it('should call next with error on service failure', async () => {
      mockRequest.params = { name: 'unknown' };
      const error = new NotFoundError('Pokémon not found');
      (pokemonService.getByNameOrId as Mock).mockRejectedValue(error);

      await controller.show(
        mockRequest as Request<{ name: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('search', () => {
    const mockPokemonData = {
      id: 25,
      name: 'pikachu',
      displayName: 'Pikachu',
      imageUrl: 'url',
      types: ['electric'],
    };

    it('should redirect to home when no query provided', async () => {
      mockRequest.query = {};

      await controller.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith('/');
    });

    it('should redirect to home when query is empty', async () => {
      mockRequest.query = { query: '' };

      await controller.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith('/');
    });

    it('should redirect to home when query is whitespace only', async () => {
      mockRequest.query = { query: '   ' };

      await controller.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith('/');
    });

    it('should redirect to pokemon detail on exact match', async () => {
      mockRequest.query = { query: 'pikachu' };
      (pokemonService.getByNameOrId as Mock).mockResolvedValue({
        ...mockPokemonData,
        height: '0.4 m',
        weight: '6.0 kg',
      });

      await controller.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith('/pokemon/pikachu');
    });

    it('should redirect to pokemon detail when search returns single result', async () => {
      mockRequest.query = { query: 'pika' };
      (pokemonService.getByNameOrId as Mock).mockRejectedValue(new NotFoundError('Not found'));
      (pokemonService.search as Mock).mockResolvedValue([mockPokemonData]);

      await controller.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith('/pokemon/pikachu');
    });

    it('should render search results when multiple matches found', async () => {
      mockRequest.query = { query: 'char' };
      const multipleResults = [
        { id: 4, name: 'charmander', displayName: 'Charmander', imageUrl: 'url', types: [] },
        { id: 5, name: 'charmeleon', displayName: 'Charmeleon', imageUrl: 'url', types: [] },
        { id: 6, name: 'charizard', displayName: 'Charizard', imageUrl: 'url', types: [] },
      ];
      (pokemonService.getByNameOrId as Mock).mockRejectedValue(new NotFoundError('Not found'));
      (pokemonService.search as Mock).mockResolvedValue(multipleResults);

      await controller.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.render).toHaveBeenCalledWith('search', {
        query: 'char',
        results: multipleResults,
        typeColors: TYPE_COLORS,
      });
    });

    it('should render not-found page when no results found', async () => {
      mockRequest.query = { query: 'zzzzz' };
      (pokemonService.getByNameOrId as Mock).mockRejectedValue(new NotFoundError('Not found'));
      (pokemonService.search as Mock).mockResolvedValue([]);

      await controller.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.render).toHaveBeenCalledWith('not-found', {
        query: 'zzzzz',
        message: 'Nenhum Pokémon encontrado para "zzzzz"',
      });
    });

    it('should call next with error when search service fails', async () => {
      mockRequest.query = { query: 'pikachu' };
      // The outer catch is triggered when pokemonService.search throws
      (pokemonService.getByNameOrId as Mock).mockRejectedValue(new NotFoundError('Not found'));
      const error = new Error('Search service failed');
      (pokemonService.search as Mock).mockRejectedValue(error);

      await controller.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});

describe('ValidationError', () => {
  it('should create error with correct properties', () => {
    const error = new ValidationError('Field is required');
    expect(error.message).toBe('Field is required');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('ValidationError');
    expect(error.isOperational).toBe(true);
  });
});
