function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  const storage = {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? (map.get(key) as string) : null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(String(key), String(value));
    },
  };
  return storage as unknown as Storage;
}

// Node 22+ (e 26) expõe localStorage/sessionStorage globais que, sem
// --localstorage-file, ficam undefined e sombreiam o storage do jsdom
// (window === globalThis no ambiente de teste). Instalamos um Storage em
// memória quando ausente para manter os testes de componente determinísticos.
if (typeof globalThis.localStorage === "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    value: createMemoryStorage(),
    configurable: true,
    writable: true,
  });
}

if (typeof globalThis.sessionStorage === "undefined") {
  Object.defineProperty(globalThis, "sessionStorage", {
    value: createMemoryStorage(),
    configurable: true,
    writable: true,
  });
}
