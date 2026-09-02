"use client";

export interface TabItem {
  key: string;
  label: string;
  count?: number;
}

export default function Tabs({
  items,
  active,
  onChange,
  tone = "coral",
}: {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
  tone?: "coral" | "sage";
}) {
  return (
    <div role="tablist" className="flex flex-wrap gap-2 border-b border-navy/10 pb-0.5">
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.key)}
            className={`relative flex items-center gap-1.5 rounded-t-lg px-3.5 py-2.5 text-sm font-semibold transition-colors ${
              isActive ? "text-navy" : "text-ink/50 hover:text-navy"
            }`}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                  isActive ? (tone === "coral" ? "bg-coral text-white" : "bg-sage text-navy") : "bg-navy/8 text-ink/60"
                }`}
              >
                {item.count}
              </span>
            )}
            {isActive && (
              <span
                className={`absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full ${
                  tone === "coral" ? "bg-coral" : "bg-sage"
                }`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
