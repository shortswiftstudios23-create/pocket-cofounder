import { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { color, space, radius, type, layout } from '@/theme/tokens';
import { Button } from '@/ui/Button'; import { Chip } from '@/ui/Chip'; import { Input } from '@/ui/Input';
import { STEPS, CLOSING, toRecords, type Draft } from '@/core/onboarding';
import { dayKey } from '@/core/day';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { deviceTz } from '@/lib/types';

interface Msg { id: number; role: 'user' | 'ai'; body: string }
export default function Onboarding() {
  const { session, refreshProfile } = useAuth(); const tz = deviceTz();
  const [i, setI] = useState(0); const [draft, setDraft] = useState<Draft>({}); const [text, setText] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, role: 'ai', body: STEPS[0].ask({}) }]);
  const list = useRef<FlatList<Msg>>(null); const step = STEPS[i]; const finished = i >= STEPS.length;
  useEffect(() => { list.current?.scrollToEnd({ animated: true }); }, [msgs.length]);

  async function answer(raw: string) {
    const a = raw.trim(); if (!a || !step || saving) return;
    const r = step.apply(a, draft, dayKey(new Date(), tz));
    setMsgs(m => [...m, { id: Date.now(), role: 'user', body: a }]); setText('');
    if (!r.ok) { setMsgs(m => [...m, { id: Date.now() + 1, role: 'ai', body: r.error }]); return; }
    setDraft(r.draft); const next = i + 1; setI(next);
    if (next < STEPS.length) { setMsgs(m => [...m, { id: Date.now() + 1, role: 'ai', body: STEPS[next].ask(r.draft) }]); return; }
    await save(r.draft);
  }
  async function save(d: Draft) {
    setSaving(true); setError('');
    const uid = session!.user.id, rec = toRecords(d, tz);
    await supabase.from('goals').delete().eq('user_id', uid); await supabase.from('memory_entries').delete().eq('user_id', uid).eq('kind', 'profile'); // safe to retry
    const g = await supabase.from('goals').insert({ user_id: uid, ...rec.goal });
    const m = await supabase.from('memory_entries').insert({ user_id: uid, ...rec.memory });
    const p = await supabase.from('profiles').update(rec.profile).eq('id', uid); // last: flips `onboarded`, which releases the gate
    const err = g.error ?? m.error ?? p.error;
    if (err) { setError(err.message); setSaving(false); return; }
    setMsgs(x => [...x, { id: Date.now(), role: 'ai', body: CLOSING }]);
    await refreshProfile();
  }
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: color.bg, padding: layout.screenPad, paddingTop: space[10] }}>
      <FlatList ref={list} data={msgs} keyExtractor={m => String(m.id)} contentContainerStyle={{ gap: space[2] }} renderItem={({ item }) => (
        <View style={{ alignSelf: item.role === 'ai' ? 'flex-start' : 'flex-end', maxWidth: '85%', padding: space[3], borderRadius: radius.card,
          backgroundColor: item.role === 'ai' ? color.surface2 : color.surface3, borderWidth: item.role === 'user' ? 1 : 0, borderColor: color.forest600 }}>
          <Text style={{ ...type.body, color: color.textPrimary }}>{item.body}</Text></View>)} />
      {!!error && <View style={{ gap: space[2], paddingTop: space[3] }}><Text accessibilityRole="alert" style={{ ...type.body, color: color.danger }}>{error}</Text><Button label="Try saving again" onPress={() => save(draft)} /></View>}
      {!finished && (<View style={{ gap: space[3], paddingTop: space[3] }}>
        {!!step.chips && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>{step.chips.map(c => <Chip key={c} label={c} onPress={() => answer(c)} />)}</View>}
        <View style={{ flexDirection: 'row', gap: space[2] }}>
          <Input label="Your answer" value={text} onChangeText={setText} placeholder={step.placeholder} onSubmitEditing={() => answer(text)} returnKeyType="send" style={{ flex: 1 }} />
          <Button label="Send" onPress={() => answer(text)} />
        </View></View>)}
    </KeyboardAvoidingView>);
}
