import Link from "next/link";
import { SITE } from "@/lib/config";

export function SiteHeader() {
  return (
    <header className="w-full">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-xl sm:text-2xl text-nexis-dark">{SITE.brandName}</span>
        </Link>
        <span className="font-display text-sm sm:text-base tracking-widest text-nexis-primary">
          {SITE.productName}
        </span>
      </div>
    </header>
  );
}
