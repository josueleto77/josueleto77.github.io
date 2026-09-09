import { SUPPORT_FAQS, type SupportFaq } from "@/lib/data/supportBot";

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "do", "does", "did", "how", "what", "when", "where", "why",
  "can", "i", "my", "me", "to", "for", "of", "on", "in", "with", "and", "or", "about", "your",
]);

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function significantWords(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

/** Keyword-overlap scoring against the fixed FAQ set. Returns null below a minimum confidence. */
export function matchFaq(query: string): SupportFaq | null {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return null;
  const queryWords = new Set(significantWords(query));

  let best: SupportFaq | null = null;
  let bestScore = 0;

  for (const faq of SUPPORT_FAQS) {
    let score = 0;
    for (const keyword of faq.keywords) {
      const normalizedKeyword = normalize(keyword);
      if (normalizedQuery.includes(normalizedKeyword)) {
        score += normalizedKeyword.split(" ").length * 3;
        continue;
      }
      for (const word of significantWords(keyword)) {
        if (queryWords.has(word)) score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = faq;
    }
  }

  return bestScore >= 2 ? best : null;
}
