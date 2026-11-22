import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, Card, Chips, Field, Loading, Picker, Screen } from '@/components/ui';
import { fetchClientsLite, fetchProfiles, friendlyError } from '@/lib/data';
import { notify } from '@/lib/dialog';
import { blankToNull } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Client, Profile } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { must } from '@/lib/useQuery';

export default function ClientForm() {
  const { id, returnTo } = useLocalSearchParams<{ id?: string; returnTo?: string }>();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [team, setTeam] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [f, setF] = useState({
    client_type: 'individual' as Client['client_type'],
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    pan: '',
    gstin: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    notes: '',
    parent_id: null as string | null,
    owner_id: (profile?.id ?? null) as string | null,
  });
  const set = (k: keyof typeof f) => (v: string | null) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    fetchProfiles().then(setTeam).catch(() => {});
    fetchClientsLite().then((c) => setGroups(c.filter((x) => x.id !== id))).catch(() => {});
    if (!id) return;
    (async () => {
      try {
        const c = must(await supabase.from('clients').select('*').eq('id', id).single()) as Client;
        setF({
          client_type: c.client_type,
          name: c.name,
          contact_person: c.contact_person ?? '',
          phone: c.phone ?? '',
          email: c.email ?? '',
          pan: c.pan ?? '',
          gstin: c.gstin ?? '',
          address: c.address ?? '',
          city: c.city ?? '',
          state: c.state ?? '',
          pincode: c.pincode ?? '',
          notes: c.notes ?? '',
          parent_id: c.parent_id,
          owner_id: c.owner_id,
        });
      } catch (e) {
        notify('Could not load client', friendlyError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function save() {
    if (!f.name.trim()) return notify('Name is required');
    setSaving(true);
    const row = {
      client_type: f.client_type,
      name: f.name.trim(),
      contact_person: blankToNull(f.contact_person),
      phone: blankToNull(f.phone),
      email: blankToNull(f.email),
      pan: blankToNull(f.pan)?.toUpperCase() ?? null,
      gstin: blankToNull(f.gstin)?.toUpperCase() ?? null,
      address: blankToNull(f.address),
      city: blankToNull(f.city),
      state: blankToNull(f.state),
      pincode: blankToNull(f.pincode),
      notes: blankToNull(f.notes),
      parent_id: f.parent_id,
      owner_id: f.owner_id,
    };
    try {
      if (id) {
        must(await supabase.from('clients').update(row).eq('id', id));
        router.back();
      } else {
        const c = must(await supabase.from('clients').insert(row).select('id').single()) as { id: string };
        if (returnTo === 'policy') router.replace({ pathname: '/policy/form', params: { clientId: c.id } });
        else router.replace(`/client/${c.id}`);
      }
    } catch (e) {
      notify('Could not save', friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;
  const company = f.client_type === 'company';

  return (
    <Screen>
      <Stack.Screen options={{ title: id ? 'Edit client' : 'New client' }} />
      <Card>
        <Chips
          label="Type"
          options={[
            { value: 'individual', label: 'Individual' },
            { value: 'company', label: 'Company / Firm' },
          ]}
          value={f.client_type}
          onChange={(v) => set('client_type')(v ?? 'individual')}
        />
        <Field label={company ? 'Company name' : 'Full name'} required value={f.name} onChangeText={set('name')} />
        {company ? <Field label="Contact person" value={f.contact_person} onChangeText={set('contact_person')} /> : null}
        <Field label="Mobile" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
        <Field label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
        <Field label="PAN" value={f.pan} onChangeText={set('pan')} autoCapitalize="characters" />
        {company ? <Field label="GSTIN" value={f.gstin} onChangeText={set('gstin')} autoCapitalize="characters" /> : null}
      </Card>
      <Card>
        <Field label="Address" value={f.address} onChangeText={set('address')} multiline />
        <Field label="City" value={f.city} onChangeText={set('city')} />
        <Field label="State" value={f.state} onChangeText={set('state')} />
        <Field label="PIN code" value={f.pincode} onChangeText={set('pincode')} keyboardType="number-pad" />
      </Card>
      <Card>
        <Picker
          label="Group / Parent client"
          value={f.parent_id}
          options={[{ value: '', label: '— None —' }, ...groups.map((g) => ({ value: g.id, label: g.name }))]}
          onChange={(v) => set('parent_id')(v || null)}
          placeholder="e.g. family head or group company"
        />
        <Picker
          label="Relationship manager"
          value={f.owner_id}
          options={team.filter((p) => p.active).map((p) => ({ value: p.id, label: p.full_name || p.email || 'User' }))}
          onChange={set('owner_id')}
        />
        <Field label="Notes" value={f.notes} onChangeText={set('notes')} multiline />
      </Card>
      <Button title={id ? 'Save changes' : 'Create client'} onPress={save} loading={saving} />
    </Screen>
  );
}
