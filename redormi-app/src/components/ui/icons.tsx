import type { SVGProps } from "react";

export type IconName =
  | "search" | "heart" | "heart-filled" | "star" | "flame" | "chevron-left" | "chevron-right"
  | "chevron-down" | "chevron-up" | "calendar" | "users" | "bed" | "bath" | "home" | "shield-check"
  | "message" | "check" | "check-circle" | "x" | "upload" | "camera" | "car" | "map-pin" | "clock"
  | "phone" | "mail" | "lock" | "sparkles" | "arrow-right" | "plus" | "minus" | "filter" | "grid"
  | "list" | "credit-card" | "menu" | "wifi" | "kitchen" | "washer" | "ac" | "heating" | "desk"
  | "tv" | "pool" | "hot-tub" | "parking" | "water" | "patio" | "bbq" | "garden" | "gym" | "fireplace"
  | "elevator" | "pet" | "ev" | "smoke" | "co" | "first-aid" | "camera-security" | "info" | "alert"
  | "image" | "send" | "trash" | "edit" | "bell" | "logout" | "kayak" | "bike" | "route" | "layers"
  | "handshake" | "scale" | "download" | "external-link" | "tag";

const paths: Record<IconName, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  heart: <path d="M12 20s-7-4.4-9.5-9A5.5 5.5 0 0 1 12 5.5 5.5 5.5 0 0 1 21.5 11c-2.5 4.6-9.5 9-9.5 9Z" />,
  "heart-filled": <path fill="currentColor" stroke="none" d="M12 20s-7-4.4-9.5-9A5.5 5.5 0 0 1 12 5.5 5.5 5.5 0 0 1 21.5 11c-2.5 4.6-9.5 9-9.5 9Z" />,
  star: <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.1 6.5L12 17.3 6.2 20.5l1.1-6.5-4.8-4.6 6.6-.9L12 2.5Z" />,
  flame: <path d="M12 2s5 4.5 5 9.5A5 5 0 1 1 7 11.5c0-1 .3-2 .8-2.9.4.9 1.2 1.4 1.9 1 .1-2.4 1-4.8 2.3-6.6Z" />,
  "chevron-left": <path d="M15 6l-6 6 6 6" />,
  "chevron-right": <path d="M9 6l6 6-6 6" />,
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  "chevron-up": <path d="M6 15l6-6 6 6" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17.5" cy="9" r="2.6" /><path d="M15 13.5a5.5 5.5 0 0 1 6.8 5.3" /></>,
  bed: <><path d="M2 19v-7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v7M2 19v2M22 19v2M2 15h20" /><rect x="4" y="9" width="7" height="4" rx="1" /></>,
  bath: <><path d="M4 12V6a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v1" /><path d="M2 12h20v2a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5v-2Z" /><path d="M6 19v2M18 19v2" /></>,
  home: <path d="M3 11l9-8 9 8M5 10v10h14V10" />,
  "shield-check": <><path d="M12 2l8 3.5v6c0 4.9-3.4 8.7-8 10.5-4.6-1.8-8-5.6-8-10.5v-6L12 2Z" /><path d="M8.5 12l2.5 2.5L15.5 9" /></>,
  message: <path d="M21 11.5a8.5 8.5 0 1 1-3.6-6.9L21 3l-1.2 4.1c.8 1.3 1.2 2.8 1.2 4.4Z" />,
  check: <path d="M4 12l5 5L20 6" />,
  "check-circle": <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9.5" /></>,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></>,
  camera: <><path d="M4 8h3l2-2h6l2 2h3v11H4Z" /><circle cx="12" cy="13.5" r="3.3" /></>,
  car: <><path d="M4 16V11l2-5h12l2 5v5" /><path d="M2 16h20M6 16v2M18 16v2" /><circle cx="7" cy="16" r="1.4" /><circle cx="17" cy="16" r="1.4" /></>,
  "map-pin": <><path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" /><circle cx="12" cy="10" r="2.4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  phone: <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1.3 1.3 0 0 1 1.3-.3c1.2.4 2.5.6 3.8.6.7 0 1.3.6 1.3 1.3V21c0 .7-.6 1.3-1.3 1.3C11.7 22.3 1.7 12.3 1.7 3.6.7 3.6 1.3 3 2 3h3.7c.7 0 1.3.6 1.3 1.3 0 1.3.2 2.6.6 3.8.1.4 0 1-.3 1.3l-2.1 2.2Z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  lock: <><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  sparkles: <path d="M12 3l1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3ZM19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />,
  "arrow-right": <path d="M4 12h16M13 5l7 7-7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  filter: <path d="M4 5h16l-6.5 8v6l-3 1.5v-7.5L4 5Z" />,
  grid: <><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="3.5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="3.5" cy="18" r="1" fill="currentColor" stroke="none" /></>,
  "credit-card": <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  wifi: <><path d="M2 8.5a16 16 0 0 1 20 0" /><path d="M5.5 12.5a11 11 0 0 1 13 0" /><path d="M9 16.3a5.8 5.8 0 0 1 6 0" /><circle cx="12" cy="19.5" r="1" fill="currentColor" stroke="none" /></>,
  kitchen: <><path d="M4 3v18M4 8h4M4 3h16v18H10" /><circle cx="15" cy="8" r="1" fill="currentColor" stroke="none" /></>,
  washer: <><rect x="4" y="3" width="16" height="18" rx="2" /><circle cx="12" cy="13" r="4.5" /><path d="M8 6.5h.01M11 6.5h.01" /></>,
  ac: <><rect x="2" y="6" width="20" height="7" rx="2" /><path d="M6 17v2M10 17v3M14 17v2M18 17v3" /></>,
  heating: <path d="M6 3s-2 2.5-2 5a2 2 0 0 0 4 0c0-1-.5-1.8-1-2.5M14 3s-2 2.5-2 5a2 2 0 0 0 4 0c0-1-.5-1.8-1-2.5M4 21c0-2 1.5-3 4-3s4 1 4 1 1.5-1 4-1 4 1 4 3" />,
  desk: <><path d="M3 13h18M5 13V6h14v7M5 13v6M19 13v6M9 6V4M15 6V4" /></>,
  tv: <><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M9 21h6M12 17v4" /></>,
  pool: <><path d="M3 17c1.5 1 2.5 1 4 0s2.5-1 4 0 2.5 1 4 0 2.5-1 4 0" /><path d="M6 13V6a2 2 0 0 1 2-2h1M18 13V9" /></>,
  "hot-tub": <><circle cx="12" cy="12" r="9" /><path d="M8 12c0-1.5 1.5-1.5 1.5-3S8 6.5 8 5M16 12c0-1.5 1.5-1.5 1.5-3S16 6.5 16 5" /></>,
  parking: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 16V7h4a3 3 0 0 1 0 6H9" /></>,
  water: <path d="M12 3s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11Z" />,
  patio: <><path d="M3 9l9-6 9 6" /><path d="M5 9v10M19 9v10M3 9h18" /></>,
  bbq: <><path d="M6 12a6 6 0 0 0 12 0Z" /><path d="M12 12V4M9 4c0 1.5 1 1.5 1 3M15 4c0 1.5-1 1.5-1 3" /><path d="M8 20l1-4M16 20l-1-4" /></>,
  garden: <><path d="M12 21V10" /><path d="M12 10c0-3-2-5-5-5 0 3 2 5 5 5ZM12 10c0-3 2-5 5-5 0 3-2 5-5 5Z" /></>,
  gym: <><path d="M2 12h2M20 12h2M5 9v6M19 9v6" /><rect x="6" y="8" width="3" height="8" rx="1" /><rect x="15" y="8" width="3" height="8" rx="1" /><path d="M9 12h6" /></>,
  fireplace: <><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M12 8s-2.5 2.5-2.5 4.5a2.5 2.5 0 0 0 5 0C14.5 10.5 12 8 12 8Z" /></>,
  elevator: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M10 9l2-2 2 2M10 15l2 2 2-2" /></>,
  pet: <><circle cx="7" cy="8" r="1.6" /><circle cx="12" cy="6" r="1.6" /><circle cx="17" cy="8" r="1.6" /><circle cx="19" cy="12.5" r="1.6" /><path d="M12 21c-3.5 0-6-1.8-6-4.4 0-2 1.8-3.6 3-4.6 1-.8 1.6-1.5 3-1.5s2 .7 3 1.5c1.2 1 3 2.6 3 4.6 0 2.6-2.5 4.4-6 4.4Z" /></>,
  ev: <><rect x="3" y="9" width="13" height="8" rx="2" /><path d="M16 12h2l2 2v3h-4" /><circle cx="7.5" cy="18.5" r="1.3" /><circle cx="16.5" cy="18.5" r="1.3" /><path d="M9 9V6h4l-1 3" /></>,
  smoke: <><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></>,
  co: <><circle cx="12" cy="12" r="9" /><path d="M8 15V9M12 15V9M16 15V9" /></>,
  "first-aid": <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" /><path d="M12 10v6M9 13h6" /></>,
  "camera-security": <><path d="M3 8l6-2 6 2v5c0 4-3 6.5-6 7.5-3-1-6-3.5-6-7.5V8Z" /><circle cx="9" cy="10.5" r="1.6" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5h.01" /></>,
  alert: <><path d="M12 3l10 18H2L12 3Z" /><path d="M12 10v4M12 17h.01" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="M4 17l5-5 4 4 3-3 4 4" /></>,
  send: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7Z" />,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" /></>,
  edit: <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z" />,
  bell: <><path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" /><path d="M10 19a2 2 0 0 0 4 0" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>,
  kayak: <><path d="M2 14c3-3 17-3 20 0M4 12l16-8M20 12L4 20" /></>,
  bike: <><circle cx="6" cy="17" r="3.3" /><circle cx="18" cy="17" r="3.3" /><path d="M6 17l4-9h4l3 5M10 8h4M9.5 17H16l-3-8" /></>,
  route: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M6 16c0-6 4-4 6-8s6-2 6-2" /></>,
  layers: <><path d="M12 3l9 5-9 5-9-5 9-5Z" /><path d="M3 13l9 5 9-5" /></>,
  handshake: <><path d="M2 12l5-4 4 2 3-2 4 3-4 5-3-1-4 2-5-2Z" /><path d="M11 10l3 4M14 8l3 4" /></>,
  scale: <><path d="M12 3v18M6 8l-3.5 6a3.5 3.5 0 0 0 7 0L6 8ZM18 8l-3.5 6a3.5 3.5 0 0 0 7 0L18 8ZM4 8h4M16 8h4M8 21h8" /></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5" /><path d="M5 21h14" /></>,
  "external-link": <><path d="M14 4h6v6M20 4L10 14" /><path d="M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" /></>,
  tag: <><path d="M12.6 2.6l7.8 7.8a2 2 0 0 1 0 2.8l-7.4 7.4a2 2 0 0 1-2.8 0L2.6 12.9a2 2 0 0 1-.6-1.4V4.4A1.8 1.8 0 0 1 3.8 2.6h7a2 2 0 0 1 1.8 0Z" /><circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" /></>,
};

export default function Icon({ name, className = "h-5 w-5", ...rest }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
