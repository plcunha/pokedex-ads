/**
 * Pokédex Pro - Arena 3D
 * Interactive 3D Pokemon viewer using Three.js
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================
// CONSTANTS
// ============================================

const ARENA_RADIUS = 8;
const POKEMON_SCALE = 4;
const CAMERA_DISTANCE = 10;
const ROTATION_SPEED = 0.3;

// ============================================
// STATE
// ============================================

let scene, camera, renderer, controls;
let pokemonSprite, pokemonMaterial;
let opponentSprite, opponentMaterial;
let currentPokemon = null;
let opponentPokemon = null;
let allPokemons = [];
let isAutoRotating = true;
let animationId = null;

// Battle State
let battleState = {
  isActive: false,
  playerTurn: true,
  playerHP: 0,
  playerMaxHP: 0,
  opponentHP: 0,
  opponentMaxHP: 0,
  playerMoves: [],
  opponentMoves: [],
  battleLog: []
};

// ============================================
// INITIALIZATION
// ============================================

async function init() {
  try {
    // Setup Three.js scene
    setupScene();
    setupCamera();
    setupRenderer();
    setupLighting();
    setupArena();
    setupControls();
    
    // Load Pokemon data
    await loadPokemonList();
    
    // Load initial Pokemon (Pikachu)
    await loadPokemon(25);
    
    // Setup UI
    setupEventListeners();
    setupBattleEventListeners();
    
    // Hide loading overlay
    document.getElementById('loading-overlay').classList.add('hidden');
    
    // Start animation loop
    animate();
    
    // Handle resize
    window.addEventListener('resize', onWindowResize);
    
  } catch (error) {
    console.error('Failed to initialize Arena:', error);
    showToast('Erro ao carregar Arena 3D', 'error');
  }
}

// ============================================
// THREE.JS SETUP
// ============================================

function setupScene() {
  scene = new THREE.Scene();
  
  // Gradient background using a large sphere
  const bgGeometry = new THREE.SphereGeometry(100, 32, 32);
  const bgMaterial = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x1e3a5f) },
      bottomColor: { value: new THREE.Color(0x0f172a) }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
      }
    `,
    side: THREE.BackSide
  });
  const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
  scene.add(bgMesh);
  
  // Add fog for depth
  scene.fog = new THREE.Fog(0x0f172a, 15, 50);
}

function setupCamera() {
  const container = document.getElementById('arena-container');
  const aspect = container.clientWidth / container.clientHeight;
  
  camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
  camera.position.set(0, 3, CAMERA_DISTANCE);
  camera.lookAt(0, 2, 0);
}

function setupRenderer() {
  const container = document.getElementById('arena-container');
  
  renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  
  container.insertBefore(renderer.domElement, container.firstChild);
}

function setupLighting() {
  // Ambient light for base illumination
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  // Main directional light (sun)
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
  mainLight.position.set(5, 10, 7);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 1024;
  mainLight.shadow.mapSize.height = 1024;
  mainLight.shadow.camera.near = 0.5;
  mainLight.shadow.camera.far = 50;
  mainLight.shadow.camera.left = -10;
  mainLight.shadow.camera.right = 10;
  mainLight.shadow.camera.top = 10;
  mainLight.shadow.camera.bottom = -10;
  scene.add(mainLight);
  
  // Rim light for dramatic effect
  const rimLight = new THREE.DirectionalLight(0x4488ff, 0.5);
  rimLight.position.set(-5, 5, -5);
  scene.add(rimLight);
  
  // Ground accent light
  const groundLight = new THREE.PointLight(0xef4444, 0.3, 15);
  groundLight.position.set(0, 0.5, 0);
  scene.add(groundLight);
}

function setupArena() {
  // Arena floor - circular platform
  const floorGeometry = new THREE.CircleGeometry(ARENA_RADIUS, 64);
  const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x1e293b,
    metalness: 0.3,
    roughness: 0.7
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  
  // Arena ring glow
  const ringGeometry = new THREE.RingGeometry(ARENA_RADIUS - 0.1, ARENA_RADIUS + 0.1, 64);
  const ringMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xef4444,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  scene.add(ring);
  
  // Inner circle decoration
  const innerRingGeometry = new THREE.RingGeometry(3, 3.1, 64);
  const innerRingMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x3b82f6,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5
  });
  const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.02;
  scene.add(innerRing);
  
  // Pokeball pattern on floor
  createPokeballPattern();
  
  // Particle effect
  createParticles();
}

function createPokeballPattern() {
  // Center circle
  const centerGeometry = new THREE.CircleGeometry(0.8, 32);
  const whiteMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const center = new THREE.Mesh(centerGeometry, whiteMaterial);
  center.rotation.x = -Math.PI / 2;
  center.position.y = 0.03;
  scene.add(center);
  
  // Center dot
  const dotGeometry = new THREE.CircleGeometry(0.3, 32);
  const redMaterial = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const dot = new THREE.Mesh(dotGeometry, redMaterial);
  dot.rotation.x = -Math.PI / 2;
  dot.position.y = 0.04;
  scene.add(dot);
  
  // Horizontal line
  const lineGeometry = new THREE.PlaneGeometry(6, 0.1);
  const line = new THREE.Mesh(lineGeometry, whiteMaterial.clone());
  line.rotation.x = -Math.PI / 2;
  line.position.y = 0.025;
  scene.add(line);
}

function createParticles() {
  const particleCount = 50;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 2 + Math.random() * 5;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = 0.5 + Math.random() * 4;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const material = new THREE.PointsMaterial({
    color: 0x60a5fa,
    size: 0.1,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });
  
  const particles = new THREE.Points(geometry, material);
  particles.name = 'particles';
  scene.add(particles);
}

function setupControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 20;
  controls.maxPolarAngle = Math.PI / 2 - 0.1;
  controls.target.set(0, 2, 0);
  controls.autoRotate = isAutoRotating;
  controls.autoRotateSpeed = ROTATION_SPEED;
}

// ============================================
// POKEMON LOADING
// ============================================

async function loadPokemonList() {
  try {
    const data = await PokedexAPI.getPokemonList(1, PokedexAPI.MAX_POKEMON);
    allPokemons = data.pokemons;
  } catch (error) {
    console.error('Failed to load Pokemon list:', error);
    showToast('Erro ao carregar lista de Pokémon', 'error');
  }
}

async function loadPokemon(idOrName) {
  try {
    // Find pokemon in list
    let pokemon = allPokemons.find(p => 
      p.id === parseInt(idOrName) || 
      p.name.toLowerCase() === String(idOrName).toLowerCase()
    );
    
    if (!pokemon) {
      // Try to fetch from API
      pokemon = await PokedexAPI.getPokemonByIdOrName(idOrName);
    }
    
    if (!pokemon) {
      showToast('Pokémon não encontrado', 'error');
      return;
    }
    
    currentPokemon = pokemon;
    
    // Update UI
    updatePokemonInfo(pokemon);
    
    // Load sprite as texture
    await loadPokemonSprite(pokemon);
    
    showToast(`${pokemon.displayName} carregado!`, 'success');
    
  } catch (error) {
    console.error('Failed to load Pokemon:', error);
    showToast('Erro ao carregar Pokémon', 'error');
  }
}

async function loadPokemonSprite(pokemon) {
  return new Promise((resolve, reject) => {
    const textureLoader = new THREE.TextureLoader();
    
    // Use official artwork for better quality
    const imageUrl = pokemon.imageUrl || 
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`;
    
    textureLoader.load(
      imageUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        // Remove old sprite if exists
        if (pokemonSprite) {
          scene.remove(pokemonSprite);
          if (pokemonMaterial) pokemonMaterial.dispose();
        }
        
        // Create new sprite material
        pokemonMaterial = new THREE.SpriteMaterial({ 
          map: texture,
          transparent: true,
          alphaTest: 0.1
        });
        
        // Create sprite
        pokemonSprite = new THREE.Sprite(pokemonMaterial);
        pokemonSprite.scale.set(POKEMON_SCALE, POKEMON_SCALE, 1);
        pokemonSprite.position.set(0, POKEMON_SCALE / 2 + 0.5, 0);
        pokemonSprite.castShadow = true;
        
        scene.add(pokemonSprite);
        
        resolve();
      },
      undefined,
      (error) => {
        console.error('Failed to load texture:', error);
        reject(error);
      }
    );
  });
}

// ============================================
// UI UPDATES
// ============================================

function updatePokemonInfo(pokemon) {
  document.getElementById('current-pokemon-id').textContent = 
    `#${String(pokemon.id).padStart(3, '0')}`;
  document.getElementById('current-pokemon-name').textContent = 
    pokemon.displayName;
  
  const typesContainer = document.getElementById('current-pokemon-types');
  typesContainer.innerHTML = pokemon.types.map(type => 
    `<span class="type-badge type-${type}">${type}</span>`
  ).join('');
  
  // Update stats if visible
  if (document.getElementById('show-stats').checked) {
    updateStatsPanel(pokemon);
  }
}

async function updateStatsPanel(pokemon) {
  const statsPanel = document.getElementById('stats-bars');
  
  // Fetch full pokemon data if needed
  let stats = pokemon.stats;
  if (!stats) {
    try {
      const fullData = await PokedexAPI.getPokemonByIdOrName(pokemon.id);
      stats = fullData.stats;
    } catch (e) {
      stats = null;
    }
  }
  
  if (!stats) {
    statsPanel.innerHTML = '<p>Estatísticas não disponíveis</p>';
    return;
  }
  
  const statNames = {
    hp: 'HP',
    attack: 'Ataque',
    defense: 'Defesa',
    'special-attack': 'Atq. Esp.',
    'special-defense': 'Def. Esp.',
    speed: 'Velocidade'
  };
  
  const statColors = {
    hp: '#4ADE80',
    attack: '#F97316',
    defense: '#FACC15',
    'special-attack': '#818CF8',
    'special-defense': '#34D399',
    speed: '#F472B6'
  };
  
  statsPanel.innerHTML = stats.map(stat => `
    <div class="arena-stat-row">
      <span class="arena-stat-name">${statNames[stat.name] || stat.name}</span>
      <span class="arena-stat-value">${stat.value}</span>
      <div class="arena-stat-bar-bg">
        <div class="arena-stat-bar" style="width: ${Math.min(stat.value / 255 * 100, 100)}%; background: ${statColors[stat.name] || '#60a5fa'}"></div>
      </div>
    </div>
  `).join('');
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Pokemon search
  const searchInput = document.getElementById('pokemon-search');
  const suggestions = document.getElementById('pokemon-suggestions');
  
  searchInput.addEventListener('input', debounce((e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (query.length < 1) {
      suggestions.classList.add('hidden');
      return;
    }
    
    const matches = allPokemons
      .filter(p => 
        p.name.includes(query) || 
        p.displayName.toLowerCase().includes(query) ||
        String(p.id) === query
      )
      .slice(0, 8);
    
    if (matches.length === 0) {
      suggestions.classList.add('hidden');
      return;
    }
    
    suggestions.innerHTML = matches.map(p => `
      <button class="arena-suggestion-item" data-id="${p.id}">
        <img src="${p.imageUrl}" alt="${p.displayName}" onerror="this.src='icons/placeholder.svg'">
        <span>#${String(p.id).padStart(3, '0')} ${p.displayName}</span>
      </button>
    `).join('');
    
    suggestions.classList.remove('hidden');
    
    // Add click listeners to suggestions
    suggestions.querySelectorAll('.arena-suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        loadPokemon(parseInt(item.dataset.id));
        searchInput.value = '';
        suggestions.classList.add('hidden');
      });
    });
  }, 200));
  
  // Hide suggestions on blur
  searchInput.addEventListener('blur', () => {
    setTimeout(() => suggestions.classList.add('hidden'), 200);
  });
  
  // Enter to search
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && searchInput.value.trim()) {
      loadPokemon(searchInput.value.trim());
      searchInput.value = '';
      suggestions.classList.add('hidden');
    }
  });
  
  // View buttons
  document.getElementById('view-orbit').addEventListener('click', () => {
    setActiveViewBtn('view-orbit');
    animateCameraTo(0, 3, CAMERA_DISTANCE);
  });
  
  document.getElementById('view-front').addEventListener('click', () => {
    setActiveViewBtn('view-front');
    animateCameraTo(0, 2, CAMERA_DISTANCE);
  });
  
  document.getElementById('view-top').addEventListener('click', () => {
    setActiveViewBtn('view-top');
    animateCameraTo(0.1, CAMERA_DISTANCE, 0.1);
  });
  
  // Auto rotate toggle
  document.getElementById('auto-rotate').addEventListener('change', (e) => {
    isAutoRotating = e.target.checked;
    controls.autoRotate = isAutoRotating;
  });
  
  // Show stats toggle
  document.getElementById('show-stats').addEventListener('change', (e) => {
    const statsPanel = document.getElementById('stats-panel');
    if (e.target.checked) {
      statsPanel.classList.remove('hidden');
      if (currentPokemon) updateStatsPanel(currentPokemon);
    } else {
      statsPanel.classList.add('hidden');
    }
  });
  
  // Random Pokemon
  document.getElementById('random-pokemon').addEventListener('click', () => {
    const randomId = Math.floor(Math.random() * allPokemons.length) + 1;
    loadPokemon(randomId);
  });
  
  // Toggle controls panel
  document.getElementById('toggle-controls').addEventListener('click', (e) => {
    const body = document.getElementById('controls-body');
    const btn = e.target;
    body.classList.toggle('collapsed');
    btn.textContent = body.classList.contains('collapsed') ? '+' : '−';
  });
}

function setActiveViewBtn(activeId) {
  document.querySelectorAll('.arena-view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.id === activeId);
  });
}

function animateCameraTo(x, y, z) {
  const duration = 1000;
  const startPos = camera.position.clone();
  const endPos = new THREE.Vector3(x, y, z);
  const startTime = Date.now();
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(t);
    
    camera.position.lerpVectors(startPos, endPos, eased);
    camera.lookAt(controls.target);
    
    if (t < 1) {
      requestAnimationFrame(animate);
    }
  }
  
  animate();
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// ============================================
// ANIMATION LOOP
// ============================================

function animate() {
  animationId = requestAnimationFrame(animate);
  
  // Update controls
  controls.update();
  
  // Animate particles
  const particles = scene.getObjectByName('particles');
  if (particles) {
    particles.rotation.y += 0.001;
    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += Math.sin(Date.now() * 0.001 + i) * 0.002;
    }
    particles.geometry.attributes.position.needsUpdate = true;
  }
  
  // Render
  renderer.render(scene, camera);
}

// ============================================
// UTILITIES
// ============================================

function onWindowResize() {
  const container = document.getElementById('arena-container');
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  
  renderer.setSize(width, height);
}

function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  
  const toast = document.createElement('div');
  toast.className = `toast-modern toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span class="toast-message">${message}</span>
  `;
  
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================
// BATTLE SYSTEM
// ============================================

function setupBattleEventListeners() {
  // Battle mode toggle
  document.getElementById('start-battle-mode').addEventListener('click', toggleBattleMode);
  
  // End battle
  document.getElementById('btn-end-battle').addEventListener('click', endBattle);
  
  // Opponent search
  const opponentSearch = document.getElementById('opponent-search');
  const opponentSuggestions = document.getElementById('opponent-suggestions');
  
  opponentSearch.addEventListener('input', debounce((e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (query.length < 1) {
      opponentSuggestions.classList.add('hidden');
      return;
    }
    
    // Filter out current pokemon
    const matches = allPokemons
      .filter(p => 
        p.id !== currentPokemon?.id &&
        (p.name.includes(query) || 
        p.displayName.toLowerCase().includes(query) ||
        String(p.id) === query)
      )
      .slice(0, 8);
    
    if (matches.length === 0) {
      opponentSuggestions.classList.add('hidden');
      return;
    }
    
    opponentSuggestions.innerHTML = matches.map(p => `
      <button class="arena-suggestion-item" data-id="${p.id}">
        <img src="${p.imageUrl}" alt="${p.displayName}" onerror="this.src='icons/placeholder.svg'">
        <span>#${String(p.id).padStart(3, '0')} ${p.displayName}</span>
      </button>
    `).join('');
    
    opponentSuggestions.classList.remove('hidden');
    
    opponentSuggestions.querySelectorAll('.arena-suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        selectOpponent(parseInt(item.dataset.id));
        opponentSearch.value = '';
        opponentSuggestions.classList.add('hidden');
      });
    });
  }, 200));
  
  opponentSearch.addEventListener('blur', () => {
    setTimeout(() => opponentSuggestions.classList.add('hidden'), 200);
  });
  
  opponentSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && opponentSearch.value.trim()) {
      const query = opponentSearch.value.trim().toLowerCase();
      const match = allPokemons.find(p => 
        p.id !== currentPokemon?.id &&
        (p.name === query || p.displayName.toLowerCase() === query || String(p.id) === query)
      );
      if (match) {
        selectOpponent(match.id);
        opponentSearch.value = '';
        opponentSuggestions.classList.add('hidden');
      }
    }
  });
  
  // Random opponent
  document.getElementById('random-opponent').addEventListener('click', () => {
    const availablePokemons = allPokemons.filter(p => p.id !== currentPokemon?.id);
    if (availablePokemons.length > 0) {
      const randomPokemon = availablePokemons[Math.floor(Math.random() * availablePokemons.length)];
      selectOpponent(randomPokemon.id);
    }
  });
  
  // Close opponent panel
  document.getElementById('close-opponent-panel').addEventListener('click', () => {
    document.getElementById('opponent-panel').classList.add('hidden');
  });
}

function toggleBattleMode() {
  const btn = document.getElementById('start-battle-mode');
  const battlePanel = document.getElementById('battle-panel');
  const battleControls = document.getElementById('battle-controls');
  const opponentPanel = document.getElementById('opponent-panel');
  const body = document.body;
  
  if (battleState.isActive) {
    // Exit battle mode
    endBattle();
  } else {
    // Enter battle mode
    battleState.isActive = true;
    body.classList.add('battle-mode');
    btn.classList.add('active');
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
      Sair do Modo Batalha
    `;
    
    // Show battle UI
    battlePanel.classList.remove('hidden');
    battleControls.classList.remove('hidden');
    opponentPanel.classList.remove('hidden');
    
    // Update player info
    if (currentPokemon) {
      updateBattlePlayerInfo(currentPokemon);
    }
    
    // Stop auto-rotate during battle
    controls.autoRotate = false;
    
    showToast('Modo Batalha ativado! Escolha um oponente.', 'success');
  }
}

async function selectOpponent(idOrName) {
  try {
    // Find or fetch opponent pokemon
    let pokemon = allPokemons.find(p => 
      p.id === parseInt(idOrName) || 
      p.name.toLowerCase() === String(idOrName).toLowerCase()
    );
    
    if (!pokemon) {
      pokemon = await PokedexAPI.getPokemon(idOrName);
    } else {
      // Get full stats
      pokemon = await PokedexAPI.getPokemon(pokemon.id);
    }
    
    if (!pokemon) {
      showToast('Oponente não encontrado', 'error');
      return;
    }
    
    opponentPokemon = pokemon;
    
    // Load opponent sprite
    await loadOpponentSprite(pokemon);
    
    // Initialize battle
    initializeBattle();
    
    // Close opponent panel
    document.getElementById('opponent-panel').classList.add('hidden');
    
    showToast(`${pokemon.displayName} quer lutar!`, 'success');
    
  } catch (error) {
    console.error('Failed to load opponent:', error);
    showToast('Erro ao carregar oponente', 'error');
  }
}

async function loadOpponentSprite(pokemon) {
  return new Promise((resolve, reject) => {
    const textureLoader = new THREE.TextureLoader();
    
    const imageUrl = pokemon.imageUrl || 
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`;
    
    textureLoader.load(
      imageUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        // Remove old opponent sprite if exists
        if (opponentSprite) {
          scene.remove(opponentSprite);
          if (opponentMaterial) opponentMaterial.dispose();
        }
        
        // Create new sprite material
        opponentMaterial = new THREE.SpriteMaterial({ 
          map: texture,
          transparent: true,
          alphaTest: 0.1
        });
        
        // Create opponent sprite (positioned on the other side)
        opponentSprite = new THREE.Sprite(opponentMaterial);
        opponentSprite.scale.set(POKEMON_SCALE, POKEMON_SCALE, 1);
        opponentSprite.position.set(4, POKEMON_SCALE / 2 + 0.5, -2);
        opponentSprite.castShadow = true;
        
        scene.add(opponentSprite);
        
        // Move player sprite to battle position
        if (pokemonSprite) {
          pokemonSprite.position.set(-4, POKEMON_SCALE / 2 + 0.5, 2);
        }
        
        // Adjust camera for battle view
        animateCameraTo(0, 4, 14);
        
        resolve();
      },
      undefined,
      (error) => {
        console.error('Failed to load opponent texture:', error);
        reject(error);
      }
    );
  });
}

function initializeBattle() {
  if (!currentPokemon || !opponentPokemon) return;
  
  // Calculate HP from stats
  const playerHPStat = currentPokemon.stats?.find(s => s.name === 'hp');
  const opponentHPStat = opponentPokemon.stats?.find(s => s.name === 'hp');
  
  battleState.playerMaxHP = playerHPStat?.value || 100;
  battleState.playerHP = battleState.playerMaxHP;
  battleState.opponentMaxHP = opponentHPStat?.value || 100;
  battleState.opponentHP = battleState.opponentMaxHP;
  battleState.playerTurn = true;
  battleState.battleLog = [];
  
  // Get moves (limit to 4)
  battleState.playerMoves = (currentPokemon.moves || []).slice(0, 4);
  battleState.opponentMoves = (opponentPokemon.moves || []).slice(0, 4);
  
  // If no moves, create basic attacks based on types
  if (battleState.playerMoves.length === 0) {
    battleState.playerMoves = createBasicMoves(currentPokemon);
  }
  if (battleState.opponentMoves.length === 0) {
    battleState.opponentMoves = createBasicMoves(opponentPokemon);
  }
  
  // Update UI
  updateBattlePlayerInfo(currentPokemon);
  updateBattleOpponentInfo(opponentPokemon);
  updateBattleHP();
  renderAttackButtons();
  
  addBattleLog(`⚔️ ${currentPokemon.displayName} vs ${opponentPokemon.displayName}!`, '');
  addBattleLog(`É a vez de ${currentPokemon.displayName}!`, 'player');
}

function createBasicMoves(pokemon) {
  const type = pokemon.types?.[0] || 'normal';
  return [
    { name: 'Tackle', level: 1 },
    { name: `${type.charAt(0).toUpperCase() + type.slice(1)} Attack`, level: 1 },
    { name: 'Quick Attack', level: 1 },
    { name: 'Slam', level: 1 }
  ];
}

function updateBattlePlayerInfo(pokemon) {
  document.getElementById('player-pokemon-name').textContent = pokemon.displayName;
}

function updateBattleOpponentInfo(pokemon) {
  document.getElementById('opponent-pokemon-name').textContent = pokemon.displayName;
}

function updateBattleHP() {
  const playerPercentage = Math.max(0, (battleState.playerHP / battleState.playerMaxHP) * 100);
  const opponentPercentage = Math.max(0, (battleState.opponentHP / battleState.opponentMaxHP) * 100);
  
  const playerFill = document.getElementById('player-hp-fill');
  const opponentFill = document.getElementById('opponent-hp-fill');
  
  playerFill.style.width = `${playerPercentage}%`;
  opponentFill.style.width = `${opponentPercentage}%`;
  
  // Update HP class for color
  playerFill.classList.remove('low', 'critical');
  opponentFill.classList.remove('low', 'critical');
  
  if (playerPercentage <= 20) {
    playerFill.classList.add('critical');
  } else if (playerPercentage <= 50) {
    playerFill.classList.add('low');
  }
  
  if (opponentPercentage <= 20) {
    opponentFill.classList.add('critical');
  } else if (opponentPercentage <= 50) {
    opponentFill.classList.add('low');
  }
  
  // Update HP text
  document.getElementById('player-hp-text').textContent = 
    `${Math.max(0, Math.round(battleState.playerHP))} / ${battleState.playerMaxHP}`;
  document.getElementById('opponent-hp-text').textContent = 
    `${Math.max(0, Math.round(battleState.opponentHP))} / ${battleState.opponentMaxHP}`;
}

function renderAttackButtons() {
  const container = document.getElementById('attack-buttons');
  
  if (!opponentPokemon || battleState.playerMoves.length === 0) {
    container.innerHTML = '<button class="attack-btn" disabled>Selecione um oponente</button>';
    return;
  }
  
  const playerType = currentPokemon?.types?.[0] || 'normal';
  
  container.innerHTML = battleState.playerMoves.map((move, index) => `
    <button 
      class="attack-btn type-${playerType}" 
      data-move-index="${index}"
      ${!battleState.playerTurn ? 'disabled' : ''}
    >
      ${move.name}
    </button>
  `).join('');
  
  // Add click handlers
  container.querySelectorAll('.attack-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (battleState.playerTurn && !btn.disabled) {
        const moveIndex = parseInt(btn.dataset.moveIndex);
        playerAttack(moveIndex);
      }
    });
  });
}

function calculateDamage(attacker, defender, move) {
  // Simplified damage formula inspired by Pokemon games
  const attackStat = attacker.stats?.find(s => s.name === 'attack')?.value || 50;
  const defenseStat = defender.stats?.find(s => s.name === 'defense')?.value || 50;
  const speedStat = attacker.stats?.find(s => s.name === 'speed')?.value || 50;
  
  // Base damage
  const level = 50; // Assume level 50
  const power = 40 + Math.random() * 20; // Random power 40-60
  
  // Damage formula (simplified)
  let damage = Math.floor(((2 * level / 5 + 2) * power * attackStat / defenseStat) / 50 + 2);
  
  // Random factor (85-100%)
  damage = Math.floor(damage * (0.85 + Math.random() * 0.15));
  
  // Critical hit (10% chance, 1.5x damage)
  const isCritical = Math.random() < 0.1;
  if (isCritical) {
    damage = Math.floor(damage * 1.5);
  }
  
  return { damage, isCritical };
}

async function playerAttack(moveIndex) {
  if (!battleState.playerTurn || !opponentPokemon) return;
  
  battleState.playerTurn = false;
  const move = battleState.playerMoves[moveIndex];
  
  // Disable buttons during attack
  document.querySelectorAll('.attack-btn').forEach(btn => btn.disabled = true);
  
  // Calculate damage
  const { damage, isCritical } = calculateDamage(currentPokemon, opponentPokemon, move);
  
  // Add battle log
  addBattleLog(`💥 ${currentPokemon.displayName} usou ${move.name}!`, 'player');
  if (isCritical) {
    addBattleLog('⚡ Golpe crítico!', 'critical');
  }
  
  // Animate attack
  await animateAttack(pokemonSprite, opponentSprite);
  
  // Apply damage
  battleState.opponentHP -= damage;
  addBattleLog(`${opponentPokemon.displayName} perdeu ${damage} HP!`, 'opponent');
  
  updateBattleHP();
  
  // Check if opponent fainted
  if (battleState.opponentHP <= 0) {
    battleState.opponentHP = 0;
    updateBattleHP();
    await delay(500);
    showBattleResult('victory');
    return;
  }
  
  // Opponent's turn after delay
  await delay(1000);
  opponentAttack();
}

async function opponentAttack() {
  if (!currentPokemon) return;
  
  // Random move selection
  const moveIndex = Math.floor(Math.random() * battleState.opponentMoves.length);
  const move = battleState.opponentMoves[moveIndex];
  
  // Calculate damage
  const { damage, isCritical } = calculateDamage(opponentPokemon, currentPokemon, move);
  
  // Add battle log
  addBattleLog(`💢 ${opponentPokemon.displayName} usou ${move.name}!`, 'opponent');
  if (isCritical) {
    addBattleLog('⚡ Golpe crítico!', 'critical');
  }
  
  // Animate attack
  await animateAttack(opponentSprite, pokemonSprite);
  
  // Apply damage
  battleState.playerHP -= damage;
  addBattleLog(`${currentPokemon.displayName} perdeu ${damage} HP!`, 'player');
  
  updateBattleHP();
  
  // Check if player fainted
  if (battleState.playerHP <= 0) {
    battleState.playerHP = 0;
    updateBattleHP();
    await delay(500);
    showBattleResult('defeat');
    return;
  }
  
  // Back to player's turn
  await delay(500);
  battleState.playerTurn = true;
  addBattleLog(`É a vez de ${currentPokemon.displayName}!`, 'player');
  
  // Re-enable attack buttons
  document.querySelectorAll('.attack-btn').forEach(btn => btn.disabled = false);
}

async function animateAttack(attacker, defender) {
  if (!attacker || !defender) return;
  
  const originalPos = attacker.position.clone();
  const targetPos = defender.position.clone();
  
  // Move towards target
  const direction = new THREE.Vector3().subVectors(targetPos, originalPos).normalize();
  const attackPos = originalPos.clone().add(direction.multiplyScalar(2));
  
  // Quick attack animation
  await animatePositionTo(attacker, attackPos, 150);
  
  // Flash defender
  if (defender.material) {
    defender.material.color.setHex(0xff0000);
    await delay(100);
    defender.material.color.setHex(0xffffff);
  }
  
  // Return to original position
  await animatePositionTo(attacker, originalPos, 200);
}

function animatePositionTo(sprite, targetPos, duration) {
  return new Promise(resolve => {
    const startPos = sprite.position.clone();
    const startTime = Date.now();
    
    function update() {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      
      sprite.position.lerpVectors(startPos, targetPos, easeOutCubic(t));
      
      if (t < 1) {
        requestAnimationFrame(update);
      } else {
        resolve();
      }
    }
    
    update();
  });
}

function addBattleLog(message, type = '') {
  const log = document.getElementById('battle-log');
  const entry = document.createElement('p');
  entry.className = `battle-log-entry ${type}`;
  entry.textContent = message;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
  
  // Keep only last 10 entries
  while (log.children.length > 10) {
    log.removeChild(log.firstChild);
  }
  
  battleState.battleLog.push({ message, type });
}

function showBattleResult(result) {
  const overlay = document.createElement('div');
  overlay.className = 'battle-result-overlay';
  
  if (result === 'victory') {
    overlay.innerHTML = `
      <div class="battle-result-icon">🏆</div>
      <h2 class="battle-result-title victory">Vitória!</h2>
      <p class="battle-result-subtitle">${currentPokemon.displayName} venceu a batalha!</p>
      <button class="battle-result-btn" id="battle-continue">Continuar</button>
    `;
  } else {
    overlay.innerHTML = `
      <div class="battle-result-icon">💔</div>
      <h2 class="battle-result-title defeat">Derrota!</h2>
      <p class="battle-result-subtitle">${currentPokemon.displayName} foi derrotado...</p>
      <button class="battle-result-btn" id="battle-continue">Tentar Novamente</button>
    `;
  }
  
  document.body.appendChild(overlay);
  
  document.getElementById('battle-continue').addEventListener('click', () => {
    overlay.remove();
    endBattle();
  });
}

function endBattle() {
  battleState.isActive = false;
  battleState.playerTurn = true;
  
  // Update UI
  document.body.classList.remove('battle-mode');
  const btn = document.getElementById('start-battle-mode');
  btn.classList.remove('active');
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <path d="M12 18v-6"></path>
      <path d="m9 15 3-3 3 3"></path>
    </svg>
    Modo Batalha
  `;
  
  // Hide battle panels
  document.getElementById('battle-panel').classList.add('hidden');
  document.getElementById('battle-controls').classList.add('hidden');
  document.getElementById('opponent-panel').classList.add('hidden');
  
  // Remove opponent sprite
  if (opponentSprite) {
    scene.remove(opponentSprite);
    if (opponentMaterial) opponentMaterial.dispose();
    opponentSprite = null;
    opponentMaterial = null;
  }
  opponentPokemon = null;
  
  // Reset player sprite position
  if (pokemonSprite) {
    pokemonSprite.position.set(0, POKEMON_SCALE / 2 + 0.5, 0);
  }
  
  // Reset battle log
  document.getElementById('battle-log').innerHTML = 
    '<p class="battle-log-entry">⚡ Selecione um oponente para iniciar a batalha!</p>';
  
  // Restore auto-rotate
  controls.autoRotate = isAutoRotating;
  
  // Reset camera
  animateCameraTo(0, 3, CAMERA_DISTANCE);
  
  showToast('Batalha encerrada!', 'success');
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// START
// ============================================

document.addEventListener('DOMContentLoaded', init);
