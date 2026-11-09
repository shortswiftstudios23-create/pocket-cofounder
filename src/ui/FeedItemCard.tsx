import { useState } from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import { MessageCircle, Flag } from 'lucide-react-native';
import { color, space, radius, layout, type, font, size } from '@/theme/tokens';
import { timeAgo, type ReactionKind, type ReactionSummary } from '@/core/social';
import type { ReportReason } from '@/core/safety';
import type { FeedItem } from '@/lib/social';
import { Card } from './Card'; import { Avatar } from './Avatar'; import { ReactionBar } from './ReactionBar'; import { ReportSheet } from './ReportSheet';
const isUrl = (s: string | null) => !!s && /^https?:\/\/\S+$/i.test(s);
export interface FeedItemCardProps { item: FeedItem; imageUrl?: string; summary: ReactionSummary; onToggle: (k: ReactionKind, on: boolean) => void; onProfile?: () => void; onComments?: () => void; onReport: (reason: ReportReason, detail: string) => Promise<void> }
export function FeedItemCard({ item, imageUrl, summary, onToggle, onProfile, onComments, onReport }: FeedItemCardProps) {
  const [reporting, setReporting] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [sent, setSent] = useState(false);
  const submit = async (r: ReportReason, d: string) => { setBusy(true); setErr(''); try { await onReport(r, d); setSent(true); setReporting(false); } catch (e) { setErr((e as Error).message); } setBusy(false); };
  return (<Card>
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.name ?? 'member'} profile`} disabled={!onProfile} onPress={onProfile} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: layout.touchMin }}>
      <Avatar name={item.name} /><View style={{ flex: 1 }}><Text style={{ ...type.body, fontFamily: font.bold, color: color.textPrimary }}>{item.name ?? 'Member'}</Text>
        <Text style={{ ...type.caption, color: color.textMuted }}>{timeAgo(item.created_at, Date.now())}</Text></View></Pressable>
    <Text style={{ ...type.caption, color: color.textMuted }}>Task</Text>
    <Text style={{ ...type.heading, color: color.textPrimary, fontFamily: font.bold }}>{item.task_title}</Text>
    {!!imageUrl && <Image accessibilityRole="image" accessibilityLabel={`${item.kind === 'photo' ? 'Photo' : 'Screenshot'} proof for ${item.task_title}`} source={{ uri: imageUrl }} resizeMode="cover" style={{ width: '100%', height: size.preview, borderRadius: radius.input, backgroundColor: color.surface2 }} />}
    {isUrl(item.content) ? <Pressable accessibilityRole="link" accessibilityLabel={`Open proof link ${item.content}`} onPress={() => void Linking.openURL(item.content!)} style={{ minHeight: layout.touchMin, justifyContent: 'center' }}>
        <Text numberOfLines={2} style={{ ...type.body, color: color.lime400 }}>{item.content}</Text></Pressable>
      : imageUrl ? null : <Text style={{ ...type.body, color: color.textSecondary }}>{item.content ?? (item.kind === 'photo' ? 'Photo proof' : 'Screenshot proof')}</Text>}
    <ReactionBar summary={summary} onToggle={onToggle} />
    <View style={{ flexDirection: 'row', gap: space[2] }}>
      {onComments && <Pressable accessibilityRole="button" accessibilityLabel="Comments" onPress={onComments} style={{ minHeight: layout.touchMin, flexDirection: 'row', alignItems: 'center', gap: space[1], paddingHorizontal: space[2] }}>
        <MessageCircle size={size.icon} color={color.textSecondary} /><Text style={{ ...type.caption, color: color.textSecondary }}>Comments</Text></Pressable>}
      <Pressable accessibilityRole="button" accessibilityLabel="Report this proof" disabled={sent} onPress={() => setReporting(true)} style={{ minHeight: layout.touchMin, flexDirection: 'row', alignItems: 'center', gap: space[1], paddingHorizontal: space[2], opacity: sent ? 0.5 : 1 }}>
        <Flag size={size.icon} color={color.textMuted} /><Text style={{ ...type.caption, color: color.textMuted }}>{sent ? 'Reported' : 'Report'}</Text></Pressable></View>
    {reporting && <ReportSheet busy={busy} error={err} onSubmit={submit} onCancel={() => setReporting(false)} />}
  </Card>);
}
