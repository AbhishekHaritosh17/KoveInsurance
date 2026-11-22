import { Card, Chips, Loading, Muted, Row, Screen, Strong, Button } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { ROLES } from '@/lib/constants';
import { friendlyError } from '@/lib/data';
import { notify } from '@/lib/dialog';
import { supabase } from '@/lib/supabase';
import type { Profile, Role } from '@/lib/types';
import { must, useQuery } from '@/lib/useQuery';

export default function Users() {
  const { profile: me } = useAuth();
  const { data, loading, reload } = useQuery<Profile[]>(async () => must(await supabase.from('profiles').select('*').order('full_name')));

  async function update(id: string, patch: Partial<Profile>) {
    try {
      must(await supabase.from('profiles').update(patch).eq('id', id));
      reload();
    } catch (e) {
      notify('Could not update', friendlyError(e));
    }
  }

  if (me?.role !== 'admin') return <Screen><Muted>Only admins can manage the team.</Muted></Screen>;

  return (
    <Screen>
      <Card style={{ backgroundColor: '#FFFBEB' }}>
        <Strong>Adding a new staff member</Strong>
        <Muted style={{ marginTop: 4 }}>
          In Supabase, open Authentication → Users → Add user, enter their email and a password, and tick &quot;Auto confirm&quot;. They will appear here as
          Sales; change their role below.
        </Muted>
      </Card>
      {loading && !data ? <Loading /> : null}
      {(data ?? []).map((p) => (
        <Card key={p.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Strong>{p.full_name || p.email}</Strong>
            {p.id !== me.id ? (
              <Button small variant={p.active ? 'ghost' : 'secondary'} title={p.active ? 'Disable' : 'Enable'} onPress={() => update(p.id, { active: !p.active })} />
            ) : (
              <Muted>You</Muted>
            )}
          </Row>
          <Muted style={{ marginBottom: 8 }}>
            {p.email}
            {p.active ? '' : ' · disabled'}
          </Muted>
          <Chips options={ROLES} value={p.role} onChange={(r) => r && p.id !== me.id && update(p.id, { role: r as Role })} />
        </Card>
      ))}
    </Screen>
  );
}
