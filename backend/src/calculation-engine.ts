import { Shipment, CalculatedShipment } from './types';
import { getEmissionFactor, getCostPerTonKm } from './emission-factors';

export function calculateEmissions(shipments: Shipment[]): CalculatedShipment[] {
  return shipments.map((s) => {
    const ef = getEmissionFactor(s.mode, s.vehicleClass, s.fuelType);
    const co2Emissions = s.distance * s.weight * ef.factor;
    const costEstimate = s.distance * s.weight * getCostPerTonKm(s.mode, s.vehicleClass);

    return {
      ...s,
      emissionFactor: ef.factor,
      co2Emissions,
      costEstimate,
      source: ef.source,
    };
  });
}
