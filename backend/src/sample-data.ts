import { Shipment, TransportMode, VehicleClass, FuelType } from './types';

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata',
  'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
  'Surat', 'Kanpur', 'Nagpur', 'Indore', 'Bhopal',
  'Goa', 'Cochin', 'Trivandrum', 'Vizag', 'Coimbatore',
];

const ROAD_VEHICLE_CLASSES: VehicleClass[] = ['lcv', 'mcv', 'hcv', 'trailer'];
const ROAD_FUEL_TYPES: FuelType[] = ['diesel', 'diesel', 'diesel', 'cng'];

function rand(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateSampleData(count: number = 50): Shipment[] {
  const shipments: Shipment[] = [];

  for (let i = 1; i <= count; i++) {
    const modeRoll = Math.random();
    let mode: TransportMode;
    if (modeRoll < 0.55) mode = 'road';
    else if (modeRoll < 0.75) mode = 'rail';
    else if (modeRoll < 0.9) mode = 'air';
    else mode = 'sea';

    let distance: number;
    let weight: number;
    let vehicleClass: VehicleClass | undefined;
    let fuelType: FuelType | undefined;

    switch (mode) {
      case 'road':
        distance = rand(50, 2500);
        vehicleClass = pick(ROAD_VEHICLE_CLASSES);
        fuelType = pick(ROAD_FUEL_TYPES);
        weight = vehicleClass === 'lcv' ? rand(1, 5) : vehicleClass === 'mcv' ? rand(5, 15) : rand(15, 40);
        break;
      case 'rail':
        distance = rand(200, 3000);
        fuelType = Math.random() > 0.4 ? 'electric' : 'diesel';
        weight = rand(20, 200);
        break;
      case 'air':
        distance = rand(500, 5000);
        fuelType = 'jet-fuel';
        weight = rand(0.5, 10);
        break;
      case 'sea':
        distance = rand(300, 8000);
        fuelType = Math.random() > 0.6 ? 'lng' : Math.random() > 0.3 ? 'hfo' : 'diesel';
        weight = rand(50, 500);
        break;
    }

    const origin = pick(CITIES);
    let destination = pick(CITIES);
    while (destination === origin) destination = pick(CITIES);

    shipments.push({
      id: `shipment-${i}`,
      shipmentId: `SHP-${String(i).padStart(4, '0')}`,
      origin,
      destination,
      distance,
      mode,
      weight,
      vehicleClass,
      fuelType,
    });
  }

  return shipments;
}
