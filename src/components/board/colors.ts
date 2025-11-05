// Centralized board color palettes per theme + color preset (using numeric hue markers for presets)
// We use the numeric values 0/25/120/160/200/260 to represent preset buttons
// and also accept any other numeric (slider) which will fall back to a rotated classic palette.

function hslToHex(h: number, s: number, l: number): string {
  h = (h % 360 + 360) % 360; s = Math.max(0, Math.min(100, s)); l = Math.max(0, Math.min(100, l));
  const c = (1 - Math.abs(2 * l/100 - 1)) * (s/100);
  const x = c * (1 - Math.abs(((h/60) % 2) - 1));
  const m = l/100 - c/2;
  let r=0, g=0, b=0;
  if (0<=h && h<60) { r=c; g=x; b=0; }
  else if (60<=h && h<120) { r=x; g=c; b=0; }
  else if (120<=h && h<180) { r=0; g=c; b=x; }
  else if (180<=h && h<240) { r=0; g=x; b=c; }
  else if (240<=h && h<300) { r=x; g=0; b=c; }
  else { r=c; g=0; b=x; }
  const toHex = (v: number) => Math.round((v+m)*255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getSquareColors(theme: string, hue: number): { light: string; dark: string } {
  // Explicit pairs for common presets (better than CSS filter hue-rotate)
  const PRESETS: Record<number, { light: string; dark: string }> = {
    0:    { light: '#f0d9b5', dark: '#b58863' },   // classic beige/brown
    25:   { light: '#f5e0c3', dark: '#c28b57' },   // warm
    120:  { light: '#e8f3e6', dark: '#67a567' },   // green
    160:  { light: '#e0f2f1', dark: '#26a69a' },   // teal
    200:  { light: '#dbeafe', dark: '#3b82f6' },   // blue
    260:  { light: '#ede9fe', dark: '#7c3aed' },   // purple
  };
  const rounded = [0,25,120,160,200,260].find(v => Math.abs((hue ?? 0) - v) < 1e-6);
  let pair = PRESETS[typeof rounded === 'number' ? rounded : 0];

  // Theme can tweak saturation/brightness subtly
  if (theme === 'wood') {
    // make tones warmer
    return { light: '#e3c39a', dark: '#b38655' };
  } else if (theme === 'blackGold') {
    return { light: '#c7a955', dark: '#1a1712' };
  } else if (theme === 'blueGray') {
    return { light: '#9db2bf', dark: '#2b3a4b' };
  }

  // If not themed, but arbitrary slider value set, create rotated HSL off a neutral base
  if (rounded === undefined && typeof hue === 'number') {
    // base light/dark in HSL, rotate hue
    const baseLight = hslToHex((40 + hue) % 360, 55, 80);
    const baseDark  = hslToHex((30 + hue) % 360, 45, 45);
    pair = { light: baseLight, dark: baseDark };
  }
  return pair;
}

