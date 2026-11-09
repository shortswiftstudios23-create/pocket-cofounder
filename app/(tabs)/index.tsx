import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { color, space, radius, type, font, layout, size } from '@/theme/tokens';
import { Button } from '@/ui/Button'; import { Input } from '@/ui/Input'; import { Card } from '@/ui/Card';
import { ProofStatusCard } from '@/ui/ProofStatusCard'; import { ProofAccepted } from '@/ui/ProofAccepted';
import { askAI } from '@/lib/ai';
import { useAuth } from '@/lib/auth';
import { useToday } from '@/lib/data';
import { useAppealNotices } from '@/lib/notices';
import { submitProof, appealProof } from '@/lib/proofs';
import { pickImage } from '@/lib/image';
import { armCutoffAlarm, registerPush } from '@/lib/notify';
import type { ProofKind } from '@/core/proof';
import type { Task } from '@/lib/types';

export default function Today() {
  const router = useRouter(); const { session, profile } = useAuth(); const uid = session?.user.id ?? '';
  const { tasks, streak, loading, error, refresh, addTask, setStatus, latestProof } = useToday();
  const appeals = useAppealNotices(uid);
  const [draft, setDraft] = useState(''); const [note, setNote] = useState(''); const [proof, setProof] = useState('');
  const [busy, setBusy] = useState(false); const [celebrate, setCelebrate] = useState(false);

  useFocusEffect(useCallback(() => { void refresh(); void appeals.refresh(); }, [refresh, appeals.refresh]));
  // Re-arm the evening-cutoff alarm and make sure this device can receive pings.
  useFocusEffect(useCallback(() => { if (profile) { void armCutoffAlarm(profile.cutoff_min, streak.doneToday).catch(() => {}); } }, [profile?.cutoff_min, streak.doneToday]));
  useFocusEffect(useCallback(() => { void registerPush(uid).catch(() => {}); }, [uid]));

  async function guard(fn: () => Promise<void>) { setBusy(true); setNote(''); try { await fn(); } catch (e) { setNote((e as Error).message); } setBusy(false); }
  const onAdd = () => guard(async () => { const t = draft.trim(); if (!t) return; const r = await askAI({ task: 'task_challenge', memorySummary: '', input: t }); setNote(r.text); await addTask(t); setDraft(''); });
  const onSubmit = (task: Task, kind: ProofKind, imageUri?: string) => guard(async () => {
    const content = kind === 'text' || kind === 'link' ? proof.trim() : undefined;
    if (content !== undefined && !content) return;
    const r = await submitProof({ uid, taskId: task.id, kind, content, imageUri });
    setProof(''); await refresh(); if (r.status === 'accepted') setCelebrate(true);
  });
  const onImage = (task: Task, kind: 'photo' | 'screenshot') => guard(async () => {
    const uri = await pickImage(kind === 'photo' ? 'camera' : 'library'); if (!uri) return;
    const r = await submitProof({ uid, taskId: task.id, kind, imageUri: uri }); await refresh(); if (r.status === 'accepted') setCelebrate(true);
  });
  const onAppeal = (proofId: string, n: string) => guard(async () => { const r = await appealProof(proofId, n); await refresh(); if (r.status === 'accepted') setCelebrate(true); });
  const ring = (st: Task['status']) => st === 'done' ? color.lime500 : st === 'not_today' ? color.warning : color.border;

  return (<View style={{ flex: 1, backgroundColor: color.bg }}>
    <ScrollView contentContainerStyle={{ padding: layout.screenPad, paddingTop: space[10], gap: space[4] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ ...type.title, color: color.textPrimary, fontFamily: font.light }}>Today's <Text style={{ fontFamily: font.bold }}>Proof</Text></Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Streak ${streak.current} days. Open history`} onPress={() => router.push('/streak')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space[1], minHeight: layout.touchMin, backgroundColor: color.surface2, borderRadius: radius.pill, paddingHorizontal: space[3] }}>
          <Text style={{ color: color.lime500, fontFamily: font.bold }}>{'▲'}</Text><Text style={{ color: color.textPrimary, fontFamily: font.bold }}>{streak.current}</Text>
        </Pressable>
      </View>
      {!!error && <Text accessibilityRole="alert" style={{ ...type.body, color: color.danger }}>{error}</Text>}
      {appeals.notices.length > 0 && <Card accessibilityRole="alert" style={{ borderColor: color.lime500 }}>
        {appeals.notices.map(n => <Text key={n.id} style={{ ...type.body, color: color.textPrimary }}>{n.text}</Text>)}
        <Button label="Dismiss" variant="secondary" onPress={appeals.dismiss} /></Card>}
      <Card>
        {loading ? <Text style={{ ...type.body, color: color.textMuted }}>Loading...</Text>
          : tasks.length === 0 ? <Text style={{ ...type.body, color: color.textSecondary }}>No tasks yet. What exactly will exist by tonight?</Text> : null}
        {tasks.map(t => { const p = latestProof(t.id); const open = t.status === 'not_started' || t.status === 'in_progress'; return (
          <View key={t.id} style={{ gap: space[3] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
              <View style={{ width: size.ring, height: size.ring, borderRadius: size.ring / 2, borderWidth: 2, borderColor: ring(t.status), alignItems: 'center', justifyContent: 'center' }}>
                {t.status === 'done' && <Check size={size.icon - space[2]} color={color.lime500} strokeWidth={3} />}</View>
              <Text style={{ ...type.body, color: t.status === 'done' ? color.textMuted : color.textPrimary, flex: 1, fontFamily: font.regular }}>{t.title}</Text>
              {open && <Pressable accessibilityRole="button" accessibilityLabel={`Not today: ${t.title}`} onPress={() => guard(async () => { await setStatus(t.id, 'not_today'); const r = await askAI({ task: 'missed_task', memorySummary: '', input: `Not today: ${t.title}` }); setNote(r.text); })} style={{ minHeight: layout.touchMin, justifyContent: 'center' }}>
                <Text style={{ ...type.caption, color: color.textMuted }}>Not today</Text></Pressable>}
            </View>
            {p && (p.status !== 'accepted' || t.status !== 'done') && <ProofStatusCard status={p.status} reason={p.status_reason ?? ''} appealStatus={p.appeal_status} busy={busy} onAppeal={n => onAppeal(p.id, n)} />}
            {open && (<View style={{ gap: space[2] }}>
              <View style={{ flexDirection: 'row', gap: space[2] }}>
                <Input label="Proof" value={proof} onChangeText={setProof} placeholder="Link or one-line update" style={{ flex: 1 }} autoCapitalize="none" />
                <Button label="Submit proof" disabled={busy || !proof.trim()} onPress={() => onSubmit(t, /^https?:\/\//i.test(proof.trim()) ? 'link' : 'text')} />
              </View>
              <View style={{ flexDirection: 'row', gap: space[2] }}>
                <Button label="Take photo" variant="secondary" disabled={busy} onPress={() => onImage(t, 'photo')} />
                <Button label="Add screenshot" variant="secondary" disabled={busy} onPress={() => onImage(t, 'screenshot')} />
              </View></View>)}
          </View>); })}
      </Card>
      <View style={{ flexDirection: 'row', gap: space[2] }}>
        <Input label="New task" value={draft} onChangeText={setDraft} placeholder="Add today's task" style={{ flex: 1 }} onSubmitEditing={onAdd} />
        <Button label="Add" variant="secondary" disabled={busy || !draft.trim()} onPress={onAdd} />
      </View>
      {!!note && <Text style={{ ...type.body, color: color.textSecondary }}>{note}</Text>}
    </ScrollView>
    {celebrate && <ProofAccepted streak={streak.current} onDone={() => setCelebrate(false)} />}
  </View>);
}
