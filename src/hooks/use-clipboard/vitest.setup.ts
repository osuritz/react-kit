import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom does not implement document.execCommand; define a stub so vi.spyOn
// can override it in individual tests.
if (typeof document !== 'undefined' && typeof document.execCommand !== 'function') {
  Object.defineProperty(document, 'execCommand', {
    value: () => false,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  // Restore execCommand in case a test set it to undefined via defineProperty.
  if (typeof document !== 'undefined' && typeof document.execCommand !== 'function') {
    Object.defineProperty(document, 'execCommand', {
      value: () => false,
      configurable: true,
      writable: true,
    });
  }
});
