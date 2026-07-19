import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { Shipment, TransportMode, VehicleClass, FuelType } from './types';
import { analyzeShipments } from './analysis-service';
import { generateSampleData } from './sample-data';
import { runComparison, PRESET_SCENARIOS } from './comparison-engine';
import { supabase, isSupabaseConfigured } from './supabase';
import { getEmissionFactor, getCostPerTonKm } from './emission-factors';
import { calculateCertificateCost, calculateCompliance, calculateDefaultPenalty } from './cbam-engine';
import { CBAM_PRODUCTS, SECTOR_EMISSION_INTENSITY, EU_ETS_PRICES } from './cbam-factors';
import { SAMPLE_INSTALLATIONS, SAMPLE_IMPORTS } from './cbam-sample-data';
import { CBAMImport } from './cbam-types';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const upload = multer({ storage: multer.memoryStorage() });

function parseShipmentRow(row: Record<string, string>): Shipment | null {
  const mode = (row.mode || row.Mode || '').toLowerCase().trim() as TransportMode;
  if (!['road', 'rail', 'air', 'sea'].includes(mode)) return null;

  const distance = parseFloat(row.distance || row.Distance);
  const weight = parseFloat(row.weight || row.Weight);
  if (isNaN(distance) || isNaN(weight) || distance <= 0 || weight <= 0) return null;

  const vehicleClass = (row.vehicleClass || row.VehicleClass || '').toLowerCase().trim() as VehicleClass || undefined;
  const fuelType = (row.fuelType || row.FuelType || '').toLowerCase().trim() as FuelType || undefined;

  return {
    id: `csv-${Math.random().toString(36).slice(2, 9)}`,
    shipmentId: row.shipmentId || row.ShipmentID || row.shipment_id || `SHP-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    origin: row.origin || row.Origin || 'Unknown',
    destination: row.destination || row.Destination || 'Unknown',
    distance,
    mode,
    weight,
    vehicleClass: vehicleClass || undefined,
    fuelType: fuelType || undefined,
  };
}

// Analyze shipments
app.post('/api/analyze', (req, res) => {
  try {
    const { shipments } = req.body as { shipments: Shipment[] };
    if (!Array.isArray(shipments) || shipments.length === 0) {
      return res.status(400).json({ error: 'Provide shipments array' });
    }
    const result = analyzeShipments(shipments);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CSV upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const records = parse(req.file.buffer.toString(), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const shipments: Shipment[] = records
      .map((row: any) => parseShipmentRow(row))
      .filter((s): s is Shipment => s !== null);

    if (shipments.length === 0) {
      return res.status(400).json({ error: 'No valid shipments found in CSV' });
    }

    const result = analyzeShipments(shipments);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Comparison
app.post('/api/compare', (req, res) => {
  try {
    const { shipments, scenarioId } = req.body;
    if (!Array.isArray(shipments) || !scenarioId) {
      return res.status(400).json({ error: 'Provide shipments and scenarioId' });
    }
    const calculated = shipments.map((s: any) => ({
      ...s,
      emissionFactor: s.emissionFactor || 0,
      co2Emissions: s.co2Emissions || 0,
      costEstimate: s.costEstimate || 0,
      source: s.source || '',
    }));
    const scenario = PRESET_SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) return res.status(400).json({ error: 'Unknown scenario' });

    const result = runComparison(calculated, scenario);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export optimized CSV
app.post('/api/export-csv', (req, res) => {
  try {
    const { shipments, scenarioId } = req.body;
    if (!Array.isArray(shipments)) {
      return res.status(400).json({ error: 'Provide shipments' });
    }

    const scenario = scenarioId ? PRESET_SCENARIOS.find((s) => s.id === scenarioId) : null;

    const rows = shipments.map((s: any) => {
      const newMode = scenario ? scenario.targetMode : s.mode;
      const newVehicleClass = scenario?.targetVehicleClass || s.vehicleClass;
      const newFuelType = scenario?.targetFuelType || s.fuelType;
      const ef = getEmissionFactor(newMode, newVehicleClass, newFuelType);
      const newEmissions = s.distance * s.weight * ef.factor;
      const newCost = s.distance * s.weight * getCostPerTonKm(newMode, newVehicleClass);

      return {
        shipmentId: s.shipmentId,
        origin: s.origin,
        destination: s.destination,
        distance: s.distance,
        originalMode: s.mode,
        newMode,
        originalVehicleClass: s.vehicleClass || '',
        newVehicleClass: newVehicleClass || '',
        originalFuelType: s.fuelType || '',
        newFuelType: newFuelType || '',
        weight: s.weight,
        originalCO2: s.co2Emissions?.toFixed(2) || '',
        newCO2: newEmissions.toFixed(2),
        emissionReduction: ((s.co2Emissions || 0) - newEmissions).toFixed(2),
        originalCost: s.costEstimate?.toFixed(0) || '',
        newCost: newCost.toFixed(0),
      };
    });

    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(','),
      ...rows.map((r: any) => headers.map((h) => `"${r[h]}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=optimized-shipments.csv');
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/scenarios', (_req, res) => {
  res.json(PRESET_SCENARIOS);
});

