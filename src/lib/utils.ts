import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Helper untuk compose Tailwind className (dari shadcn/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
