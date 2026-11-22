import { Tabs } from 'expo-router/js-tabs';
import { Text, type ColorValue } from 'react-native';

import { Logo } from '@/components/logo';
import { colors } from '@/lib/theme';

const icon = (glyph: string) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Text style={{ color, fontSize: 18, fontWeight: '700' }}>{glyph}</Text>;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '700', color: colors.text },
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', headerTitle: () => <Logo size={26} />, tabBarIcon: icon('⌂') }} />
      <Tabs.Screen name="leads" options={{ title: 'Leads', tabBarIcon: icon('◎') }} />
      <Tabs.Screen name="policies" options={{ title: 'Policies', tabBarIcon: icon('▤') }} />
      <Tabs.Screen name="renewals" options={{ title: 'Renewals', tabBarIcon: icon('↻') }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('≡') }} />
    </Tabs>
  );
}
