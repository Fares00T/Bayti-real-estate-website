// localStorage that degrades to memory (private windows, Node tests).
const memory = new Map();

const available = (() => {
  try {
    const k = "__bayti_demo_probe__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
})();

export const store = {
  get(key) {
    try {
      return available ? localStorage.getItem(key) : memory.get(key) ?? null;
    } catch {
      return memory.get(key) ?? null;
    }
  },
  set(key, value) {
    memory.set(key, value);
    if (!available) return true;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err) {
      console.warn("Demo storage is full; changes stay in this tab only.", err);
      return false;
    }
  },
  remove(key) {
    memory.delete(key);
    try {
      if (available) localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
