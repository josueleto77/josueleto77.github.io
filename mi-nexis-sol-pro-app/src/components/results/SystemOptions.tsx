import { Card } from "@/components/ui/Card";
import type { SystemOption } from "@/types/solar";
import { formatKw, formatKwh, formatPercent } from "@/lib/utils/format";

export function SystemOptions({ options }: { options: SystemOption[] }) {
  if (options.length === 0) return null;

  return (
    <div>
      <h3 className="font-display text-2xl text-nexis-dark">System Options</h3>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {options.map((option) => (
          <Card
            key={option.key}
            className={[
              "relative flex flex-col",
              option.isNexisRecommended ? "border-2 border-nexis-primary shadow-nexis-card-lg" : "",
            ].join(" ")}
          >
            {option.isNexisRecommended && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full nexis-gradient-primary px-4 py-1 font-display text-xs tracking-wide text-nexis-dark">
                NEXIS RECOMMENDED
              </span>
            )}
            <p className="font-display text-sm tracking-widest text-nexis-blue">{option.label}</p>
            <p className="mt-3 font-display text-4xl text-nexis-dark">{formatKw(option.systemSizeKw)}</p>
            <p className="mt-1 text-sm font-semibold text-nexis-dark/70">{option.panelCount} panels</p>
            <div className="mt-4 space-y-1 border-t border-black/5 pt-4 text-sm text-nexis-dark/70">
              <p>{formatKwh(option.estimatedAnnualProductionKwh)} / year</p>
              <p className="font-display text-lg text-nexis-primary">Approx. {formatPercent(option.estimatedOffsetPercent)} offset</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
