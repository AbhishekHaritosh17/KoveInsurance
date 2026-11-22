import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { LeadItem, POLICY_SELECT, PolicyItem } from '@/components/list-items';
import { Button, ErrorBox, Muted, Row, Screen, Section } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { addDays, money, today } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, radius, space } from '@/lib/theme';
import type { Lead, Policy } from '@/lib/types';
import { must, useQuery } from '@/lib/useQuery';

interface DashData {
  followUps: Lead[];
  openLeads: number;
  renewals: Policy[];
  monthPremium: number;
  monthPolicies: number;
  renewedThisMonth: number;
  dueThisMonth: number;
}

async function load(): Promise<DashData> {
  const t = today();
  const monthStart = t.slice(0, 8) + '01';
  const nextMonth = addDays(monthStart, 32).slice(0, 8) + '01';

  const [followUps, openLeads, renewals, monthPol, dueMonth] = await Promise.all([
    supabase
      .from('leads')
      .select('*')
      .not('stage', 'in', '(won,lost)')
      .lte('next_follow_up', t)
      .order('next_follow_up')
      .limit(20),
    supabase.from('leads').select('id', { count: 'exact', head: true }).not('stage', 'in', '(won,lost)'),
    supabase
      .from('policies')
      .select(POLICY_SELECT)
      .eq('status', 'active')
      .not('renewal_stage', 'in', '(renewed,lost)')
      .gte('end_date', addDays(t, -30))
      .lte('end_date', addDays(t, 30))
      .order('end_date')
      .limit(50),
    supabase.from('policies').select('total_premium').gte('start_date', monthStart).lt('start_date', nextMonth),
    supabase.from('policies').select('renewal_stage').gte('end_date', monthStart).lt('end_date', nextMonth),
  ]);
  if (openLeads.error) throw new Error(openLeads.error.message);
  const monthRows = must(monthPol) as { total_premium: number | null }[];
  const dueRows = must(dueMonth) as { renewal_stage: string }[];
  return {
    followUps: must(followUps) as Lead[],
    openLeads: openLeads.count ?? 0,
    renewals: must(renewals) as Policy[],
    monthPremium: monthRows.reduce((s, r) => s + Number(r.total_premium ?? 0), 0),
    monthPolicies: monthRows.length,
    renewedThisMonth: dueRows.filter((r) => r.renewal_stage === 'renewed').length,
    dueThisMonth: dueRows.length,
  };
}

function Kpi({ title, value, sub, onPress, tone }: { title: string; value: string; sub?: string; onPress?: () => void; tone?: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexGrow: 1,
        flexBasis: 150,
        backgroundColor: '#fff',
        borderRadius: radius,
        borderWidth: 1,
        borderColor: colors.border,
        padding: space.lg,
      }}>
      <Muted>{title}</Muted>
      <Text style={{ fontSize: 26, fontWeight: '800', color: tone ?? colors.text, marginTop: 4 }}>{value}</Text>
      {sub ? <Muted style={{ fontSize: 12, marginTop: 2 }}>{sub}</Muted> : null}
    </Pressable>
  );
}

export default function Home() {
  const { profile } = useAuth();
  const { data, error, loading, reload } = useQuery(load);
  const t = today();
  const overdue = data?.renewals.filter((p) => (p.end_date ?? '') < t).length ?? 0;
  const renewalRate = data && data.dueThisMonth ? Math.round((data.renewedThisMonth / data.dueThisMonth) * 100) : null;

  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Hello{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</Text>
      <Muted style={{ marginBottom: space.lg }}>Here is what needs attention today.</Muted>

      {error ? <ErrorBox message={error} onRetry={reload} /> : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginBottom: space.lg }}>
        <Kpi
          title="Renewals due (±30 days)"
          value={String(data?.renewals.length ?? '–')}
          sub={overdue ? `${overdue} already expired` : 'none expired'}
          tone={overdue ? colors.danger : undefined}
          onPress={() => router.push('/renewals')}
        />
        <Kpi title="Follow-ups due" value={String(data?.followUps.length ?? '–')} sub={`${data?.openLeads ?? '–'} open leads`} onPress={() => router.push('/leads')} />
        <Kpi title="Premium this month" value={data ? money(data.monthPremium) : '–'} sub={`${data?.monthPolicies ?? '–'} policies`} onPress={() => router.push('/policies')} />
        <Kpi
          title="Renewal rate this month"
          value={renewalRate === null ? '–' : `${renewalRate}%`}
          sub={data ? `${data.renewedThisMonth} of ${data.dueThisMonth} renewed` : undefined}
        />
      </View>

      <Row style={{ marginBottom: space.lg }}>
        <Button title="+ New lead" small onPress={() => router.push('/lead/form')} />
        <Button title="+ New policy" small variant="secondary" onPress={() => router.push('/policy/form')} />
        <Button title="Import Excel" small variant="secondary" onPress={() => router.push('/import')} />
      </Row>

      <Section title="Follow-ups due">
        {data?.followUps.length ? data.followUps.slice(0, 8).map((l) => <LeadItem key={l.id} lead={l} />) : <Muted>Nothing due. Nice work.</Muted>}
      </Section>

      <Section title="Upcoming renewals">
        {data?.renewals.length ? data.renewals.slice(0, 8).map((p) => <PolicyItem key={p.id} policy={p} showRenewal />) : <Muted>No renewals in the next 30 days.</Muted>}
      </Section>
    </Screen>
  );
}
