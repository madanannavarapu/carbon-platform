// CBAM emission factors — product-specific embedded emissions
// ponytail: covers the 6 CBAM sectors, extend when new products actually arrive

import { CBAMProduct, CBAMDefaultValues, CBAMSector } from './cbam-types';

// Common CBAM products (CN codes from EU Regulation 2023/956 Annex I)
export const CBAM_PRODUCTS: CBAMProduct[] = [
  // Iron & Steel
  { cnCode: '7201', name: 'Pig iron and spiegeleisen', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7202', name: 'Ferro-alloys', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7203', name: 'Ferrous products from direct reduction of iron ore', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7206', name: 'Iron and non-alloy steel in ingots', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7207', name: 'Semi-finished products of iron/non-alloy steel', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7208', name: 'Flat-rolled products of iron/non-alloy steel', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7209', name: 'Flat-rolled products of iron/non-alloy steel (cold-rolled)', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7210', name: 'Flat-rolled products with coatings', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7219', name: 'Flat-rolled products of stainless steel', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7220', name: 'Flat-rolled products of stainless steel (cold-rolled)', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7225', name: 'Flat-rolled products of other alloy steel', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7226', name: 'Flat-rolled products of other alloy steel (cold-rolled)', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7229', name: 'Wire of other alloy steel', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7301', name: 'Sheet piling of iron or steel', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7302', name: 'Railway track construction material', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7303', name: 'Tubes, pipes and hollow profiles (cast iron)', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7304', name: 'Tubes, pipes and hollow profiles (seamless)', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7305', name: 'Tubes and pipes (longitudinally welded)', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7306', name: 'Other tubes, pipes and hollow profiles', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7307', name: 'Tube/pipe fittings of iron or steel', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7308', name: 'Structures and parts of structures of iron or steel', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7309', name: 'Reservoirs, tanks, vats (iron/steel, >300L)', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7310', name: 'Reservoirs, tanks, vats (iron/steel, ≤300L)', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7311', name: 'Containers for compressed/liquefied gas (iron/steel)', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7318', name: 'Screws, bolts, nuts of iron or steel', sector: 'iron-steel', unit: 'kg' },
  { cnCode: '7326', name: 'Other articles of iron or steel', sector: 'iron-steel', unit: 'kg' },

  // Aluminium
  { cnCode: '7601', name: 'Unwrought aluminium', sector: 'aluminium', unit: 'kg' },
  { cnCode: '7603', name: 'Aluminium powders and flakes', sector: 'aluminium', unit: 'kg' },
  { cnCode: '7604', name: 'Aluminium bars, rods and profiles', sector: 'aluminium', unit: 'kg' },
  { cnCode: '7605', name: 'Aluminium wire', sector: 'aluminium', unit: 'kg' },
  { cnCode: '7606', name: 'Aluminium plates, sheets and strips (>0.2mm)', sector: 'aluminium', unit: 'kg' },
  { cnCode: '7607', name: 'Aluminium foil (≤0.2mm)', sector: 'aluminium', unit: 'kg' },
  { cnCode: '7608', name: 'Aluminium tubes and pipes', sector: 'aluminium', unit: 'kg' },
  { cnCode: '7609', name: 'Aluminium tube/pipe fittings', sector: 'aluminium', unit: 'kg' },
  { cnCode: '7616', name: 'Other articles of aluminium', sector: 'aluminium', unit: 'kg' },

  // Cement
  { cnCode: '2523', name: 'Cement (all types)', sector: 'cement', unit: 'kg' },

  // Fertilisers
  { cnCode: '2808', name: 'Nitric acid; sulphonitric acids', sector: 'fertilisers', unit: 'kg' },
  { cnCode: '2814', name: 'Ammonia (anhydrous)', sector: 'fertilisers', unit: 'kg' },
  { cnCode: '3102', name: 'Mineral or chemical fertilisers, nitrogenous', sector: 'fertilisers', unit: 'kg' },
  { cnCode: '3105', name: 'Mineral or chemical fertilisers containing two/three nutrients', sector: 'fertilisers', unit: 'kg' },

  // Hydrogen
  { cnCode: '2804', name: 'Hydrogen', sector: 'hydrogen', unit: 'kg' },
];

