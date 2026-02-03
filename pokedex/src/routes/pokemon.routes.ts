/**
 * Pokemon Routes
 * Route definitions for Pokemon resources
 */

import { Router } from 'express';
import { pokemonController } from '../controllers';

const router = Router();

// Home page - Pokemon list
router.get('/', (req, res, next) => pokemonController.index(req, res, next));

// Search route
router.get('/search', (req, res, next) => pokemonController.search(req, res, next));

// Pokemon detail page
router.get('/pokemon/:name', (req, res, next) => pokemonController.show(req, res, next));

export default router;
