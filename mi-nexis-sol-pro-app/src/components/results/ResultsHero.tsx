export function ResultsHero({ address }: { address: string }) {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-6 pt-10 text-center sm:pt-14">
      <h1 className="font-display text-3xl text-nexis-dark sm:text-5xl">Your Solar Design</h1>
      <p className="mt-3 text-sm font-medium uppercase tracking-wide text-nexis-blue sm:text-base">{address}</p>
    </div>
  );
}
