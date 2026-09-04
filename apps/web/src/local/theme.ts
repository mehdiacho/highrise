import type { ColorGroup } from '@richup/shared/types';

/** Vivid property-group bands, tuned to read on the dark table. */
export const GROUP_COLORS: Record<ColorGroup, string> = {
  brown: '#a06a3f',
  lblue: '#6ec9f0',
  pink: '#ef5ba1',
  orange: '#f5943b',
  red: '#ef4444',
  yellow: '#f5c542',
  green: '#3fbf6f',
  dblue: '#4f7cff',
};

/** Distinct token colors offered on the setup screen, in pick order (12 seats). */
export const PLAYER_COLORS: string[] = [
  '#4f7cff', // blue
  '#ef4444', // red
  '#3fbf6f', // green
  '#f5c542', // gold
  '#c77dff', // violet
  '#ff8fab', // pink
  '#2dd4bf', // teal
  '#f5943b', // orange
  '#a78bfa', // indigo
  '#f472b6', // rose
  '#34d399', // emerald
  '#e2e8f0', // silver
];

/** $1,234 — grouped, no cents. */
export function money(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
}

/** Two-letter monogram for a token/avatar. */
export function monogram(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || '??';
}
