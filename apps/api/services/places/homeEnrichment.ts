export type CoreContactRestaurant = {
  imageUrl?: string | null;
  rating?: string | null;
  address?: string | null;
  phone?: string | null;
  photos?: string[] | null;
};

export function hasCoreContactData(restaurant: CoreContactRestaurant): boolean {
  const hasImage = Boolean(restaurant.imageUrl?.trim());
  const hasRating = Boolean(restaurant.rating?.trim()) && restaurant.rating !== "N/A";
  const hasAddress = Boolean(restaurant.address?.trim()) && restaurant.address !== "N/A";
  const hasPhone = Boolean(restaurant.phone?.trim());
  const hasPhotos = Array.isArray(restaurant.photos) && restaurant.photos.length > 0;
  return hasImage && hasRating && hasAddress && hasPhone && hasPhotos;
}

export class HomeEnrichmentDebouncer {
  private readonly locks = new Map<string, { running: boolean; lastStartedAt: number }>();

  constructor(private readonly debounceMs: number) {}

  shouldStart(tileKey: string, now = Date.now()): boolean {
    const lock = this.locks.get(tileKey);
    if (lock?.running) return false;
    if (lock && now - lock.lastStartedAt < this.debounceMs) return false;
    this.locks.set(tileKey, { running: true, lastStartedAt: now });
    return true;
  }

  markFinished(tileKey: string, now = Date.now()): void {
    this.locks.set(tileKey, { running: false, lastStartedAt: now });
  }
}
