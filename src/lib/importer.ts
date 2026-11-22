/**
 * Excel import: turns spreadsheet rows into clients, leads or policies.
 * Column headers are matched loosely ("Policy No", "policy number", "POLICY_NO" all work).
 */
import * as XLSX from 'xlsx';

import { parseDate, toNumber } from './format';
import type { Line } from './types';

export type ImportKind = 'policies' | 'clients' | 'leads';

interface ColumnDef {
  key: string;
  label: string;
  aliases: string[];
  required?: boolean;
}

const C = (key: string, label: string, aliases: string[], required = false): ColumnDef => ({ key, label, aliases: [label, ...aliases], required });

const CLIENT_COLS: ColumnDef[] = [
  C('client_name', 'Client Name', ['client', 'insured name', 'insured', 'customer name', 'customer', 'proposer name', 'proposer', 'name'], true),
  C('phone', 'Mobile', ['mobile no', 'mobile number', 'phone', 'phone no', 'contact no', 'contact number', 'contact']),
  C('email', 'Email', ['email id', 'e-mail', 'mail']),
  C('client_type', 'Client Type', ['type', 'individual/company']),
  C('contact_person', 'Contact Person', []),
  C('pan', 'PAN', ['pan no', 'pan number']),
  C('gstin', 'GSTIN', ['gst no', 'gst number']),
  C('address', 'Address', []),
  C('city', 'City', ['location']),
  C('state', 'State', []),
  C('pincode', 'PIN Code', ['pin', 'pincode', 'zip']),
];

const POLICY_COLS: ColumnDef[] = [
  ...CLIENT_COLS.filter((c) => ['client_name', 'phone', 'email', 'city'].includes(c.key)),
  C('policy_no', 'Policy No', ['policy number', 'policy']),
  C('insurer', 'Insurer', ['insurance company', 'insurer name', 'insurance co', 'ic', 'company name']),
  C('line', 'Line', ['lob', 'line of business', 'department', 'segment']),
  C('product', 'Product', ['policy type', 'plan', 'product name', 'cover']),
  C('start_date', 'Start Date', ['risk start date', 'risk start', 'start', 'inception date', 'from date', 'policy start date']),
  C('end_date', 'Expiry Date', ['end date', 'expiry', 'risk end date', 'to date', 'renewal date', 'valid till', 'policy end date', 'due date'], true),
  C('sum_insured', 'Sum Insured', ['si', 'sum assured']),
  C('net_premium', 'Net Premium', ['premium', 'net', 'basic premium']),
  C('gst', 'GST', ['tax', 'gst amount', 'service tax']),
  C('total_premium', 'Total Premium', ['gross premium', 'total', 'premium with gst', 'final premium']),
  C('commission_pct', 'Commission %', ['commission', 'brokerage %', 'brokerage', 'comm %']),
  C('vehicle_reg_no', 'Vehicle No', ['registration no', 'reg no', 'vehicle number', 'registration number', 'vehicle reg no', 'rto no']),
  C('make', 'Make', ['manufacturer', 'vehicle make']),
  C('model', 'Model', ['vehicle model', 'variant', 'model/variant']),
  C('mfg_year', 'Mfg Year', ['year', 'manufacturing year', 'year of manufacture', 'yom']),
  C('fuel', 'Fuel', ['fuel type']),
  C('idv', 'IDV', ['insured declared value']),
  C('ncb_pct', 'NCB %', ['ncb']),
  C('od_premium', 'OD Premium', ['own damage premium', 'od']),
  C('tp_premium', 'TP Premium', ['third party premium', 'tp']),
  C('occupancy', 'Occupancy', ['business', 'nature of business']),
  C('risk_location', 'Risk Location', ['risk address', 'location of risk']),
  C('notes', 'Remarks', ['notes', 'remark', 'comments']),
];

const LEAD_COLS: ColumnDef[] = [
  C('name', 'Name', ['lead name', 'client name', 'customer name', 'prospect'], true),
  C('company', 'Company', ['company name', 'firm']),
  C('phone', 'Mobile', ['mobile no', 'phone', 'contact no', 'contact']),
  C('email', 'Email', ['email id']),
  C('city', 'City', []),
  C('line', 'Line', ['lob', 'line of business']),
  C('product', 'Product', ['policy type', 'requirement']),
  C('source', 'Source', ['lead source', 'reference']),
  C('expected_premium', 'Expected Premium', ['premium', 'expected']),
  C('current_insurer', 'Current Insurer', ['existing insurer', 'insurer']),
  C('current_expiry', 'Current Expiry', ['expiry date', 'expiry', 'renewal date']),
  C('next_follow_up', 'Next Follow-up', ['follow up', 'follow up date', 'followup']),
  C('notes', 'Remarks', ['notes', 'remark', 'comments']),
];

