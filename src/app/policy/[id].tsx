import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ActivityLog } from '@/components/activity-log';
import { ContactButtons } from '@/components/contact-buttons';
import { Documents } from '@/components/documents';
import { dueText, dueTone, stageTone } from '@/components/list-items';
import { Badge, Button, Card, Chips, ErrorBox, Field, H1, KeyValue, Loading, Muted, Row, Screen, Section } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { LINES, LOST_REASONS, RENEWAL_STAGES, detailFieldsFor, label } from '@/lib/constants';
import { friendlyError, logActivity } from '@/lib/data';
import { confirm, notify } from '@/lib/dialog';
import { dateLabel, daysUntil, money, toNumber } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Client, Policy, RenewalStage } from '@/lib/types';
import { must, useQuery } from '@/lib/useQuery';

type PolicyFull = Policy & { clients: Pick<Client, 'id' | 'name' | 'phone' | 'email'> | null };

export default function PolicyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [activityKey, setActivityKey] = useState(0);
  const [quote, setQuote] = useState<string | null>(null);
  const [pickLost, setPickLost] = useState(false);
  const { data: p, error, loading, reload } = useQuery<PolicyFull>(
    async () => must(await supabase.from('policies').select('*, clients(id,name,phone,email), insurers(id,name,short_code)').eq('id', id).single()),
    [id],
  );

  async function update(patch: Partial<Policy>, note?: string) {
    try {
      must(await supabase.from('policies').update(patch).eq('id', id));
      if (note) await logActivity('policy', id, 'note', note);
      setActivityKey((k) => k + 1);
      reload();
    } catch (e) {
      notify('Could not update', friendlyError(e));
    }
  }

  function changeRenewal(stage: RenewalStage | null) {
    if (!stage || !p || stage === p.renewal_stage) return;
    if (stage === 'renewed') {
      router.push({ pathname: '/policy/form', params: { renewFrom: id } });
      return;
    }
    if (stage === 'lost') {
      setPickLost(true);
      return;
    }
    update({ renewal_stage: stage }, `Renewal stage: ${label(RENEWAL_STAGES, stage)}`);
  }

  async function remove() {
    if (!(await confirm('Delete policy?', 'This cannot be undone.', 'Delete'))) return;
    try {
      must(await supabase.from('policies').delete().eq('id', id));
      router.back();
    } catch (e) {
      notify('Could not delete', friendlyError(e));
    }
  }

  if (loading && !p) return <Loading />;
  if (error || !p) return <Screen><ErrorBox message={error ?? 'Policy not found'} onRetry={reload} /></Screen>;
  const d = daysUntil(p.end_date);
  const fields = detailFieldsFor(p.line);
  const canRenew = p.status === 'active' && p.renewal_stage !== 'renewed';

  return (
    <Screen>
      <Stack.Screen options={{ title: p.policy_no ?? 'Policy' }} />
      <H1>{p.clients?.name ?? 'Policy'}</H1>
      <Muted style={{ marginTop: -8, marginBottom: 8 }}>
        {[label(LINES, p.line), p.product, p.insurers?.name].filter(Boolean).join(' · ')}
      </Muted>
      <Row style={{ marginBottom: 12 }}>
        <Badge text={p.status} tone={p.status === 'active' ? 'success' : 'neutral'} />
        {p.status === 'active' ? <Badge text={`Expires ${dueText(d)}`} tone={dueTone(d)} /> : null}
        <Badge text={`Payment ${p.payment_status}`} tone={p.payment_status === 'paid' ? 'success' : 'warning'} />
      </Row>
      <ContactButtons phone={p.clients?.phone} email={p.clients?.email} entityType="policy" entityId={p.id} onLogged={() => setActivityKey((k) => k + 1)} />

      {canRenew ? (
        <Section title="Renewal">
          <Card>
            <Chips label="Stage" options={RENEWAL_STAGES} value={p.renewal_stage} onChange={changeRenewal} />
            {pickLost ? (
              <Chips
                label="Why was it lost?"
                options={LOST_REASONS}
                value={null}
                onChange={(r) => {
                  setPickLost(false);
                  if (r) update({ renewal_stage: 'lost', renewal_lost_reason: r, status: 'expired' }, `Renewal lost: ${r}`);
                }}
              />
            ) : null}
            <Field
              label="Renewal quote (net premium ₹)"
              value={quote ?? (p.renewal_quote?.toString() ?? '')}
              onChangeText={setQuote}
              keyboardType="numeric"
              onBlur={() => {
                if (quote !== null && toNumber(quote) !== p.renewal_quote) update({ renewal_quote: toNumber(quote), renewal_stage: p.renewal_stage === 'pending' || p.renewal_stage === 'contacted' ? 'quoted' : p.renewal_stage }, `Renewal quote ${money(toNumber(quote))}`);
              }}
            />
            <Button title="Renew now" onPress={() => router.push({ pathname: '/policy/form', params: { renewFrom: id } })} />
          </Card>
        </Section>
      ) : p.renewal_stage === 'lost' ? (
        <Card>
          <Muted>Renewal lost: {p.renewal_lost_reason ?? '—'}</Muted>
        </Card>
      ) : null}

      <Row style={{ marginBottom: 12 }}>
        {p.previous_policy_id ? <Button small variant="secondary" title="Previous year" onPress={() => router.push(`/policy/${p.previous_policy_id}`)} /> : null}
        {p.renewed_policy_id ? <Button small variant="secondary" title="Renewed policy" onPress={() => router.push(`/policy/${p.renewed_policy_id}`)} /> : null}
        {p.clients ? <Button small variant="secondary" title="Open client" onPress={() => router.push(`/client/${p.client_id}`)} /> : null}
      </Row>

      <Section title="Policy" right={<Button title="Edit" small variant="ghost" onPress={() => router.push({ pathname: '/policy/form', params: { id } })} />}>
        <Card>
          <KeyValue k="Policy no." v={p.policy_no} />
          <KeyValue k="Period" v={`${dateLabel(p.start_date)} – ${dateLabel(p.end_date)}`} />
          <KeyValue k="Sum insured" v={p.sum_insured ? money(p.sum_insured) : null} />
          <KeyValue k="Net premium" v={p.net_premium != null ? money(p.net_premium) : null} />
          <KeyValue k="GST" v={p.gst != null ? money(p.gst) : null} />
          <KeyValue k="Total premium" v={p.total_premium != null ? money(p.total_premium) : null} />
          <KeyValue k="Commission" v={p.commission_pct != null ? `${p.commission_pct}% · ${money(p.commission_amount)}${p.commission_received ? ' (received)' : ''}` : null} />
          <KeyValue k="Notes" v={p.notes} />
        </Card>
        {fields.length ? (
          <Card>
            {fields.map((f) => (
              <KeyValue key={f.key} k={f.label} v={f.numeric && p.details?.[f.key] && f.label.includes('₹') ? money(p.details[f.key]) : p.details?.[f.key]} />
            ))}
          </Card>
        ) : null}
        {p.commission_pct != null && !p.commission_received ? (
          <Button title="Mark commission received" small variant="secondary" style={{ alignSelf: 'flex-start' }} onPress={() => update({ commission_received: true }, 'Commission received')} />
        ) : null}
      </Section>

      <ActivityLog entityType="policy" entityId={p.id} refreshKey={activityKey} />
      <Documents entityType="policy" entityId={p.id} />
      {profile?.role === 'admin' ? <Button title="Delete policy" variant="ghost" onPress={remove} /> : null}
    </Screen>
  );
}
