import { SITE } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-black/5 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-10 text-sm text-nexis-dark/60 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>© {new Date().getFullYear()} {SITE.brandName}. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="/privacy" className="hover:text-nexis-primary">Privacy Policy</a>
          <a href="/terms" className="hover:text-nexis-primary">Terms</a>
        </div>
      </div>
    </footer>
  );
}
