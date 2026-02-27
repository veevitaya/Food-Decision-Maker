import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "toast_saved_restaurants";

export type SaveBucket = "mine" | "partner";

export interface SavedData {
  mine: number[];
  partner: number[];
}

function getStoredData(): SavedData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { mine: [], partner: [] };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { mine: parsed, partner: [] };
    }
    return { mine: parsed.mine || [], partner: parsed.partner || [] };
  } catch {
    return { mine: [], partner: [] };
  }
}

let subscribers = new Set<() => void>();
let snapshot = getStoredData();

function notify() {
  snapshot = getStoredData();
  subscribers.forEach(cb => cb());
}

function persistAndNotify(data: SavedData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  notify();
}

function subscribe(listener: () => void) {
  subscribers.add(listener);
  return () => { subscribers.delete(listener); };
}

function getSnapshot() {
  return snapshot;
}

export function useSavedRestaurants() {
  const data = useSyncExternalStore(subscribe, getSnapshot);

  const isSaved = useCallback((id: number): boolean => {
    return data.mine.includes(id) || data.partner.includes(id);
  }, [data]);

  const getBucket = useCallback((id: number): SaveBucket | null => {
    if (data.mine.includes(id)) return "mine";
    if (data.partner.includes(id)) return "partner";
    return null;
  }, [data]);

  const saveToMine = useCallback((id: number) => {
    const current = getStoredData();
    if (current.mine.includes(id)) return;
    current.partner = current.partner.filter(i => i !== id);
    current.mine = [...current.mine, id];
    persistAndNotify(current);
  }, []);

  const saveToPartner = useCallback((id: number) => {
    const current = getStoredData();
    if (current.partner.includes(id)) return;
    current.mine = current.mine.filter(i => i !== id);
    current.partner = [...current.partner, id];
    persistAndNotify(current);
  }, []);

  const unsave = useCallback((id: number) => {
    const current = getStoredData();
    current.mine = current.mine.filter(i => i !== id);
    current.partner = current.partner.filter(i => i !== id);
    persistAndNotify(current);
  }, []);

  return {
    data,
    isSaved,
    getBucket,
    saveToMine,
    saveToPartner,
    unsave,
    mineCount: data.mine.length,
    partnerCount: data.partner.length,
  };
}