export const COLUMNS: Record<ImportKind, ColumnDef[]> = {
  policies: POLICY_COLS,
  clients: CLIENT_COLS,
  leads: LEAD_COLS,
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9%]/g, '');

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, unknown>[];
  /** our field key -> the spreadsheet header it came from */
  mapping: Record<string, string>;
  unmatchedHeaders: string[];
  missingRequired: string[];
}

export function readWorkbook(bytes: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(bytes, { type: 'array', cellDates: true });
  const first = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(first, { defval: '', raw: true });
}

export function mapColumns(kind: ImportKind, rawRows: Record<string, unknown>[]): ParsedSheet {
  const headers = rawRows.length ? Object.keys(rawRows[0]) : [];
  const cols = COLUMNS[kind];
  const mapping: Record<string, string> = {};
  const used = new Set<string>();
  // Pass 1: exact label matches win, then aliases in order.
  for (const col of cols) {
    for (const alias of col.aliases) {
      const h = headers.find((x) => !used.has(x) && norm(x) === norm(alias));
      if (h) {
        mapping[col.key] = h;
        used.add(h);
        break;
      }
    }
  }
  const rows = rawRows
    .map((r) => {
      const out: Record<string, unknown> = {};
      for (const [key, h] of Object.entries(mapping)) out[key] = typeof r[h] === 'string' ? (r[h] as string).trim() : r[h];
      return out;
    })
    // skip blank lines
    .filter((r) => Object.values(r).some((v) => v !== '' && v !== null && v !== undefined));
  return {
    headers,
    rows,
    mapping,
    unmatchedHeaders: headers.filter((h) => !used.has(h)),
    missingRequired: cols.filter((c) => c.required && !mapping[c.key]).map((c) => c.label),
  };
}

export function normalizeLine(v: unknown, hasVehicle: boolean): Line {
  const s = String(v ?? '').toLowerCase();
  if (/motor|car|vehicle|two ?wheeler|bike|gcv|pcv/.test(s)) return 'motor';
  if (/health|mediclaim|floater/.test(s) && !/group/.test(s)) return 'health';
  if (/life|term|ulip|endowment/.test(s)) return 'life';
  if (s) return 'commercial';
  return hasVehicle ? 'motor' : 'commercial';
}

const str = (v: unknown) => {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  return s === '' ? null : s;
};

const phoneStr = (v: unknown) => {
  const s = str(v);
  if (!s) return null;
  // Excel often stores mobiles as numbers like 9876543210 or 9.87654321E9
  return typeof v === 'number' ? String(Math.round(v)) : s;
};

export interface RowIssue {
  row: number; // 1-based spreadsheet row (header is row 1)
  message: string;
}

export function validate(kind: ImportKind, rows: Record<string, unknown>[]): RowIssue[] {
  const issues: RowIssue[] = [];
  rows.forEach((r, i) => {
    const n = i + 2;
    if (kind === 'policies') {
      if (!str(r.client_name)) issues.push({ row: n, message: 'Client name is empty' });
      if (!parseDate(r.end_date)) issues.push({ row: n, message: `Expiry date "${str(r.end_date) ?? ''}" not understood` });
      if (str(r.start_date) && !parseDate(r.start_date)) issues.push({ row: n, message: `Start date "${str(r.start_date)}" not understood` });
    } else if (kind === 'clients') {
      if (!str(r.client_name)) issues.push({ row: n, message: 'Client name is empty' });
    } else if (!str(r.name)) {
      issues.push({ row: n, message: 'Name is empty' });
    }
  });
  return issues;
}

export function toClientRow(r: Record<string, unknown>) {
  const type = String(r.client_type ?? '').toLowerCase();
  const gstin = str(r.gstin)?.toUpperCase() ?? null;
  return {
    name: str(r.client_name)!,
    client_type: type.startsWith('c') || type.startsWith('f') || (gstin && !type) ? ('company' as const) : ('individual' as const),
    contact_person: str(r.contact_person),
    phone: phoneStr(r.phone),
    email: str(r.email),
    pan: str(r.pan)?.toUpperCase() ?? null,
    gstin,
    address: str(r.address),
    city: str(r.city),
    state: str(r.state),
    pincode: phoneStr(r.pincode),
  };
}

