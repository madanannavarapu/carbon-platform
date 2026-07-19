export type TransportMode = 'road' | 'rail' | 'air' | 'sea';
export type VehicleClass = 'lcv' | 'mcv' | 'hcv' | 'trailer' | 'container-truck';
export type FuelType = 'diesel' | 'cng' | 'electric' | 'jet-fuel' | 'hfo' | 'lng';

export interface Shipment {
  id: string;
  shipmentId: string;
  origin: string;
  destination: string;
  distance: number;
  mode: TransportMode;
  weight: number;
  vehicleClass?: VehicleClass;
  fuelType?: FuelType;
}

export interface CalculatedShipment extends Shipment {
  emissionFactor: number;
  co2Emissions: number;
  costEstimate: number;
  source: string;
}

export interface Insight {
  type: 'mode-optimization' | 'route-efficiency' | 'load-optimization' | 'high-emission';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  explainability?: {
    currentFactor: number;
    currentFactorLabel: string;
    alternativeFactor: number;
    alternativeFactorLabel: string;
    source: string;
  };
  affectedShipments: string[];
  potentialSaving: {
    emissionReduction: number;
    costReduction: number;
    percentage: number;
  };
}

export interface Action {
  id: string;
  type: 'switch-mode' | 'consolidate' | 'optimize-route' | 'fuel-switch';
  category: 'quick-win' | 'strategic';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impactScore: number;
  explainability?: {
    currentFactor: number;
    currentFactorLabel: string;
    alternativeFactor: number;
    alternativeFactorLabel: string;
    source: string;
  };
  expectedEmissionReduction: number;
  estimatedCostImpact: number;
  affectedShipments: string[];
}

export interface AnalysisResult {
  id?: string;
  name?: string;
  shipments: CalculatedShipment[];
  summary: {
    totalShipments: number;
    totalDistance: number;
    totalWeight: number;
    totalEmissions: number;
    totalCost: number;
    emissionsByMode: Record<TransportMode, number>;
    avgEmissionPerTonKm: number;
  };
  confidence: {
    score: 'high' | 'medium' | 'low';
    percentage: number;
    reasons: string[];
  };
  insights: Insight[];
  actions: Action[];
}

export interface ComparisonScenario {
  id: string;
  name: string;
  description: string;
  targetMode: TransportMode;
  targetVehicleClass?: VehicleClass;
  targetFuelType?: FuelType;
}

export interface ComparisonResult {
  scenario: ComparisonScenario;
  originalEmissions: number;
  scenarioEmissions: number;
  emissionReduction: number;
  emissionReductionPct: number;
  originalCost: number;
  scenarioCost: number;
  costDifference: number;
  affectedShipments: CalculatedShipment[];
  beforeAfter: {
    metric: string;
    before: string;
    after: string;
  }[];
}

export interface SavedAnalysis {
  id: string;
  name: string;
  created_at: string;
  summary: AnalysisResult['summary'];
}

// ─── CBAM Types ─────────────────────────────────────────────

export type CBAMSector = 'iron-steel' | 'aluminium' | 'cement' | 'fertilisers' | 'hydrogen';

export interface CBAMProduct {
  cnCode: string;
  name: string;
  sector: CBAMSector;
  unit: string;
}

export interface EmbeddedEmissions {
  scope1: number;
  scope2: number;
  upstream: number;
  total: number;
}

export interface CBAMInstallation {
  id: string;
  name: string;
  country: string;
  sector: CBAMSector;
  emissions: EmbeddedEmissions;
  verified: boolean;
  verificationDate?: string;
}

export interface CBAMImport {
  id: string;
  installationId: string;
  product: CBAMProduct;
  quantity: number;
  country: string;
  carbonPricePaid?: number;
}

export interface CBAMCertificate {
  id: string;
  importId: string;
  embeddedEmissions: number;
  etsPrice: number;
  totalCost: number;
  carbonPriceDeduction: number;
  netCost: number;
  status: 'pending' | 'purchased' | 'surrendered';
  quarter: string;
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
