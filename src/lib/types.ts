import type { ProofKind, ProofStatus } from '@/core/proof';
export interface Profile { id: string; name: string | null; tz: string; wake_min: number; sleep_min: number; cutoff_min: number; trust_level: number; onboarded: boolean; is_moderator: boolean }
export interface Task { id: string; day: string; title: string; status: 'not_started' | 'in_progress' | 'done' | 'not_today'; created_at: string }
export interface Proof { id: string; task_id: string; day: string; kind: ProofKind; content: string | null; status: ProofStatus; status_reason: string | null; appeal_status: 'none' | 'pending' | 'upheld' | 'overturned'; created_at: string }
export const deviceTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
