import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Award } from 'lucide-react-native';
import { color, space, type, font, layout, size } from '@/theme/tokens';
import { Button } from '@/ui/Button'; import { Input } from '@/ui/Input'; import { Card } from '@/ui/Card'; import { Avatar } from '@/ui/Avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useStreakHistory } from '@/lib/data';
import { askAI } from '@/lib/ai';
import { registerPush } from '@/lib/notify';
import { loadBlocked, namesFor, unblockUser } from '@/lib/social';
import { badgesFor } from '@/core/streak';
import { formatClock, parseHHMM, validateSchedule } from '@/core/schedule';
import { friendlyError, isDeleteConfirmed } from '@/core/safety';
import { deleteMyAccount, DELETE_PROMPT } from '@/lib/account';
import { dayKey } from '@/core/day';
import { deviceTz } from '@/lib/types';

export default function Profile() {
  const router = useRouter(); const { session, profile, refreshProfile, signOut } = useAuth(); const uid = session?.user.id ?? ''; const { streak } = useStreakHistory();
  const [name, setName] = useState(''); const [bio, setBio] = useState(''); const [isPublic, setIsPublic] = useState(true);
  const [wake, setWake] = useState(''); const [sleep, setSleep] = useState(''); const [cutoff, setCutoff] = useState('');
  const [blocked, setBlocked] = useState<{ id: string; name: string }[]>([]); const [note, setNote] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [review, setReview] = useState(''); const [deleting, setDeleting] = useState(false); const [delText, setDelText] = useState('');

  useFocusEffect(useCallback(() => {
    if (!uid) return; let live = true;
    (async () => {
      const { data } = await supabase.from('profiles').select('name, bio, is_public, wake_min, sleep_min, cutoff_min').eq('id', uid).single();
      if (data && live) { setName(data.name ?? ''); setBio(data.bio ?? ''); setIsPublic(!!data.is_public); setWake(formatClock(data.wake_min)); setSleep(formatClock(data.sleep_min)); setCutoff(formatClock(data.cutoff_min)); }
      try { const ids = [...(await loadBlocked(uid))]; const n = await namesFor(ids); if (live) setBlocked(ids.map(id => ({ id, name: n[id] ?? 'Member' }))); } catch { /* list stays empty */ }
    })();
    return () => { live = false; };
  }, [uid]));

  async function run(fn: () => Promise<void>) { setBusy(true); setErr(''); setNote(''); try { await fn(); } catch (e) { setErr(friendlyError((e as Error).message)); } setBusy(false); }
  const saveProfile = () => run(async () => {
    if (!name.trim()) throw new Error('Add a name.');
    const { error } = await supabase.from('profiles').update({ name: name.trim().slice(0, 60), bio: bio.trim().slice(0, 160) || null }).eq('id', uid); if (error) throw error;
    await refreshProfile(); setNote('Profile saved.');
  });
  const togglePublic = (v: boolean) => run(async () => { setIsPublic(v); const { error } = await supabase.from('profiles').update({ is_public: v }).eq('id', uid); if (error) { setIsPublic(!v); throw error; } setNote(v ? 'Your accepted proofs can show up for people who follow you.' : 'Your profile and proofs are now private.'); });
  const saveTimes = () => run(async () => {
    const w = parseHHMM(wake), s = parseHHMM(sleep), c = parseHHMM(cutoff); if (w === undefined || s === undefined || c === undefined) throw new Error('Use 24-hour times like 07:00.');
    const bad = validateSchedule(w, s, c); if (bad) throw new Error(bad);
    const { error } = await supabase.from('profiles').update({ wake_min: w, sleep_min: s, cutoff_min: c }).eq('id', uid); if (error) throw error;
    await refreshProfile(); setNote('Times saved. Pings stay inside this window.');
  });
  const enablePush = () => run(async () => { const r = await registerPush(uid); setNote(r === 'granted' ? 'Notifications are on for this device.' : r === 'denied' ? 'Notifications are blocked. Allow them in your browser or phone settings.' : 'This device cannot receive notifications here.'); });
  const weekly = () => run(async () => {
    const tz = profile?.tz ?? deviceTz(); const from = dayKey(new Date(Date.now() - 6 * 86_400_000), tz);
    const { data } = await supabase.from('tasks').select('status').gte('day', from); const total = data?.length ?? 0, done = (data ?? []).filter(t => t.status === 'done').length;
    const r = await askAI({ task: 'review', memorySummary: '', input: `Last 7 days: ${total} tasks planned, ${done} finished with accepted proof. Current streak ${streak.current}, longest ${streak.longest}.` }); setReview(r.text);
  });
  const removeAccount = () => run(async () => { if (!isDeleteConfirmed(delText)) throw new Error('Type DELETE exactly as shown.'); await deleteMyAccount(delText); });
  async function unblock(id: string) { await run(async () => { await unblockUser(uid, id); setBlocked(b => b.filter(x => x.id !== id)); }); }

  const label = { ...type.caption, color: color.textMuted } as const; const head = { ...type.heading, fontFamily: font.bold, color: color.textPrimary } as const;
  return (<ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={{ padding: layout.screenPad, paddingTop: space[10], gap: space[4] }} keyboardShouldPersistTaps="handled">
    <View style={{ alignItems: 'center', gap: space[2] }}><Avatar name={name} large /><Text style={{ ...type.title, fontFamily: font.bold, color: color.textPrimary }}>{name || 'You'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Streak ${streak.current} days. Open streak history`} onPress={() => router.push('/streak')} style={{ minHeight: layout.touchMin, justifyContent: 'center' }}>
        <Text style={{ ...type.body, color: color.lime400 }}>{streak.current} day streak · view history</Text></Pressable>
      <View style={{ flexDirection: 'row', gap: space[3] }}>{badgesFor(streak.longest).length === 0 ? <Text style={label}>Badges unlock at 7, 30 and 100 days.</Text> : badgesFor(streak.longest).map(b => (
        <View key={b} accessibilityLabel={`${b} day badge earned`} style={{ flexDirection: 'row', gap: space[1], alignItems: 'center' }}><Award size={size.icon} color={color.lime500} /><Text style={{ ...type.caption, color: color.lime400 }}>{b} days</Text></View>))}</View></View>
    {!!err && <Text accessibilityRole="alert" style={{ ...type.body, color: color.danger }}>{err}</Text>}
    {!!note && <Text accessibilityRole="alert" style={{ ...type.body, color: color.textSecondary }}>{note}</Text>}

    <Card><Text style={head}>Public profile</Text>
      <Input label="Name" value={name} onChangeText={setName} placeholder="Name" /><Input label="Bio" value={bio} onChangeText={setBio} placeholder="One line about what you are building" multiline maxLength={160} />
      <Button label="Save profile" disabled={busy} onPress={saveProfile} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: layout.touchMin }}>
        <View style={{ flex: 1 }}><Text style={{ ...type.body, color: color.textPrimary }}>Public profile</Text><Text style={label}>{isPublic ? 'People you approve by following can see your accepted proofs.' : 'Private. Nobody sees your proofs or profile.'}</Text></View>
        <Switch accessibilityLabel="Public profile" value={isPublic} onValueChange={togglePublic} disabled={busy} trackColor={{ false: color.surface3, true: color.forest600 }} thumbColor={isPublic ? color.lime500 : color.textMuted} /></View></Card>

    <Card><Text style={head}>Notifications</Text><Text style={label}>24-hour times, your local time zone ({profile?.tz ?? deviceTz()}).</Text>
      <View style={{ flexDirection: 'row', gap: space[2] }}>
        <View style={{ flex: 1, gap: space[1] }}><Text style={label}>Wake</Text><Input label="Wake time" value={wake} onChangeText={setWake} placeholder="07:00" keyboardType="numbers-and-punctuation" /></View>
        <View style={{ flex: 1, gap: space[1] }}><Text style={label}>Cutoff</Text><Input label="Cutoff time" value={cutoff} onChangeText={setCutoff} placeholder="21:00" keyboardType="numbers-and-punctuation" /></View>
        <View style={{ flex: 1, gap: space[1] }}><Text style={label}>Sleep</Text><Input label="Sleep time" value={sleep} onChangeText={setSleep} placeholder="23:00" keyboardType="numbers-and-punctuation" /></View></View>
      <Button label="Save times" disabled={busy} onPress={saveTimes} /><Button label="Turn on notifications on this device" variant="secondary" disabled={busy} onPress={enablePush} /></Card>

    <Card><Text style={head}>Weekly review</Text>{!!review && <Text style={{ ...type.body, color: color.textSecondary }}>{review}</Text>}
      <Button label={review ? 'Refresh review' : 'Write my weekly review'} variant="secondary" disabled={busy} onPress={weekly} /></Card>

    {blocked.length > 0 && <Card><Text style={head}>Blocked</Text>{blocked.map(b => (<View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
      <Text style={{ ...type.body, color: color.textPrimary, flex: 1 }}>{b.name}</Text><Button label={`Unblock ${b.name}`} variant="ghost" onPress={() => unblock(b.id)} /></View>))}</Card>}
    {profile?.is_moderator && <Button label="Moderation queue" variant="secondary" onPress={() => router.push('/moderation')} />}
    <Button label="Sign out" variant="ghost" onPress={signOut} />
    <Card><Text style={head}>Delete account</Text>
      {deleting ? (<>
        <Text style={{ ...type.body, color: color.textSecondary }}>{DELETE_PROMPT}</Text>
        <Input label="Type DELETE to confirm" value={delText} onChangeText={setDelText} placeholder="DELETE" autoCapitalize="characters" autoCorrect={false} />
        <Button label="Delete my account forever" variant="danger" disabled={busy || !isDeleteConfirmed(delText)} onPress={removeAccount} />
        <Button label="Cancel" variant="ghost" onPress={() => { setDeleting(false); setDelText(''); }} /></>)
        : <Button label="Delete my account" variant="danger" onPress={() => setDeleting(true)} />}</Card>
  </ScrollView>);
}
