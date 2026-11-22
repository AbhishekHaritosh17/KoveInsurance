export type Role = 'admin' | 'manager' | 'sales' | 'ops' | 'accounts';
export type Line = 'motor' | 'commercial' | 'health' | 'life' | 'other';
export type LeadStage = 'new' | 'contacted' | 'requirement' | 'quoted' | 'won' | 'lost';
export type RenewalStage = 'pending' | 'contacted' | 'quoted' | 'renewed' | 'lost';
export type EntityType = 'lead' | 'client' | 'policy';

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: Role;
  active: boolean;
}

export interface Insurer {
  id: string;
  name: string;
  short_code: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
}

export interface Client {
  id: string;
  client_type: 'individual' | 'company';
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  pan: string | null;
  gstin: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  parent_id: string | null;
  owner_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  line: Line;
  product: string | null;
  source: string | null;
  stage: LeadStage;
  expected_premium: number | null;
  current_insurer: string | null;
  current_expiry: string | null;
  next_follow_up: string | null;
  lost_reason: string | null;
  notes: string | null;
  owner_id: string | null;
  client_id: string | null;
  created_at: string;
}

export interface Policy {
  id: string;
  client_id: string;
  insurer_id: string | null;
  line: Line;
  product: string | null;
  policy_no: string | null;
  start_date: string | null;
  end_date: string | null;
  sum_insured: number | null;
  net_premium: number | null;
  gst: number | null;
  total_premium: number | null;
  payment_status: 'pending' | 'paid' | 'partial';
  status: 'active' | 'renewed' | 'expired' | 'cancelled';
  commission_pct: number | null;
  commission_amount: number | null;
  commission_received: boolean;
  details: Record<string, string>;
  renewal_stage: RenewalStage;
  renewal_quote: number | null;
  renewal_lost_reason: string | null;
  renewed_policy_id: string | null;
  previous_policy_id: string | null;
  lead_id: string | null;
  owner_id: string | null;
  notes: string | null;
  created_at: string;
  // joined
  clients?: Pick<Client, 'id' | 'name' | 'phone'> | null;
  insurers?: Pick<Insurer, 'id' | 'name' | 'short_code'> | null;
}

export interface Activity {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  kind: 'call' | 'whatsapp' | 'email' | 'meeting' | 'note';
  note: string;
  created_by: string | null;
  created_at: string;
}

export interface DocumentRow {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  file_path: string;
  file_name: string;
  doc_type: string;
  created_at: string;
}
