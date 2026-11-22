import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, Card, Chips, DateField, Field, Loading, Muted, Picker, Screen, Section } from '@/components/ui';
import { LINES, PRODUCTS, detailFieldsFor } from '@/lib/constants';
import { fetchClientsLite, fetchInsurers, fetchProfiles, friendlyError, logActivity } from '@/lib/data';
import { notify } from '@/lib/dialog';
import { addDays, addYears, blankToNull, money, toNumber, today } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Client, Insurer, Lead, Line, Policy, Profile } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { must } from '@/lib/useQuery';

const num = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));

export default function PolicyForm() {
  const { id, clientId, leadId, renewFrom } = useLocalSearchParams<{ id?: string; clientId?: string; leadId?: string; renewFrom?: string }>();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(!!(id || renewFrom || leadId));
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name' | 'phone' | 'city'>[]>([]);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [team, setTeam] = useState<Profile[]>([]);

  const [client, setClient] = useState<string | null>(clientId ?? null);
  const [insurer, setInsurer] = useState<string | null>(null);
  const [line, setLine] = useState<Line>('motor');
  const [product, setProduct] = useState<string | null>(null);
  const [policyNo, setPolicyNo] = useState('');
  const [start, setStart] = useState<string | null>(today());
  const [end, setEnd] = useState<string | null>(addDays(addYears(today(), 1), -1));
  const [sumInsured, setSumInsured] = useState('');
  const [net, setNet] = useState('');
  const [gst, setGst] = useState('');
  const [gstTouched, setGstTouched] = useState(false);
  const [payment, setPayment] = useState<Policy['payment_status']>('pending');
  const [commPct, setCommPct] = useState('');
  const [details, setDetails] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [ownerId, setOwnerId] = useState<string | null>(profile?.id ?? null);
  const [previousId, setPreviousId] = useState<string | null>(null);

  useEffect(() => {
    fetchClientsLite().then(setClients).catch(() => {});
    fetchInsurers().then(setInsurers).catch(() => {});
    fetchProfiles().then(setTeam).catch(() => {});
    (async () => {
      try {
        const srcId = id ?? renewFrom;
        if (srcId) {
          const p = must(await supabase.from('policies').select('*').eq('id', srcId).single()) as Policy;
          setClient(p.client_id);
          setInsurer(p.insurer_id);
          setLine(p.line);
          setProduct(p.product);
          setSumInsured(num(p.sum_insured));
          setCommPct(num(p.commission_pct));
          setDetails(p.details ?? {});
          setOwnerId(p.owner_id);
          if (id) {
            setPolicyNo(p.policy_no ?? '');
            setStart(p.start_date);
            setEnd(p.end_date);
            setNet(num(p.net_premium));
            setGst(num(p.gst));
            setGstTouched(true);
            setPayment(p.payment_status);
            setNotes(p.notes ?? '');
          } else {
            // Renewal: new period starts the day after the old one ends.
            const s = p.end_date ? addDays(p.end_date, 1) : today();
            setStart(s);
            setEnd(addDays(addYears(s, 1), -1));
            setPreviousId(p.id);
            if (p.renewal_quote) setNet(String(p.renewal_quote));
            // Motor: bump NCB one step on a claim-free renewal is a manual decision; keep as is.
          }
        } else if (leadId) {
          const l = must(await supabase.from('leads').select('*').eq('id', leadId).single()) as Lead;
          setLine(l.line);
          setProduct(l.product);
          if (l.expected_premium) setNet(String(l.expected_premium));
          if (l.current_expiry) {
            const s = addDays(l.current_expiry, 1);
            setStart(s);
            setEnd(addDays(addYears(s, 1), -1));
          }
        }
      } catch (e) {
        notify('Could not load', friendlyError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, renewFrom, leadId]);

  const netN = toNumber(net) ?? 0;
  const gstN = gstTouched ? toNumber(gst) ?? 0 : Math.round(netN * 0.18 * 100) / 100;
  const total = netN + gstN;
  const commN = toNumber(commPct);
  const commAmount = commN !== null ? Math.round(netN * commN) / 100 : null;

  async function save() {
    if (!client) return notify('Please choose the client');
    if (!end) return notify('Please enter the expiry date');
    if (start && end < start) return notify('Expiry date is before the start date');
    setSaving(true);
    const cleanDetails: Record<string, string> = {};
    for (const [k, v] of Object.entries(details)) if (v && v.trim()) cleanDetails[k] = v.trim();
    if (cleanDetails.vehicle_reg_no) cleanDetails.vehicle_reg_no = cleanDetails.vehicle_reg_no.toUpperCase().replace(/\s+/g, '');
    const row = {
      client_id: client,
      insurer_id: insurer,
      line,
      product,
      policy_no: blankToNull(policyNo),
      start_date: start,
      end_date: end,
      sum_insured: toNumber(sumInsured),
      net_premium: net ? netN : null,
      gst: net || gst ? gstN : null,
      total_premium: net || gst ? total : null,
      payment_status: payment,
      commission_pct: commN,
      commission_amount: commAmount,
      details: cleanDetails,
      notes: blankToNull(notes),
      owner_id: ownerId,
    };
    try {
      if (id) {
        must(await supabase.from('policies').update(row).eq('id', id));
        router.back();
        return;
      }
      const created = must(
        await supabase
          .from('policies')
          .insert({ ...row, previous_policy_id: previousId, lead_id: leadId ?? null })
          .select('id')
          .single(),
      ) as { id: string };
      if (previousId) {
        must(
          await supabase
            .from('policies')
            .update({ status: 'renewed', renewal_stage: 'renewed', renewed_policy_id: created.id })
            .eq('id', previousId),
        );
        await logActivity('policy', previousId, 'note', 'Renewed');
      }
      router.replace(`/policy/${created.id}`);
    } catch (e) {
      notify('Could not save', friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;
  const fields = detailFieldsFor(line);

  return (
    <Screen>
      <Stack.Screen options={{ title: id ? 'Edit policy' : previousId ? 'Renew policy' : 'New policy' }} />
      {previousId ? <Muted style={{ marginBottom: 8 }}>Renewal: details copied from the expiring policy. Update premium and policy number.</Muted> : null}
      <Card>
        <Picker
          label="Client"
          required
          value={client}
          options={clients.map((c) => ({ value: c.id, label: c.name, sub: [c.phone, c.city].filter(Boolean).join(' · ') }))}
          onChange={setClient}
          onCreateNew={() => router.push({ pathname: '/client/form', params: { returnTo: 'policy' } })}
        />
        <Picker label="Insurer" value={insurer} options={insurers.map((i) => ({ value: i.id, label: i.name }))} onChange={setInsurer} />
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
        <Field label="Policy number" value={policyNo} onChangeText={setPolicyNo} autoCapitalize="characters" />
        <DateField
          label="Start date"
          value={start}
          onChange={(s) => {
            setStart(s);
            if (s) setEnd(addDays(addYears(s, 1), -1));
          }}
        />
        <DateField label="Expiry date" required value={end} onChange={setEnd} />
      </Card>

      {fields.length ? (
        <Section title={line === 'motor' ? 'Vehicle details' : 'Risk details'}>
          <Card>
            {fields.map((fd) =>
              fd.options ? (
                <Chips
                  key={fd.key}
                  label={fd.label}
                  options={fd.options}
                  value={details[fd.key] ?? null}
                  onChange={(v) => setDetails((d) => ({ ...d, [fd.key]: v ?? '' }))}
                  allowClear
                />
              ) : (
                <Field
                  key={fd.key}
                  label={fd.label}
                  value={details[fd.key] ?? ''}
                  onChangeText={(v) => setDetails((d) => ({ ...d, [fd.key]: v }))}
                  keyboardType={fd.numeric ? 'numeric' : 'default'}
                  autoCapitalize={fd.key === 'vehicle_reg_no' || fd.key.endsWith('_no') ? 'characters' : 'sentences'}
                />
              ),
            )}
          </Card>
        </Section>
      ) : null}

      <Section title="Premium">
        <Card>
          <Field label="Sum insured (₹)" value={sumInsured} onChangeText={setSumInsured} keyboardType="numeric" />
          <Field label="Net premium (₹)" value={net} onChangeText={setNet} keyboardType="numeric" />
          <Field
            label="GST (₹)"
            value={gstTouched ? gst : net ? String(gstN) : ''}
            onChangeText={(v) => {
              setGstTouched(true);
              setGst(v);
            }}
            keyboardType="numeric"
            hint={gstTouched ? undefined : 'Auto 18%. Type to override.'}
          />
          <Muted style={{ marginBottom: 12 }}>Total premium: {money(total)}</Muted>
          <Chips
            label="Payment"
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'paid', label: 'Paid' },
              { value: 'partial', label: 'Partial' },
            ]}
            value={payment}
            onChange={(v) => setPayment(v ?? 'pending')}
          />
          <Field label="Brokerage / commission %" value={commPct} onChangeText={setCommPct} keyboardType="numeric" hint={commAmount !== null ? `= ${money(commAmount)} on net premium` : undefined} />
        </Card>
      </Section>

      <Card>
        <Picker
          label="Relationship manager"
          value={ownerId}
          options={team.filter((p) => p.active).map((p) => ({ value: p.id, label: p.full_name || p.email || 'User' }))}
          onChange={setOwnerId}
        />
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      </Card>
      <Button title={id ? 'Save changes' : previousId ? 'Save renewal' : 'Create policy'} onPress={save} loading={saving} />
    </Screen>
  );
}
