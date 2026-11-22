import { useState } from 'react';

import { Button, Card, Field, Loading, Muted, Screen, SearchBox, Section, Strong } from '@/components/ui';
import { friendlyError } from '@/lib/data';
import { notify } from '@/lib/dialog';
import { blankToNull } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Insurer } from '@/lib/types';
import { must, useQuery } from '@/lib/useQuery';

export default function Insurers() {
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const { data, loading, reload } = useQuery<Insurer[]>(async () => must(await supabase.from('insurers').select('*').order('name')));

  async function add() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      must(await supabase.from('insurers').insert({ name: name.trim(), short_code: blankToNull(code)?.toUpperCase() ?? null }));
      setName('');
      setCode('');
      reload();
    } catch (e) {
      notify('Could not add insurer', friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  const s = q.toLowerCase();
  const rows = (data ?? []).filter((i) => !s || i.name.toLowerCase().includes(s) || i.short_code?.toLowerCase().includes(s));
  return (
    <Screen>
      <Section title="Add insurer">
        <Card>
          <Field label="Name" value={name} onChangeText={setName} />
          <Field label="Short code" value={code} onChangeText={setCode} autoCapitalize="characters" />
          <Button title="Add" small onPress={add} loading={saving} disabled={!name.trim()} style={{ alignSelf: 'flex-start' }} />
        </Card>
      </Section>
      <SearchBox value={q} onChangeText={setQ} />
      {loading && !data ? <Loading /> : null}
      {rows.map((i) => (
        <Card key={i.id}>
          <Strong>{i.name}</Strong>
          {i.short_code ? <Muted>{i.short_code}</Muted> : null}
        </Card>
      ))}
    </Screen>
  );
}
