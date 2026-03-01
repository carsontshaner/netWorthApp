export const harborWordmark = {
  fontFamily: undefined,  // system default / DM Sans if loaded
  fontSize: 48,
  fontWeight: '500' as const,
  color: '#27231C',
  letterSpacing: 5.5,
} as const;

export const theme = {
  // Environment
  bg: {
    base: '#F3E7D3',
    card: 'rgba(255,255,255,0.30)',
    cardRaised: 'rgba(255,255,255,0.55)',
  },

  text: {
    primary: '#27231C',
    secondary: 'rgba(39,35,28,0.65)',
    tertiary: 'rgba(39,35,28,0.42)',
  },

  border: {
    default: 'rgba(39,35,28,0.10)',
    emphasis: 'rgba(39,35,28,0.16)',
  },

  // Net worth line — pencil
  netWorth: {
    line:   '#5B4A3A',
    subtle: 'rgba(91,74,58,0.15)',
  },
} as const;

export const colorScales = {
  assetShortTerm:     { from: '#A9D6CF', to: '#7FB3C8' },
  assetLongTerm:      { from: '#C8B89A', to: '#8A6F4E' },
  liabilityShortTerm: { from: '#D4B89A', to: '#C49A86' },
  liabilityLongTerm:  { from: '#8B6347', to: '#4A2E1A' },
} as const;

const SHORT_TERM_ASSETS      = ['cash', 'brokerage'];
const LONG_TERM_ASSETS       = ['retirement', 'real_estate', 'vehicle',
                                'business_ownership', 'other'];
const SHORT_TERM_LIABILITIES = ['credit_card', 'personal_loan',
                                'taxes_owed', 'other'];
const LONG_TERM_LIABILITIES  = ['mortgage', 'student_loan', 'auto_loan'];

export const CATEGORY_ORDER: ReadonlyArray<{ category: string; side: 'asset' | 'liability' }> = [
  { category: 'retirement',         side: 'asset' },
  { category: 'real_estate',        side: 'asset' },
  { category: 'vehicle',            side: 'asset' },
  { category: 'business_ownership', side: 'asset' },
  { category: 'other',              side: 'asset' },
  { category: 'cash',               side: 'asset' },
  { category: 'brokerage',          side: 'asset' },
  { category: 'mortgage',           side: 'liability' },
  { category: 'student_loan',       side: 'liability' },
  { category: 'auto_loan',          side: 'liability' },
  { category: 'credit_card',        side: 'liability' },
  { category: 'personal_loan',      side: 'liability' },
  { category: 'taxes_owed',         side: 'liability' },
  { category: 'other',              side: 'liability' },
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function interpolateColor(from: string, to: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(from);
  const [r2, g2, b2] = hexToRgb(to);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function categoryColor(
  category: string,
  side: 'asset' | 'liability',
  indexInGroup: number,
  groupSize: number,
): string {
  const scale =
    side === 'asset'
      ? SHORT_TERM_ASSETS.includes(category)
        ? colorScales.assetShortTerm
        : colorScales.assetLongTerm
      : SHORT_TERM_LIABILITIES.includes(category)
        ? colorScales.liabilityShortTerm
        : colorScales.liabilityLongTerm;

  const t = groupSize === 1 ? 0.5 : indexInGroup / (groupSize - 1);
  return interpolateColor(scale.from, scale.to, t);
}

export function categoryOrder(category: string, side: 'asset' | 'liability'): number {
  const idx = CATEGORY_ORDER.findIndex((e) => e.category === category && e.side === side);
  return idx !== -1 ? idx : 999;
}
