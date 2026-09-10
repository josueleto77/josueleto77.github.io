import Image from "next/image";
import { LeadForm } from "./LeadForm";
import { Card } from "@/components/ui/Card";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-4 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-16 lg:pt-10">
      <div className="animate-nexis-fade-up">
        <h1 className="font-display text-4xl text-nexis-dark sm:text-5xl lg:text-6xl">
          See Your Home&rsquo;s
          <br />
          <span className="text-nexis-primary">Solar Potential</span>
        </h1>
        <p className="mt-5 max-w-md text-base text-nexis-dark/70 sm:text-lg">
          Enter your address and see how solar could look on your home in seconds — real roof data,
          real production estimates, no obligation.
        </p>

        <Card className="mt-8">
          <LeadForm />
        </Card>
      </div>

      <div className="relative order-first lg:order-last">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem] shadow-nexis-card-lg nexis-gradient-dark">
          <Image
            src="/hero-roof.svg"
            alt="Satellite view of a home with a modern solar panel array on its roof"
            fill
            priority
            className="object-cover"
          />
        </div>
        <div className="absolute -bottom-6 left-6 rounded-2xl bg-white px-5 py-4 shadow-nexis-card sm:left-10">
          <p className="font-display text-3xl text-nexis-primary">92</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-nexis-dark/60">Nexis Solar Score</p>
        </div>
      </div>
    </section>
  );
}
