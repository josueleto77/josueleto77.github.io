import type { SwitchTierScore } from "@/lib/types";
import Icon from "@/components/ui/icons";
import { TIER_ORDER } from "@/lib/utils/tier";

const TIER_COLOR: Record<string, string> = {
  Bronze: "bg-[#b08d57]",
  Silver: "bg-[#a8adb5]",
  Gold: "bg-[#d4af37]",
  Platinum: "bg-[#8fa3ac]",
  Diamond: "bg-sage-dark",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-semibold text-navy/70">
        <span>{label}</span>
        <span>{value.toFixed(1)} / 5</span>
      </div>
      <div className="h-1.5 rounded-full bg-navy/8">
        <div className="h-full rounded-full bg-sage-dark" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
    </div>
  );
}

export default function TierBreakdownCard({ score, compact = false }: { score: SwitchTierScore; compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${TIER_COLOR[score.label]}`}>
          <Icon name="sparkles" className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-navy/50">Switch Tier</p>
          <p className="text-xl font-extrabold text-navy">
            {score.label} <span className="text-sm font-semibold text-ink/50">({score.composite.toFixed(1)}/5)</span>
          </p>
        </div>
      </div>

      {!compact && (
        <div className="mb-2 flex items-center gap-1">
          {TIER_ORDER.map((t) => (
            <span
              key={t}
              className={`h-1.5 flex-1 rounded-full ${
                TIER_ORDER.indexOf(t) <= TIER_ORDER.indexOf(score.label) ? "bg-sage-dark" : "bg-navy/8"
              }`}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <ScoreBar label="Property type & quality" value={score.propertyScore} />
        <ScoreBar label="Location desirability" value={score.locationScore} />
        <ScoreBar label="Owner standing" value={score.ownerScore} />
      </div>

      {!compact && score.tips.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5 rounded-xl bg-cream p-3">
          <p className="text-xs font-bold text-navy">Ways to raise your tier</p>
          {score.tips.map((tip) => (
            <p key={tip.text} className="text-xs text-ink/70">
              {tip.text}: <span className="font-semibold text-sage-dark">+{tip.delta.toFixed(1)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
