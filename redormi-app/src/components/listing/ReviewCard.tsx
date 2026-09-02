import type { Review } from "@/lib/types";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import StarRating from "@/components/ui/StarRating";
import { formatDate } from "@/lib/utils/format";

export default function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="flex flex-col gap-2 border-b border-navy/8 pb-5">
      <div className="flex items-center gap-3">
        <Avatar src={review.authorAvatar} name={review.authorName} size={40} />
        <div>
          <p className="text-sm font-bold text-navy">{review.authorName}</p>
          <p className="text-xs text-ink/50">{formatDate(review.date)}</p>
        </div>
        {review.stayType === "switch" && (
          <Badge tone="sage" className="ml-auto">
            Switch stay
          </Badge>
        )}
      </div>
      <StarRating rating={review.rating} showValue />
      <p className="text-sm text-ink/80">{review.text}</p>
      {review.hostReply && (
        <div className="ml-4 rounded-xl bg-cream p-3 text-sm text-ink/70">
          <span className="font-bold text-navy">Host response: </span>
          {review.hostReply}
        </div>
      )}
    </div>
  );
}
