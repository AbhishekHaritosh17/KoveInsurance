import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Loading } from '@/components/ui';
import LoginScreen from '@/components/login-screen';
import { AuthProvider, useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

function Gate() {
  const { loading, session, profile } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <Loading />
      </View>
    );
  }
  if (!session) return <LoginScreen />;
  if (profile && !profile.active) return <LoginScreen inactive />;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        contentStyle: { backgroundColor: colors.bg },
        headerBackTitle: 'Back',
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="lead/[id]" options={{ title: 'Lead' }} />
      <Stack.Screen name="lead/form" options={{ title: 'Lead' }} />
      <Stack.Screen name="client/[id]" options={{ title: 'Client' }} />
      <Stack.Screen name="client/form" options={{ title: 'Client' }} />
      <Stack.Screen name="policy/[id]" options={{ title: 'Policy' }} />
      <Stack.Screen name="policy/form" options={{ title: 'Policy' }} />
      <Stack.Screen name="clients" options={{ title: 'Clients' }} />
      <Stack.Screen name="import" options={{ title: 'Import from Excel' }} />
      <Stack.Screen name="insurers" options={{ title: 'Insurers' }} />
      <Stack.Screen name="users" options={{ title: 'Team' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Gate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
