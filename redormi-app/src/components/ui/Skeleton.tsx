export default function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} aria-hidden="true" />;
}

export function ListingCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-[4/3] w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
