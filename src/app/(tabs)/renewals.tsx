import { useState } from 'react';
import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

import { POLICY_SELECT, PolicyItem } from '@/components/list-items';
import { Button, Chips, Empty, ErrorBox, Loading, Muted, Row, Screen } from '@/components/ui';
import { LINES, RENEWAL_STAGES, label } from '@/lib/constants';
import { addDays, money, today } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Line, Policy } from '@/lib/types';
import { must, useQuery } from '@/lib/useQuery';

type Window = 'overdue' | '7' | '15' | '30' | '60' | '90';
const WINDOWS: { value: Window; label: string }[] = [
  { value: 'overdue', label: 'Expired' },
  { value: '7', label: '7 days' },
  { value: '15', label: '15 days' },
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
];

export default function Renewals() {
  const [win, setWin] = useState<Window>('30');
  const [line, setLine] = useState<Line | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const { data, error, loading, reload } = useQuery<Policy[]>(async () => {
    const t = today();
    let query = supabase.from('policies').select(POLICY_SELECT).order('end_date').limit(1000);
    if (win === 'overdue') query = query.lt('end_date', t).gte('end_date', addDays(t, -90));
    else query = query.gte('end_date', t).lte('end_date', addDays(t, Number(win)));
    if (!showClosed) query = query.eq('status', 'active').not('renewal_stage', 'in', '(renewed,lost)');
    if (line) query = query.eq('line', line);
    return must(await query);
  }, [win, line, showClosed]);

  const rows = data ?? [];
  const premium = rows.reduce((s, p) => s + Number(p.total_premium ?? 0), 0);

  function exportExcel() {
    const sheet = XLSX.utils.json_to_sheet(
      rows.map((p) => ({
        Client: p.clients?.name ?? '',
        Mobile: p.clients?.phone ?? '',
        Line: label(LINES, p.line),
        Product: p.product ?? '',
        'Vehicle no.': p.details?.vehicle_reg_no ?? '',
        Insurer: p.insurers?.name ?? '',
        'Policy no.': p.policy_no ?? '',
        Expiry: p.end_date ?? '',
        'Total premium': p.total_premium ?? '',
        'Renewal stage': label(RENEWAL_STAGES, p.renewal_stage),
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Renewals');
    XLSX.writeFile(wb, `renewals-${today()}.xlsx`);
  }

  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <Chips options={WINDOWS} value={win} onChange={(v) => setWin(v ?? '30')} />
      <Chips options={LINES} value={line} onChange={setLine} allowClear />
      <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <Muted>
          {rows.length} {rows.length === 1 ? 'policy' : 'policies'} · {money(premium)}
        </Muted>
        <Row>
          <Button small variant="ghost" title={showClosed ? 'Hide done' : 'Show done'} onPress={() => setShowClosed((s) => !s)} />
          {Platform.OS === 'web' && rows.length ? <Button small variant="secondary" title="Export Excel" onPress={exportExcel} /> : null}
        </Row>
      </Row>
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {rows.map((p) => (
        <PolicyItem key={p.id} policy={p} showRenewal />
      ))}
      {data && rows.length === 0 ? <Empty text={win === 'overdue' ? 'No expired policies waiting. Great.' : 'No renewals due in this window.'} /> : null}
    </Screen>
  );
}
