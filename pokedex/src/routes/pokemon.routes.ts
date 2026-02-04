/**
 * Pokemon Routes
 * Route definitions for Pokemon resources
 */

import { Router } from 'express';
import { pokemonController } from '../controllers';

const router = Router();

/**
 * @swagger
 * /:
 *   get:
 *     summary: Get Pokémon list
 *     description: Returns a paginated list of Pokémon with basic information
 *     tags: [Pokemon]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: Successful response with Pokémon list
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Rendered HTML page
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PokemonList'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', (req, res, next) => pokemonController.index(req, res, next));

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Search Pokémon by name
 *     description: Search for Pokémon whose name contains the query string
 *     tags: [Pokemon]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Search query (Pokémon name)
 *         example: pikachu
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Rendered HTML page
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResult'
 *       400:
 *         description: Missing search query
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/search', (req, res, next) => pokemonController.search(req, res, next));

/**
 * @swagger
 * /pokemon/{name}:
 *   get:
 *     summary: Get Pokémon details
 *     description: Returns detailed information about a specific Pokémon
 *     tags: [Pokemon]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Pokémon name (lowercase)
 *         example: pikachu
 *     responses:
 *       200:
 *         description: Pokémon details
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Rendered HTML page
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PokemonDetail'
 *       404:
 *         description: Pokémon not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/pokemon/:name', (req, res, next) => pokemonController.show(req, res, next));

export default router;
