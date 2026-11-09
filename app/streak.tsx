import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Award, Lock } from 'lucide-react-native';
import { color, space, radius, type, font, layout, size } from '@/theme/tokens';
import { Button } from '@/ui/Button'; import { Card } from '@/ui/Card';
import { useStreakHistory } from '@/lib/data';
import { badgesFor, MILESTONES } from '@/core/streak';
import { heatmapColumns, monthLabel } from '@/core/day';

export default function StreakHistory() {
  const router = useRouter(); const { today, days, streak, loading } = useStreakHistory();
  const done = new Set(days); const cols = heatmapColumns(today, 12); const earned = badgesFor(streak.longest);
  return (
    <ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={{ padding: layout.screenPad, paddingTop: space[10], gap: space[4] }}>
      <Button label="Back" variant="ghost" onPress={() => router.back()} />
      <View accessibilityLabel={`Current streak ${streak.current} days`} style={{ alignItems: 'center' }}>
        <Text style={{ ...type.streak, fontFamily: font.bold, color: streak.doneToday ? color.lime500 : color.textPrimary }}>{loading ? '-' : streak.current}</Text>
        <Text style={{ ...type.body, color: color.textSecondary }}>{streak.doneToday ? 'day streak. Today is done.' : streak.current > 0 ? 'day streak. Send proof today to extend it.' : 'No streak yet. One proof starts it.'}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: space[3] }}>
        {[['Longest', streak.longest], ['Total days', streak.total]].map(([l, v]) => (
          <Card key={l as string} style={{ flex: 1, alignItems: 'center' }}><Text style={{ ...type.title, fontFamily: font.bold, color: color.textPrimary }}>{v}</Text><Text style={{ ...type.caption, color: color.textMuted }}>{l}</Text></Card>))}
      </View>
      <Card>
        <Text style={{ ...type.heading, fontFamily: font.bold, color: color.textPrimary }}>Last 12 weeks</Text>
        <View accessibilityLabel={`${days.length} proof days in the last 12 weeks view`} style={{ flexDirection: 'row', gap: size.heatGap }}>
          {cols.map((col, ci) => (<View key={ci} style={{ gap: size.heatGap }}>{col.map((d, ri) => (
            <View key={ri} accessibilityLabel={d ? `${d}${done.has(d) ? ', proof sent' : ', no proof'}` : undefined}
              style={{ width: size.heat, height: size.heat, borderRadius: radius.cell, backgroundColor: !d ? 'transparent' : done.has(d) ? color.lime500 : color.surface3,
                borderWidth: d === today ? 1 : 0, borderColor: color.lime400 }} />))}</View>))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ ...type.caption, color: color.textMuted }}>{monthLabel(cols[0].find(Boolean)!)}</Text><Text style={{ ...type.caption, color: color.textMuted }}>{monthLabel(today)}</Text>
        </View>
      </Card>
      <Card>
        <Text style={{ ...type.heading, fontFamily: font.bold, color: color.textPrimary }}>Milestones</Text>
        {MILESTONES.map(m => { const ok = earned.includes(m); return (
          <View key={m} accessibilityLabel={`${m} day milestone, ${ok ? 'earned' : 'locked'}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: layout.touchMin }}>
            {ok ? <Award size={size.iconLg} color={color.lime500} /> : <Lock size={size.iconLg} color={color.textMuted} />}
            <Text style={{ ...type.body, color: ok ? color.textPrimary : color.textMuted }}>{m} days{ok ? '' : ` (${Math.max(m - streak.longest, 0)} to go)`}</Text>
          </View>); })}
      </Card>
    </ScrollView>);
}
