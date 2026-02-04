/**
 * Pokedex Pro - Modern Tier List
 * Enhanced drag and drop Pokemon ranking with touch support
 */

const STORAGE_KEY = 'pokedex-ranking-v2';
const TIERS = ['s-plus', 's', 'a', 'b', 'c', 'd'];
const TIER_NAMES = {
  's-plus': 'S+',
  's': 'S',
  'a': 'A',
  'b': 'B',
  'c': 'C',
  'd': 'D'
};

// State
let allPokemons = [];
let rankings = {};
let tierLabels = {};
let draggedElement = null;
let touchDragElement = null;
let touchClone = null;
let currentFilter = 'all';
let currentView = 'grid';

/**
 * Initialize the ranking page
 */
async function init() {
  try {
    // Load all Pokemon
    const data = await PokedexAPI.getPokemonList(1, PokedexAPI.MAX_POKEMON);
    allPokemons = data.pokemons;
    
    // Load saved data
    loadRankings();
    
    // Render everything
    renderPool();
    renderTiers();
    updateStats();
    
    // Setup all event listeners
    setupEventListeners();
    setupTouchSupport();
    
  } catch (error) {
    console.error('Failed to initialize ranking:', error);
    showError('Falha ao carregar Pokémon. Tente recarregar a página.');
  }
}

/**
 * Load rankings and custom tier labels from localStorage
 */
function loadRankings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      rankings = data.rankings || {};
      tierLabels = data.tierLabels || {};
    } else {
      rankings = {};
      tierLabels = {};
    }
    TIERS.forEach(tier => {
      if (!rankings[tier]) rankings[tier] = [];
      if (!tierLabels[tier]) tierLabels[tier] = TIER_NAMES[tier];
    });
    
    // Apply saved tier labels
    TIERS.forEach(tier => {
      const label = document.querySelector(`.tier-label-modern[contenteditable]`);
      const labelEl = document.querySelector(`.tier-row-modern[data-tier="${tier}"] .tier-label-modern`);
      if (labelEl && tierLabels[tier]) {
        labelEl.textContent = tierLabels[tier];
      }
    });
  } catch (e) {
    console.warn('Failed to load rankings:', e);
    rankings = {};
    tierLabels = {};
    TIERS.forEach(tier => {
      rankings[tier] = [];
      tierLabels[tier] = TIER_NAMES[tier];
    });
  }
}

/**
 * Save rankings to localStorage
 */
function saveRankings() {
  try {
    // Capture current tier labels
    TIERS.forEach(tier => {
      const labelEl = document.querySelector(`.tier-row-modern[data-tier="${tier}"] .tier-label-modern`);
      if (labelEl) {
        tierLabels[tier] = labelEl.textContent.trim() || TIER_NAMES[tier];
      }
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      rankings,
      tierLabels,
      savedAt: new Date().toISOString()
    }));
    showToast('✓ Ranking salvo com sucesso!', 'success');
  } catch (e) {
    console.error('Failed to save rankings:', e);
    showToast('Erro ao salvar ranking', 'error');
  }
}

/**
 * Clear all rankings
 */
function clearAllRankings() {
  if (!confirm('Tem certeza que deseja limpar toda a tier list?\nIsso removerá todos os Pokémon classificados.')) return;
  
  rankings = {};
  TIERS.forEach(tier => rankings[tier] = []);
  localStorage.removeItem(STORAGE_KEY);
  
  renderPool();
  renderTiers();
  updateStats();
  showToast('Tier list limpa!', 'info');
}

/**
 * Get ranked Pokemon IDs
 */
function getRankedIds() {
  const ids = new Set();
  Object.values(rankings).forEach(tierIds => {
    tierIds.forEach(id => ids.add(id));
  });
  return ids;
}

/**
 * Update statistics display
 */
function updateStats() {
  const rankedCount = getRankedIds().size;
  const remaining = allPokemons.length - rankedCount;
  
  document.getElementById('stats-ranked').textContent = `${rankedCount} classificados`;
  document.getElementById('stats-remaining').textContent = `${remaining} restantes`;
  
  // Update tier counts
  TIERS.forEach(tier => {
    const count = (rankings[tier] || []).length;
    const countEl = document.querySelector(`.tier-count[data-tier="${tier}"]`);
    if (countEl) countEl.textContent = count;
  });
}

/**
 * Render the Pokemon pool
 */
