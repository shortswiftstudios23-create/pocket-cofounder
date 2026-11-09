import { useState } from 'react';
import { View, Text } from 'react-native';
import { CheckCircle2, HelpCircle, XCircle } from 'lucide-react-native';
import { color, space, type, font, size } from '@/theme/tokens';
import type { ProofStatus } from '@/core/proof';
import { Card } from './Card'; import { Button } from './Button'; import { Input } from './Input';

const META = {
  accepted: { Icon: CheckCircle2, tint: color.success, title: 'Proof accepted' },
  needs_followup: { Icon: HelpCircle, tint: color.warning, title: 'Needs follow-up' },
  not_accepted: { Icon: XCircle, tint: color.danger, title: 'Not accepted' },
} as const;

export interface ProofCardProps { status: ProofStatus; reason: string; appealStatus?: 'none' | 'pending' | 'upheld' | 'overturned'; busy?: boolean; onAppeal?: (note: string) => void }
/** Status is always spelled out in words; color and icon are only reinforcement. */
export function ProofStatusCard({ status, reason, appealStatus = 'none', busy, onAppeal }: ProofCardProps) {
  const m = META[status]; const [open, setOpen] = useState(false); const [note, setNote] = useState('');
  return (
    <Card accessibilityRole="alert" accessibilityLabel={`${m.title}. ${reason}`} style={{ borderColor: m.tint, backgroundColor: color.surface2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <m.Icon size={size.icon} color={m.tint} />
        <Text style={{ ...type.heading, fontFamily: font.bold, color: m.tint }}>{m.title}</Text>
      </View>
      <Text style={{ ...type.body, color: color.textSecondary }}>{reason}</Text>
      {status !== 'accepted' && appealStatus === 'pending' && <Text style={{ ...type.caption, color: color.textMuted }}>Appeal sent. Waiting for review.</Text>}
      {status !== 'accepted' && appealStatus === 'upheld' && <Text style={{ ...type.caption, color: color.textMuted }}>Appeal reviewed. The decision stands.</Text>}
      {status !== 'accepted' && appealStatus === 'none' && onAppeal && (open ? (
        <View style={{ gap: space[2] }}>
          <Input label="Appeal note" value={note} onChangeText={setNote} multiline
            placeholder={status === 'needs_followup' ? 'What exactly did you finish?' : 'Why should this count?'} />
          <Button label={status === 'needs_followup' ? 'Send follow-up' : 'Send appeal'} disabled={busy || note.trim().length < 10} onPress={() => { onAppeal(note.trim()); setNote(''); setOpen(false); }} />
        </View>) : <Button label={status === 'needs_followup' ? 'Answer follow-up' : 'Appeal'} variant="secondary" onPress={() => setOpen(true)} />)}
    </Card>);
}
