import * as React from "react";

import { cn } from "@/lib/utils";

const CONTROL = [
  "w-full rounded-md border border-line bg-white px-3 text-ink",
  "placeholder:text-muted",
  "focus:border-ink focus:outline-none focus-visible:outline-none",
  "disabled:bg-surface-alt disabled:text-muted",
].join(" ");

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input ref={ref} className={cn(CONTROL, "h-10", className)} {...props} />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(CONTROL, "min-h-24 py-2 leading-relaxed", className)}
      {...props}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(CONTROL, "h-10 appearance-none pr-8", className)}
      {...props}
    />
  );
});

export function Label({
  className,
  children,
  hint,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { hint?: string }) {
  return (
    <label
      className={cn("block text-sm font-medium text-ink-soft", className)}
      {...props}
    >
      {children}
      {hint ? (
        <span className="ml-2 font-normal text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <Label htmlFor={htmlFor} hint={hint}>
          {label}
        </Label>
      ) : null}
      {children}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