function renderPool() {
  const pool = document.getElementById('pokemon-pool');
  const rankedIds = getRankedIds();
  const searchQuery = document.getElementById('pool-search-input')?.value?.toLowerCase() || '';
  
  // Filter unranked Pokemon
  let unranked = allPokemons.filter(p => !rankedIds.has(p.id));
  
  // Apply type filter
  if (currentFilter !== 'all') {
    unranked = unranked.filter(p => p.types.includes(currentFilter));
  }
  
  // Apply search filter
  if (searchQuery) {
    unranked = unranked.filter(p => 
      p.name.includes(searchQuery) || 
      p.displayName.toLowerCase().includes(searchQuery) ||
      String(p.id) === searchQuery
    );
  }
  
  if (unranked.length === 0) {
    const message = searchQuery 
      ? 'Nenhum Pokémon encontrado' 
      : currentFilter !== 'all' 
        ? `Nenhum Pokémon do tipo ${currentFilter}` 
        : 'Todos os Pokémon foram classificados! 🎉';
    
    pool.innerHTML = `
      <div class="empty-pool-modern">
        <span class="empty-icon">${searchQuery || currentFilter !== 'all' ? '🔍' : '✨'}</span>
        <p>${message}</p>
      </div>
    `;
    return;
  }
  
  const viewClass = currentView === 'compact' ? 'pool-compact' : '';
  pool.className = `pokemon-pool-modern ${viewClass}`;
  pool.innerHTML = unranked.map(pokemon => createPokemonCard(pokemon, currentView === 'compact')).join('');
  
  // Setup drag listeners
  pool.querySelectorAll('.tier-pokemon').forEach(setupDragListeners);
}

/**
 * Render all tiers
 */
function renderTiers() {
  TIERS.forEach(tier => {
    const container = document.querySelector(`.tier-content-modern[data-tier="${tier}"]`);
    const tierIds = rankings[tier] || [];
    
    if (tierIds.length === 0) {
      container.innerHTML = '<div class="tier-placeholder">Arraste pokémon aqui</div>';
      return;
    }
    
    const pokemons = tierIds
      .map(id => allPokemons.find(p => p.id === id))
      .filter(Boolean);
    
    container.innerHTML = pokemons.map(p => createPokemonCard(p, true)).join('');
    
    // Setup drag listeners
    container.querySelectorAll('.tier-pokemon').forEach(setupDragListeners);
  });
  
  updateStats();
}

/**
 * Create a Pokemon card HTML
 */
function createPokemonCard(pokemon, compact = false) {
  const typeClass = pokemon.types[0] ? `type-glow-${pokemon.types[0]}` : '';
  const sizeClass = compact ? 'compact' : '';
  
  return `
    <div 
      class="tier-pokemon ${typeClass} ${sizeClass}" 
      data-id="${pokemon.id}"
      data-name="${pokemon.name}"
      data-types="${pokemon.types.join(',')}"
      draggable="true"
      title="${pokemon.displayName} #${String(pokemon.id).padStart(3, '0')}"
    >
      <img 
        src="${pokemon.imageUrl}" 
        alt="${pokemon.displayName}"
        class="tier-pokemon-img"
        loading="lazy"
        decoding="async"
        fetchpriority="low"
        onerror="this.src='icons/placeholder.svg'"
      >
      ${!compact ? `<span class="tier-pokemon-name">${pokemon.displayName}</span>` : ''}
    </div>
  `;
}

/**
 * Setup drag event listeners
 */
function setupDragListeners(element) {
  element.addEventListener('dragstart', handleDragStart);
  element.addEventListener('dragend', handleDragEnd);
}

function handleDragStart(e) {
  draggedElement = e.target.closest('.tier-pokemon');
  draggedElement.classList.add('dragging');
  
  // Create ghost image
  const ghost = draggedElement.cloneNode(true);
  ghost.style.opacity = '0.8';
  ghost.style.position = 'absolute';
  ghost.style.top = '-1000px';
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, 30, 30);
  setTimeout(() => ghost.remove(), 0);
  
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedElement.dataset.id);
}

