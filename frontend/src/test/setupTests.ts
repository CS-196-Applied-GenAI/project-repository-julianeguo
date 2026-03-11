import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "node:util";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).ResizeObserver = ResizeObserverMock;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).TextEncoder = TextEncoder;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).TextDecoder = TextDecoder;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).URL.createObjectURL = jest.fn(() => "blob:preview-avatar");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).URL.revokeObjectURL = jest.fn();
