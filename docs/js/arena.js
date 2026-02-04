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
let currentPokemon = null;
let allPokemons = [];
let isAutoRotating = true;
let animationId = null;

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
// START
// ============================================

document.addEventListener('DOMContentLoaded', init);
