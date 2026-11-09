// Rules and wording for push notifications about messages and comments. The notify-social edge function applies exactly these.
export const MAX_DM_PUSHES_PER_BURST = 3; // after this many unread messages from one person in a thread, stay quiet until they are read
export interface PushText { title: string; body: string; tag: string; url: string }
const clean = (s: string | null | undefined, fallback: string) => ((s ?? '').trim().slice(0, 40) || fallback);
/** Message text is deliberately NOT in the notification: lock screens are public. */
export const messagePush = (senderName: string | null, conversationId: string): PushText => ({ title: clean(senderName, 'Someone'), body: 'Sent you a message', tag: `dm-${conversationId}`, url: `/thread/${conversationId}` });
export const commentPush = (name: string | null, taskTitle: string, proofId: string): PushText => ({ title: `${clean(name, 'Someone')} commented on your proof`, body: taskTitle.trim().slice(0, 80), tag: `comment-${proofId}`, url: `/proof/${proofId}` });
export function shouldPushMessage(a: { unreadFromSender: number; blockedEither: boolean; hidden: boolean }): boolean { return !a.blockedEither && !a.hidden && a.unreadFromSender <= MAX_DM_PUSHES_PER_BURST; }
export function shouldPushComment(a: { commenter: string; owner: string; blockedEither: boolean; hidden: boolean }): boolean { return a.commenter !== a.owner && !a.blockedEither && !a.hidden; }
