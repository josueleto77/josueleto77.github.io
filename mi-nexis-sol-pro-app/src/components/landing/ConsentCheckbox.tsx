interface ConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  hasError?: boolean;
}

export function ConsentCheckbox({ checked, onChange, hasError }: ConsentCheckboxProps) {
  return (
    <label className="flex items-start gap-3 text-sm text-nexis-dark/80 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={[
          "mt-0.5 h-5 w-5 shrink-0 rounded border-2 accent-nexis-primary cursor-pointer",
          hasError ? "border-red-400" : "border-nexis-blue",
        ].join(" ")}
      />
      <span>
        By submitting, you agree that Nexis Power may contact you regarding your home energy assessment.
        Message and data rates may apply. See our{" "}
        <a href="/privacy" className="underline decoration-nexis-primary underline-offset-2 hover:text-nexis-primary">
          Privacy Policy
        </a>{" "}
        and{" "}
        <a href="/terms" className="underline decoration-nexis-primary underline-offset-2 hover:text-nexis-primary">
          Terms
        </a>
        .
      </span>
    </label>
  );
}
