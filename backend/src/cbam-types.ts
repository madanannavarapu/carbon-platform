// CBAM types — EU Carbon Border Adjustment Mechanism
// ponytail: covers what the UI needs, extend when a new field is actually required

export type CBAMSector = 'iron-steel' | 'aluminium' | 'cement' | 'fertilisers' | 'hydrogen';

export interface CBAMProduct {
  cnCode: string;           // EU customs code (e.g., 7208.51)
  name: string;             // Human-readable
  sector: CBAMSector;
  unit: string;             // kg, tonnes, etc.
}

export interface EmbeddedEmissions {
  scope1: number;           // Direct emissions (tCO₂e per tonne of product)
  scope2: number;           // Indirect emissions - electricity (tCO₂e per tonne)
  upstream: number;         // Upstream/precursor emissions (tCO₂e per tonne)
  total: number;            // sum of above
}

export interface CBAMInstallation {
  id: string;
  name: string;
  country: string;          // ISO 3166-1 alpha-2 (e.g., "IN")
  sector: CBAMSector;
  emissions: EmbeddedEmissions;
  verified: boolean;        // Has accredited verifier signed off?
  verificationDate?: string;
}

export interface CBAMImport {
  id: string;
  installationId: string;
  product: CBAMProduct;
  quantity: number;         // tonnes imported
  country: string;          // country of origin
  carbonPricePaid?: number; // EUR already paid in origin country
  carbonPriceCurrency?: string;
}

export interface CBAMDefaultValues {
  country: string;
  sector: CBAMSector;
  value: number;            // tCO₂e per tonne of product (country average)
  source: string;
  year: number;
}

export interface CBAMCertificate {
  id: string;
  importId: string;
  embeddedEmissions: number; // tCO₂e
  etsPrice: number;          // EUR per tCO₂e (quarterly avg)
  totalCost: number;         // EUR = embeddedEmissions × etsPrice
  carbonPriceDeduction: number;
  netCost: number;           // totalCost - carbonPriceDeduction
  status: 'pending' | 'purchased' | 'surrendered';
  quarter: string;           // e.g., "2026-Q1"
}

export interface CBAMCompliance {
  reportingPeriod: string;
  totalImports: number;
  totalEmbeddedEmissions: number;
  totalCertificateCost: number;
  totalCarbonPricePaid: number;
  netObligation: number;
  deadline: string;
  status: 'on-track' | 'at-risk' | 'overdue';
}
