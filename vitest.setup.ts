class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.data.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(String(key), String(value));
  }
}

function ensureStorageMethods(storage: Storage | undefined): Storage {
  if (
    storage &&
    typeof storage.clear === "function" &&
    typeof storage.removeItem === "function" &&
    typeof storage.getItem === "function" &&
    typeof storage.setItem === "function"
  ) {
    return storage;
  }
  return new MemoryStorage();
}

const safeStorage = ensureStorageMethods(globalThis.localStorage);

Object.defineProperty(globalThis, "localStorage", {
  value: safeStorage,
  configurable: true,
});

if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    value: safeStorage,
    configurable: true,
  });
}