// Sample data
app.get('/api/sample-data', (_req, res) => {
  const shipments = generateSampleData(50);
  res.json({ shipments });
});

// ─── Supabase Persistence ─────────────────────────────────

app.get('/api/analyses', async (_req, res) => {
  if (!isSupabaseConfigured()) return res.json([]);
  const { data, error } = await supabase!.from('analyses').select('id, name, created_at, summary').order('created_at', { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/analyses/:id', async (req, res) => {
  if (!isSupabaseConfigured()) return res.status(404).json({ error: 'Supabase not configured' });
  const { data, error } = await supabase!.from('analyses').select('id, name, created_at, summary, shipments, insights, actions, confidence').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

app.post('/api/analyses', async (req, res) => {
  if (!isSupabaseConfigured()) return res.status(400).json({ error: 'Supabase not configured' });
  const { name, result } = req.body;
  const { data, error } = await supabase!.from('analyses').insert({
    name: name || 'Untitled Analysis',
    summary: result.summary,
    shipments: result.shipments,
    insights: result.insights,
    actions: result.actions,
    confidence: result.confidence,
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/analyses/:id', async (req, res) => {
  if (!isSupabaseConfigured()) return res.status(400).json({ error: 'Supabase not configured' });
  const { error } = await supabase!.from('analyses').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ─── CBAM Routes ────────────────────────────────────────────

app.get('/api/cbam/products', (_req, res) => {
  res.json(CBAM_PRODUCTS);
});

app.get('/api/cbam/installations', (_req, res) => {
  res.json(SAMPLE_INSTALLATIONS);
});

app.get('/api/cbam/sample-imports', (_req, res) => {
  res.json(SAMPLE_IMPORTS);
});

app.post('/api/cbam/calculate', (req, res) => {
  try {
    const { imports: importsData, useDefaults, year } = req.body as {
      imports: CBAMImport[];
      useDefaults: boolean;
      year: number;
    };
    if (!Array.isArray(importsData) || importsData.length === 0) {
      return res.status(400).json({ error: 'Provide imports array' });
    }

    const certificates = importsData.map((imp) => calculateCertificateCost(imp, useDefaults, year || 2026));
    const compliance = calculateCompliance(importsData, certificates, `${year || 2026}`);

    res.json({ certificates, compliance });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cbam/penalty', (req, res) => {
  try {
    const { country, sector, quantity, year } = req.body;
    const result = calculateDefaultPenalty(country, sector, quantity, year || 2026);
    if (!result) return res.status(404).json({ error: 'No default values for this country/sector' });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cbam/ets-prices', (_req, res) => {
  res.json(EU_ETS_PRICES);
});

app.get('/api/cbam/sector-intensity', (_req, res) => {
  res.json(SECTOR_EMISSION_INTENSITY);
});

// Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', supabase: isSupabaseConfigured() });
});

// Serve frontend in production
const frontendPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Carbon Platform API running on http://localhost:${PORT}`);
  console.log(`Supabase: ${isSupabaseConfigured() ? 'connected' : 'not configured (set SUPABASE_URL + SUPABASE_KEY)'}`);
});
