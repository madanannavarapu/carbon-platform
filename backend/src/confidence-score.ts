import { CalculatedShipment } from './types';

interface ConfidenceResult {
  score: 'high' | 'medium' | 'low';
  percentage: number;
  reasons: string[];
}

export function calculateConfidence(shipments: CalculatedShipment[]): ConfidenceResult {
  const reasons: string[] = [];
  let score = 100;

  // Check data completeness
  const withVehicleClass = shipments.filter((s) => s.vehicleClass).length;
  const withFuelType = shipments.filter((s) => s.fuelType).length;
  const withShipmentId = shipments.filter((s) => s.shipmentId && !s.shipmentId.startsWith('SHP-')).length;

  const vehiclePct = withVehicleClass / shipments.length;
  const fuelPct = withFuelType / shipments.length;
  const idPct = withShipmentId / shipments.length;

  // Vehicle class completeness (up to -20 points)
  if (vehiclePct < 0.5) {
    score -= 20;
    reasons.push('Missing vehicle class for most shipments — using defaults');
  } else if (vehiclePct < 0.9) {
    score -= 10;
    reasons.push('Some shipments missing vehicle class');
  }

  // Fuel type completeness (up to -20 points)
  if (fuelPct < 0.5) {
    score -= 20;
    reasons.push('Missing fuel type — assuming diesel');
  } else if (fuelPct < 0.9) {
    score -= 10;
    reasons.push('Some shipments missing fuel type');
  }

  // Real shipment IDs vs generated (up to -10 points)
  if (idPct < 0.3) {
    score -= 10;
    reasons.push('Most shipment IDs are auto-generated');
  }

  // Distance sanity checks (up to -15 points)
  const avgDist = shipments.reduce((s, sh) => s + sh.distance, 0) / shipments.length;
  if (avgDist > 3000) {
    score -= 15;
    reasons.push('Average distance unusually high — verify route data');
  } else if (avgDist > 2000) {
    score -= 5;
  }

  // Weight sanity checks (up to -15 points)
  const avgWeight = shipments.reduce((s, sh) => s + sh.weight, 0) / shipments.length;
  if (avgWeight < 1) {
    score -= 15;
    reasons.push('Very low average weight — may indicate incomplete data');
  }

  // Sample data penalty (up to -15 points)
  const sampleIds = shipments.filter((s) => s.id.startsWith('shipment-')).length;
  if (sampleIds > shipments.length * 0.8) {
    score -= 15;
    reasons.push('Using generated sample data — replace with actual shipments');
  }

  // Clamp
  score = Math.max(10, Math.min(100, score));

  let level: 'high' | 'medium' | 'low';
  if (score >= 75) level = 'high';
  else if (score >= 50) level = 'medium';
  else level = 'low';

  if (reasons.length === 0) reasons.push('All data fields present and validated');

  return { score: level, percentage: score, reasons };
}
