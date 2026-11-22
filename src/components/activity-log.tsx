import { useState } from 'react';
import { View } from 'react-native';

import { friendlyError, logActivity } from '@/lib/data';
import { notify } from '@/lib/dialog';
import { dateLabel } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Activity, EntityType } from '@/lib/types';
import { must, useQuery } from '@/lib/useQuery';
import { Button, Card, Chips, Field, Muted, Section, Strong } from './ui';

const KINDS = [
  { value: 'note', label: 'Note' },
  { value: 'call', label: 'Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'email', label: 'Email' },
] as const;

/** Timeline of notes and calls on a lead, client or policy. */
export function ActivityLog({ entityType, entityId, refreshKey = 0 }: { entityType: EntityType; entityId: string; refreshKey?: number }) {
  const [note, setNote] = useState('');
  const [kind, setKind] = useState<string>('note');
  const [saving, setSaving] = useState(false);
  const { data, reload } = useQuery<Activity[]>(
    async () =>
      must(
        await supabase
          .from('activities')
          .select('*')
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
          .order('created_at', { ascending: false })
          .limit(100),
      ),
    [entityId, refreshKey],
  );

  async function add() {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await logActivity(entityType, entityId, kind, note.trim());
      setNote('');
      reload();
    } catch (e) {
      notify('Could not save note', friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Activity">
      <Card>
        <Chips options={KINDS as unknown as { value: string; label: string }[]} value={kind} onChange={(v) => setKind(v ?? 'note')} />
        <Field label="What happened?" value={note} onChangeText={setNote} multiline placeholder="e.g. Client asked for quote with zero-dep add-on" />
        <Button title="Add to timeline" small onPress={add} loading={saving} disabled={!note.trim()} style={{ alignSelf: 'flex-start' }} />
      </Card>
      {(data ?? []).map((a) => (
        <View key={a.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
          <Strong style={{ fontSize: 13 }}>
            {KINDS.find((k) => k.value === a.kind)?.label ?? a.kind} · <Muted>{dateLabel(a.created_at.slice(0, 10))}</Muted>
          </Strong>
          <Muted style={{ color: '#111827', marginTop: 2 }}>{a.note}</Muted>
        </View>
      ))}
      {data && data.length === 0 ? <Muted>No activity yet.</Muted> : null}
    </Section>
  );
}
