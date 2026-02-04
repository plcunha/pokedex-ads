/**
 * Pokedex Pro - Main Application
 * Handles UI rendering and user interactions
 */

// Image lazy loading with IntersectionObserver for better performance
const imageObserver = 'IntersectionObserver' in window 
  ? new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            img.classList.add('loaded');
          }
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '100px', // Load images 100px before they enter viewport
      threshold: 0.01
    })
  : null;

document.addEventListener('DOMContentLoaded', () => {
  const app = new PokedexApp();
  app.init();
});

class PokedexApp {
  constructor() {
    this.currentPage = 1;
    this.isLoading = false;
    this.searchQuery = '';
  }

  async init() {
    this.bindEvents();
    
    const { page, query } = PokedexAPI.getUrlParams();
    this.currentPage = page;
    this.searchQuery = query;
    
    if (query) {
      await this.handleSearch(query);
    } else {
      await this.loadPokemonList();
    }
  }

  bindEvents() {
    // Search form
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('search-input');
        if (input.value.trim()) {
          this.handleSearch(input.value.trim());
        }
      });
    }

    // Pagination
    document.addEventListener('click', (e) => {
      if (e.target.closest('.pagination-prev')) {
        e.preventDefault();
        if (this.currentPage > 1) {
          this.currentPage--;
          this.loadPokemonList();
        }
      }
      if (e.target.closest('.pagination-next')) {
        e.preventDefault();
        this.currentPage++;
        this.loadPokemonList();
      }
    });

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      const { page, query } = PokedexAPI.getUrlParams();
      this.currentPage = page;
      this.searchQuery = query;
      
      if (query) {
        this.handleSearch(query, false);
      } else {
        this.loadPokemonList(false);
      }
    });
  }

  async loadPokemonList(updateHistory = true) {
    if (this.isLoading) return;
    
    this.showLoading();
    this.isLoading = true;
    
    try {
      const data = await PokedexAPI.getPokemonList(this.currentPage);
      this.renderPokemonGrid(data.pokemons);
      this.renderPagination(data);
      
      if (updateHistory) {
        PokedexAPI.updateUrl({ 
          page: this.currentPage > 1 ? this.currentPage : null,
          query: null 
        });
      }
      
      // Update search input
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.value = '';
      }
      
      // Update header if showing search results
      const headerTitle = document.querySelector('.header h1, .search-title');
      if (headerTitle && headerTitle.classList.contains('search-title')) {
        location.reload(); // Reload to show normal header
      }
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.isLoading = false;
    }
  }

  async handleSearch(query, updateHistory = true) {
    if (this.isLoading) return;
    
    this.showLoading();
    this.isLoading = true;
    this.searchQuery = query;
    
    try {
      const results = await PokedexAPI.searchPokemon(query);
      
      if (results.length === 1) {
        // Redirect to Pokemon detail page
        window.location.href = `pokemon.html?pokemon=${results[0].name}`;
        return;
      }
      
      if (results.length === 0) {
        this.showNotFound(query);
      } else {
        this.renderSearchResults(query, results);
      }
      
      if (updateHistory) {
        PokedexAPI.updateUrl({ query, page: null });
      }
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.isLoading = false;
    }
  }

  renderPokemonGrid(pokemons) {
    const grid = document.getElementById('pokemon-grid');
    if (!grid) return;
    
    grid.innerHTML = pokemons.map(pokemon => this.createPokemonCard(pokemon)).join('');
    
    // Setup IntersectionObserver for lazy loading
    if (imageObserver) {
      grid.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }

  createPokemonCard(pokemon) {
    const typeBadges = pokemon.types
      .map(type => `<span class="type-badge type-${type}">${type}</span>`)
      .join('');
    
    // Use IntersectionObserver for smarter lazy loading if available
    const useObserver = !!imageObserver;
    const imgSrc = useObserver ? 'icons/placeholder.svg' : pokemon.imageUrl;
    const dataSrc = useObserver ? `data-src="${pokemon.imageUrl}"` : '';
    
    return `
      <li class="pokemon-card">
        <a href="pokemon.html?pokemon=${pokemon.name}" class="pokemon-link">
          <div class="pokemon-image-wrapper">
            <img 
              src="${imgSrc}"
              ${dataSrc}
              alt="${pokemon.displayName}"
              class="pokemon-image"
              loading="lazy"
              decoding="async"
              fetchpriority="low"
              onerror="this.src='icons/placeholder.svg'"
            >
          </div>
          <p class="pokemon-id">#${String(pokemon.id).padStart(3, '0')}</p>
          <h2 class="pokemon-name">${pokemon.displayName}</h2>
          ${typeBadges ? `<div class="pokemon-types">${typeBadges}</div>` : ''}
        </a>
      </li>
    `;
  }

  renderPagination(data) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    const prevDisabled = data.page <= 1;
    const nextDisabled = data.page >= data.totalPages;
    
    pagination.innerHTML = `
      <button class="pagination-btn pagination-prev" ${prevDisabled ? 'disabled' : ''}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6"></path>
        </svg>
        Anterior
      </button>
      <span class="pagination-info">Página ${data.page} de ${data.totalPages}</span>
      <button class="pagination-btn pagination-next" ${nextDisabled ? 'disabled' : ''}>
        Próximo
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"></path>
        </svg>
      </button>
    `;
  }

  renderSearchResults(query, results) {
    const container = document.querySelector('.main');
    const headerContent = document.querySelector('.header-content');
    
    if (headerContent) {
      headerContent.innerHTML = `
        <a href="index.html" class="back-link" style="display: inline-flex; align-items: center; gap: 0.5rem; color: white; text-decoration: none; font-weight: 500; margin-bottom: 1rem;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6"></path>
          </svg>
          Voltar para Pokédex
        </a>
        <h1 class="search-title" style="font-size: 1.5rem; font-weight: 700; color: white;">
          Resultados para: <span style="color: rgba(255,255,255,0.9); font-weight: 400;">"${this.escapeHtml(query)}"</span>
        </h1>
        <p style="font-size: 0.875rem; color: rgba(255,255,255,0.8); margin-top: 0.5rem;">
          ${results.length} Pokémon encontrado${results.length !== 1 ? 's' : ''}
        </p>
      `;
    }
    
    this.renderPokemonGrid(results);
    
    // Hide pagination for search results
    const pagination = document.getElementById('pagination');
    if (pagination) {
      pagination.innerHTML = `
        <a href="index.html" class="pagination-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6"></path>
          </svg>
          Ver todos os Pokémon
        </a>
      `;
    }
  }

  showLoading() {
    const grid = document.getElementById('pokemon-grid');
    if (!grid) return;
    
    grid.innerHTML = `
      <li class="loading" style="grid-column: 1 / -1;">
        <div class="spinner"></div>
        <p class="loading-text">Carregando Pokémon...</p>
      </li>
    `;
  }

  showNotFound(query) {
    const grid = document.getElementById('pokemon-grid');
    if (!grid) return;
    
    grid.innerHTML = `
      <li class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">🔍</div>
        <h2 class="empty-state-title">Pokémon não encontrado</h2>
        <p class="empty-state-text">Nenhum Pokémon encontrado para "${this.escapeHtml(query)}"</p>
        <a href="index.html" class="home-btn" style="margin-top: 1.5rem;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          Ver todos os Pokémon
        </a>
      </li>
    `;
    
    // Hide pagination
    const pagination = document.getElementById('pagination');
    if (pagination) {
      pagination.innerHTML = '';
    }
  }

  showError(message) {
    const grid = document.getElementById('pokemon-grid');
    if (!grid) return;
    
    grid.innerHTML = `
      <li class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">⚠️</div>
        <h2 class="empty-state-title">Algo deu errado</h2>
        <p class="empty-state-text">${this.escapeHtml(message)}</p>
        <button class="home-btn" onclick="location.reload()" style="margin-top: 1.5rem;">
          Tentar novamente
        </button>
      </li>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
