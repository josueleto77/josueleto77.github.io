export default function Toggle({
  checked,
  onChange,
  label,
  description,
  id,
  tone = "coral",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
  id?: string;
  tone?: "coral" | "sage";
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4">
      {(label || description) && (
        <span>
          {label && <span className="block text-sm font-semibold text-navy">{label}</span>}
          {description && <span className="block text-xs text-ink/60">{description}</span>}
        </span>
      )}
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? (tone === "coral" ? "bg-coral" : "bg-sage") : "bg-navy/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
