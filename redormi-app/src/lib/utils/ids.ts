let counter = 0;

/** Deterministic-ish id generator for mock data / mock services (no crypto needed). */
export function makeId(prefix: string): string {
  counter += 1;
  return `${prefix}_${counter.toString(36)}`;
}

export function seededPhoto(seed: string, w = 900, h = 600): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

export function avatarFor(seed: number): string {
  const n = ((seed - 1) % 70) + 1;
  return `https://i.pravatar.cc/150?img=${n}`;
}
