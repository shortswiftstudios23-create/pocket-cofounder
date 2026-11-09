import { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { color, space, radius, type, layout } from '@/theme/tokens';
import { Button } from '@/ui/Button'; import { Input } from '@/ui/Input'; import { ReportSheet } from '@/ui/ReportSheet';
import { useAuth } from '@/lib/auth';
import { listConversations, loadMessages, markRead, namesFor, sendMessage, sendReport, subscribeMessages, type Message } from '@/lib/social';
import { checkBody, MAX_MESSAGE, type ReportReason } from '@/core/safety';
import { otherUser, timeAgo } from '@/core/social';

export default function Thread() {
  const router = useRouter(); const { id } = useLocalSearchParams<{ id: string }>(); const { session } = useAuth(); const me = session?.user.id ?? '';
  const [msgs, setMsgs] = useState<Message[]>([]); const [name, setName] = useState(''); const [text, setText] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [reportId, setReportId] = useState<string | null>(null);
  const list = useRef<FlatList<Message>>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [m, c] = await Promise.all([loadMessages(id), listConversations()]); if (!live) return; setMsgs(m);
        const conv = c.find(x => x.id === id); if (conv) setName((await namesFor([otherUser(conv, me)]))[otherUser(conv, me)] ?? 'Member');
        await markRead(id, me);
      } catch (e) { if (live) setErr((e as Error).message); }
    })();
    const off = subscribeMessages(id, m => { setMsgs(cur => (cur.some(x => x.id === m.id) ? cur : [...cur, m])); if (m.sender_id !== me) void markRead(id, me); });
    return () => { live = false; off(); };
  }, [id, me]);
  useEffect(() => { list.current?.scrollToEnd({ animated: true }); }, [msgs.length]);
  async function send() {
    const c = checkBody(text, MAX_MESSAGE); if (!c.ok) { setErr(c.error); return; }
    setBusy(true); setErr(''); try { await sendMessage(id, me, c.body); setText(''); } catch (e) { setErr((e as Error).message); } setBusy(false); // the realtime channel appends it
  }
  async function report(mid: string, r: ReportReason, d: string) { try { await sendReport(me, 'message', mid, r, d); setReportId(null); } catch (e) { setErr((e as Error).message); } }
  return (<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: color.bg, padding: layout.screenPad, paddingTop: space[10] }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}><Button label="Back" variant="ghost" onPress={() => router.back()} /><Text style={{ ...type.heading, color: color.textPrimary }}>{name}</Text></View>
    <FlatList ref={list} data={msgs} keyExtractor={m => m.id} contentContainerStyle={{ gap: space[2], paddingVertical: space[3] }} renderItem={({ item }) => { const mine = item.sender_id === me; return (
      <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%', gap: space[1] }}>
        <View style={{ padding: space[3], borderRadius: radius.card, backgroundColor: mine ? color.surface3 : color.surface2, borderWidth: mine ? 1 : 0, borderColor: color.forest600 }}>
          <Text style={{ ...type.body, color: color.textPrimary }}>{item.body}</Text></View>
        <View style={{ flexDirection: 'row', gap: space[2], alignSelf: mine ? 'flex-end' : 'flex-start', alignItems: 'center' }}>
          <Text style={{ ...type.caption, color: color.textMuted }}>{timeAgo(item.created_at, Date.now())}{mine && item.read_at ? ' · seen' : ''}</Text>
          {!mine && <Pressable accessibilityRole="button" accessibilityLabel="Report this message" onPress={() => setReportId(item.id)} style={{ minHeight: layout.touchMin, justifyContent: 'center', paddingHorizontal: space[2] }}><Text style={{ ...type.caption, color: color.textMuted }}>Report</Text></Pressable>}</View>
        {reportId === item.id && <ReportSheet onSubmit={(r, d) => report(item.id, r, d)} onCancel={() => setReportId(null)} />}
      </View>); }} />
    {!!err && <Text accessibilityRole="alert" style={{ ...type.body, color: color.danger }}>{err}</Text>}
    <View style={{ flexDirection: 'row', gap: space[2], paddingTop: space[2] }}>
      <Input label="Message" value={text} onChangeText={setText} placeholder="Message" style={{ flex: 1 }} maxLength={MAX_MESSAGE} onSubmitEditing={send} returnKeyType="send" />
      <Button label="Send" disabled={busy || !text.trim()} onPress={send} /></View>
  </KeyboardAvoidingView>);
}
