import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface FieldWrapProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  labelProps?: LabelHTMLAttributes<HTMLLabelElement>;
}

export function FieldWrap({ label, hint, error, required, htmlFor, children, labelProps }: FieldWrapProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-semibold text-navy" {...labelProps}>
          {label}
          {required && <span className="text-coral"> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-ink/60">{hint}</p>}
      {error && (
        <p className="text-xs font-semibold text-coral-dark" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const baseFieldClasses =
  "w-full rounded-xl border border-navy/15 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:border-coral outline-none disabled:opacity-50";

type InputProps = InputHTMLAttributes<HTMLInputElement> & Omit<FieldWrapProps, "children" | "htmlFor">;

export default function Input({ label, hint, error, required, id, className = "", ...rest }: InputProps) {
  return (
    <FieldWrap label={label} hint={hint} error={error} required={required} htmlFor={id}>
      <input id={id} className={`${baseFieldClasses} ${error ? "border-coral" : ""} ${className}`} {...rest} />
    </FieldWrap>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & Omit<FieldWrapProps, "children" | "htmlFor">;

export function Textarea({ label, hint, error, required, id, className = "", ...rest }: TextareaProps) {
  return (
    <FieldWrap label={label} hint={hint} error={error} required={required} htmlFor={id}>
      <textarea id={id} className={`${baseFieldClasses} min-h-[100px] resize-y ${className}`} {...rest} />
    </FieldWrap>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & Omit<FieldWrapProps, "children" | "htmlFor">;

export function Select({ label, hint, error, required, id, className = "", children, ...rest }: SelectProps) {
  return (
    <FieldWrap label={label} hint={hint} error={error} required={required} htmlFor={id}>
      <select id={id} className={`${baseFieldClasses} ${className}`} {...rest}>
        {children}
      </select>
    </FieldWrap>
  );
}
