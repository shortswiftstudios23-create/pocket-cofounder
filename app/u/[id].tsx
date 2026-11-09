import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Award } from 'lucide-react-native';
import { color, space, type, font, layout, size } from '@/theme/tokens';
import { Button } from '@/ui/Button'; import { Card } from '@/ui/Card'; import { Avatar } from '@/ui/Avatar'; import { ReportSheet } from '@/ui/ReportSheet';
import { useAuth } from '@/lib/auth';
import { blockUser, follow, getPublicProfile, sendReport, startConversation, unblockUser, unfollow, type PublicProfile } from '@/lib/social';
import { computeStreak, badgesFor } from '@/core/streak';
import { canMessage, type ReportReason } from '@/core/safety';
import { dayKey } from '@/core/day';
import { deviceTz } from '@/lib/types';

export default function PublicProfileScreen() {
  const router = useRouter(); const { id } = useLocalSearchParams<{ id: string }>(); const { session, profile: mine } = useAuth(); const me = session?.user.id ?? '';
  const [p, setP] = useState<PublicProfile | null>(null); const [loading, setLoading] = useState(true); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [reporting, setReporting] = useState(false); const [note, setNote] = useState('');
  const load = useCallback(async () => { try { setP(await getPublicProfile(id)); setErr(''); } catch (e) { setErr((e as Error).message); } setLoading(false); }, [id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const streak = useMemo(() => computeStreak(p?.days ?? [], dayKey(new Date(), mine?.tz ?? deviceTz())), [p, mine?.tz]);
  async function act(fn: () => Promise<void>) { setBusy(true); setErr(''); setNote(''); try { await fn(); await load(); } catch (e) { setErr((e as Error).message); } setBusy(false); }
  const msg = p ? canMessage({ iFollow: p.i_follow, theyFollow: p.follows_me, blockedEither: false }) : null;
  return (<ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={{ padding: layout.screenPad, paddingTop: space[10], gap: space[4] }}>
    <Button label="Back" variant="ghost" onPress={() => router.back()} />
    {loading ? <Text style={{ ...type.body, color: color.textMuted }}>Loading...</Text> : !p ? <Card><Text style={{ ...type.body, color: color.textSecondary }}>This profile is not available.</Text></Card> : (<>
      <View style={{ alignItems: 'center', gap: space[2] }}><Avatar name={p.name} large />
        <Text style={{ ...type.title, fontFamily: font.bold, color: color.textPrimary }}>{p.name ?? 'Member'}</Text>
        {!!p.project && <Text style={{ ...type.body, color: color.textSecondary }}>{[p.project, p.stage, p.field].filter(Boolean).join(' · ')}</Text>}
        {!!p.bio && <Text style={{ ...type.body, color: color.textSecondary, textAlign: 'center' }}>{p.bio}</Text>}</View>
      <View style={{ flexDirection: 'row', gap: space[3] }}>
        {([['Streak', streak.current], ['Longest', streak.longest], ['Followers', p.followers], ['Following', p.following]] as const).map(([l, v]) => (
          <Card key={l} style={{ flex: 1, alignItems: 'center', padding: space[3] }}><Text style={{ ...type.heading, fontFamily: font.bold, color: color.textPrimary }}>{v}</Text><Text style={{ ...type.caption, color: color.textMuted }}>{l}</Text></Card>))}</View>
      {badgesFor(streak.longest).length > 0 && <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center' }}>{badgesFor(streak.longest).map(b => (
        <View key={b} accessibilityLabel={`${b} day badge`} style={{ flexDirection: 'row', gap: space[1], alignItems: 'center' }}><Award size={size.icon} color={color.lime500} /><Text style={{ ...type.caption, color: color.lime400 }}>{b} days</Text></View>))}</View>}
      {!!err && <Text accessibilityRole="alert" style={{ ...type.body, color: color.danger }}>{err}</Text>}
      {!!note && <Text style={{ ...type.body, color: color.textSecondary }}>{note}</Text>}
      {p.id === me ? <Text style={{ ...type.body, color: color.textMuted }}>This is how others see you.</Text> : (<View style={{ gap: space[2] }}>
        {p.i_blocked ? <Button label="Unblock" variant="secondary" disabled={busy} onPress={() => act(() => unblockUser(me, p.id))} /> : (<>
          <Button label={p.i_follow ? 'Unfollow' : p.follows_me ? 'Follow back' : 'Follow'} variant={p.i_follow ? 'secondary' : 'primary'} disabled={busy} onPress={() => act(() => (p.i_follow ? unfollow(me, p.id) : follow(me, p.id)))} />
          <Button label="Message" variant="secondary" disabled={busy} onPress={async () => { if (!msg?.ok) { setNote(msg?.reason ?? ''); return; } setBusy(true); try { router.push(`/thread/${await startConversation(p.id)}`); } catch (e) { setErr((e as Error).message); } setBusy(false); }} />
          <Button label="Block" variant="ghost" disabled={busy} onPress={() => act(async () => { await blockUser(me, p.id); router.back(); })} /></>)}
        <Button label="Report" variant="ghost" onPress={() => setReporting(true)} />
        {reporting && <ReportSheet busy={busy} onCancel={() => setReporting(false)} onSubmit={async (r: ReportReason, d) => { setBusy(true); try { await sendReport(me, 'profile', p.id, r, d); setReporting(false); setNote('Report sent. Thank you.'); } catch (e) { setErr((e as Error).message); } setBusy(false); }} />}
      </View>)}
    </>)}
  </ScrollView>);
}
