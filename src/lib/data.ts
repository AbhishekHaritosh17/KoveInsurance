import { supabase } from './supabase';
import type { Client, EntityType, Insurer, Profile } from './types';
import { must } from './useQuery';

export async function fetchInsurers(): Promise<Insurer[]> {
  return must(await supabase.from('insurers').select('*').order('name'));
}

export async function fetchClientsLite(): Promise<Pick<Client, 'id' | 'name' | 'phone' | 'city'>[]> {
  return must(await supabase.from('clients').select('id,name,phone,city').order('name').limit(5000));
}

export async function fetchProfiles(): Promise<Profile[]> {
  return must(await supabase.from('profiles').select('*').order('full_name'));
}

export async function logActivity(entity_type: EntityType, entity_id: string, kind: string, note: string) {
  must(await supabase.from('activities').insert({ entity_type, entity_id, kind, note }));
}

/** Supabase errors are often technical; make the common ones readable. */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes('row-level security')) return 'You do not have permission to do this. Ask your admin.';
  if (msg.includes('violates foreign key') && msg.includes('policies')) return 'This record has policies linked to it, so it cannot be deleted.';
  if (msg.includes('Failed to fetch') || msg.includes('Network request failed')) return 'No internet connection. Please try again.';
  return msg;
}
