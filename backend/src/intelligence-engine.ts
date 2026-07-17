import { CalculatedShipment, Insight } from './types';
import { getEmissionFactor, getCostPerTonKm } from './emission-factors';

export function generateInsights(shipments: CalculatedShipment[]): Insight[] {
  const insights: Insight[] = [];

  // 1. Mode Optimization - suggest rail/sea over road
  const roadShipments = shipments.filter((s) => s.mode === 'road' && s.distance > 300);
  if (roadShipments.length > 0) {
    const railEf = getEmissionFactor('rail', undefined, 'electric');
    const roadEf = getEmissionFactor('road', 'hcv', 'diesel');
    let totalReduction = 0;
    let totalCostSaving = 0;
    const affected: string[] = [];

    roadShipments.forEach((s) => {
      const railEmissions = s.distance * s.weight * railEf.factor;
      const reduction = s.co2Emissions - railEmissions;
      const costSaving = s.costEstimate - s.distance * s.weight * getCostPerTonKm('rail');
      totalReduction += reduction;
      totalCostSaving += costSaving;
      affected.push(s.id);
    });

    const avgReduction = roadShipments.reduce((sum, s) => {
      const railE = s.distance * s.weight * railEf.factor;
      return sum + ((s.co2Emissions - railE) / s.co2Emissions) * 100;
    }, 0) / roadShipments.length;

    insights.push({
      type: 'mode-optimization',
      severity: 'high',
      title: `${roadShipments.length} long-haul road shipments could switch to rail`,
      description: `Shipments over 300km on road are ${avgReduction.toFixed(0)}% more emission-intensive than electric rail.`,
      explainability: {
        currentFactor: roadEf.factor,
        currentFactorLabel: `Road (HCV Diesel): ${roadEf.factor} kg CO₂/ton-km`,
        alternativeFactor: railEf.factor,
        alternativeFactorLabel: `Rail (Electric): ${railEf.factor} kg CO₂/ton-km`,
        source: 'TEMT/ISO 14083',
      },
      affectedShipments: affected,
      potentialSaving: {
        emissionReduction: totalReduction,
        costReduction: totalCostSaving,
        percentage: avgReduction,
      },
    });
  }

  // 2. Route Efficiency - flag unusually high distance
  const distances = shipments.map((s) => s.distance);
  const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
  const highDistanceThreshold = avgDistance * 1.8;
  const inefficientRoutes = shipments.filter((s) => s.distance > highDistanceThreshold);

  if (inefficientRoutes.length > 0) {
    insights.push({
      type: 'route-efficiency',
      severity: 'medium',
      title: `${inefficientRoutes.length} shipments have unusually long routes`,
      description: `Average distance is ${avgDistance.toFixed(0)}km. ${inefficientRoutes.length} routes exceed ${highDistanceThreshold.toFixed(0)}km — check for route optimization or alternative hubs.`,
      affectedShipments: inefficientRoutes.map((s) => s.id),
      potentialSaving: {
        emissionReduction: inefficientRoutes.reduce((sum, s) => s.co2Emissions * 0.15, 0),
        costReduction: inefficientRoutes.reduce((sum, s) => s.costEstimate * 0.15, 0),
        percentage: 15,
      },
    });
  }

  // 3. Load Optimization - detect underutilized loads (LCV)
  const smallLoads = shipments.filter((s) => s.mode === 'road' && s.vehicleClass === 'lcv');
  if (smallLoads.length > 2) {
    const lcvEf = getEmissionFactor('road', 'lcv', 'diesel');
    const hcvEf = getEmissionFactor('road', 'hcv', 'diesel');
    const consolidatedEmissions = smallLoads.reduce((sum, s) => sum + s.co2Emissions, 0);
    const consolidatedSaving = consolidatedEmissions * 0.35;

    insights.push({
      type: 'load-optimization',
      severity: 'medium',
      title: `${smallLoads.length} LCV shipments could be consolidated into HCV/Trailer`,
      description: 'Light commercial vehicles have higher emission factors per ton-km. Consolidating into heavier vehicles reduces per-unit emissions.',
      explainability: {
        currentFactor: lcvEf.factor,
        currentFactorLabel: `LCV (Diesel): ${lcvEf.factor} kg CO₂/ton-km`,
        alternativeFactor: hcvEf.factor,
        alternativeFactorLabel: `HCV (Diesel): ${hcvEf.factor} kg CO₂/ton-km`,
        source: 'TEMT/ARAI',
      },
      affectedShipments: smallLoads.map((s) => s.id),
      potentialSaving: {
        emissionReduction: consolidatedSaving,
        costReduction: smallLoads.reduce((sum, s) => s.costEstimate * 0.35, 0),
        percentage: 35,
      },
    });
  }

  // 4. Diesel vs Cleaner Fuel
  const dieselRoad = shipments.filter((s) => s.mode === 'road' && s.fuelType === 'diesel');
  if (dieselRoad.length > 3) {
    const dieselEf = getEmissionFactor('road', undefined, 'diesel');
    const cngEf = getEmissionFactor('road', undefined, 'cng');
    let saving = 0;
    dieselRoad.forEach((s) => {
      const cngE = s.distance * s.weight * cngEf.factor;
      saving += s.co2Emissions - cngE;
    });
    insights.push({
      type: 'mode-optimization',
      severity: 'medium',
      title: `${dieselRoad.length} diesel trucks could switch to CNG`,
      description: 'CNG vehicles produce ~15-20% less CO₂ than diesel equivalents. Consider fleet conversion for high-frequency routes.',
      explainability: {
        currentFactor: dieselEf.factor,
        currentFactorLabel: `Diesel: ${dieselEf.factor} kg CO₂/ton-km`,
        alternativeFactor: cngEf.factor,
        alternativeFactorLabel: `CNG: ${cngEf.factor} kg CO₂/ton-km`,
        source: 'TEMT/ARAI',
      },
      affectedShipments: dieselRoad.map((s) => s.id),
      potentialSaving: {
        emissionReduction: saving,
        costReduction: saving * 0.1,
        percentage: 18,
      },
    });
  }

  // 5. High Emission Alerts - top 20% contributors
  const sorted = [...shipments].sort((a, b) => b.co2Emissions - a.co2Emissions);
  const top20Count = Math.max(1, Math.ceil(shipments.length * 0.2));
  const top20 = sorted.slice(0, top20Count);
  const top20Total = top20.reduce((sum, s) => sum + s.co2Emissions, 0);
  const allTotal = shipments.reduce((sum, s) => sum + s.co2Emissions, 0);
  const top20Percentage = (top20Total / allTotal) * 100;

  insights.push({
    type: 'high-emission',
    severity: 'high',
    title: `Top ${top20Count} shipments account for ${top20Percentage.toFixed(0)}% of emissions`,
    description: `Focus reduction efforts on these high-impact shipments for maximum effect.`,
    affectedShipments: top20.map((s) => s.id),
    potentialSaving: {
      emissionReduction: top20Total * 0.2,
      costReduction: top20.reduce((sum, s) => s.costEstimate * 0.2, 0),
      percentage: 20,
    },
  });

  return insights;
}
