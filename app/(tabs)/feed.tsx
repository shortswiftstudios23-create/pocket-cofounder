import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { color, space, type, font, layout } from '@/theme/tokens';
import { Input } from '@/ui/Input'; import { Card } from '@/ui/Card'; import { Avatar } from '@/ui/Avatar'; import { FeedItemCard } from '@/ui/FeedItemCard';
import { useAuth } from '@/lib/auth';
import { loadFeed, loadFeedImages, loadReactions, loadBlocked, searchPeople, setReaction, sendReport, SocialError, type FeedItem, type Person } from '@/lib/social';
import { cleanSearch, summarizeReactions, visibleOnly, type ReactionRow } from '@/core/social';

export default function Feed() {
  const router = useRouter(); const { session } = useAuth(); const me = session?.user.id ?? '';
  const [items, setItems] = useState<FeedItem[]>([]); const [reactions, setReactions] = useState<Record<string, ReactionRow[]>>({}); const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [q, setQ] = useState(''); const [people, setPeople] = useState<Person[] | null>(null);

  const refresh = useCallback(async () => {
    if (!me) return; setLoading(true);
    try {
      const [feed, blocked] = await Promise.all([loadFeed(me), loadBlocked(me)]); const shown = visibleOnly(feed, blocked);
      setItems(shown); const [rx, img] = await Promise.all([loadReactions(shown.map(i => i.id)), loadFeedImages(shown)]); setReactions(rx); setImages(img); setError('');
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  }, [me]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  async function find(text: string) {
    setQ(text); const c = cleanSearch(text); if (!c) { setPeople(null); return; }
    try { const blocked = await loadBlocked(me); setPeople(visibleOnly((await searchPeople(c, me)).map(p => ({ ...p, user_id: p.id })), blocked)); } catch (e) { setError((e as Error).message); }
  }
  async function toggle(proofId: string, kind: 'fire' | 'clap' | 'check', on: boolean) {
    const before = reactions; // optimistic update, rolled back if the server says no
    setReactions(r => { const rows = (r[proofId] ?? []).filter(x => !(x.kind === kind && x.user_id === me)); return { ...r, [proofId]: on ? [...rows, { kind, user_id: me }] : rows }; });
    try { await setReaction(proofId, me, kind, on); } catch (e) { setReactions(before); setError((e as SocialError).message); }
  }

  const header = (<View style={{ gap: space[3], paddingBottom: space[3] }}>
    <Text style={{ ...type.title, color: color.textPrimary, fontFamily: font.light }}>The <Text style={{ fontFamily: font.bold }}>Feed</Text></Text>
    <Input label="Find people" value={q} onChangeText={find} placeholder="Find people by name" autoCapitalize="none" />
    {people && (people.length === 0 ? <Text style={{ ...type.body, color: color.textMuted }}>No one found.</Text> : people.map(p => (
      <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Open ${p.name ?? 'member'} profile`} onPress={() => router.push(`/u/${p.id}`)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: layout.touchMin }}>
        <Avatar name={p.name} /><View style={{ flex: 1 }}><Text style={{ ...type.body, fontFamily: font.bold, color: color.textPrimary }}>{p.name ?? 'Member'}</Text>
          {!!p.project && <Text numberOfLines={1} style={{ ...type.caption, color: color.textMuted }}>{p.project}</Text>}</View></Pressable>)))}
    {!!error && <Text accessibilityRole="alert" style={{ ...type.body, color: color.danger }}>{error}</Text>}
  </View>);

  return (<View style={{ flex: 1, backgroundColor: color.bg }}>
    <FlatList data={items} keyExtractor={i => i.id} ListHeaderComponent={header} contentContainerStyle={{ padding: layout.screenPad, paddingTop: space[10], gap: layout.cardGap }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={color.lime500} />}
      ListEmptyComponent={loading ? null : <Card><Text style={{ ...type.body, color: color.textSecondary }}>Nothing here yet. Find people above and follow them to see the proof they ship.</Text></Card>}
      renderItem={({ item }) => (<FeedItemCard item={item} imageUrl={item.media_path ? images[item.media_path] : undefined} summary={summarizeReactions(reactions[item.id] ?? [], me)} onToggle={(k, on) => toggle(item.id, k, on)}
        onProfile={() => router.push(`/u/${item.user_id}`)} onComments={() => router.push(`/proof/${item.id}`)} onReport={(r, d) => sendReport(me, 'proof', item.id, r, d)} />)} />
  </View>);
}
