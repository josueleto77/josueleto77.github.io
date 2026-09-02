export default function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  label,
  formatValue,
  id,
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  label?: string;
  formatValue?: (v: number) => string;
  id?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-semibold text-navy">{label}</span>
          <span className="font-bold text-coral">{formatValue ? formatValue(value) : value}</span>
        </div>
      )}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-navy/10 accent-coral"
        style={{
          background: `linear-gradient(to right, var(--coral) ${pct}%, rgba(23,42,58,0.1) ${pct}%)`,
        }}
      />
    </div>
  );
}
