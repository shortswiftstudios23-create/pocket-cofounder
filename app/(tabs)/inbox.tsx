import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { color, space, radius, type, font, layout } from '@/theme/tokens';
import { Card } from '@/ui/Card'; import { Avatar } from '@/ui/Avatar';
import { useAuth } from '@/lib/auth';
import { listConversations, mutuals, namesFor, startConversation, unreadByConversation, type Conversation, type Person } from '@/lib/social';
import { otherUser, timeAgo } from '@/core/social';

export default function Inbox() {
  const router = useRouter(); const { session } = useAuth(); const me = session?.user.id ?? '';
  const [convos, setConvos] = useState<Conversation[]>([]); const [names, setNames] = useState<Record<string, string>>({}); const [unread, setUnread] = useState<Record<string, number>>({});
  const [people, setPeople] = useState<Person[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!me) return;
    try {
      const [c, u, m] = await Promise.all([listConversations(), unreadByConversation(me), mutuals(me)]);
      setConvos(c); setUnread(u); setPeople(m); setNames(await namesFor(c.map(x => otherUser(x, me)))); setError('');
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  }, [me]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  const open = async (other: string) => { try { router.push(`/thread/${await startConversation(other)}`); } catch (e) { setError((e as Error).message); } };
  const row = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: space[3], minHeight: layout.touchMin };
  return (<ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={{ padding: layout.screenPad, paddingTop: space[10], gap: space[4] }}>
    <Text style={{ ...type.title, color: color.textPrimary, fontFamily: font.light }}>Your <Text style={{ fontFamily: font.bold }}>Inbox</Text></Text>
    {!!error && <Text accessibilityRole="alert" style={{ ...type.body, color: color.danger }}>{error}</Text>}
    <Card>
      {loading ? <Text style={{ ...type.body, color: color.textMuted }}>Loading...</Text> : convos.length === 0 && <Text style={{ ...type.body, color: color.textSecondary }}>No conversations yet. You can message people who follow you back.</Text>}
      {convos.map(c => { const o = otherUser(c, me), n = unread[c.id] ?? 0; return (
        <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`Open chat with ${names[o] ?? 'member'}${n ? `, ${n} unread` : ''}`} onPress={() => router.push(`/thread/${c.id}`)} style={row}>
          <Avatar name={names[o]} /><View style={{ flex: 1 }}><Text style={{ ...type.body, fontFamily: n ? font.bold : font.regular, color: color.textPrimary }}>{names[o] ?? 'Member'}</Text>
            <Text style={{ ...type.caption, color: color.textMuted }}>{timeAgo(c.last_message_at, Date.now())}</Text></View>
          {n > 0 && <View style={{ minWidth: space[6], paddingHorizontal: space[2], borderRadius: radius.pill, backgroundColor: color.lime500, alignItems: 'center' }}><Text style={{ ...type.caption, fontFamily: font.bold, color: color.onLime }}>{n}</Text></View>}
        </Pressable>); })}
    </Card>
    <Text style={{ ...type.heading, fontFamily: font.bold, color: color.textPrimary }}>Start a chat</Text>
    <Card>
      {people.length === 0 ? <Text style={{ ...type.body, color: color.textSecondary }}>Follow people from the Feed. When they follow you back, you can message each other.</Text>
        : people.map(p => (<Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Message ${p.name ?? 'member'}`} onPress={() => open(p.id)} style={row}>
          <Avatar name={p.name} /><Text style={{ ...type.body, color: color.textPrimary, flex: 1 }}>{p.name ?? 'Member'}</Text></Pressable>))}
    </Card>
  </ScrollView>);
}
