import type { Metadata } from "next";
import Icon from "@/components/ui/icons";
import { getLegalDoc } from "@/lib/legal/generated";
import { renderMarkdown } from "@/lib/legal/markdown";
import { SWITCH_DOCS } from "@/lib/legal/registry";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Home Exchange Agreement" };

export default function SwitchAgreementPage() {
  const docs = SWITCH_DOCS.map((d) => getLegalDoc(d.slug)!);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sage px-3 py-1 text-xs font-bold text-navy">
        <Icon name="sparkles" className="h-3.5 w-3.5" />
        Redormi Switch
      </span>
      {docs.map((doc, i) => (
        <article key={doc.slug} className={i > 0 ? "mt-12 border-t border-navy/10 pt-10" : ""}>
          <h1 className="mt-4 text-3xl font-extrabold text-navy">{doc.title}</h1>
          <p className="mt-2 text-xs text-ink/50">
            Version {doc.version} · Effective {formatDate(doc.effectiveDate)}
          </p>
          <div className="mt-8 flex flex-col gap-4">{renderMarkdown(doc.body)}</div>
        </article>
      ))}
    </div>
  );
}
