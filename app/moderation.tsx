import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { color, space, type, font, layout, size, radius } from '@/theme/tokens';
import { Button } from '@/ui/Button'; import { Input } from '@/ui/Input'; import { Card } from '@/ui/Card'; import { Chip } from '@/ui/Chip';
import { listAppeals, listReports, resolveAppeal, resolveReport, type AppealItem, type ReportItem } from '@/lib/moderation';
import { REPORT_LABEL, type ReportReason } from '@/core/safety';
import { timeAgo } from '@/core/social';

export default function Moderation() {
  const router = useRouter(); const [tab, setTab] = useState<'appeals' | 'reports'>('appeals');
  const [appeals, setAppeals] = useState<AppealItem[]>([]); const [reports, setReports] = useState<ReportItem[]>([]); const [notes, setNotes] = useState<Record<string, string>>({});
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { try { const [a, r] = await Promise.all([listAppeals(), listReports()]); setAppeals(a); setReports(r); setErr(''); } catch (e) { setErr((e as Error).message); } setLoading(false); }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const act = async (fn: () => Promise<unknown>) => { setBusy(true); setErr(''); try { await fn(); await load(); } catch (e) { setErr((e as Error).message); } setBusy(false); };
  return (<ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={{ padding: layout.screenPad, paddingTop: space[10], gap: space[4] }} keyboardShouldPersistTaps="handled">
    <Button label="Back" variant="ghost" onPress={() => router.back()} />
    <Text style={{ ...type.title, fontFamily: font.bold, color: color.textPrimary }}>Moderation</Text>
    <View style={{ flexDirection: 'row', gap: space[2] }}><Chip label={`Appeals (${appeals.length})${tab === 'appeals' ? ' (selected)' : ''}`} onPress={() => setTab('appeals')} /><Chip label={`Reports (${reports.length})${tab === 'reports' ? ' (selected)' : ''}`} onPress={() => setTab('reports')} /></View>
    {!!err && <Text accessibilityRole="alert" style={{ ...type.body, color: color.danger }}>{err}</Text>}
    {loading && <Text style={{ ...type.body, color: color.textMuted }}>Loading...</Text>}
    {tab === 'appeals' && !loading && appeals.length === 0 && <Card><Text style={{ ...type.body, color: color.textSecondary }}>No pending appeals.</Text></Card>}
    {tab === 'appeals' && appeals.map(a => (<Card key={a.id}>
      <Text style={{ ...type.caption, color: color.textMuted }}>{a.kind} proof · {timeAgo(a.created_at, Date.now())} · {a.status.replace('_', ' ')}</Text>
      <Text style={{ ...type.heading, fontFamily: font.bold, color: color.textPrimary }}>{a.task_title}</Text>
      {a.image_url ? <Image accessibilityLabel="Proof image" source={{ uri: a.image_url }} resizeMode="contain" style={{ height: size.preview, borderRadius: radius.input, backgroundColor: color.surface2 }} /> : <Text style={{ ...type.body, color: color.textSecondary }}>{a.content}</Text>}
      <Text style={{ ...type.caption, color: color.textMuted }}>Why it was not accepted</Text><Text style={{ ...type.body, color: color.textSecondary }}>{a.status_reason}</Text>
      <Text style={{ ...type.caption, color: color.textMuted }}>Their appeal</Text><Text style={{ ...type.body, color: color.textPrimary }}>{a.appeal_text}</Text>
      <Input label="Note to the user (optional)" value={notes[a.id] ?? ''} onChangeText={t => setNotes(n => ({ ...n, [a.id]: t }))} placeholder="Note to the user (optional)" />
      <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
        <Button label="Overturn: accept it" disabled={busy} onPress={() => act(() => resolveAppeal(a.id, 'overturn'))} />
        <Button label="Uphold: keep decision" variant="secondary" disabled={busy} onPress={() => act(() => resolveAppeal(a.id, 'uphold', notes[a.id]))} /></View></Card>))}
    {tab === 'reports' && !loading && reports.length === 0 && <Card><Text style={{ ...type.body, color: color.textSecondary }}>No open reports.</Text></Card>}
    {tab === 'reports' && reports.map(r => (<Card key={r.id}>
      <Text style={{ ...type.caption, color: color.textMuted }}>{r.target_type} · {REPORT_LABEL[r.reason as ReportReason] ?? r.reason} · {r.source === 'auto' ? 'auto-flagged' : 'reported'} · {timeAgo(r.created_at, Date.now())}</Text>
      <Text style={{ ...type.body, color: color.textPrimary }}>{r.preview || '(content unavailable)'}</Text>{!!r.detail && <Text style={{ ...type.body, color: color.textSecondary }}>"{r.detail}"</Text>}
      <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
        {r.target_type !== 'profile' && <Button label="Hide it" disabled={busy} onPress={() => act(() => resolveReport(r.id, 'hide'))} />}
        {r.target_type !== 'profile' && <Button label="Restore it" variant="secondary" disabled={busy} onPress={() => act(() => resolveReport(r.id, 'restore'))} />}
        <Button label="Dismiss" variant="secondary" disabled={busy} onPress={() => act(() => resolveReport(r.id, 'dismiss'))} /></View></Card>))}
  </ScrollView>);
}
