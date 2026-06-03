// Re-export from the package's built-in FontSize
export { FontSize } from '@tiptap/extension-text-style';

export const FONT_SIZES = [10, 12, 14, 15, 16, 18, 20, 24, 28, 32, 40, 48, 64, 72, 96];
export const DEFAULT_SIZE = 15;

export function getNextSize(current: number | null, direction: 1 | -1): number {
  const base = current ?? DEFAULT_SIZE;
  // Find first size >= base
  const idx = FONT_SIZES.findIndex((s) => s >= base);
  if (direction === 1) {
    if (idx === -1) return FONT_SIZES[FONT_SIZES.length - 1];
    if (FONT_SIZES[idx] === base) return FONT_SIZES[Math.min(idx + 1, FONT_SIZES.length - 1)];
    return FONT_SIZES[idx];
  } else {
    if (idx <= 0) return FONT_SIZES[0];
    if (FONT_SIZES[idx] === base) return FONT_SIZES[Math.max(idx - 1, 0)];
    return FONT_SIZES[idx - 1];
  }
}

export function parsePxSize(val: string | null | undefined): number | null {
  if (!val) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}
