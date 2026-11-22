import { router } from 'expo-router';
import { Text } from 'react-native';

import { Button, Card, Muted, Screen, Section, Strong } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { ROLES, label } from '@/lib/constants';
import { colors } from '@/lib/theme';

function Item({ title, sub, onPress }: { title: string; sub: string; onPress: () => void }) {
  return (
    <Card onPress={onPress}>
      <Strong>{title}</Strong>
      <Muted style={{ marginTop: 2 }}>{sub}</Muted>
    </Card>
  );
}

export default function More() {
  const { profile, session, signOut } = useAuth();
  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{profile?.full_name || session?.user.email}</Text>
        <Muted>
          {session?.user.email} · {label(ROLES, profile?.role)}
        </Muted>
      </Card>
      <Section title="Records">
        <Item title="Clients" sub="All individuals and companies" onPress={() => router.push('/clients')} />
        <Item title="Import from Excel" sub="Bring in policies, clients or leads from a spreadsheet" onPress={() => router.push('/import')} />
        <Item title="Insurers" sub="Insurance companies you place business with" onPress={() => router.push('/insurers')} />
      </Section>
      {profile?.role === 'admin' ? (
        <Section title="Admin">
          <Item title="Team" sub="Roles and access for your staff" onPress={() => router.push('/users')} />
        </Section>
      ) : null}
      <Button title="Sign out" variant="secondary" onPress={signOut} />
      <Muted style={{ textAlign: 'center', marginTop: 16, fontSize: 12 }}>Fizzy · v1.0</Muted>
    </Screen>
  );
}