function handleDragEnd() {
  if (draggedElement) {
    draggedElement.classList.remove('dragging');
    draggedElement = null;
  }
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Tier drop zones
  document.querySelectorAll('.tier-content-modern').forEach(container => {
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('drop', handleDrop);
  });
  
  // Pool drop zone
  const pool = document.getElementById('pokemon-pool');
  pool.addEventListener('dragover', handleDragOver);
  pool.addEventListener('dragleave', handleDragLeave);
  pool.addEventListener('drop', handlePoolDrop);
  
  // Search
  document.getElementById('pool-search-input').addEventListener('input', debounce(renderPool, 200));
  
  // Type filter dropdown
  const filterBtn = document.getElementById('type-filter-btn');
  const dropdown = document.getElementById('type-dropdown');
  
  filterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
  });
  
  document.addEventListener('click', () => dropdown.classList.add('hidden'));
  
  dropdown.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
      currentFilter = e.target.dataset.type;
      document.getElementById('filter-label').textContent = 
        currentFilter === 'all' ? 'Todos os Tipos' : capitalizeFirst(currentFilter);
      
      dropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
      e.target.classList.add('active');
      dropdown.classList.add('hidden');
      renderPool();
    });
  });
  
  // View toggle
  document.getElementById('view-grid').addEventListener('click', () => {
    currentView = 'grid';
    document.getElementById('view-grid').classList.add('active');
    document.getElementById('view-compact').classList.remove('active');
    renderPool();
  });
  
  document.getElementById('view-compact').addEventListener('click', () => {
    currentView = 'compact';
    document.getElementById('view-compact').classList.add('active');
    document.getElementById('view-grid').classList.remove('active');
    renderPool();
  });
  
  // Action buttons
  document.getElementById('clear-all-btn').addEventListener('click', clearAllRankings);
  document.getElementById('save-btn').addEventListener('click', saveRankings);
  document.getElementById('screenshot-btn').addEventListener('click', takeScreenshot);
  document.getElementById('share-btn').addEventListener('click', shareRanking);
  
  // Modal
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.querySelector('.modal-backdrop').addEventListener('click', closeModal);
  document.getElementById('download-screenshot').addEventListener('click', downloadScreenshot);
  
  // Auto-save tier label changes
  document.querySelectorAll('.tier-label-modern[contenteditable]').forEach(label => {
    label.addEventListener('blur', () => {
      const tier = label.closest('.tier-row-modern').dataset.tier;
      tierLabels[tier] = label.textContent.trim() || TIER_NAMES[tier];
    });
    
    label.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        label.blur();
      }
    });
  });
}

/**
 * Touch support for mobile
 */
function setupTouchSupport() {
  document.addEventListener('touchstart', handleTouchStart, { passive: false });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd, { passive: false });
}

function handleTouchStart(e) {
  const pokemon = e.target.closest('.tier-pokemon');
  if (!pokemon) return;
  
  touchDragElement = pokemon;
  
  const touch = e.touches[0];
  const rect = pokemon.getBoundingClientRect();
  
  // Create clone for dragging
  touchClone = pokemon.cloneNode(true);
  touchClone.classList.add('touch-dragging');
  touchClone.style.position = 'fixed';
  touchClone.style.left = `${touch.clientX - rect.width / 2}px`;
  touchClone.style.top = `${touch.clientY - rect.height / 2}px`;
  touchClone.style.width = `${rect.width}px`;
  touchClone.style.zIndex = '10000';
  touchClone.style.pointerEvents = 'none';
  document.body.appendChild(touchClone);
  
  pokemon.classList.add('dragging');
}

function handleTouchMove(e) {
  if (!touchClone || !touchDragElement) return;
  e.preventDefault();
  
  const touch = e.touches[0];
  const rect = touchDragElement.getBoundingClientRect();
  
  touchClone.style.left = `${touch.clientX - rect.width / 2}px`;
  touchClone.style.top = `${touch.clientY - rect.height / 2}px`;
  
  // Auto-scroll when dragging near edges
  autoScrollOnDrag(touch.clientY);
  
  // Highlight drop zone
  const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
  const dropZone = elemBelow?.closest('.tier-content-modern, .pokemon-pool-modern');
  
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  if (dropZone) dropZone.classList.add('drag-over');
}

/**
 * Auto-scroll page when dragging near top or bottom edges
 */
let autoScrollInterval = null;

function autoScrollOnDrag(clientY) {
  const scrollThreshold = 80; // pixels from edge to trigger scroll
  const scrollSpeed = 15; // pixels per frame
  const viewportHeight = window.innerHeight;
  
  // Clear any existing scroll interval
  if (autoScrollInterval) {
    clearInterval(autoScrollInterval);
    autoScrollInterval = null;
  }
  
  // Check if near top edge - scroll up
  if (clientY < scrollThreshold) {
    const intensity = 1 - (clientY / scrollThreshold); // 0 to 1
    autoScrollInterval = setInterval(() => {
      window.scrollBy(0, -scrollSpeed * intensity);
    }, 16);
  }
  // Check if near bottom edge - scroll down
  else if (clientY > viewportHeight - scrollThreshold) {
    const intensity = 1 - ((viewportHeight - clientY) / scrollThreshold); // 0 to 1
    autoScrollInterval = setInterval(() => {
      window.scrollBy(0, scrollSpeed * intensity);
    }, 16);
  }
}