const MOTOR_KEYS = ['vehicle_reg_no', 'make', 'model', 'mfg_year', 'fuel', 'idv', 'ncb_pct', 'od_premium', 'tp_premium'];
const COMMERCIAL_KEYS = ['occupancy', 'risk_location'];

export function toPolicyRow(r: Record<string, unknown>) {
  const details: Record<string, string> = {};
  for (const k of [...MOTOR_KEYS, ...COMMERCIAL_KEYS]) {
    const v = k === 'mfg_year' || k === 'idv' || k.endsWith('_premium') || k === 'ncb_pct' ? phoneStr(r[k]) : str(r[k]);
    if (v) details[k] = k === 'vehicle_reg_no' ? v.toUpperCase().replace(/\s+/g, '') : v;
  }
  const net = toNumber(r.net_premium);
  let gst = toNumber(r.gst);
  let total = toNumber(r.total_premium);
  if (net !== null && gst === null && total !== null) gst = Math.round((total - net) * 100) / 100;
  if (net !== null && gst !== null && total === null) total = net + gst;
  const commPct = toNumber(String(r.commission_pct ?? '').replace('%', ''));
  return {
    line: normalizeLine(r.line, !!details.vehicle_reg_no),
    product: str(r.product),
    policy_no: str(r.policy_no),
    start_date: parseDate(r.start_date),
    end_date: parseDate(r.end_date),
    sum_insured: toNumber(r.sum_insured),
    net_premium: net,
    gst,
    total_premium: total,
    commission_pct: commPct,
    commission_amount: commPct !== null && net !== null ? Math.round(net * commPct) / 100 : null,
    details,
    notes: str(r.notes),
    insurerName: str(r.insurer),
  };
}

export function toLeadRow(r: Record<string, unknown>) {
  return {
    name: str(r.name)!,
    company: str(r.company),
    phone: phoneStr(r.phone),
    email: str(r.email),
    city: str(r.city),
    line: normalizeLine(r.line, false),
    product: str(r.product),
    source: str(r.source),
    expected_premium: toNumber(r.expected_premium),
    current_insurer: str(r.current_insurer),
    current_expiry: parseDate(r.current_expiry),
    next_follow_up: parseDate(r.next_follow_up),
    notes: str(r.notes),
  };
}

/** Finds an insurer by name or short code, tolerant of "ICICI" vs "ICICI Lombard General Insurance". */
export function matchInsurer(name: string | null, insurers: { id: string; name: string; short_code: string | null }[]): string | null {
  if (!name) return null;
  const n = norm(name);
  const exact = insurers.find((i) => norm(i.name) === n || (i.short_code && norm(i.short_code) === n));
  if (exact) return exact.id;
  const partial = insurers.find((i) => norm(i.name).includes(n) || n.includes(norm(i.name).replace(/generalinsurance|insurance|company|limited|ltd/g, '')));
  return partial?.id ?? null;
}

export function templateWorkbook(kind: ImportKind) {
  const cols = COLUMNS[kind];
  const sample: Record<ImportKind, Record<string, string | number>> = {
    policies: {
      'Client Name': 'Ramesh Traders',
      Mobile: '9876543210',
      'Policy No': 'OG-25-1234-5678',
      Insurer: 'ICICI Lombard',
      Line: 'Motor',
      Product: 'Goods Carrying Vehicle',
      'Start Date': '01-04-2025',
      'Expiry Date': '31-03-2026',
      'Net Premium': 25000,
      GST: 4500,
      'Total Premium': 29500,
      'Commission %': 15,
      'Vehicle No': 'MH12AB1234',
      Make: 'Tata',
      Model: 'Ace Gold',
      'Mfg Year': 2022,
      IDV: 450000,
      'NCB %': 20,
    },
    clients: { 'Client Name': 'Ramesh Traders', Mobile: '9876543210', 'Client Type': 'Company', 'Contact Person': 'Ramesh Shah', City: 'Pune', GSTIN: '27ABCDE1234F1Z5' },
    leads: { Name: 'Suresh Patel', Company: 'Patel Logistics', Mobile: '9822012345', Line: 'Motor', Product: 'Goods Carrying Vehicle', Source: 'Referral', 'Current Expiry': '15-01-2026' },
  };
  const header = cols.map((c) => c.label);
  const sheet = XLSX.utils.json_to_sheet([sample[kind]], { header });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, kind);
  return wb;
}
