import { Shipment, AnalysisResult, TransportMode } from './types';
import { calculateEmissions } from './calculation-engine';
import { generateInsights } from './intelligence-engine';
import { generateActions } from './action-engine';
import { calculateConfidence } from './confidence-score';

export function analyzeShipments(shipments: Shipment[]): AnalysisResult {
  const calculated = calculateEmissions(shipments);
  const confidence = calculateConfidence(calculated);
  const insights = generateInsights(calculated);
  const actions = generateActions(calculated, insights, confidence.percentage);

  const totalDistance = calculated.reduce((s, sh) => s + sh.distance, 0);
  const totalWeight = calculated.reduce((s, sh) => s + sh.weight, 0);
  const totalEmissions = calculated.reduce((s, sh) => s + sh.co2Emissions, 0);
  const totalCost = calculated.reduce((s, sh) => s + sh.costEstimate, 0);

  const emissionsByMode: Record<TransportMode, number> = {
    road: 0, rail: 0, air: 0, sea: 0,
  };
  calculated.forEach((s) => {
    emissionsByMode[s.mode] += s.co2Emissions;
  });

  return {
    shipments: calculated,
    summary: {
      totalShipments: calculated.length,
      totalDistance,
      totalWeight,
      totalEmissions,
      totalCost,
      emissionsByMode,
      avgEmissionPerTonKm: totalEmissions / (totalDistance * totalWeight || 1),
    },
    confidence,
    insights,
    actions,
  };
}
