import type { Metadata } from "next";
import { LEGAL_DOCS } from "@/lib/legal/generated";
import { renderMarkdown } from "@/lib/legal/markdown";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Terms & Policies" };

export default function TermsPage() {
  const docs = LEGAL_DOCS.filter((d) => d.slug !== "home-exchange-agreement");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold text-navy">Terms & Policies</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        These documents govern your use of Redormi. Switch Members also agree to the separate{" "}
        <a href="/legal/switch-agreement" className="font-semibold text-coral hover:underline">
          Home Exchange Agreement
        </a>
        .
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Policy sections" className="hidden lg:block">
          <ul className="sticky top-24 flex flex-col gap-1 text-sm">
            {docs.map((d) => (
              <li key={d.slug}>
                <a href={`#${d.slug}`} className="block rounded-lg px-3 py-1.5 text-navy/70 hover:bg-navy/8 hover:text-navy">
                  {d.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-14">
          {docs.map((d) => (
            <article key={d.slug} id={d.slug} className="scroll-mt-24 border-b border-navy/10 pb-10 last:border-0">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-2xl font-extrabold text-navy">{d.title}</h2>
                <p className="text-xs text-ink/50">
                  Version {d.version} · Effective {formatDate(d.effectiveDate)}
                </p>
              </div>
              <div className="flex flex-col gap-4">{renderMarkdown(d.body)}</div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
