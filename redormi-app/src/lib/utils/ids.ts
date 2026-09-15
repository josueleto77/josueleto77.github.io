let counter = 0;

/**
 * Id generator for mock data / mock services (no crypto needed). Mixes in
 * the current time so a freshly-created id can't collide with the
 * low-numbered, hardcoded ids used throughout src/lib/data/*.ts (th_1,
 * off_1, bk_1, ...) — a plain incrementing counter starting at 0 would
 * produce exactly those on a fresh page load, silently merging a new
 * thread/offer/booking into an unrelated seed record with the same id.
 */
export function makeId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}

export function seededPhoto(seed: string, w = 900, h = 600): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

export function avatarFor(seed: number): string {
  const n = ((seed - 1) % 70) + 1;
  return `https://i.pravatar.cc/150?img=${n}`;
}
