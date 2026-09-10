import { Card } from "@/components/ui/Card";
import type { RoofAnalysisResult } from "@/types/solar";
import { formatSqFt } from "@/lib/utils/format";

export function RoofAnalysisSection({ roof }: { roof: RoofAnalysisResult }) {
  const items = [
    `${roof.solarExposure} solar exposure`,
    `${roof.shading} shading`,
    roof.primaryPitchDegrees !== null
      ? `${roof.primaryOrientation}-facing primary roof at ${roof.primaryPitchDegrees}° pitch`
      : `${roof.primaryOrientation}-facing primary roof`,
    `Space for up to ${roof.maxPanelCapacity} panels`,
  ];

  return (
    <Card>
      <h3 className="font-display text-2xl text-nexis-dark">Your Roof</h3>

      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Solar Suitability" value={roof.suitability} />
        <Stat label="Usable Solar Area" value={formatSqFt(roof.usableAreaSqFt)} />
        <Stat label="Primary Orientation" value={roof.primaryOrientation} />
        <Stat label="Solar Exposure" value={roof.solarExposure} />
      </dl>

      <ul className="mt-6 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-nexis-dark/80">
            <span className="mt-0.5 text-nexis-primary">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-nexis-dark/50">{label}</dt>
      <dd className="mt-0.5 font-display text-lg text-nexis-dark">{value}</dd>
    </div>
  );
}
