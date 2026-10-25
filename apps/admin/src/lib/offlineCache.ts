/**
 * RR Cafe Offline Cache Manager (WhatsApp-style persistence)
 * - Stores app data locally in localStorage with automatic trimming
 * - Serves instant UI data even when disconnected
 * - Automatically synchronizes with Supabase when online
 */

export const CACHE_KEYS = {
  LIVE_ORDERS: 'rr_cache_live_orders',
  ORDERS_HISTORY: 'rr_cache_orders_history',
  MENU_ITEMS: 'rr_cache_menu_items',
  CATEGORIES: 'rr_cache_categories',
  PRICING_CONFIG: 'rr_cache_pricing_config',
  PARTNERS: 'rr_cache_partners',
  LAST_SYNC: 'rr_cache_last_sync',
};

export function getCached<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed.data !== undefined ? parsed.data : parsed;
  } catch (e) {
    console.warn(`[offlineCache] Failed to read ${key}:`, e);
    return fallback;
  }
}

export function setCached<T>(key: string, data: T, maxItems?: number): void {
  try {
    let payload = data;
    if (Array.isArray(data) && maxItems && data.length > maxItems) {
      payload = data.slice(0, maxItems) as unknown as T;
    }
    const record = {
      data: payload,
      updatedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(record));
    localStorage.setItem(CACHE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (e) {
    console.warn(`[offlineCache] Storage quota or write error for ${key}:`, e);
    // If quota exceeded, clear non-critical history cache
    try {
      localStorage.removeItem(CACHE_KEYS.ORDERS_HISTORY);
      localStorage.setItem(key, JSON.stringify({ data, updatedAt: Date.now() }));
    } catch {
      // ignore
    }
  }
}

export function isDeviceOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
