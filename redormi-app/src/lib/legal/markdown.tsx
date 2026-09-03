import type { ReactNode } from "react";

function inline(text: string, key: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={`${key}-${i}`}>{part}</span>
    )
  );
}

/** Minimal, dependency-free markdown renderer for legal docs (#, ##, -, 1., **bold**, paragraphs). */
export function renderMarkdown(md: string): ReactNode[] {
  const lines = md.split("\n");
  const blocks: ReactNode[] = [];
  let listBuffer: string[] = [];
  let listOrdered = false;
  let paragraphBuffer: string[] = [];

  function flushList() {
    if (listBuffer.length === 0) return;
    const ListTag = listOrdered ? "ol" : "ul";
    blocks.push(
      <ListTag key={`list-${blocks.length}`} className={listOrdered ? "list-decimal pl-5 space-y-1" : "list-disc pl-5 space-y-1"}>
        {listBuffer.map((item, i) => (
          <li key={i}>{inline(item, `li-${blocks.length}-${i}`)}</li>
        ))}
      </ListTag>
    );
    listBuffer = [];
  }

  function flushParagraph() {
    if (paragraphBuffer.length === 0) return;
    const text = paragraphBuffer.join(" ");
    blocks.push(
      <p key={`p-${blocks.length}`} className="text-sm leading-relaxed text-ink/80">
        {inline(text, `p-${blocks.length}`)}
      </p>
    );
    paragraphBuffer = [];
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }
    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push(
        <h3 key={`h3-${blocks.length}`} className="mt-5 text-base font-bold text-navy">
          {inline(line.slice(4), `h3-${blocks.length}`)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push(
        <h2 key={`h2-${blocks.length}`} className="mt-8 text-xl font-extrabold text-navy">
          {inline(line.slice(3), `h2-${blocks.length}`)}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      flushParagraph();
      flushList();
      blocks.push(
        <h1 key={`h1-${blocks.length}`} className="text-2xl font-extrabold text-navy">
          {inline(line.slice(2), `h1-${blocks.length}`)}
        </h1>
      );
    } else if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      if (listOrdered) flushList();
      listOrdered = false;
      listBuffer.push(line.replace(/^[-*]\s+/, ""));
    } else if (/^\d+\.\s+/.test(line)) {
      flushParagraph();
      if (!listOrdered) flushList();
      listOrdered = true;
      listBuffer.push(line.replace(/^\d+\.\s+/, ""));
    } else {
      flushList();
      paragraphBuffer.push(line);
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

export interface ParsedLegalDoc {
  slug: string;
  title: string;
  version: string;
  effectiveDate: string;
  summary: string;
  body: string;
}

export function parseLegalMarkdown(raw: string): ParsedLegalDoc {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { slug: "unknown", title: "Untitled", version: "1.0", effectiveDate: "", summary: "", body: raw };
  }
  const [, frontmatter, body] = match;
  const meta: Record<string, string> = {};
  frontmatter.split("\n").forEach((line) => {
    const idx = line.indexOf(":");
    if (idx === -1) return;
    meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  });
  return {
    slug: meta.slug ?? "unknown",
    title: meta.title ?? "Untitled",
    version: meta.version ?? "1.0",
    effectiveDate: meta.effectiveDate ?? "",
    summary: meta.summary ?? "",
    body: body.trim(),
  };
}
