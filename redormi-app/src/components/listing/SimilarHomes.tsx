import type { Listing } from "@/lib/types";
import Carousel from "@/components/ui/Carousel";
import ListingCard from "@/components/listing/ListingCard";

export default function SimilarHomes({ listings, currentId }: { listings: Listing[]; currentId: string }) {
  const similar = listings.filter((l) => l.id !== currentId);
  if (similar.length === 0) return null;
  return (
    <section>
      <h2 className="mb-4 text-xl font-extrabold text-navy">Similar homes nearby</h2>
      <Carousel>
        {similar.slice(0, 8).map((l) => (
          <div key={l.id} className="w-64 shrink-0">
            <ListingCard listing={l} />
          </div>
        ))}
      </Carousel>
    </section>
  );
}
