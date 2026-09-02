import Icon from "@/components/ui/icons";

export default function StarRating({
  rating,
  count,
  size = "h-4 w-4",
  showValue = true,
}: {
  rating: number;
  count?: number;
  size?: string;
  showValue?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-navy">
      <Icon name="star" className={`${size} fill-coral text-coral`} />
      {showValue && rating.toFixed(2)}
      {count !== undefined && <span className="font-normal text-ink/60">({count})</span>}
    </span>
  );
}
