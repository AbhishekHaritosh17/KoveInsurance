import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Card, Empty, ErrorBox, Loading, Muted, Row, Screen, SearchBox, Strong } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/lib/types';
import { must, useQuery } from '@/lib/useQuery';

export default function Clients() {
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useQuery<Client[]>(async () => must(await supabase.from('clients').select('*').order('name').limit(2000)));
  const s = q.trim().toLowerCase();
  const rows = (data ?? []).filter((c) => !s || [c.name, c.phone, c.email, c.city, c.contact_person, c.gstin].some((x) => x?.toLowerCase().includes(s)));
  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <Row style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
        <Button title="+ New client" small onPress={() => router.push('/client/form')} />
      </Row>
      <SearchBox value={q} onChangeText={setQ} placeholder="Search name, phone, city, GSTIN" />
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {rows.map((c) => (
        <Card key={c.id} onPress={() => router.push(`/client/${c.id}`)}>
          <Strong>{c.name}</Strong>
          <Muted style={{ marginTop: 4 }}>{[c.client_type === 'company' ? 'Company' : 'Individual', c.contact_person, c.phone, c.city].filter(Boolean).join(' · ')}</Muted>
        </Card>
      ))}
      {data && rows.length === 0 ? <Empty text="No clients found." /> : null}
    </Screen>
  );
}
