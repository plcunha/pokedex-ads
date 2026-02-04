/**
 * Pokédex Pro - E2E Tests
 * Complete user flow tests using Playwright
 */

import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display the Pokédex title', async ({ page }) => {
    await page.goto('/');
    
    // Should have main title
    await expect(page.locator('h1')).toContainText(/Pokédex/i);
  });

  test('should display a list of Pokémon', async ({ page }) => {
    await page.goto('/');
    
    // Should have Pokémon cards
    const pokemonCards = page.locator('[class*="pokemon"], [class*="card"], article');
    await expect(pokemonCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have a working search form', async ({ page }) => {
    await page.goto('/');
    
    // Should have search input
    const searchInput = page.locator('input[type="search"], input[type="text"], input[name="q"]').first();
    await expect(searchInput).toBeVisible();
  });

  test('should have pagination controls', async ({ page }) => {
    await page.goto('/');
    
    // Should have next/previous or page numbers
    const paginationLinks = page.locator('a[href*="page"], nav a, .pagination a');
    const count = await paginationLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should navigate to page 2', async ({ page }) => {
    await page.goto('/?page=2');
    
    // Page 2 should load with different Pokémon
    const url = page.url();
    expect(url).toContain('page=2');
    
    // Should still have content (page loaded successfully)
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

test.describe('Pokémon Search', () => {
  test('should search for a Pokémon by name', async ({ page }) => {
    await page.goto('/');
    
    // Find and fill search input
    const searchInput = page.locator('input[type="search"], input[type="text"], input[name="q"]').first();
    await searchInput.fill('pikachu');
    
    // Submit search
    await searchInput.press('Enter');
    
    // Should redirect to Pikachu detail or show results
    await page.waitForURL(/pokemon\/pikachu|search\?q=pikachu/i, { timeout: 10000 });
  });

  test('should handle search with partial name', async ({ page }) => {
    await page.goto('/search?q=char');
    
    // Should show search results or redirect
    await expect(page.locator('body')).toContainText(/char|Char/i);
  });

  test('should redirect to home when search is empty', async ({ page }) => {
    await page.goto('/search?q=');
    
    // Should redirect to home
    await page.waitForURL('/', { timeout: 5000 });
  });
});

test.describe('Pokémon Detail Page', () => {
  test('should display Pikachu details', async ({ page }) => {
    await page.goto('/pokemon/pikachu');
    
    // Should display Pikachu's name (first heading)
    await expect(page.locator('h1').first()).toContainText(/Pikachu/i);
  });

  test('should display Pokémon image', async ({ page }) => {
    await page.goto('/pokemon/pikachu');
    
    // Should have an image
    const image = page.locator('img[src*="pokemon"], img[alt*="Pikachu"], img[alt*="pikachu"]').first();
    await expect(image).toBeVisible({ timeout: 10000 });
  });

  test('should display Pokémon stats', async ({ page }) => {
    await page.goto('/pokemon/pikachu');
    
    // Should have stats like HP, Attack, etc.
    await expect(page.locator('body')).toContainText(/HP|Ataque|Attack/i);
  });

  test('should display Pokémon type', async ({ page }) => {
    await page.goto('/pokemon/pikachu');
    
    // Pikachu is Electric type
    await expect(page.locator('body')).toContainText(/electric|elétrico/i);
  });

  test('should display Pokémon abilities', async ({ page }) => {
    await page.goto('/pokemon/charizard');
    
    // Should have abilities section
    await expect(page.locator('body')).toContainText(/blaze|habilidade|abilities/i);
  });

  test('should have navigation back to home', async ({ page }) => {
    await page.goto('/pokemon/bulbasaur');
    
    // Should have a link back to home
    const homeLink = page.locator('a[href="/"], a[href*="home"], nav a').first();
    await expect(homeLink).toBeVisible();
  });

  test('should handle non-existent Pokémon', async ({ page }) => {
    const response = await page.goto('/pokemon/notarealpokemon');
    
    // Should return 404
    expect(response?.status()).toBe(404);
  });
});

test.describe('Navigation Flow', () => {
  test('should complete full user journey', async ({ page }) => {
    // Start at home
    await page.goto('/');
    await expect(page.locator('h1')).toContainText(/Pokédex/i);
    
    // Click on a Pokémon (first link to /pokemon/)
    const pokemonLink = page.locator('a[href*="/pokemon/"]').first();
    await pokemonLink.click();
    
    // Should be on detail page
    await page.waitForURL(/\/pokemon\//);
    await expect(page.locator('body')).toContainText(/HP|Ataque|Stats/i);
    
    // Navigate back to home
    const homeLink = page.locator('a[href="/"]').first();
    await homeLink.click();
    
    // Should be back at home
    await page.waitForURL('/');
    await expect(page.locator('h1')).toContainText(/Pokédex/i);
  });
});

test.describe('API Endpoints', () => {
  test('should return health status', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.status).toMatch(/ok|healthy/i);
  });
});
