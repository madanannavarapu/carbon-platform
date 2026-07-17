import { CalculatedShipment, Action } from './types';
import { getEmissionFactor, getCostPerTonKm, EMISSION_FACTORS } from './emission-factors';

let actionCounter = 0;
function nextId(): string {
  return `action-${++actionCounter}`;
}

function calcImpactScore(emissionReduction: number, costSaving: number, confidencePct: number): number {
  // Normalize: emission reduction (0-100k), cost saving (0-10L), confidence (0-100)
  const eNorm = Math.min(emissionReduction / 100000, 1);
  const cNorm = Math.min(costSaving / 1000000, 1);
  const confNorm = confidencePct / 100;
  return Math.round((eNorm * 40 + cNorm * 40 + confNorm * 20) * 100) / 100;
}

export function generateActions(
  shipments: CalculatedShipment[],
  _insights: { affectedShipments: string[]; potentialSaving: { emissionReduction: number; costReduction: number } }[],
  confidencePct: number = 75
): Action[] {
  const actions: Action[] = [];

  // 1. Mode switch: road → rail (Strategic)
  const roadLong = shipments.filter((s) => s.mode === 'road' && s.distance > 300);
  if (roadLong.length > 0) {
    const railEf = getEmissionFactor('rail', undefined, 'electric');
    const roadEf = getEmissionFactor('road', 'hcv', 'diesel');
    let emissionReduction = 0;
    let costReduction = 0;

    roadLong.forEach((s) => {
      const railE = s.distance * s.weight * railEf.factor;
      emissionReduction += s.co2Emissions - railE;
      costReduction += s.costEstimate - s.distance * s.weight * getCostPerTonKm('rail');
    });

    const impactScore = calcImpactScore(emissionReduction, costReduction, confidencePct);

    actions.push({
      id: nextId(),
      type: 'switch-mode',
      category: 'strategic',
      title: `Switch ${roadLong.length} long-haul shipments to rail`,
      description: `Route via electric rail for significant emission and cost savings.`,
      priority: impactScore > 0.6 ? 'high' : impactScore > 0.3 ? 'medium' : 'low',
      impactScore,
      explainability: {
        currentFactor: roadEf.factor,
        currentFactorLabel: `Road (HCV Diesel): ${roadEf.factor} kg CO₂/ton-km`,
        alternativeFactor: railEf.factor,
        alternativeFactorLabel: `Rail (Electric): ${railEf.factor} kg CO₂/ton-km`,
        source: 'TEMT/ISO 14083',
      },
      expectedEmissionReduction: emissionReduction,
      estimatedCostImpact: -costReduction,
      affectedShipments: roadLong.map((s) => s.id),
    });
  }

  // 2. Fuel switch: diesel → CNG (Quick Win)
  const dieselRoad = shipments.filter((s) => s.mode === 'road' && s.fuelType === 'diesel');
  if (dieselRoad.length > 2) {
    const dieselEf = getEmissionFactor('road', undefined, 'diesel');
    const cngEf = getEmissionFactor('road', undefined, 'cng');
    let emissionReduction = 0;
    let costSaving = 0;

    dieselRoad.forEach((s) => {
      const cngE = s.distance * s.weight * cngEf.factor;
      emissionReduction += s.co2Emissions - cngE;
      costSaving += s.co2Emissions * 0.05; // CNG is slightly cheaper
    });

    const impactScore = calcImpactScore(emissionReduction, costSaving, confidencePct);

    actions.push({
      id: nextId(),
      type: 'fuel-switch',
      category: 'quick-win',
      title: `Switch ${dieselRoad.length} diesel trucks to CNG`,
      description: 'CNG vehicles produce less CO₂ than diesel. Fleet conversion for high-frequency routes.',
      priority: impactScore > 0.5 ? 'medium' : 'low',
      impactScore,
      explainability: {
        currentFactor: dieselEf.factor,
        currentFactorLabel: `Diesel: ${dieselEf.factor} kg CO₂/ton-km`,
        alternativeFactor: cngEf.factor,
        alternativeFactorLabel: `CNG: ${cngEf.factor} kg CO₂/ton-km`,
        source: 'TEMT/ARAI',
      },
      expectedEmissionReduction: emissionReduction,
      estimatedCostImpact: -costSaving,
      affectedShipments: dieselRoad.map((s) => s.id),
    });
  }

  // 3. Consolidate LCV → HCV (Quick Win)
  const lcvShipments = shipments.filter((s) => s.mode === 'road' && s.vehicleClass === 'lcv');
  if (lcvShipments.length > 2) {
    const lcvEf = getEmissionFactor('road', 'lcv', 'diesel');
    const hcvEf = getEmissionFactor('road', 'hcv', 'diesel');
    let saving = 0;
    lcvShipments.forEach((s) => {
      const hcvE = s.distance * s.weight * hcvEf.factor;
      saving += s.co2Emissions - hcvE;
    });

    const costSaving = saving * 0.1;
    const impactScore = calcImpactScore(saving, costSaving, confidencePct);

    actions.push({
      id: nextId(),
      type: 'consolidate',
      category: 'quick-win',
      title: `Consolidate ${lcvShipments.length} LCV shipments into HCV`,
      description: 'Light commercial vehicles have higher emission factors per ton-km. Consolidate into heavier vehicles.',
      priority: impactScore > 0.4 ? 'medium' : 'low',
      impactScore,
      explainability: {
        currentFactor: lcvEf.factor,
        currentFactorLabel: `LCV (Diesel): ${lcvEf.factor} kg CO₂/ton-km`,
        alternativeFactor: hcvEf.factor,
        alternativeFactorLabel: `HCV (Diesel): ${hcvEf.factor} kg CO₂/ton-km`,
        source: 'TEMT/ARAI',
      },
      expectedEmissionReduction: saving,
      estimatedCostImpact: -costSaving,
      affectedShipments: lcvShipments.map((s) => s.id),
    });
  }

  // 4. Route optimization (Strategic)
  const distances = shipments.map((s) => s.distance);
  const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
  const longRoutes = shipments.filter((s) => s.distance > avgDist * 1.8);
  if (longRoutes.length > 0) {
    const emissionReduction = longRoutes.reduce((sum, s) => s.co2Emissions * 0.15, 0);
    const costSaving = longRoutes.reduce((sum, s) => s.costEstimate * 0.15, 0);
    const impactScore = calcImpactScore(emissionReduction, costSaving, confidencePct);

    actions.push({
      id: nextId(),
      type: 'optimize-route',
      category: 'strategic',
      title: `Optimize ${longRoutes.length} long-distance routes`,
      description: `Routes exceeding ${(avgDist * 1.8).toFixed(0)}km — review for hub consolidation or modal shift.`,
      priority: 'low',
      impactScore,
      expectedEmissionReduction: emissionReduction,
      estimatedCostImpact: -costSaving,
      affectedShipments: longRoutes.map((s) => s.id),
    });
  }

  // Sort by impact score descending
  return actions.sort((a, b) => b.impactScore - a.impactScore);
}
