/**
 * Setup globale per i test Vitest
 * Questo file viene eseguito prima di ogni suite di test
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup automatico dopo ogni test
afterEach(() => {
  cleanup();
});

// Mock di eventuali API browser non disponibili in jsdom
if (typeof window !== 'undefined') {
  global.matchMedia = global.matchMedia || function() {
    return {
      matches: false,
      addListener: () => {},
      removeListener: () => {},
    };
  };
}
