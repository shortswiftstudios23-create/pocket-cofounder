import { useState } from 'react';
import { View, Text, TextInput, FlatList } from 'react-native';
import { color, space, radius, type, layout } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { askAI } from '@/lib/ai';
interface Msg { id: number; role: 'user' | 'ai'; body: string }
export default function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, role: 'ai', body: 'Tell me what you are working on right now.' }]);
  const [text, setText] = useState('');
  async function send() {
    const body = text.trim(); if (!body) return; setText('');
    setMsgs(m => [...m, { id: Date.now(), role: 'user', body }]);
    const r = await askAI({ task: 'chat', memorySummary: '', input: body });
    setMsgs(m => [...m, { id: Date.now() + 1, role: 'ai', body: r.text }]);
  }
  return (<View style={{ flex: 1, backgroundColor: color.bg, padding: layout.screenPad, paddingTop: space[10] }}>
    <FlatList data={msgs} keyExtractor={m => String(m.id)} contentContainerStyle={{ gap: space[2] }} renderItem={({ item }) => (
      <View style={{ alignSelf: item.role === 'ai' ? 'flex-start' : 'flex-end', maxWidth: '85%', padding: space[3], borderRadius: radius.card,
        backgroundColor: item.role === 'ai' ? color.surface2 : color.surface3, borderWidth: item.role === 'user' ? 1 : 0, borderColor: color.forest600 }}>
        <Text style={{ ...type.body, color: color.textPrimary }}>{item.body}</Text></View>)} />
    <View style={{ flexDirection: 'row', gap: space[2], paddingTop: space[3] }}>
      <TextInput value={text} onChangeText={setText} accessibilityLabel="Message" placeholder="Message" placeholderTextColor={color.textMuted}
        style={{ flex: 1, minHeight: layout.touchMin, backgroundColor: color.surface2, borderRadius: radius.input, paddingHorizontal: space[4], color: color.textPrimary }} />
      <Button label="Send" onPress={send} />
    </View></View>);
}
