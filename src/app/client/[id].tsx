import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ActivityLog } from '@/components/activity-log';
import { ContactButtons } from '@/components/contact-buttons';
import { Documents } from '@/components/documents';
import { POLICY_SELECT, PolicyItem } from '@/components/list-items';
import { Button, Card, ErrorBox, H1, KeyValue, Loading, Muted, Screen, Section } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/data';
import { confirm, notify } from '@/lib/dialog';
import { money } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Client, Policy } from '@/lib/types';
import { must, useQuery } from '@/lib/useQuery';

interface ClientData {
  client: Client & { parent?: { id: string; name: string } | null };
  policies: Policy[];
  members: { id: string; name: string }[];
}

export default function ClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [activityKey, setActivityKey] = useState(0);
  const { data, error, loading, reload } = useQuery<ClientData>(async () => {
    const [c, p, m] = await Promise.all([
      supabase.from('clients').select('*, parent:parent_id(id,name)').eq('id', id).single(),
      supabase.from('policies').select(POLICY_SELECT).eq('client_id', id).order('end_date', { ascending: false }),
      supabase.from('clients').select('id,name').eq('parent_id', id).order('name'),
    ]);
    return { client: must(c) as ClientData['client'], policies: must(p) as Policy[], members: must(m) as { id: string; name: string }[] };
  }, [id]);

  async function remove() {
    if (!(await confirm('Delete client?', 'Only possible when the client has no policies.', 'Delete'))) return;
    try {
      must(await supabase.from('clients').delete().eq('id', id));
      router.back();
    } catch (e) {
      notify('Could not delete', friendlyError(e));
    }
  }

  if (loading && !data) return <Loading />;
  if (error || !data) return <Screen><ErrorBox message={error ?? 'Client not found'} onRetry={reload} /></Screen>;
  const { client: c, policies, members } = data;
  const active = policies.filter((p) => p.status === 'active');
  const premium = active.reduce((s, p) => s + Number(p.total_premium ?? 0), 0);

  return (
    <Screen>
      <Stack.Screen options={{ title: c.name }} />
      <H1>{c.name}</H1>
      <ContactButtons phone={c.phone} email={c.email} entityType="client" entityId={c.id} onLogged={() => setActivityKey((k) => k + 1)} />
      <Muted style={{ marginBottom: 12 }}>
        {active.length} active {active.length === 1 ? 'policy' : 'policies'} · {money(premium)} total premium
      </Muted>

      <Section title="Policies" right={<Button title="+ Add policy" small onPress={() => router.push({ pathname: '/policy/form', params: { clientId: c.id } })} />}>
        {policies.length ? policies.map((p) => <PolicyItem key={p.id} policy={p} />) : <Muted>No policies yet.</Muted>}
      </Section>

      <Section title="Details" right={<Button title="Edit" small variant="ghost" onPress={() => router.push({ pathname: '/client/form', params: { id } })} />}>
        <Card>
          <KeyValue k="Type" v={c.client_type === 'company' ? 'Company / Firm' : 'Individual'} />
          {c.client_type === 'company' ? <KeyValue k="Contact person" v={c.contact_person} /> : null}
          <KeyValue k="Mobile" v={c.phone} />
          <KeyValue k="Email" v={c.email} />
          <KeyValue k="PAN" v={c.pan} />
          {c.client_type === 'company' ? <KeyValue k="GSTIN" v={c.gstin} /> : null}
          <KeyValue k="Address" v={[c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ')} />
          <KeyValue k="Group" v={c.parent?.name} />
          <KeyValue k="Notes" v={c.notes} />
        </Card>
        {members.length ? (
          <Card>
            <Muted style={{ marginBottom: 6 }}>Group members</Muted>
            {members.map((m) => (
              <Button key={m.id} title={m.name} small variant="ghost" style={{ alignSelf: 'flex-start' }} onPress={() => router.push(`/client/${m.id}`)} />
            ))}
          </Card>
        ) : null}
      </Section>

      <ActivityLog entityType="client" entityId={c.id} refreshKey={activityKey} />
      <Documents entityType="client" entityId={c.id} />
      {profile?.role === 'admin' ? <Button title="Delete client" variant="ghost" onPress={remove} /> : null}
    </Screen>
  );
}
