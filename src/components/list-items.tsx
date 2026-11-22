import { router } from 'expo-router';
import { View } from 'react-native';

import { LEAD_STAGES, LINES, RENEWAL_STAGES, label } from '@/lib/constants';
import { dateLabel, daysUntil, money } from '@/lib/format';
import type { Lead, Policy } from '@/lib/types';
import { Badge, Card, Muted, Row, Strong } from './ui';

export function stageTone(stage: string): 'neutral' | 'primary' | 'success' | 'warning' | 'danger' {
  if (stage === 'won' || stage === 'renewed') return 'success';
  if (stage === 'lost') return 'danger';
  if (stage === 'quoted') return 'warning';
  if (stage === 'new' || stage === 'pending') return 'neutral';
  return 'primary';
}

export function dueTone(days: number | null): 'neutral' | 'success' | 'warning' | 'danger' {
  if (days === null) return 'neutral';
  if (days < 0) return 'danger';
  if (days <= 15) return 'warning';
  return 'neutral';
}

export function dueText(days: number | null): string {
  if (days === null) return 'No date';
  if (days === 0) return 'Today';
  if (days < 0) return `${-days}d overdue`;
  return `in ${days}d`;
}

export function LeadItem({ lead }: { lead: Lead }) {
  const fu = daysUntil(lead.next_follow_up);
  const open = lead.stage !== 'won' && lead.stage !== 'lost';
  return (
    <Card onPress={() => router.push(`/lead/${lead.id}`)}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Strong>{lead.name}</Strong>
        <Badge text={label(LEAD_STAGES, lead.stage)} tone={stageTone(lead.stage)} />
      </Row>
      <Muted style={{ marginTop: 4 }}>
        {[label(LINES, lead.line), lead.product, lead.company, lead.phone].filter(Boolean).join(' · ')}
      </Muted>
      {open && lead.next_follow_up ? (
        <Row style={{ marginTop: 6 }}>
          <Badge text={`Follow-up ${dueText(fu)}`} tone={dueTone(fu)} />
          {lead.expected_premium ? <Muted>{money(lead.expected_premium)}</Muted> : null}
        </Row>
      ) : null}
    </Card>
  );
}

export function PolicyItem({ policy, showRenewal }: { policy: Policy; showRenewal?: boolean }) {
  const d = daysUntil(policy.end_date);
  return (
    <Card onPress={() => router.push(`/policy/${policy.id}`)}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1, minWidth: 160 }}>
          <Strong>{policy.clients?.name ?? 'Client'}</Strong>
        </View>
        {showRenewal ? (
          <Badge text={label(RENEWAL_STAGES, policy.renewal_stage)} tone={stageTone(policy.renewal_stage)} />
        ) : (
          <Badge text={policy.status} tone={policy.status === 'active' ? 'success' : 'neutral'} />
        )}
      </Row>
      <Muted style={{ marginTop: 4 }}>
        {[label(LINES, policy.line), policy.product, policy.details?.vehicle_reg_no, policy.insurers?.short_code ?? policy.insurers?.name]
          .filter(Boolean)
          .join(' · ')}
      </Muted>
      <Row style={{ marginTop: 6 }}>
        <Muted>
          {policy.policy_no ? `#${policy.policy_no} · ` : ''}Expires {dateLabel(policy.end_date)}
        </Muted>
        {policy.status === 'active' ? <Badge text={dueText(d)} tone={dueTone(d)} /> : null}
        <Muted>{money(policy.total_premium)}</Muted>
      </Row>
    </Card>
  );
}

export const POLICY_SELECT = '*, clients(id,name,phone), insurers(id,name,short_code)';
