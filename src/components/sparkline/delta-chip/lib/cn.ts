import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Class-name composer used throughout the drop-in. Built on `clsx` for
 * conditional joining and `tailwind-merge` so caller-provided classes win
 * over the component's defaults (the standard shadcn convention).
 *
 * Drop-ins keep their own copy so a consumer can paste this folder into
 * any project without depending on the host app's `lib/utils`.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
