import type { Shipment, AnalysisResult, ComparisonResult, SavedAnalysis, ComparisonScenario } from './types';

const API = '/api';

export async function analyzeShipments(shipments: Shipment[]): Promise<AnalysisResult> {
  const res = await fetch(`${API}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shipments }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadCSV(file: File): Promise<AnalysisResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API}/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getSampleData(): Promise<Shipment[]> {
  const res = await fetch(`${API}/sample-data`);
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).shipments;
}

export async function getScenarios(): Promise<ComparisonScenario[]> {
  const res = await fetch(`${API}/scenarios`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function runComparison(
  shipments: AnalysisResult['shipments'],
  scenarioId: string
): Promise<ComparisonResult> {
  const res = await fetch(`${API}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shipments, scenarioId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Supabase persistence
export async function listAnalyses(): Promise<SavedAnalysis[]> {
  const res = await fetch(`${API}/analyses`);
  if (!res.ok) return [];
  return res.json();
}

export async function getAnalysis(id: string): Promise<AnalysisResult> {
  const res = await fetch(`${API}/analyses/${id}`);
  if (!res.ok) throw new Error('Not found');
  return res.json();
}

export async function saveAnalysis(name: string, result: AnalysisResult): Promise<{ id: string }> {
  const res = await fetch(`${API}/analyses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, result }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteAnalysis(id: string): Promise<void> {
  await fetch(`${API}/analyses/${id}`, { method: 'DELETE' });
}

export async function exportOptimizedCSV(result: { affectedShipments: any[]; scenario: { id: string } }): Promise<void> {
  const res = await fetch(`${API}/export-csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shipments: result.affectedShipments, scenarioId: result.scenario.id }),
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `optimized-${result.scenario.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
