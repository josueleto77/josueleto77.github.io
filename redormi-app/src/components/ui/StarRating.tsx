import Icon from "@/components/ui/icons";

const NEW_LISTING_WINDOW_DAYS = 30;

export default function StarRating({
  rating,
  count,
  createdAt,
  size = "h-4 w-4",
  showValue = true,
}: {
  rating: number;
  count?: number;
  createdAt?: string;
  size?: string;
  showValue?: boolean;
}) {
  if (count === 0) {
    const isNew =
      !!createdAt && Date.now() - new Date(createdAt).getTime() < NEW_LISTING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return <span className="text-sm font-semibold text-ink/50">{isNew ? "New listing" : "No reviews yet"}</span>;
  }

  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-navy">
      <Icon name="star" className={`${size} fill-coral text-coral`} />
      {showValue && rating.toFixed(2)}
      {count !== undefined && <span className="font-normal text-ink/60">({count})</span>}
    </span>
  );
}
