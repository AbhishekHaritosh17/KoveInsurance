import { router } from 'expo-router';
import { useState } from 'react';

import { LeadItem } from '@/components/list-items';
import { Button, Chips, Empty, ErrorBox, Loading, Row, Screen, SearchBox } from '@/components/ui';
import { LEAD_STAGES, LINES } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { Lead, LeadStage, Line } from '@/lib/types';
import { must, useQuery } from '@/lib/useQuery';

type StageFilter = 'open' | LeadStage | 'all';

export default function Leads() {
  const [stage, setStage] = useState<StageFilter>('open');
  const [line, setLine] = useState<Line | null>(null);
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useQuery<Lead[]>(async () => {
    let query = supabase.from('leads').select('*').order('next_follow_up', { ascending: true, nullsFirst: false }).limit(500);
    if (stage === 'open') query = query.not('stage', 'in', '(won,lost)');
    else if (stage !== 'all') query = query.eq('stage', stage);
    if (line) query = query.eq('line', line);
    return must(await query);
  }, [stage, line]);

  const s = q.trim().toLowerCase();
  const rows = (data ?? []).filter((l) => !s || [l.name, l.company, l.phone, l.email, l.product].some((x) => x?.toLowerCase().includes(s)));

  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <Row style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
        <Button title="+ New lead" small onPress={() => router.push('/lead/form')} />
      </Row>
      <SearchBox value={q} onChangeText={setQ} placeholder="Search name, company, phone" />
      <Chips
        options={[{ value: 'open', label: 'Open' }, ...LEAD_STAGES, { value: 'all', label: 'All' }] as { value: StageFilter; label: string }[]}
        value={stage}
        onChange={(v) => setStage(v ?? 'open')}
      />
      <Chips options={LINES} value={line} onChange={setLine} allowClear />
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {rows.map((l) => (
        <LeadItem key={l.id} lead={l} />
      ))}
      {data && rows.length === 0 ? <Empty text="No leads here yet." action={<Button title="Add a lead" small onPress={() => router.push('/lead/form')} />} /> : null}
    </Screen>
  );
}
