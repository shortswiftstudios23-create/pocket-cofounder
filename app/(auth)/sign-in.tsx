import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { color, space, type, font, layout } from '@/theme/tokens';
import { Button } from '@/ui/Button'; import { Input } from '@/ui/Input';
import { signInEmail, signUpEmail, signInGoogle } from '@/lib/auth';
import { isConfigured } from '@/lib/supabase';

export default function SignIn() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null); const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<{ error: Error | null; needsConfirmation?: boolean }>) {
    setBusy(true); setMsg(null);
    try { const r = await fn(); if (r.error) setMsg({ text: r.error.message, bad: true }); else if (r.needsConfirmation) setMsg({ text: 'Check your email to confirm, then sign in.', bad: false }); }
    catch (e) { setMsg({ text: (e as Error).message, bad: true }); }
    setBusy(false);
  }
  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= 8;
  return (
    <ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: layout.screenPad, gap: space[4], maxWidth: 480, width: '100%', alignSelf: 'center' }}>
      <Text style={{ ...type.display, color: color.textPrimary, fontFamily: font.light }}>Pocket <Text style={{ fontFamily: font.bold }}>Cofounder</Text></Text>
      <Text style={{ ...type.body, color: color.textSecondary }}>Show proof every day. Keep the streak.</Text>
      {!isConfigured && <Text style={{ ...type.caption, color: color.warning }}>Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.</Text>}
      <Input label="Email" value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Input label="Password" value={password} onChangeText={setPassword} placeholder="Password (8+ characters)" secureTextEntry autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
      {msg && <Text accessibilityRole="alert" style={{ ...type.body, color: msg.bad ? color.danger : color.lime400 }}>{msg.text}</Text>}
      <Button label={mode === 'in' ? 'Sign in' : 'Create account'} disabled={busy || !valid}
        onPress={() => run(mode === 'in' ? () => signInEmail(email, password).then(r => ({ error: r.error })) : () => signUpEmail(email, password))} />
      <Button label="Continue with Google" variant="secondary" disabled={busy} onPress={() => run(signInGoogle)} />
      <View style={{ alignItems: 'center' }}>
        <Button label={mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'} variant="ghost" onPress={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null); }} />
      </View>
    </ScrollView>);
}
