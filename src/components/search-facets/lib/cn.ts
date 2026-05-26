import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Class-name composer used throughout the drop-in. Built on `clsx` for
 * conditional joining and `tailwind-merge` so caller-provided classes
 * win over the component's defaults (the standard shadcn convention).
 *
 * Drop-ins keep their own copy so a consumer can paste this folder into
 * any project without depending on the host app's `lib/utils`.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Shared class strings used by the per-type editors so the form controls
 * inside the builder popover stay visually consistent. These mirror the
 * shadcn token vocabulary (`bg-background`, `border-input`, `ring-ring`,
 * etc.) and merge cleanly with caller overrides via `cn()`.
 */
export const editorStyles = {
  row: 'flex flex-wrap items-center gap-2',
  input: cn(
    'h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2.5 text-sm shadow-xs transition-colors',
    'placeholder:text-muted-foreground',
    'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
    'dark:bg-input/30'
  ),
  select: cn(
    'h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs transition-colors',
    'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
    'dark:bg-input/30'
  ),
  primaryButton: cn(
    'inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium whitespace-nowrap text-primary-foreground transition-colors',
    'hover:bg-primary/80',
    'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
    'disabled:pointer-events-none disabled:opacity-50'
  ),
  ghostButton: cn(
    'inline-flex h-8 shrink-0 items-center justify-center rounded-md px-3 text-xs font-medium whitespace-nowrap transition-colors',
    'hover:bg-muted hover:text-foreground',
    'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'
  ),
  checkboxLabel: 'inline-flex select-none items-center gap-1.5 text-xs text-muted-foreground',
  checkbox: cn(
    'peer flex size-4 shrink-0 items-center justify-center rounded-sm border border-input bg-background shadow-xs transition-colors',
    'hover:border-ring',
    'data-[checked]:bg-primary data-[checked]:border-primary data-[checked]:text-primary-foreground',
    'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'
  ),
  radio: cn(
    'flex size-4 shrink-0 items-center justify-center rounded-full border border-input bg-background shadow-xs transition-colors',
    'hover:border-ring',
    'data-[checked]:border-primary',
    'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'
  ),
  radioIndicator: 'size-2 rounded-full bg-primary opacity-0 data-[checked]:opacity-100',
  radioGroup: 'flex flex-wrap items-center gap-3',
  radioLabel: 'inline-flex select-none items-center gap-1.5 text-sm',
} as const;
