import { useState, useRef, useCallback, useEffect } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Shipment, AnalysisResult, ComparisonResult, SavedAnalysis, ComparisonScenario, VehicleClass, FuelType, TransportMode, Action } from './types';
import {
  analyzeShipments, uploadCSV, getSampleData, getScenarios, runComparison,
  listAnalyses, getAnalysis, saveAnalysis, deleteAnalysis, exportOptimizedCSV,
} from './api';

const MODE_COLORS: Record<string, string> = { road: '#ef4444', rail: '#22c55e', air: '#f59e0b', sea: '#3b82f6' };
const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-700',
};

function fmt(n: number, d = 1): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: d });
}

// ─── Input Module ──────────────────────────────────────────

function InputModule({ onAnalyze, onAutoAnalyze }: { onAnalyze: (s: Shipment[]) => void; onAutoAnalyze: (s: Shipment[]) => void }) {
  const [tab, setTab] = useState<'sample' | 'form' | 'csv'>('sample');
  const [form, setForm] = useState({
    shipmentId: '', origin: '', destination: '', distance: '', mode: 'road' as TransportMode,
    weight: '', vehicleClass: 'hcv' as VehicleClass, fuelType: 'diesel' as FuelType,
  });
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addManual = () => {
    if (!form.origin || !form.destination || !form.distance || !form.weight) return;
    const s: Shipment = {
      id: `m-${Date.now()}`,
      shipmentId: form.shipmentId || `SHP-${Date.now().toString(36).toUpperCase()}`,
      origin: form.origin, destination: form.destination,
      distance: parseFloat(form.distance), mode: form.mode, weight: parseFloat(form.weight),
      vehicleClass: form.mode === 'road' ? form.vehicleClass : undefined,
      fuelType: form.fuelType,
    };
    setShipments((prev) => [...prev, s]);
    setForm({ ...form, shipmentId: '', origin: '', destination: '', distance: '', weight: '' });
  };

  const loadSample = async () => {
    const data = await getSampleData();
    onAutoAnalyze(data);
  };

  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { const r = await uploadCSV(file); onAnalyze(r.shipments); } catch { alert('CSV parse failed'); }
    setUploading(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-xl font-semibold mb-4">Add Shipments</h2>
      <div className="flex gap-1 mb-4 border-b pb-2 overflow-x-auto scrollbar-hide">
        {(['sample', 'form', 'csv'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 md:px-4 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap shrink-0 ${tab === t ? 'bg-emerald-600 text-white' : 'hover:bg-gray-100'}`}>
            {t === 'sample' ? 'Sample Data' : t === 'form' ? 'Manual Entry' : 'CSV Upload'}
          </button>
        ))}
      </div>

      {tab === 'sample' && (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">Load 50 sample shipments with realistic Indian logistics data</p>
          <button onClick={loadSample} className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition">
            Load Sample Data
          </button>
        </div>
      )}

      {tab === 'form' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input placeholder="Shipment ID" value={form.shipmentId} onChange={(e) => setForm({ ...form, shipmentId: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Origin" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input type="number" placeholder="Distance (km)" value={form.distance} onChange={(e) => setForm({ ...form, distance: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as TransportMode })} className="border rounded-lg px-3 py-2 text-sm">
            <option value="road">Road</option><option value="rail">Rail</option><option value="air">Air</option><option value="sea">Sea</option>
          </select>
          <input type="number" placeholder="Weight (tons)" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          {form.mode === 'road' && (
            <select value={form.vehicleClass} onChange={(e) => setForm({ ...form, vehicleClass: e.target.value as VehicleClass })} className="border rounded-lg px-3 py-2 text-sm">
              <option value="lcv">LCV (2-6t)</option><option value="mcv">MCV (6-16t)</option><option value="hcv">HCV (16-25t)</option><option value="trailer">Trailer (25t+)</option>
            </select>
          )}
          <select value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value as FuelType })} className="border rounded-lg px-3 py-2 text-sm">
            <option value="diesel">Diesel</option><option value="cng">CNG</option>
            {form.mode === 'rail' && <option value="electric">Electric</option>}
            {form.mode === 'air' && <option value="jet-fuel">Jet Fuel</option>}
            {form.mode === 'sea' && <><option value="hfo">HFO</option><option value="lng">LNG</option></>}
          </select>
          <button onClick={addManual} className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 transition col-span-2 md:col-span-1">Add Shipment</button>
          {shipments.length > 0 && <p className="col-span-4 text-sm text-gray-500">{shipments.length} shipments added</p>}
        </div>
      )}

      {tab === 'csv' && (
        <div className="text-center py-8 px-4">
          <p className="text-gray-500 mb-2 text-xs md:text-sm">CSV columns: shipmentId, origin, destination, distance, mode, weight, vehicleClass, fuelType</p>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition disabled:opacity-50">
            {uploading ? 'Processing...' : 'Choose CSV File'}
          </button>
        </div>
      )}

      {shipments.length > 0 && (
        <div className="mt-4 flex gap-3">
          <button onClick={() => onAnalyze(shipments)} className="bg-gray-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-gray-800 transition">
            Analyze {shipments.length} Shipments →
          </button>
          <button onClick={() => setShipments([])} className="text-gray-500 hover:text-gray-700 px-4 py-2.5 text-sm">Clear</button>
        </div>
      )}
    </div>
  );
}

// ─── History Panel ─────────────────────────────────────────

function HistoryPanel({ onLoad }: { onLoad: (id: string) => void }) {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAnalyses().then((d) => { setAnalyses(d); setLoading(false); });
  }, []);

  if (loading) return <div className="text-center py-4 text-gray-400 text-sm">Loading history...</div>;
  if (analyses.length === 0) return <div className="text-center py-4 text-gray-400 text-sm">No saved analyses yet</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-5">
      <h3 className="font-medium mb-3">Past Analyses</h3>
      <div className="space-y-2">
        {analyses.map((a) => (
          <div key={a.id} className="flex items-center justify-between border rounded-lg p-3 hover:bg-gray-50 cursor-pointer" onClick={() => onLoad(a.id)}>
            <div>
              <p className="font-medium text-sm">{a.name}</p>
              <p className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString('en-IN')} · {a.summary.totalShipments} shipments · {fmt(a.summary.totalEmissions)} kg CO₂</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); deleteAnalysis(a.id); setAnalyses((p) => p.filter((x) => x.id !== a.id)); }}
              className="text-gray-400 hover:text-red-500 text-xs">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────

function Dashboard({ data, onSave }: { data: AnalysisResult; onSave: (name: string) => void }) {
  const { summary, shipments, confidence, actions } = data;
  const modeData = Object.entries(summary.emissionsByMode).filter(([, v]) => v > 0).map(([mode, emissions]) => ({ name: mode, value: Math.round(emissions) }));
  const topRoutes = [...shipments].sort((a, b) => b.co2Emissions - a.co2Emissions).slice(0, 10).map((s) => ({ name: `${s.origin}→${s.destination}`, emissions: Math.round(s.co2Emissions) }));
  const [saveName, setSaveName] = useState('');
  const [saved, setSaved] = useState(false);

  const totalSavingEmissions = actions.reduce((sum, a) => sum + a.expectedEmissionReduction, 0);
  const totalSavingCost = actions.reduce((sum, a) => sum + Math.abs(a.estimatedCostImpact), 0);

  const confidenceColor = { high: 'bg-green-100 text-green-700 border-green-200', medium: 'bg-yellow-100 text-yellow-700 border-yellow-200', low: 'bg-red-100 text-red-700 border-red-200' }[confidence.score];
  const confidenceLabel = { high: 'High Confidence', medium: 'Medium Confidence', low: 'Low Confidence' }[confidence.score];

  return (
    <div className="space-y-6">
      {/* Savings Summary Banner */}
      {totalSavingEmissions > 0 && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 sm:p-5 text-white">
          <p className="text-sm font-medium opacity-90 mb-1">Potential Savings Identified</p>
          <div className="flex flex-wrap items-baseline gap-x-4 sm:gap-x-6 gap-y-1">
            <p className="text-2xl sm:text-3xl font-bold">₹{fmt(totalSavingCost, 0)}</p>
            <p className="text-base sm:text-lg font-semibold opacity-90">+ {fmt(totalSavingEmissions)} kg CO₂ reduction</p>
          </div>
          <p className="text-xs opacity-75 mt-2">Based on {actions.length} recommended actions · See Insights tab for details</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Shipments', value: summary.totalShipments, unit: '' },
          { label: 'Total CO₂', value: fmt(summary.totalEmissions), unit: 'kg' },
          { label: 'Total Distance', value: fmt(summary.totalDistance, 0), unit: 'km' },
          { label: 'Est. Cost', value: `₹${fmt(summary.totalCost, 0)}`, unit: '' },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{c.label}</p>
            <p className="text-2xl font-bold mt-1 break-words">{c.value}<span className="text-sm font-normal text-gray-400 ml-1">{c.unit}</span></p>
          </div>
        ))}
      </div>

      {/* Confidence Score */}
      <div className={`rounded-xl border p-4 ${confidenceColor}`}>
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold">{confidenceLabel} — {confidence.percentage}%</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {confidence.reasons.map((r, i) => (
            <span key={i} className="text-xs bg-white/60 rounded-full px-2.5 py-1">{r}</span>
          ))}
        </div>
      </div>

      {/* Audit Trail */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <h3 className="font-medium text-sm mb-3 text-gray-700">Audit Trail — Methodology & Sources</h3>
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs sm:text-sm text-gray-700 border border-gray-100 break-words">
          <p className="mb-2"><span className="font-semibold">Formula:</span> CO₂ (kg) = Distance (km) × Weight (tons) × Emission Factor (kg CO₂/ton-km)</p>
          <p className="mb-2"><span className="font-semibold">Standard:</span> ISO 14083 · TEMT (Transport Emission Measurement & Transparency) Methodology</p>
          <p className="mb-2"><span className="font-semibold">Emission Factor Sources:</span> ARAI, IR, IATA, IMO, PCS, MORTH</p>
          <p><span className="font-semibold">Version:</span> v1.0 · <span className="font-semibold">Date:</span> {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="font-medium mb-3">Emissions by Mode</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={modeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                {modeData.map((e) => <Cell key={e.name} fill={MODE_COLORS[e.name]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="font-medium mb-3">Top 10 Emission Routes</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topRoutes} layout="vertical" margin={{ left: 80 }}>
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="emissions" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Save */}
      <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <input placeholder="Analysis name..." value={saveName} onChange={(e) => setSaveName(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-0" />
        <button onClick={() => { onSave(saveName || 'Untitled'); setSaved(true); }} disabled={saved}
          className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50 whitespace-nowrap">
          {saved ? 'Saved!' : 'Save to History'}
        </button>
      </div>
    </div>
  );
}

// ─── Comparison Mode ───────────────────────────────────────

function ComparisonPanel({ data }: { data: AnalysisResult }) {
  const [scenarios, setScenarios] = useState<ComparisonScenario[]>([]);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { getScenarios().then(setScenarios); }, []);

  const run = async (scenarioId: string) => {
    setLoading(true);
    try { const r = await runComparison(data.shipments, scenarioId); setResult(r); } catch { alert('Comparison failed'); }
    setLoading(false);
  };

  const handleExport = async () => {
    if (!result) return;
    setExporting(true);
    try { await exportOptimizedCSV(result); } catch { alert('Export failed'); }
    setExporting(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-5">
      <h3 className="font-semibold text-lg mb-4">Compare Scenarios</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {scenarios.map((s) => (
          <button key={s.id} onClick={() => run(s.id)} disabled={loading}
            className="border-2 rounded-lg p-4 text-left hover:border-emerald-500 transition disabled:opacity-50">
            <p className="font-medium">{s.name}</p>
            <p className="text-xs text-gray-500 mt-1">{s.description}</p>
          </button>
        ))}
      </div>

      {result && (
        <div className="space-y-4">
          <div className="border rounded-lg p-5 bg-gray-50">
            <h4 className="font-medium mb-3">{result.scenario.name}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Original CO₂</p>
                <p className="font-bold">{fmt(result.originalEmissions)} kg</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Scenario CO₂</p>
                <p className="font-bold text-emerald-600">{fmt(result.scenarioEmissions)} kg</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Emission Reduction</p>
                <p className="font-bold text-emerald-600">-{fmt(result.emissionReduction)} kg ({result.emissionReductionPct.toFixed(1)}%)</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Cost Impact</p>
                <p className={`font-bold ${result.costDifference > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {result.costDifference > 0 ? `Save ₹${fmt(result.costDifference, 0)}` : `+₹${fmt(Math.abs(result.costDifference), 0)}`}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-3">{result.affectedShipments.length} shipments would be affected</p>
          </div>

          {result.beforeAfter.length > 0 && (
            <div className="border rounded-lg p-5">
              <h4 className="font-medium mb-3">Before vs After</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2 pr-4 font-medium">Metric</th>
                      <th className="py-2 pr-4 font-medium">Before</th>
                      <th className="py-2 font-medium">After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.beforeAfter.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-4 text-gray-700">{row.metric}</td>
                        <td className="py-2 pr-4">{row.before}</td>
                        <td className="py-2 text-emerald-600 font-medium">{row.after}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button onClick={handleExport} disabled={exporting}
            className="bg-gray-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-gray-800 transition text-sm disabled:opacity-50">
            {exporting ? 'Exporting...' : 'Export Optimized CSV'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Insights & Actions ─────────────────────────────────────

function InsightsPanel({ data }: { data: AnalysisResult }) {
  const quickWins = data.actions.filter((a) => a.category === 'quick-win');
  const strategic = data.actions.filter((a) => a.category === 'strategic');

  const ActionCard = ({ a }: { a: Action }) => (
    <div className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[a.priority]}`}>{a.priority.toUpperCase()}</span>
          <span className="text-xs text-gray-400 uppercase">{a.type.replace('-', ' ')}</span>
          {a.impactScore > 0 && (
            <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 font-medium">
              Impact: {(a.impactScore * 100).toFixed(0)}%
            </span>
          )}
        </div>
        <p className="font-medium break-words">{a.title}</p>
        <p className="text-sm text-gray-500 mt-1 break-words">{a.description}</p>
        {a.explainability && (
          <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 border border-gray-100">
            {a.explainability.currentFactorLabel}: {a.explainability.currentFactor} → {a.explainability.alternativeFactorLabel}: {a.explainability.alternativeFactor} kg CO₂/ton-km
            <span className="text-gray-400 ml-1">({a.explainability.source})</span>
          </div>
        )}
      </div>
      <div className="sm:text-right shrink-0 flex sm:flex-col items-baseline sm:items-end gap-2">
        <p className="text-emerald-600 font-semibold">-{fmt(a.expectedEmissionReduction)} kg CO₂</p>
        <p className="text-sm text-gray-500">Save ₹{fmt(Math.abs(a.estimatedCostImpact), 0)}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {quickWins.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-lg mb-1">Quick Wins</h3>
          <p className="text-xs text-gray-400 mb-4">High impact, low effort — do these first</p>
          <div className="space-y-3">{quickWins.map((a) => <ActionCard key={a.id} a={a} />)}</div>
        </div>
      )}
      {strategic.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-lg mb-1">Strategic Actions</h3>
          <p className="text-xs text-gray-400 mb-4">Longer-term, structural changes</p>
          <div className="space-y-3">{strategic.map((a) => <ActionCard key={a.id} a={a} />)}</div>
        </div>
      )}
      {data.actions.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-gray-400 text-sm">No actions — your data looks optimal.</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border p-5">
        <h3 className="font-semibold text-lg mb-4">Insights</h3>
        <div className="space-y-3">
          {data.insights.map((ins, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[ins.severity]}`}>{ins.severity.toUpperCase()}</span>
                <span className="text-xs text-gray-400 uppercase">{ins.type.replace(/-/g, ' ')}</span>
              </div>
              <p className="font-medium">{ins.title}</p>
              <p className="text-sm text-gray-500 mt-1">{ins.description}</p>
              {ins.explainability && (
                <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 border border-gray-100">
                  {ins.explainability.currentFactorLabel}: {ins.explainability.currentFactor} → {ins.explainability.alternativeFactorLabel}: {ins.explainability.alternativeFactor} kg CO₂/ton-km
                  <span className="text-gray-400 ml-1">({ins.explainability.source})</span>
                </div>
              )}
              <p className="text-sm text-emerald-600 mt-2">Potential: -{fmt(ins.potentialSaving.emissionReduction)} kg CO₂ ({ins.potentialSaving.percentage.toFixed(0)}% reduction)</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Report Generator (branded) ────────────────────────────

function ReportButton({ data }: { data: AnalysisResult }) {
  const generate = () => {
    const doc = new jsPDF();
    const { summary, insights, actions, shipments, confidence } = data;

    // Header bar
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.rect(0, 0, 210, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Carbon Intelligence Platform', 14, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('ISO 14083 Aligned · TEMT Methodology', 14, 26);
    doc.text(`Report Date: ${new Date().toLocaleDateString('en-IN')}`, 140, 26);

    // Reset color
    doc.setTextColor(0, 0, 0);

    let y = 44;

    // Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', 14, y);
    autoTable(doc, {
      startY: 48,
      head: [['Metric', 'Value']],
      body: [
        ['Total Shipments', String(summary.totalShipments)],
        ['Total Distance', `${fmt(summary.totalDistance, 0)} km`],
        ['Total Weight', `${fmt(summary.totalWeight)} tons`],
        ['Total CO₂ Emissions', `${fmt(summary.totalEmissions)} kg`],
        ['Estimated Cost', `₹${fmt(summary.totalCost, 0)}`],
        ['Avg Emission Factor', `${fmt(summary.avgEmissionPerTonKm, 4)} kg CO₂/ton-km`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
    });

    // Confidence Score
    y = (doc as any).lastAutoTable?.finalY + 10 || 100;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    const confLabel = confidence.score === 'high' ? 'HIGH' : confidence.score === 'medium' ? 'MEDIUM' : 'LOW';
    doc.text(`Data Confidence: ${confLabel} (${confidence.percentage}%)`, 14, y);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    confidence.reasons.forEach((r, i) => {
      doc.text(`• ${r}`, 14, y + 5 + (i * 4));
    });
    doc.setTextColor(0);

    // Audit Trail
    y = (doc as any).lastAutoTable?.finalY + 12 || y + 15 + (confidence.reasons.length * 4);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Audit Trail — Methodology & Sources', 14, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    doc.text('Formula: CO₂ (kg) = Distance (km) × Weight (tons) × Emission Factor (kg CO₂/ton-km)', 14, y); y += 5;
    doc.text('Standard: ISO 14083 · TEMT (Transport Emission Measurement & Transparency)', 14, y); y += 5;
    doc.text('Emission Factor Sources: ARAI, IR, IATA, IMO, PCS, MORTH', 14, y); y += 5;
    doc.text(`Version: v1.0 · Date: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`, 14, y);
    doc.setTextColor(0);

    // Mode Breakdown
    y = (doc as any).lastAutoTable?.finalY + 12 || y + 15 + (confidence.reasons.length * 4);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Emissions by Transport Mode', 14, y);
    y += 4;
    const modeRows = Object.entries(summary.emissionsByMode)
      .filter(([, v]) => v > 0)
      .map(([mode, emissions]) => [
        mode.charAt(0).toUpperCase() + mode.slice(1),
        `${fmt(emissions)} kg`,
        `${((emissions / summary.totalEmissions) * 100).toFixed(1)}%`,
      ]);
    autoTable(doc, { startY: y, head: [['Mode', 'CO₂ (kg)', 'Share']], body: modeRows, theme: 'grid', headStyles: { fillColor: [16, 185, 129] } });

    // Insights
    y = (doc as any).lastAutoTable?.finalY + 12 || 180;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Insights', 14, y);
    y += 4;
    if (insights.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Priority', 'Insight', 'Potential Saving']],
        body: insights.map((ins) => [ins.severity.toUpperCase(), ins.title, `-${fmt(ins.potentialSaving.emissionReduction)} kg CO₂`]),
        theme: 'grid', headStyles: { fillColor: [16, 185, 129] },
      });
    }

    // Actions
    y = (doc as any).lastAutoTable?.finalY + 12 || 240;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommended Actions', 14, y);
    y += 4;
    if (actions.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Priority', 'Action', 'Emission Reduction', 'Cost Impact']],
        body: actions.map((a) => [a.priority.toUpperCase(), a.title, `-${fmt(a.expectedEmissionReduction)} kg`, `₹${fmt(Math.abs(a.estimatedCostImpact), 0)} saved`]),
        theme: 'grid', headStyles: { fillColor: [16, 185, 129] },
      });
    }

    // Shipment table (page 2)
    doc.addPage();
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Shipment Details', 14, 13);
    doc.setTextColor(0, 0, 0);
    autoTable(doc, {
      startY: 24,
      head: [['ID', 'Origin', 'Dest', 'Mode', 'Vehicle', 'Fuel', 'Dist (km)', 'Weight (t)', 'CO₂ (kg)']],
      body: shipments.map((s) => [
        s.shipmentId, s.origin, s.destination, s.mode,
        s.vehicleClass || '-', s.fuelType || '-',
        String(s.distance), fmt(s.weight), fmt(s.co2Emissions),
      ]),
      theme: 'grid', styles: { fontSize: 7 }, headStyles: { fillColor: [16, 185, 129] },
    });

    // Footer on each page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text('Carbon Intelligence Platform · ISO 14083 · Confidential', 14, 290);
      doc.text(`Page ${i}/${pageCount}`, 180, 290);
    }

    doc.save('carbon-emissions-report.pdf');
  };

  return (
    <button onClick={generate} className="bg-gray-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-gray-800 transition text-sm">
      Download PDF Report
    </button>
  );
}

// ─── App ────────────────────────────────────────────────────

type View = 'input' | 'dashboard' | 'insights' | 'compare' | 'report';

export default function App() {
  const [view, setView] = useState<View>('input');
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = useCallback(async (shipments: Shipment[]) => {
    setLoading(true);
    try { const r = await analyzeShipments(shipments); setData(r); setView('dashboard'); }
    catch (e: any) { alert('Analysis failed: ' + e.message); }
    setLoading(false);
  }, []);

  const handleSave = useCallback(async (name: string) => {
    if (!data) return;
    try { await saveAnalysis(name, data); } catch { alert('Save failed'); }
  }, [data]);

  const handleLoadHistory = useCallback(async (id: string) => {
    setLoading(true);
    try { const r = await getAnalysis(id); setData(r); setView('dashboard'); }
    catch { alert('Load failed'); }
    setLoading(false);
  }, []);

  const handleAutoAnalyze = useCallback(async (shipments: Shipment[]) => {
    setLoading(true);
    try { const r = await analyzeShipments(shipments); setData(r); setView('insights'); }
    catch (e: any) { alert('Analysis failed: ' + e.message); }
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2 md:mb-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">C</div>
              <h1 className="text-base md:text-lg font-bold text-gray-900">
                <span className="text-emerald-600">Carbon</span><span className="hidden sm:inline"> Intelligence Platform</span>
              </h1>
            </div>
          </div>
          {data && (
            <nav className="flex gap-1 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
              {([['input', 'Input'], ['dashboard', 'Dashboard'], ['compare', 'Compare'], ['insights', 'Insights'], ['report', 'Report']] as const).map(([v, label]) => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap shrink-0 ${view === v ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {label}
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 mt-3">Analyzing emissions...</p>
          </div>
        )}

        {!loading && view === 'input' && (
          <div className="space-y-6">
            <InputModule onAnalyze={handleAnalyze} onAutoAnalyze={handleAutoAnalyze} />
            <HistoryPanel onLoad={handleLoadHistory} />
          </div>
        )}
        {!loading && view === 'dashboard' && data && <Dashboard data={data} onSave={handleSave} />}
        {!loading && view === 'compare' && data && <ComparisonPanel data={data} />}
        {!loading && view === 'insights' && data && <InsightsPanel data={data} />}
        {!loading && view === 'report' && data && (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Download Report</h2>
            <p className="text-gray-500 mb-6">Client-ready PDF with branding, summary, insights, and recommended actions.</p>
            <ReportButton data={data} />
          </div>
        )}
      </main>
    </div>
  );
}
