import { Card } from "@/components/ui/Card";
import { AnimatedNumber } from "@/components/solar/AnimatedNumber";
import type { NexisSolarScoreResult, SystemRecommendation } from "@/types/solar";
import { formatKw, formatKwh } from "@/lib/utils/format";

interface MetricCardsProps {
  solarScore: NexisSolarScoreResult;
  systemRecommendation: SystemRecommendation;
}

const CATEGORY_LABEL: Record<NexisSolarScoreResult["category"], string> = {
  "EXCELLENT SOLAR ROOF": "Excellent",
  "VERY GOOD": "Very Good",
  GOOD: "Good",
  FAIR: "Fair",
  "LIMITED SOLAR POTENTIAL": "Limited",
};

export function MetricCards({ solarScore, systemRecommendation }: MetricCardsProps) {
  const cards = [
    {
      label: "Nexis Solar Score",
      value: <AnimatedNumber value={solarScore.score} />,
      sub: `/ 100 · ${CATEGORY_LABEL[solarScore.category]}`,
    },
    {
      label: "Recommended System",
      value: <AnimatedNumber value={systemRecommendation.systemSizeKw} formatter={(v) => v.toFixed(2)} />,
      sub: "kW",
    },
    {
      label: "Solar Panels",
      value: <AnimatedNumber value={systemRecommendation.panelCount} />,
      sub: "Panels",
    },
    {
      label: "Estimated Production",
      value: <AnimatedNumber value={systemRecommendation.estimatedAnnualProductionKwh} />,
      sub: "kWh / year",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="text-center !p-5 sm:!p-6">
          <p className="font-display text-3xl text-nexis-dark sm:text-4xl">{card.value}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-nexis-primary">{card.sub}</p>
          <p className="mt-2 text-[11px] uppercase tracking-wide text-nexis-dark/50">{card.label}</p>
        </Card>
      ))}
    </div>
  );
}

// re-exported for the metric labeled "kW"/"kWh" plain formatting elsewhere
export { formatKw, formatKwh };
