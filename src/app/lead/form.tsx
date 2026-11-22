import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, Card, Chips, DateField, Field, Loading, Picker, Screen } from '@/components/ui';
import { LEAD_SOURCES, LEAD_STAGES, LINES, LOST_REASONS, PRODUCTS } from '@/lib/constants';
import { fetchInsurers, fetchProfiles, friendlyError } from '@/lib/data';
import { notify } from '@/lib/dialog';
import { addDays, blankToNull, toNumber, today } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Insurer, Lead, LeadStage, Line, Profile } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { must } from '@/lib/useQuery';

export default function LeadForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [team, setTeam] = useState<Profile[]>([]);

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [line, setLine] = useState<Line>('motor');
  const [product, setProduct] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [stage, setStage] = useState<LeadStage>('new');
  const [expected, setExpected] = useState('');
  const [currentInsurer, setCurrentInsurer] = useState<string | null>(null);
  const [currentExpiry, setCurrentExpiry] = useState<string | null>(null);
  const [nextFollowUp, setNextFollowUp] = useState<string | null>(addDays(today(), 1));
  const [lostReason, setLostReason] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [ownerId, setOwnerId] = useState<string | null>(profile?.id ?? null);

  useEffect(() => {
    fetchInsurers().then(setInsurers).catch(() => {});
    fetchProfiles().then(setTeam).catch(() => {});
    if (!id) return;
    (async () => {
      try {
        const l = must(await supabase.from('leads').select('*').eq('id', id).single()) as Lead;
        setName(l.name);
        setCompany(l.company ?? '');
        setPhone(l.phone ?? '');
        setEmail(l.email ?? '');
        setCity(l.city ?? '');
        setLine(l.line);
        setProduct(l.product);
        setSource(l.source);
        setStage(l.stage);
        setExpected(l.expected_premium?.toString() ?? '');
        setCurrentInsurer(l.current_insurer);
        setCurrentExpiry(l.current_expiry);
        setNextFollowUp(l.next_follow_up);
        setLostReason(l.lost_reason);
        setNotes(l.notes ?? '');
        setOwnerId(l.owner_id);
      } catch (e) {
        notify('Could not load lead', friendlyError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function save() {
    if (!name.trim()) return notify('Name is required');
    if (stage === 'lost' && !lostReason) return notify('Please pick why the lead was lost');
    setSaving(true);
    const row = {
      name: name.trim(),
      company: blankToNull(company),
      phone: blankToNull(phone),
      email: blankToNull(email),
      city: blankToNull(city),
      line,
      product,
      source,
      stage,
      expected_premium: toNumber(expected),
      current_insurer: currentInsurer,
      current_expiry: currentExpiry,
      next_follow_up: stage === 'won' || stage === 'lost' ? null : nextFollowUp,
      lost_reason: stage === 'lost' ? lostReason : null,
      notes: blankToNull(notes),
      owner_id: ownerId,
    };
    try {
      if (id) {
        must(await supabase.from('leads').update(row).eq('id', id));
        router.back();
      } else {
        const created = must(await supabase.from('leads').insert(row).select('id').single()) as { id: string };
        router.replace(`/lead/${created.id}`);
      }
    } catch (e) {
      notify('Could not save', friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <Screen>
      <Stack.Screen options={{ title: id ? 'Edit lead' : 'New lead' }} />
      <Card>
        <Field label="Name" required value={name} onChangeText={setName} placeholder="Person or business name" />
        <Field label="Company" value={company} onChangeText={setCompany} />
        <Field label="Mobile" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Field label="City" value={city} onChangeText={setCity} />
      </Card>
      <Card>
        <Chips
          label="Line of business"
          options={LINES}
          value={line}
          onChange={(v) => {
            setLine(v ?? 'motor');
            setProduct(null);
          }}
        />
        <Chips label="Product" options={PRODUCTS[line]} value={product} onChange={setProduct} allowClear />
        <Field label="Expected premium (₹)" value={expected} onChangeText={setExpected} keyboardType="numeric" />
        <Picker
          label="Current insurer"
          value={currentInsurer}
          options={insurers.map((i) => ({ value: i.name, label: i.name }))}
          onChange={setCurrentInsurer}
          placeholder="If they already have a policy"
        />
        <DateField label="Current policy expiry" value={currentExpiry} onChange={setCurrentExpiry} />
        <Chips label="Source" options={LEAD_SOURCES} value={source} onChange={setSource} allowClear />
      </Card>
      <Card>
        <Chips label="Stage" options={LEAD_STAGES} value={stage} onChange={(v) => setStage(v ?? 'new')} />
        {stage === 'lost' ? <Chips label="Lost reason" options={LOST_REASONS} value={lostReason} onChange={setLostReason} /> : null}
        {stage !== 'won' && stage !== 'lost' ? <DateField label="Next follow-up" value={nextFollowUp} onChange={setNextFollowUp} /> : null}
        <Picker
          label="Assigned to"
          value={ownerId}
          options={team.filter((p) => p.active).map((p) => ({ value: p.id, label: p.full_name || p.email || 'User' }))}
          onChange={setOwnerId}
        />
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      </Card>
      <Button title={id ? 'Save changes' : 'Create lead'} onPress={save} loading={saving} />
    </Screen>
  );
}
