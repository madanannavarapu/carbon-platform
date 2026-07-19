// Sample CBAM data for demo — Indian exporters to EU
// ponytail: enough for UI to render, real data comes from user uploads

import { CBAMInstallation, CBAMImport, CBAMCertificate } from './cbam-types';

export const SAMPLE_INSTALLATIONS: CBAMInstallation[] = [
  {
    id: 'INST-001',
    name: 'Tata Steel - Jamshedpur Plant',
    country: 'IN',
    sector: 'iron-steel',
    emissions: { scope1: 1.25, scope2: 0.35, upstream: 0.25, total: 1.85 },
    verified: true,
    verificationDate: '2025-11-15',
  },
  {
    id: 'INST-002',
    name: 'Hindalco - Aditya Aluminium Smelter',
    country: 'IN',
    sector: 'aluminium',
    emissions: { scope1: 8.20, scope2: 3.80, upstream: 0.50, total: 12.50 },
    verified: false,
  },
  {
    id: 'INST-003',
    name: 'UltraTech Cement - Birla Corporation',
    country: 'IN',
    sector: 'cement',
    emissions: { scope1: 0.42, scope2: 0.12, upstream: 0.08, total: 0.62 },
    verified: true,
    verificationDate: '2026-01-20',
  },
  {
    id: 'INST-004',
    name: 'Rashtriya Ispat Nigam - Visakhapatnam Steel Plant',
    country: 'IN',
    sector: 'iron-steel',
    emissions: { scope1: 1.45, scope2: 0.42, upstream: 0.33, total: 2.20 },
    verified: false,
  },
  {
    id: 'INST-005',
    name: 'GAIL - Pata Ammonia Unit',
    country: 'IN',
    sector: 'fertilisers',
    emissions: { scope1: 3.20, scope2: 0.90, upstream: 0.40, total: 4.50 },
    verified: true,
    verificationDate: '2025-12-10',
  },
];

export const SAMPLE_IMPORTS: CBAMImport[] = [
  {
    id: 'IMP-001',
    installationId: 'INST-001',
    product: { cnCode: '7208', name: 'Flat-rolled products of iron/non-alloy steel', sector: 'iron-steel', unit: 'kg' },
    quantity: 500,
    country: 'IN',
    carbonPricePaid: 0,
  },
  {
    id: 'IMP-002',
    installationId: 'INST-002',
    product: { cnCode: '7604', name: 'Aluminium bars, rods and profiles', sector: 'aluminium', unit: 'kg' },
    quantity: 100,
    country: 'IN',
    carbonPricePaid: 0,
  },
  {
    id: 'IMP-003',
    installationId: 'INST-003',
    product: { cnCode: '2523', name: 'Cement (all types)', sector: 'cement', unit: 'kg' },
    quantity: 2000,
    country: 'IN',
    carbonPricePaid: 0,
  },
  {
    id: 'IMP-004',
    installationId: 'INST-004',
    product: { cnCode: '7207', name: 'Semi-finished products of iron/non-alloy steel', sector: 'iron-steel', unit: 'kg' },
    quantity: 800,
    country: 'IN',
    carbonPricePaid: 0,
  },
  {
    id: 'IMP-005',
    installationId: 'INST-005',
    product: { cnCode: '3102', name: 'Mineral or chemical fertilisers, nitrogenous', sector: 'fertilisers', unit: 'kg' },
    quantity: 300,
    country: 'IN',
    carbonPricePaid: 0,
  },
];
