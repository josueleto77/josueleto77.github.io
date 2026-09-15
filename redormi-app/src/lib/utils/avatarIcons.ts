// Simple, original, offline-safe avatars for signup's "pick an avatar" step.
// Each is a flat two-tone SVG (a filled circle background + a small glyph),
// inlined as a data URI so it never depends on an external image service.

interface AvatarGlyph {
  id: string;
  label: string;
  // Uses {fg}/{bg} as color placeholders so the same glyph can be recolored.
  svg: string;
}

const GLYPHS: AvatarGlyph[] = [
  {
    id: "star",
    label: "Star",
    svg: `<path d="M32 6 L38 24 L57 24 L42 35 L48 54 L32 43 L16 54 L22 35 L7 24 L26 24 Z" fill="{fg}"/>`,
  },
  {
    id: "sun",
    label: "Sun",
    svg: `<circle cx="32" cy="32" r="13" fill="{fg}"/><g stroke="{fg}" stroke-width="4" stroke-linecap="round">
      <line x1="32" y1="4" x2="32" y2="12"/><line x1="32" y1="52" x2="32" y2="60"/>
      <line x1="4" y1="32" x2="12" y2="32"/><line x1="52" y1="32" x2="60" y2="32"/>
      <line x1="12" y1="12" x2="17.5" y2="17.5"/><line x1="46.5" y1="46.5" x2="52" y2="52"/>
      <line x1="52" y1="12" x2="46.5" y2="17.5"/><line x1="17.5" y1="46.5" x2="12" y2="52"/>
    </g>`,
  },
  {
    id: "cloud",
    label: "Cloud",
    svg: `<ellipse cx="26" cy="37" rx="15" ry="10" fill="{fg}"/><circle cx="20" cy="28" r="9" fill="{fg}"/>
      <circle cx="32" cy="24" r="11" fill="{fg}"/><circle cx="43" cy="30" r="8" fill="{fg}"/>
      <ellipse cx="35" cy="38" rx="16" ry="9" fill="{fg}"/>`,
  },
  {
    id: "mountain",
    label: "Mountain",
    svg: `<path d="M4 48 L22 18 L34 36 L42 24 L60 48 Z" fill="{fg}"/><circle cx="47" cy="15" r="5" fill="{accent}"/>`,
  },
  {
    id: "moon",
    label: "Moon",
    svg: `<circle cx="29" cy="32" r="17" fill="{fg}"/><circle cx="38" cy="25" r="14" fill="{bg}"/>`,
  },
  {
    id: "wave",
    label: "Wave",
    svg: `<path d="M4 30 Q14 18 24 30 T44 30 T64 30" stroke="{fg}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M4 42 Q14 34 24 42 T44 42 T64 42" stroke="{fg}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.55"/>`,
  },
  {
    id: "leaf",
    label: "Leaf",
    svg: `<path d="M14 50 C14 20 50 14 50 14 C50 14 44 50 14 50 Z" fill="{fg}"/>
      <path d="M18 46 C28 36 38 26 46 18" stroke="{bg}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  },
  {
    id: "heart",
    label: "Heart",
    svg: `<path d="M32 52 C10 36 6 22 16 14 C24 8 32 14 32 20 C32 14 40 8 48 14 C58 22 54 36 32 52 Z" fill="{fg}"/>`,
  },
];

// bg/fg pairs pulled from the brand palette (see globals.css), cycled across glyphs.
const PALETTE: { bg: string; fg: string; accent: string }[] = [
  { bg: "#172A3A", fg: "#F7F4EE", accent: "#C24B2E" }, // navy bg, cream glyph
  { bg: "#C24B2E", fg: "#F7F4EE", accent: "#F7F4EE" }, // coral bg, cream glyph
  { bg: "#A8B5A2", fg: "#172A3A", accent: "#C24B2E" }, // sage bg, navy glyph
  { bg: "#F7F4EE", fg: "#C24B2E", accent: "#172A3A" }, // cream bg, coral glyph
];

function toDataUri(glyph: AvatarGlyph, bg: string, fg: string, accent: string): string {
  const inner = glyph.svg.replaceAll("{fg}", fg).replaceAll("{bg}", bg).replaceAll("{accent}", accent);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${bg}"/>${inner}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export interface AvatarOption {
  id: string;
  label: string;
  src: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = GLYPHS.map((glyph, i) => {
  const { bg, fg, accent } = PALETTE[i % PALETTE.length];
  return { id: glyph.id, label: glyph.label, src: toDataUri(glyph, bg, fg, accent) };
});

export function avatarById(id: string): string {
  return AVATAR_OPTIONS.find((o) => o.id === id)?.src ?? AVATAR_OPTIONS[0].src;
}
