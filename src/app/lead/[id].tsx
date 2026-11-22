import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ActivityLog } from '@/components/activity-log';
import { ContactButtons } from '@/components/contact-buttons';
import { Documents } from '@/components/documents';
import { stageTone } from '@/components/list-items';
import { Badge, Button, Card, Chips, ErrorBox, H1, KeyValue, Loading, Muted, Row, Screen, Section } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { LEAD_STAGES, LINES, LOST_REASONS, label } from '@/lib/constants';
import { friendlyError, logActivity } from '@/lib/data';
import { confirm, notify } from '@/lib/dialog';
import { addDays, dateLabel, money, today } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Lead, LeadStage } from '@/lib/types';
import { must, useQuery } from '@/lib/useQuery';

export default function LeadDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [pickLost, setPickLost] = useState(false);
  const [activityKey, setActivityKey] = useState(0);
  const { data: lead, error, loading, reload } = useQuery<Lead>(async () => must(await supabase.from('leads').select('*').eq('id', id).single()), [id]);

  async function update(patch: Partial<Lead>, note?: string) {
    setBusy(true);
    try {
      must(await supabase.from('leads').update(patch).eq('id', id));
      if (note) await logActivity('lead', id, 'note', note);
      setActivityKey((k) => k + 1);
      await reload();
    } catch (e) {
      notify('Could not update', friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function changeStage(stage: LeadStage | null) {
    if (!stage || !lead || stage === lead.stage) return;
    if (stage === 'lost') {
      setPickLost(true);
      return;
    }
    if (stage === 'won') return convert();
    await update({ stage }, `Stage changed to ${label(LEAD_STAGES, stage)}`);
  }

  /** Won: create (or reuse) the client and open a new policy pre-filled from the lead. */
  async function convert() {
    if (!lead) return;
    setBusy(true);
    try {
      let clientId = lead.client_id;
      if (!clientId) {
        const c = must(
          await supabase
            .from('clients')
            .insert({
              name: lead.company || lead.name,
              client_type: lead.company ? 'company' : 'individual',
              contact_person: lead.company ? lead.name : null,
              phone: lead.phone,
              email: lead.email,
              city: lead.city,
              owner_id: lead.owner_id,
            })
            .select('id')
            .single(),
        ) as { id: string };
        clientId = c.id;
      }
      must(await supabase.from('leads').update({ stage: 'won', client_id: clientId, next_follow_up: null }).eq('id', id));
      await logActivity('lead', id, 'note', 'Lead won and converted to client');
      router.push({ pathname: '/policy/form', params: { clientId, leadId: id } });
    } catch (e) {
      notify('Could not convert', friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!(await confirm('Delete lead?', 'This cannot be undone.', 'Delete'))) return;
    try {
      must(await supabase.from('leads').delete().eq('id', id));
      router.back();
    } catch (e) {
      notify('Could not delete', friendlyError(e));
    }
  }

  if (loading && !lead) return <Loading />;
  if (error || !lead) return <Screen><ErrorBox message={error ?? 'Lead not found'} onRetry={reload} /></Screen>;
  const open = lead.stage !== 'won' && lead.stage !== 'lost';

  return (
    <Screen>
      <Stack.Screen options={{ title: lead.name }} />
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>{lead.name}</H1>
        <Badge text={label(LEAD_STAGES, lead.stage)} tone={stageTone(lead.stage)} />
      </Row>
      <ContactButtons phone={lead.phone} email={lead.email} entityType="lead" entityId={lead.id} onLogged={() => setActivityKey((k) => k + 1)} />

      <Card>
        <Chips label="Move to stage" options={LEAD_STAGES} value={lead.stage} onChange={changeStage} />
        {pickLost ? (
          <Chips
            label="Why was it lost?"
            options={LOST_REASONS}
            value={null}
            onChange={(r) => {
              setPickLost(false);
              if (r) update({ stage: 'lost', lost_reason: r, next_follow_up: null }, `Lost: ${r}`);
            }}
          />
        ) : null}
        {open ? (
          <>
            <Muted style={{ marginBottom: 6 }}>Next follow-up: {dateLabel(lead.next_follow_up)}</Muted>
            <Row>
              {[1, 3, 7, 30].map((d) => (
                <Button
                  key={d}
                  small
                  variant="secondary"
                  title={d === 1 ? 'Tomorrow' : `+${d} days`}
                  disabled={busy}
                  onPress={() => update({ next_follow_up: addDays(today(), d) }, `Follow-up set for ${dateLabel(addDays(today(), d))}`)}
                />
              ))}
            </Row>
          </>
        ) : null}
        {lead.stage === 'won' && lead.client_id ? (
          <Button title="Open client" small variant="secondary" style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => router.push(`/client/${lead.client_id}`)} />
        ) : null}
      </Card>

      <Section title="Details" right={<Button title="Edit" small variant="ghost" onPress={() => router.push({ pathname: '/lead/form', params: { id } })} />}>
        <Card>
          <KeyValue k="Company" v={lead.company} />
          <KeyValue k="Mobile" v={lead.phone} />
          <KeyValue k="Email" v={lead.email} />
          <KeyValue k="City" v={lead.city} />
          <KeyValue k="Line / product" v={[label(LINES, lead.line), lead.product].filter(Boolean).join(' · ')} />
          <KeyValue k="Expected premium" v={lead.expected_premium ? money(lead.expected_premium) : null} />
          <KeyValue k="Current insurer" v={lead.current_insurer} />
          <KeyValue k="Current expiry" v={lead.current_expiry ? dateLabel(lead.current_expiry) : null} />
          <KeyValue k="Source" v={lead.source} />
          {lead.stage === 'lost' ? <KeyValue k="Lost reason" v={lead.lost_reason} /> : null}
          <KeyValue k="Notes" v={lead.notes} />
          <KeyValue k="Created" v={dateLabel(lead.created_at.slice(0, 10))} />
        </Card>
      </Section>

      <ActivityLog entityType="lead" entityId={lead.id} refreshKey={activityKey} />
      <Documents entityType="lead" entityId={lead.id} />

      {profile?.role === 'admin' ? <Button title="Delete lead" variant="ghost" onPress={remove} /> : null}
    </Screen>
  );
}
