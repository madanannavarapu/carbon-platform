// CBAM calculation engine — embedded emissions, certificates, compliance
// ponytail: straight math, no abstractions until a second consumer appears

import {
  CBAMImport,
  CBAMInstallation,
  EmbeddedEmissions,
  CBAMCertificate,
  CBAMCompliance,
} from './cbam-types';
import { CBAM_PRODUCTS, SECTOR_EMISSION_INTENSITY, getMarkedUpDefault, EU_ETS_PRICES } from './cbam-factors';

/**
 * Calculate embedded emissions for an installation using actual data
 */
export function calculateActualEmissions(installation: CBAMInstallation): EmbeddedEmissions {
  return installation.emissions;
}

/**
 * Calculate embedded emissions using default values (punitive)
 */
export function calculateDefaultEmissions(country: string, sector: string, year: number): EmbeddedEmissions | null {
  const defaultTotal = getMarkedUpDefault(country, sector as any, year);
  if (!defaultTotal) return null;

  // Distribute across scopes (defaults don't break down — use typical proportions)
  const sectorData = SECTOR_EMISSION_INTENSITY[sector as keyof typeof SECTOR_EMISSION_INTENSITY];
  const scope1Ratio = sectorData ? 0.70 : 0.75; // typical direct emission share
  const scope2Ratio = sectorData ? 0.20 : 0.18;
  const upstreamRatio = 1 - scope1Ratio - scope2Ratio;

  return {
    scope1: defaultTotal * scope1Ratio,
    scope2: defaultTotal * scope2Ratio,
    upstream: defaultTotal * upstreamRatio,
    total: defaultTotal,
  };
}

/**
 * Calculate CBAM certificate cost for an import
 */
export function calculateCertificateCost(
  imp: CBAMImport,
  useDefaults: boolean,
  year: number
): CBAMCertificate {
  const embedded = useDefaults
    ? calculateDefaultEmissions(imp.country, imp.product.sector, year)
    : null;

  // If no default available, use sector typical
  const emissionsTotal = embedded?.total ?? SECTOR_EMISSION_INTENSITY[imp.product.sector]?.typical ?? 1.0;

  // Total embedded emissions = intensity × quantity
  const totalEmbedded = emissionsTotal * imp.quantity;

  // EU ETS price for the quarter
  const quarter = `${year}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
  const etsPrice = EU_ETS_PRICES[quarter] ?? 75.0;

  const totalCost = totalEmbedded * etsPrice;
  const carbonPriceDeduction = imp.carbonPricePaid ?? 0;
  const netCost = Math.max(0, totalCost - carbonPriceDeduction);

  return {
    id: `CBAM-${imp.id}-${quarter}`,
    importId: imp.id,
    embeddedEmissions: totalEmbedded,
    etsPrice,
    totalCost,
    carbonPriceDeduction,
    netCost,
    status: 'pending',
    quarter,
  };
}

/**
 * Calculate compliance status for a set of imports
 */
export function calculateCompliance(
  imports: CBAMImport[],
  certificates: CBAMCertificate[],
  reportingPeriod: string
): CBAMCompliance {
  const totalImports = imports.reduce((sum, imp) => sum + imp.quantity, 0);
  const totalEmbedded = certificates.reduce((sum, cert) => sum + cert.embeddedEmissions, 0);
  const totalCertCost = certificates.reduce((sum, cert) => sum + cert.netCost, 0);
  const totalCarbonPaid = certificates.reduce((sum, cert) => sum + cert.carbonPriceDeduction, 0);
  const netObligation = totalCertCost;

  // Deadline: Sep 30 of following year
  const year = parseInt(reportingPeriod.split('-')[0]);
  const deadline = `${year + 1}-09-30`;

  // Status logic
  const now = new Date();
  const deadlineDate = new Date(deadline);
  let status: 'on-track' | 'at-risk' | 'overdue' = 'on-track';

  if (now > deadlineDate) {
    status = 'overdue';
  } else if (certificates.some((c) => c.status === 'pending')) {
    const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilDeadline < 90) status = 'at-risk';
  }

  return {
    reportingPeriod,
    totalImports,
    totalEmbeddedEmissions: totalEmbedded,
    totalCertificateCost: totalCertCost,
    totalCarbonPricePaid: totalCarbonPaid,
    netObligation,
    deadline,
    status,
  };
}

/**
 * Get CN code options for a sector
 */
export function getProductsForSector(sector: string) {
  return CBAM_PRODUCTS.filter((p) => p.sector === sector);
}

/**
 * Calculate savings from providing actual data vs defaults
 */
export function calculateDefaultPenalty(country: string, sector: string, quantity: number, year: number): {
  defaultEmissions: number;
  actualEmissions: number;
  penaltyCost: number;
  etsPrice: number;
} | null {
  const markedUp = getMarkedUpDefault(country, sector as any, year);
  if (!markedUp) return null;

  const typical = SECTOR_EMISSION_INTENSITY[sector as keyof typeof SECTOR_EMISSION_INTENSITY]?.typical ?? 1.0;
  const quarter = `${year}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
  const etsPrice = EU_ETS_PRICES[quarter] ?? 75.0;

  const defaultTotal = markedUp * quantity;
  const actualTotal = typical * quantity;
  const penaltyCost = (defaultTotal - actualTotal) * etsPrice;

  return {
    defaultEmissions: defaultTotal,
    actualEmissions: actualTotal,
    penaltyCost,
    etsPrice,
  };
}
