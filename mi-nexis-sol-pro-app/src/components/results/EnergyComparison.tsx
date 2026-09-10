import { Card } from "@/components/ui/Card";
import { formatKwh, formatPercent } from "@/lib/utils/format";

interface EnergyComparisonProps {
  annualConsumptionKwh: number;
  estimatedAnnualProductionKwh: number;
  estimatedOffsetPercent: number;
}

export function EnergyComparison({ annualConsumptionKwh, estimatedAnnualProductionKwh, estimatedOffsetPercent }: EnergyComparisonProps) {
  const max = Math.max(annualConsumptionKwh, estimatedAnnualProductionKwh, 1);
  const usePct = (annualConsumptionKwh / max) * 100;
  const productionPct = (estimatedAnnualProductionKwh / max) * 100;

  return (
    <Card>
      <h3 className="font-display text-2xl text-nexis-dark">Your Energy</h3>

      <div className="mt-6 space-y-5">
        <BarRow label="Home Energy Use" value={formatKwh(annualConsumptionKwh)} percent={usePct} color="bg-nexis-blue" />
        <BarRow label="Solar Production" value={formatKwh(estimatedAnnualProductionKwh)} percent={productionPct} color="nexis-gradient-primary" />
      </div>

      <div className="mt-6 flex items-center justify-between rounded-2xl bg-nexis-accent/50 px-5 py-4">
        <span className="font-display text-sm tracking-wide text-nexis-dark">Potential Solar Offset</span>
        <span className="font-display text-2xl text-nexis-primary">{formatPercent(estimatedOffsetPercent)}</span>
      </div>
    </Card>
  );
}

function BarRow({ label, value, percent, color }: { label: string; value: string; percent: number; color: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-nexis-dark/70">{label}</span>
        <span className="font-display text-lg text-nexis-dark">{value}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-nexis-accent/40">
        <div
          className={["h-full rounded-full transition-all duration-1000 ease-out", color].join(" ")}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
}