// Typical embedded emissions by sector (tCO₂e per tonne of product)
// These are "actual" values for well-run facilities — used for comparison with defaults
export const SECTOR_EMISSION_INTENSITY: Record<CBAMSector, {
  typical: number;   // Typical actual emissions
  low: number;       // Best available technology
  high: number;      // Older/less efficient facilities
  source: string;
}> = {
  'iron-steel': {
    typical: 1.85,    // BF-BOF route (India average)
    low: 1.20,        // Best practice BF-BOF
    high: 2.50,       // Older facilities
    source: 'Worldsteel/TERI',
  },
  'aluminium': {
    typical: 12.5,    // Primary aluminium (coal-heavy grid)
    low: 4.0,         // Hydro/solar powered
    high: 18.0,       // Coal-powered smelters
    source: 'IAI/IEA',
  },
  'cement': {
    typical: 0.62,    // Clinker-to-cement ratio 0.7
    low: 0.52,        // Best available technique
    high: 0.78,       // Older wet-process kilns
    source: 'WBCSD/IEA',
  },
  'fertilisers': {
    typical: 3.8,     // Ammonia from natural gas
    low: 2.2,         // Green hydrogen route
    high: 5.5,        // Coal-based ammonia (India)
    source: 'IEA/IFA',
  },
  'hydrogen': {
    typical: 9.0,     // Steam methane reforming (grey)
    low: 0.5,         // Electrolysis (green)
    high: 12.0,       // Coal gasification
    source: 'IEA/IRENA',
  },
};

// Country-specific default values (IR (EU) 2025/2621 simplified)
// ponytail: top trading partners with EU, extend when Commission publishes full list
export const CBAM_DEFAULT_VALUES: CBAMDefaultValues[] = [
  // India
  { country: 'IN', sector: 'iron-steel', value: 2.55, source: 'IR (EU) 2025/2621', year: 2026 },
  { country: 'IN', sector: 'aluminium', value: 16.2, source: 'IR (EU) 2025/2621', year: 2026 },
  { country: 'IN', sector: 'cement', value: 0.72, source: 'IR (EU) 2025/2621', year: 2026 },
  { country: 'IN', sector: 'fertilisers', value: 5.2, source: 'IR (EU) 2025/2621', year: 2026 },
  { country: 'IN', sector: 'hydrogen', value: 10.5, source: 'IR (EU) 2025/2621', year: 2026 },

  // China
  { country: 'CN', sector: 'iron-steel', value: 3.17, source: 'IR (EU) 2025/2621', year: 2026 },
  { country: 'CN', sector: 'aluminium', value: 18.5, source: 'IR (EU) 2025/2621', year: 2026 },
  { country: 'CN', sector: 'cement', value: 0.85, source: 'IR (EU) 2025/2621', year: 2026 },
  { country: 'CN', sector: 'fertilisers', value: 4.8, source: 'IR (EU) 2025/2621', year: 2026 },
  { country: 'CN', sector: 'hydrogen', value: 11.2, source: 'IR (EU) 2025/2621', year: 2026 },

  // Turkey
  { country: 'TR', sector: 'iron-steel', value: 1.95, source: 'IR (EU) 2025/2621', year: 2026 },
  { country: 'TR', sector: 'aluminium', value: 8.5, source: 'IR (EU) 2025/2621', year: 2026 },
  { country: 'TR', sector: 'cement', value: 0.68, source: 'IR (EU) 2025/2621', year: 2026 },

  // Russia
  { country: 'RU', sector: 'iron-steel', value: 2.20, source: 'IR (EU) 2025/2621', year: 2026 },
  { country: 'RU', sector: 'aluminium', value: 10.8, source: 'IR (EU) 2025/2621', year: 2026 },
  { country: 'RU', sector: 'cement', value: 0.75, source: 'IR (EU) 2025/2621', year: 2026 },

  // Brazil
  { country: 'BR', sector: 'iron-steel', value: 1.45, source: 'IR (EU) 2025/2621', year: 2026 },
  { country: 'BR', sector: 'aluminium', value: 5.2, source: 'IR (EU) 2025/2621', year: 2026 },
];

// Default value mark-up schedule (punitive penalty for using defaults)
export const DEFAULT_MARKUP_SCHEDULE: Record<number, number> = {
  2026: 0.10,  // +10%
  2027: 0.20,  // +20%
  2028: 0.30,  // +30% and onward
};

// EU ETS allowance price (quarterly averages for certificate cost calculation)
export const EU_ETS_PRICES: Record<string, number> = {
  '2026-Q1': 72.50,
  '2026-Q2': 75.20,
  '2026-Q3': 74.80,
  '2026-Q4': 76.10,
  '2027-Q1': 78.00,  // projected
  '2027-Q2': 80.00,  // projected
  '2027-Q3': 82.00,  // projected
  '2027-Q4': 84.00,  // projected
};

export function getProduct(cnCode: string): CBAMProduct | undefined {
  return CBAM_PRODUCTS.find((p) => p.cnCode === cnCode);
}

export function getDefaultValue(country: string, sector: CBAMSector): CBAMDefaultValues | undefined {
  return CBAM_DEFAULT_VALUES.find((d) => d.country === country && d.sector === sector);
}

export function getMarkedUpDefault(country: string, sector: CBAMSector, year: number): number | undefined {
  const dv = getDefaultValue(country, sector);
  if (!dv) return undefined;
  const markup = DEFAULT_MARKUP_SCHEDULE[year] ?? 0.30;
  return dv.value * (1 + markup);
}
