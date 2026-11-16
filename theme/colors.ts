// Client palette used before the yellow experiment.
// Blue is the action color. Navy is the brand color for headers and the active tab.
export const palette = {
  blue: "#007AFF",
  yellow: "#007AFF",
  navy: "#0B3C5D",
  black: "#1C1C1E",
  charcoal: "#3A3A3C",
  white: "#FFFFFF",
  grey: "#F2F2F7",
  soft: "#E5E5EA",
  success: "#34C759",
  warning: "#FF9500",
  error: "#FF3B30",
  info: "#8E8E93",
  teal: "#1CA7A6",
  yellowWash: "#E8F1FF",
  darkBorder: "#3A3A3C",
} as const;

export type Palette = typeof palette;
