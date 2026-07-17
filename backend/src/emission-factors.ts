export type TransportMode = 'road' | 'rail' | 'air' | 'sea';
export type FuelType = 'diesel' | 'cng' | 'electric' | 'jet-fuel' | 'hfo' | 'lng';
export type VehicleClass = 'lcv' | 'mcv' | 'hcv' | 'trailer' | 'container-truck';

export interface EmissionFactor {
  mode: TransportMode;
  vehicleClass?: VehicleClass;
  fuelType?: FuelType;
  factor: number; // kg CO2 per ton-km
  loadFactorDefault: number; // default 0.85 (85% utilization)
  source: string;
}

// TEMT / ISO 14083 aligned emission factors (India-specific)
// Sources: MoRTH, TERI, ARAI studies, TEMT documentation
export const EMISSION_FACTORS: EmissionFactor[] = [
  // ─── Road ────────────────────────────────────────────────
  // Light Commercial Vehicles (2-6 tons GVW)
  { mode: 'road', vehicleClass: 'lcv', fuelType: 'diesel', factor: 0.125, loadFactorDefault: 0.75, source: 'TEMT/ARAI' },
  { mode: 'road', vehicleClass: 'lcv', fuelType: 'cng', factor: 0.105, loadFactorDefault: 0.75, source: 'TEMT/ARAI' },
  // Medium Commercial Vehicles (6-16 tons GVW)
  { mode: 'road', vehicleClass: 'mcv', fuelType: 'diesel', factor: 0.096, loadFactorDefault: 0.80, source: 'TEMT/ARAI' },
  { mode: 'road', vehicleClass: 'mcv', fuelType: 'cng', factor: 0.082, loadFactorDefault: 0.80, source: 'TEMT/ARAI' },
  // Heavy Commercial Vehicles (16-25 tons GVW)
  { mode: 'road', vehicleClass: 'hcv', fuelType: 'diesel', factor: 0.074, loadFactorDefault: 0.85, source: 'TEMT/ARAI' },
  { mode: 'road', vehicleClass: 'hcv', fuelType: 'cng', factor: 0.065, loadFactorDefault: 0.85, source: 'TEMT/ARAI' },
  // Multi-Axle Trailer (25-40+ tons GVW)
  { mode: 'road', vehicleClass: 'trailer', fuelType: 'diesel', factor: 0.062, loadFactorDefault: 0.90, source: 'TEMT/MORTH' },
  { mode: 'road', vehicleClass: 'trailer', fuelType: 'lng', factor: 0.048, loadFactorDefault: 0.90, source: 'TEMT/MORTH' },
  // Container Truck (port haulage)
  { mode: 'road', vehicleClass: 'container-truck', fuelType: 'diesel', factor: 0.068, loadFactorDefault: 0.85, source: 'TEMT/PCS' },

  // ─── Rail ────────────────────────────────────────────────
  { mode: 'rail', fuelType: 'diesel', factor: 0.031, loadFactorDefault: 0.85, source: 'TEMT/IR' },
  { mode: 'rail', fuelType: 'electric', factor: 0.019, loadFactorDefault: 0.85, source: 'TEMT/IR/GRID' },

  // ─── Air ─────────────────────────────────────────────────
  { mode: 'air', fuelType: 'jet-fuel', factor: 0.602, loadFactorDefault: 0.80, source: 'TEMT/IATA' },

  // ─── Sea / Inland Waterway ───────────────────────────────
  { mode: 'sea', fuelType: 'hfo', factor: 0.016, loadFactorDefault: 0.90, source: 'TEMT/IMO' },
  { mode: 'sea', fuelType: 'lng', factor: 0.012, loadFactorDefault: 0.90, source: 'TEMT/IMO' },
  { mode: 'sea', fuelType: 'diesel', factor: 0.022, loadFactorDefault: 0.85, source: 'TEMT/IMO' },
];

// Realistic freight rates (INR per ton-km, 2024-25 India market)
export const COST_DATA: Record<string, { rate: number; source: string }> = {
  'road-lcv':        { rate: 4.50,  source: 'Market/Agarwal' },
  'road-mcv':        { rate: 2.80,  source: 'Market/TCI' },
  'road-hcv':        { rate: 1.90,  source: 'Market/TCI' },
  'road-trailer':    { rate: 1.40,  source: 'Market/TCI' },
  'road-container':  { rate: 1.60,  source: 'Market/Port' },
  'rail':            { rate: 1.10,  source: 'IR/Freight' },
  'air':             { rate: 22.00, source: 'IATA/Cargo' },
  'sea':             { rate: 0.55,  source: 'Shipping/Liner' },
};

export function getEmissionFactor(
  mode: TransportMode,
  vehicleClass?: VehicleClass,
  fuelType?: FuelType
): EmissionFactor {
  const matches = EMISSION_FACTORS.filter((ef) => ef.mode === mode);
  if (vehicleClass) {
    const m = matches.find((ef) => ef.vehicleClass === vehicleClass);
    if (m) return m;
  }
  if (fuelType) {
    const m = matches.find((ef) => ef.fuelType === fuelType);
    if (m) return m;
  }
  return matches[0];
}

export function getCostPerTonKm(mode: TransportMode, vehicleClass?: VehicleClass): number {
  if (mode === 'road' && vehicleClass) {
    const key = `road-${vehicleClass}`;
    if (COST_DATA[key]) return COST_DATA[key].rate;
  }
  const key = mode;
  return COST_DATA[key]?.rate ?? 2.0;
}
