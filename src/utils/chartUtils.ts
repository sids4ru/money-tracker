/**
 * Utility functions for chart components
 */

/**
 * Generates a consistent color based on the provided ID
 * This ensures the same category will always get the same color
 * 
 * @param id The category ID to generate a color for
 * @returns A HSLA color string
 */
export const generateColorForCategory = (id: number): string => {
  // Use the ID as a seed for consistent color generation
  const hue = (id * 137.5) % 360; // Golden ratio to distribute colors nicely
  return `hsla(${hue}, 70%, 60%, 0.7)`;
};
