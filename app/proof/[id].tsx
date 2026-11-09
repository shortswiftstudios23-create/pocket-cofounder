import { useCallback, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { color, space, type, font, layout } from '@/theme/tokens';
import { Button } from '@/ui/Button'; import { Input } from '@/ui/Input'; import { Card } from '@/ui/Card'; import { FeedItemCard } from '@/ui/FeedItemCard'; import { ReportSheet } from '@/ui/ReportSheet';
import { useAuth } from '@/lib/auth';
import { addComment, deleteComment, loadComments, loadFeedImages, loadFeedItem, loadReactions, sendReport, setReaction, type Comment, type FeedItem } from '@/lib/social';
import { checkBody, MAX_COMMENT, type ReportReason } from '@/core/safety';
import { summarizeReactions, timeAgo, type ReactionRow } from '@/core/social';

export default function ProofDetail() {
  const router = useRouter(); const { id } = useLocalSearchParams<{ id: string }>(); const { session } = useAuth(); const me = session?.user.id ?? '';
  const [item, setItem] = useState<FeedItem | null>(null); const [rows, setRows] = useState<ReactionRow[]>([]); const [comments, setComments] = useState<Comment[]>([]); const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [text, setText] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [reportId, setReportId] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { const it = await loadFeedItem(id); setItem(it); if (it) { setRows((await loadReactions([it.id]))[it.id] ?? []); setComments(await loadComments(it.id)); const img = await loadFeedImages([it]); setImageUrl(it.media_path ? img[it.media_path] : undefined); } setErr(''); } catch (e) { setErr((e as Error).message); }
    setLoading(false);
  }, [id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  async function send() {
    const c = checkBody(text, MAX_COMMENT); if (!c.ok) { setErr(c.error); return; }
    setBusy(true); setErr(''); try { await addComment(id, me, c.body); setText(''); setComments(await loadComments(id)); } catch (e) { setErr((e as Error).message); } setBusy(false);
  }
  async function toggle(kind: 'fire' | 'clap' | 'check', on: boolean) {
    const before = rows; setRows(r => { const k = r.filter(x => !(x.kind === kind && x.user_id === me)); return on ? [...k, { kind, user_id: me }] : k; });
    try { await setReaction(id, me, kind, on); } catch (e) { setRows(before); setErr((e as Error).message); }
  }
  async function reportComment(cid: string, r: ReportReason, d: string) { try { await sendReport(me, 'comment', cid, r, d); setReportId(null); } catch (e) { setErr((e as Error).message); } }
  return (<ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={{ padding: layout.screenPad, paddingTop: space[10], gap: space[4] }} keyboardShouldPersistTaps="handled">
    <Button label="Back" variant="ghost" onPress={() => router.back()} />
    {loading ? <Text style={{ ...type.body, color: color.textMuted }}>Loading...</Text> : !item ? <Card><Text style={{ ...type.body, color: color.textSecondary }}>This proof is not available.</Text></Card> : (<>
      <FeedItemCard item={item} imageUrl={imageUrl} summary={summarizeReactions(rows, me)} onToggle={toggle} onProfile={() => router.push(`/u/${item.user_id}`)} onReport={(r, d) => sendReport(me, 'proof', item.id, r, d)} />
      <Text style={{ ...type.heading, fontFamily: font.bold, color: color.textPrimary }}>Comments</Text>
      {comments.length === 0 && <Text style={{ ...type.body, color: color.textMuted }}>No comments yet.</Text>}
      {comments.map(c => (<Card key={c.id} style={{ gap: space[2] }}>
        <Text style={{ ...type.caption, color: color.textMuted }}>{c.profiles?.name ?? 'Member'} · {timeAgo(c.created_at, Date.now())}</Text>
        <Text style={{ ...type.body, color: color.textPrimary }}>{c.body}</Text>
        <View style={{ flexDirection: 'row', gap: space[2] }}>
          {c.user_id === me ? <Button label="Delete" variant="ghost" onPress={async () => { try { await deleteComment(c.id); setComments(await loadComments(id)); } catch (e) { setErr((e as Error).message); } }} />
            : <Button label="Report" variant="ghost" onPress={() => setReportId(c.id)} />}</View>
        {reportId === c.id && <ReportSheet onSubmit={(r, d) => reportComment(c.id, r, d)} onCancel={() => setReportId(null)} />}
      </Card>))}
      <Input label="Add a comment" value={text} onChangeText={setText} placeholder="Say something useful" multiline maxLength={MAX_COMMENT} />
      {!!err && <Text accessibilityRole="alert" style={{ ...type.body, color: color.danger }}>{err}</Text>}
      <Button label="Post comment" disabled={busy || !text.trim()} onPress={send} />
    </>)}
  </ScrollView>);
}
