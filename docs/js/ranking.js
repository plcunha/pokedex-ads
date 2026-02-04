/**
 * Pokedex Pro - Ranking/Tier List
 * Drag and drop Pokemon ranking system
 */

const STORAGE_KEY = 'pokedex-ranking';
const TIERS = ['s-plus', 's', 'a', 'b', 'c', 'd'];

let allPokemons = [];
let rankings = {};
let draggedElement = null;

/**
 * Initialize the ranking page
 */
async function init() {
  try {
    // Load all Pokemon
    const data = await PokedexAPI.getPokemonList(1, PokedexAPI.MAX_POKEMON);
    allPokemons = data.pokemons;
    
    // Load saved rankings
    loadRankings();
    
    // Render Pokemon pool
    renderPool();
    
    // Render tiers
    renderTiers();
    
    // Setup event listeners
    setupEventListeners();
    
  } catch (error) {
    console.error('Failed to initialize ranking:', error);
    showError('Falha ao carregar Pokémon');
  }
}

/**
 * Load rankings from localStorage
 */
function loadRankings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      rankings = JSON.parse(saved);
    } else {
      rankings = {};
      TIERS.forEach(tier => rankings[tier] = []);
    }
  } catch (e) {
    console.warn('Failed to load rankings:', e);
    rankings = {};
    TIERS.forEach(tier => rankings[tier] = []);
  }
}

/**
 * Save rankings to localStorage
 */
function saveRankings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rankings));
    showToast('Ranking salvo com sucesso!');
  } catch (e) {
    console.error('Failed to save rankings:', e);
    showToast('Erro ao salvar ranking', 'error');
  }
}

/**
 * Reset all rankings
 */
function resetRankings() {
  if (!confirm('Tem certeza que deseja resetar todo o ranking?')) return;
  
  rankings = {};
  TIERS.forEach(tier => rankings[tier] = []);
  localStorage.removeItem(STORAGE_KEY);
  
  renderPool();
  renderTiers();
  showToast('Ranking resetado!');
}

/**
 * Get Pokemon IDs that are already ranked
 */
function getRankedIds() {
  const ids = new Set();
  Object.values(rankings).forEach(tierIds => {
    tierIds.forEach(id => ids.add(id));
  });
  return ids;
}

/**
 * Render the Pokemon pool
 */
function renderPool(searchQuery = '') {
  const pool = document.getElementById('pokemon-pool');
  const rankedIds = getRankedIds();
  
  // Filter unranked Pokemon
  let unranked = allPokemons.filter(p => !rankedIds.has(p.id));
  
  // Apply search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    unranked = unranked.filter(p => 
      p.name.includes(query) || 
      p.displayName.toLowerCase().includes(query) ||
      String(p.id) === query
    );
  }
  
  if (unranked.length === 0) {
    pool.innerHTML = `
      <div class="empty-pool">
        <span class="empty-icon">✨</span>
        <p>${searchQuery ? 'Nenhum Pokémon encontrado' : 'Todos os Pokémon foram classificados!'}</p>
      </div>
    `;
    return;
  }
  
  pool.innerHTML = unranked.map(pokemon => createPokemonCard(pokemon)).join('');
  
  // Add drag listeners to pool items
  pool.querySelectorAll('.ranking-pokemon').forEach(setupDragListeners);
}

/**
 * Render all tiers
 */
function renderTiers() {
  TIERS.forEach(tier => {
    const container = document.querySelector(`.tier-content[data-tier="${tier}"]`);
    const tierIds = rankings[tier] || [];
    
    const pokemons = tierIds
      .map(id => allPokemons.find(p => p.id === id))
      .filter(Boolean);
    
    container.innerHTML = pokemons.map(p => createPokemonCard(p)).join('');
    
    // Add drag listeners to tier items
    container.querySelectorAll('.ranking-pokemon').forEach(setupDragListeners);
  });
}

/**
 * Create a Pokemon card HTML
 */
function createPokemonCard(pokemon) {
  const typeClass = pokemon.types[0] ? `type-border-${pokemon.types[0]}` : '';
  return `
    <div 
      class="ranking-pokemon ${typeClass}" 
      data-id="${pokemon.id}"
      draggable="true"
      title="${pokemon.displayName} #${String(pokemon.id).padStart(3, '0')}"
    >
      <img 
        src="${pokemon.imageUrl}" 
        alt="${pokemon.displayName}"
        class="ranking-pokemon-img"
        loading="lazy"
        onerror="this.src='icons/placeholder.svg'"
      >
      <span class="ranking-pokemon-name">${pokemon.displayName}</span>
    </div>
  `;
}

/**
 * Setup drag event listeners for an element
 */
function setupDragListeners(element) {
  element.addEventListener('dragstart', handleDragStart);
  element.addEventListener('dragend', handleDragEnd);
}

/**
 * Handle drag start
 */
function handleDragStart(e) {
  draggedElement = e.target.closest('.ranking-pokemon');
  draggedElement.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedElement.dataset.id);
}

/**
 * Handle drag end
 */
function handleDragEnd(e) {
  if (draggedElement) {
    draggedElement.classList.remove('dragging');
    draggedElement = null;
  }
  
  // Remove all drag-over classes
  document.querySelectorAll('.drag-over').forEach(el => {
    el.classList.remove('drag-over');
  });
}

/**
 * Setup drop zones (tiers and pool)
 */
function setupEventListeners() {
  // Tier drop zones
  document.querySelectorAll('.tier-content').forEach(container => {
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('drop', handleDrop);
  });
  
  // Pool drop zone
  const pool = document.getElementById('pokemon-pool');
  pool.addEventListener('dragover', handleDragOver);
  pool.addEventListener('dragleave', handleDragLeave);
  pool.addEventListener('drop', handlePoolDrop);
  
  // Search input
  const searchInput = document.getElementById('pool-search-input');
  searchInput.addEventListener('input', (e) => {
    renderPool(e.target.value);
  });
  
  // Action buttons
  document.getElementById('reset-btn').addEventListener('click', resetRankings);
  document.getElementById('save-btn').addEventListener('click', saveRankings);
}

/**
 * Handle drag over
 */
function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}

/**
 * Handle drag leave
 */
function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

/**
 * Handle drop on tier
 */
function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  
  const pokemonId = parseInt(e.dataTransfer.getData('text/plain'), 10);
  const targetTier = e.currentTarget.dataset.tier;
  
  if (!pokemonId || !targetTier) return;
  
  // Remove from all tiers first
  TIERS.forEach(tier => {
    rankings[tier] = (rankings[tier] || []).filter(id => id !== pokemonId);
  });
  
  // Add to target tier
  if (!rankings[targetTier]) rankings[targetTier] = [];
  rankings[targetTier].push(pokemonId);
  
  // Re-render
  renderPool(document.getElementById('pool-search-input').value);
  renderTiers();
}

/**
 * Handle drop on pool (unrank)
 */
function handlePoolDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  
  const pokemonId = parseInt(e.dataTransfer.getData('text/plain'), 10);
  if (!pokemonId) return;
  
  // Remove from all tiers
  TIERS.forEach(tier => {
    rankings[tier] = (rankings[tier] || []).filter(id => id !== pokemonId);
  });
  
  // Re-render
  renderPool(document.getElementById('pool-search-input').value);
  renderTiers();
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Remove after delay
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/**
 * Show error state
 */
function showError(message) {
  const pool = document.getElementById('pokemon-pool');
  pool.innerHTML = `
    <div class="empty-pool error">
      <span class="empty-icon">😢</span>
      <p>${message}</p>
    </div>
  `;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
