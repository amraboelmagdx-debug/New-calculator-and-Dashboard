const STORAGE_KEY = 'recentServices';
const MAX_RECENT = 5;

export function getRecentServices() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(v => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function recordRecentService(name) {
  if (typeof window === 'undefined' || !name) return getRecentServices();
  const current = getRecentServices().filter(v => v !== name);
  const next = [name, ...current].slice(0, MAX_RECENT);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / unavailable storage */
  }
  return next;
}
