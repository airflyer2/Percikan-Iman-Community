import '@testing-library/jest-dom/vitest';

if (typeof window !== 'undefined') {
  try {
    const winStorage = window.localStorage;
    if (winStorage && globalThis.localStorage !== winStorage) {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        enumerable: true,
        value: winStorage,
        writable: true,
      });
    }
  } catch {
    const store = new Map<string, string>();
    const memoryStorage: Storage = {
      get length() {
        return store.size;
      },
      clear() {
        store.clear();
      },
      getItem(key: string) {
        return store.has(key) ? store.get(key)! : null;
      },
      key(index: number) {
        return Array.from(store.keys())[index] ?? null;
      },
      removeItem(key: string) {
        store.delete(key);
      },
      setItem(key: string, value: string) {
        store.set(String(key), String(value));
      },
    };
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      enumerable: true,
      value: memoryStorage,
      writable: true,
    });
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      enumerable: true,
      value: memoryStorage,
      writable: true,
    });
  }
}
