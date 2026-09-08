import Link from "next/link";
import Icon, { type IconName } from "@/components/ui/icons";

const CATEGORIES: { label: string; icon: IconName; href: string }[] = [
  { label: "Houses", icon: "home", href: "/search?type=house" },
  { label: "Apartments", icon: "elevator", href: "/search?type=apartment" },
  { label: "Villas", icon: "garden", href: "/search?type=villa" },
  { label: "Cabins", icon: "fireplace", href: "/search?type=cabin" },
  { label: "Studios", icon: "bed", href: "/search?type=studio" },
  { label: "Lofts", icon: "layers", href: "/search?type=loft" },
  { label: "Pools", icon: "pool", href: "/search?amenity=pool" },
  { label: "Pet friendly", icon: "pet", href: "/search?amenity=pet_friendly" },
  { label: "Switch homes", icon: "sparkles", href: "/switch" },
];

export default function CategoryRow() {
  return (
    <nav aria-label="Browse by category" className="border-b border-navy/10 bg-white">
      <div className="scrollbar-thin mx-auto flex max-w-7xl gap-7 overflow-x-auto px-4 py-4 sm:px-6">
        {CATEGORIES.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="group flex shrink-0 flex-col items-center gap-2 text-navy/60 transition-colors hover:text-navy"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cream text-navy/70 transition-colors group-hover:bg-coral/10 group-hover:text-coral">
              <Icon name={c.icon} className="h-5 w-5" />
            </span>
            <span className="whitespace-nowrap text-xs font-semibold">{c.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
