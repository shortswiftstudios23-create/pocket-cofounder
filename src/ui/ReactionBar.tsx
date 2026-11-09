import { Pressable, Text, View } from 'react-native';
import { Flame, ThumbsUp, Check } from 'lucide-react-native';
import { color, space, radius, layout, type, font, size } from '@/theme/tokens';
import { REACTIONS, type ReactionKind, type ReactionSummary } from '@/core/social';
const META = { fire: { Icon: Flame, label: 'Fire' }, clap: { Icon: ThumbsUp, label: 'Respect' }, check: { Icon: Check, label: 'Solid' } } as const;
export function ReactionBar({ summary, onToggle, disabled }: { summary: ReactionSummary; onToggle: (k: ReactionKind, on: boolean) => void; disabled?: boolean }) {
  return (<View style={{ flexDirection: 'row', gap: space[2] }}>
    {REACTIONS.map(k => { const { Icon, label } = META[k]; const s = summary[k]; const tint = s.mine ? color.lime500 : color.textSecondary; return (
      <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: s.mine, disabled }} accessibilityLabel={`${label}, ${s.count} ${s.count === 1 ? 'reaction' : 'reactions'}${s.mine ? ', you reacted' : ''}`}
        disabled={disabled} onPress={() => onToggle(k, !s.mine)}
        style={{ minHeight: layout.touchMin, minWidth: layout.touchMin, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[1], paddingHorizontal: space[3],
          borderRadius: radius.pill, borderWidth: 1, borderColor: s.mine ? color.lime500 : color.border, backgroundColor: color.surface2 }}>
        <Icon size={size.icon} color={tint} /><Text style={{ ...type.caption, fontFamily: font.bold, color: tint }}>{s.count}</Text></Pressable>); })}
  </View>);
}
