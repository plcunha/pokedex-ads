/**
 * Swagger Schema Definitions
 * OpenAPI component schemas for the Pokédex API
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PokemonCard:
 *       type: object
 *       description: Basic Pokémon information for list display
 *       properties:
 *         id:
 *           type: integer
 *           description: Pokémon unique ID
 *           example: 25
 *         name:
 *           type: string
 *           description: Pokémon name (lowercase)
 *           example: pikachu
 *         displayName:
 *           type: string
 *           description: Pokémon name formatted for display
 *           example: Pikachu
 *         imageUrl:
 *           type: string
 *           description: URL to official artwork
 *           example: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png
 *         types:
 *           type: array
 *           items:
 *             type: string
 *           description: Pokémon types
 *           example: ["electric"]
 *
 *     PokemonDetail:
 *       type: object
 *       description: Detailed Pokémon information
 *       properties:
 *         id:
 *           type: integer
 *           example: 25
 *         name:
 *           type: string
 *           example: pikachu
 *         displayName:
 *           type: string
 *           example: Pikachu
 *         imageUrl:
 *           type: string
 *           example: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png
 *         height:
 *           type: string
 *           description: Height in meters
 *           example: "0.4m"
 *         weight:
 *           type: string
 *           description: Weight in kilograms
 *           example: "6.0kg"
 *         baseExperience:
 *           type: integer
 *           description: Base experience gained when defeated
 *           example: 112
 *         types:
 *           type: array
 *           items:
 *             type: string
 *           example: ["electric"]
 *         abilities:
 *           type: array
 *           items:
 *             type: string
 *           example: ["static", "lightning-rod"]
 *         stats:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PokemonStat'
 *
 *     PokemonStat:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: hp
 *         displayName:
 *           type: string
 *           example: HP
 *         value:
 *           type: integer
 *           example: 35
 *         percentage:
 *           type: integer
 *           description: Value as percentage (0-100)
 *           example: 35
 *
 *     PokemonList:
 *       type: object
 *       properties:
 *         pokemon:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PokemonCard'
 *         pagination:
 *           $ref: '#/components/schemas/Pagination'
 *
 *     Pagination:
 *       type: object
 *       properties:
 *         currentPage:
 *           type: integer
 *           example: 1
 *         totalPages:
 *           type: integer
 *           example: 56
 *         totalItems:
 *           type: integer
 *           example: 1118
 *         hasNext:
 *           type: boolean
 *           example: true
 *         hasPrevious:
 *           type: boolean
 *           example: false
 *
 *     SearchResult:
 *       type: object
 *       properties:
 *         results:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PokemonCard'
 *         query:
 *           type: string
 *           example: pika
 *         count:
 *           type: integer
 *           example: 5
 *
 *     Error:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: error
 *         message:
 *           type: string
 *           example: Pokémon not found
 *         statusCode:
 *           type: integer
 *           example: 404
 */

export {};
