import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function for combining CSS classes with Tailwind CSS.
 * 
 * Combines clsx for conditional class logic with twMerge for
 * Tailwind CSS class deduplication and conflict resolution.
 * Essential for creating dynamic, responsive UI components.
 * 
 * @param inputs - Array of class values (strings, objects, arrays)
 * @returns Merged and deduplicated class string
 * 
 * @example
 * cn("px-2 py-1", { "bg-red-500": isError }, "text-white")
 * // Returns: "px-2 py-1 bg-red-500 text-white"
 * 
 * @example
 * cn("px-2", "px-4") // Tailwind conflict resolution
 * // Returns: "px-4" (last conflicting class wins)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
