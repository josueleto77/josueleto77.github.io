import Icon from "@/components/ui/icons";

export default function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="scrollbar-thin flex items-center gap-1 overflow-x-auto pb-2" aria-label="Progress">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step} className="flex shrink-0 items-center gap-1">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                done ? "bg-sage text-navy" : active ? "bg-coral text-white" : "bg-navy/10 text-ink/50"
              }`}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={`hidden text-xs font-semibold sm:inline ${active ? "text-navy" : "text-ink/50"}`}>
              {step}
            </span>
            {i < steps.length - 1 && <span className="mx-1 h-px w-4 shrink-0 bg-navy/15 sm:w-6" />}
          </li>
        );
      })}
    </ol>
  );
}
