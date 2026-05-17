/**
 * Per-page accent colors. Used for the sign-in button + sign-in modal so they
 * match whichever page the user is on.
 *   jobs (/) → red, tracker → orange, events → purple.
 */

export type PageColor = { base: string; hover: string }

const PAGE_COLORS: Record<string, PageColor> = {
  '/':         { base: '#E62A15', hover: '#BF2211' },
  '/tracker':  { base: '#FF6B35', hover: '#FF5722' },
  '/events':   { base: '#4717A6', hover: '#3B1388' },
}

export const DEFAULT_COLOR: PageColor = { base: '#FF6B35', hover: '#FF5722' }

export function getPageColor(pathname: string | null | undefined): PageColor {
  if (!pathname) return DEFAULT_COLOR
  return PAGE_COLORS[pathname] || DEFAULT_COLOR
}
