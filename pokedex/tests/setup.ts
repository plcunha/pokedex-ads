/**
 * Test setup and global configurations
 */

import { beforeAll, afterAll, afterEach } from 'vitest';

// Clean up after each test
afterEach(() => {
  // Reset any mocks or state if needed
});

// Global setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
});

// Global teardown
afterAll(() => {
  // Cleanup resources if needed
});
