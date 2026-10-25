/** Minimal synchronous event bus shared by all modules (see ARCHITECTURE.md for event list). */
export function createBus() {
  const handlers = new Map();
  return {
    on(type, fn) {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type).add(fn);
      return () => handlers.get(type).delete(fn);
    },
    emit(type, payload) {
      const set = handlers.get(type);
      if (set) for (const fn of [...set]) fn(payload);
    },
  };
}
