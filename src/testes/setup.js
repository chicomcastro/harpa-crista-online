import '@testing-library/jest-dom/vitest';
import { vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/svelte';

// crypto.randomUUID não existe no jsdom antigo; playlists.create depende dele.
if (!globalThis.crypto?.randomUUID) {
  globalThis.crypto = { ...globalThis.crypto, randomUUID: () => `uuid-${Math.random().toString(36).slice(2)}` };
}

// jsdom não implementa matchMedia, e createDarkMode consulta prefers-color-scheme na importação.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn()
  });
}

// scrollTo/scrollBy são usados pela rolagem automática e pela navegação entre hinos.
window.scrollTo = window.scrollTo || vi.fn();
window.scrollBy = window.scrollBy || vi.fn();

// Sem `globals: true` o testing-library não registra o cleanup automático, e os componentes de um
// teste ficam no DOM do seguinte ("Found multiple elements with the role combobox").
afterEach(() => cleanup());

// Nem o IntersectionObserver nem o ResizeObserver existem no jsdom; a página do hino usa o
// primeiro para esconder o título no mini header sticky.
class ObservadorVazio {
  observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
}
globalThis.IntersectionObserver = globalThis.IntersectionObserver || ObservadorVazio;
globalThis.ResizeObserver = globalThis.ResizeObserver || ObservadorVazio;

// A rolagem automática roda em requestAnimationFrame; sem isso o jsdom só avisa num warning.
globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || ((cb) => setTimeout(() => cb(performance.now()), 16));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || clearTimeout;
