import { useState } from 'react';
import { View, Text } from 'react-native';
import { color, space, type, font } from '@/theme/tokens';
import { REPORT_LABEL, REPORT_REASONS, MAX_REPORT_DETAIL, type ReportReason } from '@/core/safety';
import { Card } from './Card'; import { Chip } from './Chip'; import { Button } from './Button'; import { Input } from './Input';
/** Inline report form (no modal, so it behaves the same on web and Android). */
export function ReportSheet({ busy, error, onSubmit, onCancel }: { busy?: boolean; error?: string; onSubmit: (reason: ReportReason, detail: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState<ReportReason | null>(null); const [detail, setDetail] = useState('');
  return (<Card style={{ backgroundColor: color.surface2 }}>
    <Text style={{ ...type.heading, fontFamily: font.bold, color: color.textPrimary }}>Report this</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
      {REPORT_REASONS.map(r => <Chip key={r} label={reason === r ? `${REPORT_LABEL[r]} (selected)` : REPORT_LABEL[r]} onPress={() => setReason(r)} />)}</View>
    <Input label="Details (optional)" value={detail} onChangeText={t => setDetail(t.slice(0, MAX_REPORT_DETAIL))} placeholder="Anything we should know?" multiline />
    {!!error && <Text accessibilityRole="alert" style={{ ...type.body, color: color.danger }}>{error}</Text>}
    <View style={{ flexDirection: 'row', gap: space[2] }}>
      <Button label="Send report" disabled={!reason || busy} onPress={() => reason && onSubmit(reason, detail)} />
      <Button label="Cancel" variant="ghost" onPress={onCancel} /></View>
  </Card>);
}
