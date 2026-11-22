import type { LeadStage, Line, RenewalStage, Role } from './types';

export const LINES: { value: Line; label: string }[] = [
  { value: 'motor', label: 'Motor' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'health', label: 'Health' },
  { value: 'life', label: 'Life' },
  { value: 'other', label: 'Other' },
];

export const PRODUCTS: Record<Line, string[]> = {
  motor: ['Private Car', 'Two Wheeler', 'Goods Carrying Vehicle', 'Passenger Carrying Vehicle', 'Misc. / Special Vehicle'],
  commercial: [
    'Fire & Special Perils',
    'Industrial All Risk',
    'Burglary',
    'Marine Cargo',
    'Marine Open Policy',
    'Contractor All Risk',
    'Machinery Breakdown',
    'Public Liability',
    'Product Liability',
    'Directors & Officers',
    'Workmen Compensation',
    'Group Health',
    'Group Personal Accident',
    'Shopkeeper / Office Package',
    'Cyber',
  ],
  health: ['Individual Health', 'Family Floater', 'Senior Citizen', 'Top-up', 'Personal Accident'],
  life: ['Term', 'Endowment', 'ULIP', 'Pension'],
  other: ['Travel', 'Home', 'Other'],
};

export const LEAD_STAGES: { value: LeadStage; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'requirement', label: 'Requirement' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

export const RENEWAL_STAGES: { value: RenewalStage; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'renewed', label: 'Renewed' },
  { value: 'lost', label: 'Lost' },
];

export const LEAD_SOURCES = ['Walk-in', 'Referral', 'Existing client', 'Cold call', 'Website', 'Dealer / Partner', 'Other'];

export const LOST_REASONS = ['Price', 'Went to another broker', 'Direct with insurer', 'No response', 'Vehicle sold / risk ended', 'Other'];

export const ROLES: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'sales', label: 'Sales' },
  { value: 'ops', label: 'Operations' },
  { value: 'accounts', label: 'Accounts' },
];

export const DOC_TYPES = [
  { value: 'policy_copy', label: 'Policy copy' },
  { value: 'kyc', label: 'KYC' },
  { value: 'rc', label: 'RC / Vehicle' },
  { value: 'quote', label: 'Quote' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'claim', label: 'Claim' },
  { value: 'other', label: 'Other' },
];

/** Line-specific policy fields, stored in policies.details */
export interface DetailField {
  key: string;
  label: string;
  numeric?: boolean;
  options?: string[];
}

export const MOTOR_FIELDS: DetailField[] = [
  { key: 'vehicle_reg_no', label: 'Registration no.' },
  { key: 'make', label: 'Make' },
  { key: 'model', label: 'Model / Variant' },
  { key: 'mfg_year', label: 'Mfg. year', numeric: true },
  { key: 'fuel', label: 'Fuel', options: ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'] },
  { key: 'cover_type', label: 'Cover', options: ['Comprehensive', 'Third Party', 'Stand-alone OD'] },
  { key: 'idv', label: 'IDV (₹)', numeric: true },
  { key: 'ncb_pct', label: 'NCB %', options: ['0', '20', '25', '35', '45', '50'] },
  { key: 'od_premium', label: 'OD premium (₹)', numeric: true },
  { key: 'tp_premium', label: 'TP premium (₹)', numeric: true },
  { key: 'engine_no', label: 'Engine no.' },
  { key: 'chassis_no', label: 'Chassis no.' },
  { key: 'add_ons', label: 'Add-ons (zero dep, RSA…)' },
];

export const COMMERCIAL_FIELDS: DetailField[] = [
  { key: 'occupancy', label: 'Occupancy / Business' },
  { key: 'risk_location', label: 'Risk location' },
  { key: 'si_building', label: 'SI Building (₹)', numeric: true },
  { key: 'si_plant_machinery', label: 'SI Plant & Machinery (₹)', numeric: true },
  { key: 'si_stock', label: 'SI Stock (₹)', numeric: true },
  { key: 'si_other', label: 'SI Other (₹)', numeric: true },
  { key: 'employees', label: 'No. of employees / lives', numeric: true },
  { key: 'co_insurance', label: 'Co-insurance / share %' },
  { key: 'hypothecation', label: 'Bank / Hypothecation' },
  { key: 'deductible', label: 'Deductible / Excess' },
];

export function detailFieldsFor(line: string): DetailField[] {
  if (line === 'motor') return MOTOR_FIELDS;
  if (line === 'commercial') return COMMERCIAL_FIELDS;
  return [];
}

export const label = (list: { value: string; label: string }[], v: string | null | undefined) =>
  list.find((x) => x.value === v)?.label ?? v ?? '';
