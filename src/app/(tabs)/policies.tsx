import { router } from 'expo-router';
import { useState } from 'react';

import { POLICY_SELECT, PolicyItem } from '@/components/list-items';
import { Button, Chips, Empty, ErrorBox, Loading, Row, Screen, SearchBox } from '@/components/ui';
import { LINES } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { Line, Policy } from '@/lib/types';
import { must, useQuery } from '@/lib/useQuery';

type StatusFilter = 'active' | 'renewed' | 'expired' | 'all';

export default function Policies() {
  const [status, setStatus] = useState<StatusFilter>('active');
  const [line, setLine] = useState<Line | null>(null);
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useQuery<Policy[]>(async () => {
    let query = supabase.from('policies').select(POLICY_SELECT).order('end_date', { ascending: true }).limit(1000);
    if (status !== 'all') query = query.eq('status', status);
    if (line) query = query.eq('line', line);
    return must(await query);
  }, [status, line]);

  const s = q.trim().toLowerCase().replace(/\s+/g, '');
  const rows = (data ?? []).filter(
    (p) =>
      !s ||
      [p.clients?.name, p.policy_no, p.details?.vehicle_reg_no, p.product, p.insurers?.name, p.clients?.phone].some((x) =>
        x?.toLowerCase().replace(/\s+/g, '').includes(s),
      ),
  );

  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <Row style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
        <Button title="Clients" small variant="secondary" onPress={() => router.push('/clients')} />
        <Button title="+ New policy" small onPress={() => router.push('/policy/form')} />
      </Row>
      <SearchBox value={q} onChangeText={setQ} placeholder="Search client, policy no., vehicle no." />
      <Chips
        options={[
          { value: 'active', label: 'Active' },
          { value: 'renewed', label: 'Renewed' },
          { value: 'expired', label: 'Expired / Lost' },
          { value: 'all', label: 'All' },
        ]}
        value={status}
        onChange={(v) => setStatus((v as StatusFilter) ?? 'active')}
      />
      <Chips options={LINES} value={line} onChange={setLine} allowClear />
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {rows.map((p) => (
        <PolicyItem key={p.id} policy={p} />
      ))}
      {data && rows.length === 0 ? <Empty text="No policies found." action={<Button title="Add a policy" small onPress={() => router.push('/policy/form')} />} /> : null}
    </Screen>
  );
}
