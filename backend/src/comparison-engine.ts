import { CalculatedShipment, ComparisonScenario, ComparisonResult } from './types';
import { getEmissionFactor, getCostPerTonKm } from './emission-factors';

export function runComparison(
  shipments: CalculatedShipment[],
  scenario: ComparisonScenario
): ComparisonResult {
  const affected = shipments.filter((s) => s.mode !== scenario.targetMode);

  const originalEmissions = affected.reduce((sum, s) => sum + s.co2Emissions, 0);
  const originalCost = affected.reduce((sum, s) => sum + s.costEstimate, 0);

  let scenarioEmissions = 0;
  let scenarioCost = 0;

  affected.forEach((s) => {
    const ef = getEmissionFactor(scenario.targetMode, scenario.targetVehicleClass, scenario.targetFuelType);
    scenarioEmissions += s.distance * s.weight * ef.factor;
    scenarioCost += s.distance * s.weight * getCostPerTonKm(scenario.targetMode, scenario.targetVehicleClass);
  });

  const emissionReduction = originalEmissions - scenarioEmissions;
  const emissionReductionPct = originalEmissions > 0 ? (emissionReduction / originalEmissions) * 100 : 0;
  const costDifference = originalCost - scenarioCost;

  const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const beforeAfter = [
    { metric: 'CO₂ Emissions', before: `${fmt(originalEmissions)} kg`, after: `${fmt(scenarioEmissions)} kg` },
    { metric: 'Emission Reduction', before: '—', after: `-${fmt(emissionReduction)} kg (${emissionReductionPct.toFixed(1)}%)` },
    { metric: 'Logistics Cost', before: `₹${fmt(originalCost)}`, after: `₹${fmt(scenarioCost)}` },
    { metric: 'Cost Impact', before: '—', after: costDifference > 0 ? `Save ₹${fmt(costDifference)}` : `+₹${fmt(Math.abs(costDifference))}` },
    { metric: 'Shipments Affected', before: String(affected.length), after: String(affected.length) },
    { metric: 'Scenario', before: scenario.name, after: scenario.description },
  ];

  return {
    scenario,
    originalEmissions,
    scenarioEmissions,
    emissionReduction,
    emissionReductionPct,
    originalCost,
    scenarioCost,
    costDifference,
    affectedShipments: affected,
    beforeAfter,
  };
}

export const PRESET_SCENARIOS: ComparisonScenario[] = [
  {
    id: 'road-to-rail',
    name: 'Switch to Rail',
    description: 'Move long-haul road freight to rail transport',
    targetMode: 'rail',
    targetFuelType: 'electric',
  },
  {
    id: 'road-to-sea',
    name: 'Switch to Sea',
    description: 'Move coastal freight from road to sea/waterway',
    targetMode: 'sea',
    targetFuelType: 'lng',
  },
  {
    id: 'diesel-to-cng',
    name: 'Diesel to CNG Trucks',
    description: 'Switch diesel trucks to CNG-powered vehicles',
    targetMode: 'road',
    targetVehicleClass: 'hcv',
    targetFuelType: 'cng',
  },
  {
    id: 'diesel-to-electric-rail',
    name: 'Electric Rail',
    description: 'Use electric traction instead of diesel rail',
    targetMode: 'rail',
    targetFuelType: 'electric',
  },
  {
    id: 'hcv-to-trailer',
    name: 'Upgrade to Multi-Axle Trailer',
    description: 'Replace HCV with higher-capacity multi-axle trailers',
    targetMode: 'road',
    targetVehicleClass: 'trailer',
    targetFuelType: 'diesel',
  },
];
