import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Static SVG components: no localStorage / ResizeObserver / scrollIntoView
// shims needed (unlike the interaction drop-ins). Just unmount between tests.
afterEach(() => {
  cleanup();
});
