import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { supabase, isConfigured } from '@/lib/supabase';
import { colors, space } from '@/lib/theme';
import { KoveWordmark } from './logo';
import { Button, Card, Field, Muted } from './ui';

export default function LoginScreen({ inactive = false }: { inactive?: boolean }) {
  const { signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    setInfo(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message);
  }

  async function forgot() {
    if (!email.trim()) {
      setError('Type your email first, then tap "Forgot password".');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setBusy(false);
    if (error) setError(error.message);
    else setInfo('Password reset email sent. Check your inbox.');
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.primary }}>
      <View style={{ flex: 1, justifyContent: 'center', padding: space.xl, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: 400 }}>
          <View style={{ alignItems: 'center', marginBottom: space.xl }}>
            <KoveWordmark width={180} />
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginTop: space.lg }}>Fizzy</Text>
            <Text style={{ color: '#D5E8EB', marginTop: 2 }}>Policies · Leads · Renewals</Text>
          </View>
          <Card>
            {!isConfigured ? (
              <>
                <Text style={{ fontWeight: '700', marginBottom: 6 }}>Almost there</Text>
                <Muted>
                  The app is not connected to its database yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (see README, step 2).
                </Muted>
              </>
            ) : inactive ? (
              <>
                <Text style={{ fontWeight: '700', marginBottom: 6 }}>Account disabled</Text>
                <Muted>Your account has been switched off. Ask your admin to turn it back on.</Muted>
                <Button title="Sign out" variant="secondary" onPress={signOut} style={{ marginTop: space.md }} />
              </>
            ) : (
              <>
                <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
                <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry onSubmitEditing={signIn} autoComplete="password" />
                {error ? <Text style={{ color: colors.danger, marginBottom: space.sm }}>{error}</Text> : null}
                {info ? <Text style={{ color: colors.success, marginBottom: space.sm }}>{info}</Text> : null}
                <Button title="Sign in" onPress={signIn} loading={busy} disabled={!email || !password} />
                <Button title="Forgot password" variant="ghost" small onPress={forgot} style={{ marginTop: space.sm }} />
              </>
            )}
          </Card>
          <Muted style={{ color: '#D5E8EB', textAlign: 'center', fontSize: 12 }}>Accounts are created by your admin.</Muted>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