function handleTouchEnd(e) {
  if (!touchDragElement) return;
  
  const touch = e.changedTouches[0];
  const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
  const dropZone = elemBelow?.closest('.tier-content-modern, .pokemon-pool-modern');
  
  if (dropZone) {
    const pokemonId = parseInt(touchDragElement.dataset.id, 10);
    
    if (dropZone.classList.contains('tier-content-modern')) {
      const targetTier = dropZone.dataset.tier;
      movePokemonToTier(pokemonId, targetTier);
    } else {
      removePokemonFromTiers(pokemonId);
    }
  }
  
  // Cleanup
  if (touchClone) {
    touchClone.remove();
    touchClone = null;
  }
  
  if (touchDragElement) {
    touchDragElement.classList.remove('dragging');
    touchDragElement = null;
  }
  
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

/**
 * Move Pokemon to a tier
 */
function movePokemonToTier(pokemonId, targetTier) {
  // Remove from all tiers first
  TIERS.forEach(tier => {
    rankings[tier] = (rankings[tier] || []).filter(id => id !== pokemonId);
  });
  
  // Add to target tier
  if (!rankings[targetTier]) rankings[targetTier] = [];
  rankings[targetTier].push(pokemonId);
  
  renderPool();
  renderTiers();
}

/**
 * Remove Pokemon from all tiers
 */
function removePokemonFromTiers(pokemonId) {
  TIERS.forEach(tier => {
    rankings[tier] = (rankings[tier] || []).filter(id => id !== pokemonId);
  });
  
  renderPool();
  renderTiers();
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  
  const pokemonId = parseInt(e.dataTransfer.getData('text/plain'), 10);
  const targetTier = e.currentTarget.dataset.tier;
  
  if (!pokemonId || !targetTier) return;
  movePokemonToTier(pokemonId, targetTier);
}

function handlePoolDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  
  const pokemonId = parseInt(e.dataTransfer.getData('text/plain'), 10);
  if (!pokemonId) return;
  removePokemonFromTiers(pokemonId);
}

/**
 * Take screenshot of tier list
 */
async function takeScreenshot() {
  const captureArea = document.getElementById('tier-list-capture');
  
  showToast('Gerando screenshot...', 'info');
  
  try {
    const canvas = await html2canvas(captureArea, {
      backgroundColor: '#0F172A',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false
    });
    
    const imgData = canvas.toDataURL('image/png');
    document.getElementById('screenshot-preview').src = imgData;
    document.getElementById('screenshot-modal').classList.remove('hidden');
    
  } catch (error) {
    console.error('Screenshot failed:', error);
    showToast('Erro ao gerar screenshot', 'error');
  }
}

function downloadScreenshot() {
  const img = document.getElementById('screenshot-preview');
  const link = document.createElement('a');
  link.download = `pokemon-tier-list-${Date.now()}.png`;
  link.href = img.src;
  link.click();
  closeModal();
  showToast('Screenshot baixado!', 'success');
}

function closeModal() {
  document.getElementById('screenshot-modal').classList.add('hidden');
}

/**
 * Share ranking
 */
async function shareRanking() {
  const ranked = [];
  TIERS.forEach(tier => {
    if (rankings[tier]?.length > 0) {
      const names = rankings[tier]
        .map(id => allPokemons.find(p => p.id === id)?.displayName)
        .filter(Boolean);
      ranked.push(`${tierLabels[tier]}: ${names.join(', ')}`);
    }
  });
  
  const text = `🏆 Minha Pokémon Tier List\n\n${ranked.join('\n')}\n\nCriado em: pokedex-ads`;
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Pokémon Tier List',
        text: text
      });
    } catch (e) {
      if (e.name !== 'AbortError') {
        copyToClipboard(text);
      }
    }
  } else {
    copyToClipboard(text);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copiado para a área de transferência!', 'success');
  }).catch(() => {
    showToast('Erro ao copiar', 'error');
  });
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  
  const toast = document.createElement('div');
  toast.className = `toast-modern toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span class="toast-message">${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('show'));
  
  // Remove after delay
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Show error state
 */
function showError(message) {
  const pool = document.getElementById('pokemon-pool');
  pool.innerHTML = `
    <div class="empty-pool-modern error">
      <span class="empty-icon">😢</span>
      <p>${message}</p>
      <button onclick="location.reload()" class="retry-btn">Tentar Novamente</button>
    </div>
  `;
}

/**
 * Utility functions
 */
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
