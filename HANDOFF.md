# Handoff log
## Session 1 (done)
Scaffold, tokens, migration 0001 (Phase 1 tables + RLS), ai.ts (mock), streak + ping rules with tests.
## Session 2 (done)
Outfit fonts, supabase client stub, proof-check rules, Button, local-state Today, mock AI chat.
## Session 3 (code written, NOT yet run)
**Environment limit:** this session had no npm/registry or Supabase access. `npm install`, `npx expo start --web`, Metro bundling, and every
edge function were NEVER executed. Verified only: `npm test` (39/39 pass, Node), and a typecheck of src/ + app/ against permissive module
shims (catches syntax and core-logic types, not React Native / Supabase API usage). Treat the first real run as Session 4's step 1.
### Added
- Core (tested): `day.ts` (tz day keys, heatmap grid), `phash.ts` (DCT 64-bit hash), `linkcheck.ts` (SSRF guard, page text, relatedness),
  `onboarding.ts` (9-step script, parsers, record mapper), `ping.ts` += `PING_COPY`, `cutoffAlarmDue`, `nextCutoff`.
- Migration `0002`: `profiles.onboarded/cutoff_min`, auto-profile trigger (+backfill), column-level grants (clients can't edit `trust_level`),
  proofs now read-only for clients (only `submit-proof` writes), link-unique index narrowed to accepted proofs, appeal columns,
  `device_tokens`, private `proofs` storage bucket (5 MB, jpeg, per-user folder).
- Edge functions: `submit-proof` (link fetch check w/ DNS+redirect SSRF guard, image decode, server EXIF strip by re-encode, phash dup check,
  `decideProof`, task->done, trust+1, appeals/follow-ups), `ping-engine` (cron; `shouldPing` + `cutoffAlarmDue`; CRON_SECRET header), `_shared/push.ts` (FCM v1 + Web Push, dead-token cleanup).
- App: session gate in `app/_layout.tsx`; `(auth)/sign-in` (email + Google); `onboarding` (chat + chips, writes profiles/goals/memory_entries);
  Today on Supabase (tasks, proofs, streak); `ProofStatusCard` (accepted / needs follow-up / not accepted + Appeal); `ProofAccepted` Reanimated
  animation with `useReducedMotion` fallback; image pick -> resize 1280px -> JPEG 0.7 -> upload; `streak.tsx` history (12-week heatmap, milestones);
  `lib/notify.ts` (Android FCM token, Web Push, on-device cutoff alarm); `public/sw.js`.
- UI kit: `Input`, `Chip`, `Card`; `Button` now token-only. Tokens added: `size`, `radius.cell`.
- Setup steps for keys, providers, cron, deploy: `docs/SETUP.md`.
### Known gaps / honest caveats
- Spec PDF and BUILD-PROMPT were not attached in Session 3; work followed HANDOFF + code only. Reconcile against them.
- AI relatedness for text and image proofs is not implemented (needs `ai-proxy`): only links get a relatedness score (page title/meta vs task words);
  text/image proofs pass if long enough / not duplicate. `ai.ts` still mock-only.
- Appeals are stored (`appeal_status='pending'`) but nothing reviews them yet. Needs-follow-up answers are re-scored automatically.
- phash duplicate scan loads the latest 5000 accepted hashes: fine now, needs an index/bucket scheme at scale.
- Clients can still set their own task `status='done'`; streaks are safe (they count accepted proofs only) but the task checkmark is client-trusted.
- Web push needs `EXPO_PUBLIC_VAPID_PUBLIC_KEY` + function secrets; Android push needs a dev build with `google-services.json` (not Expo Go).
- Local cutoff alarm is Android only (browsers cannot schedule); the server alarm covers web.
- Reanimated Babel plugin is assumed to be auto-added by babel-preset-expo (SDK 52). If the animation crashes, add `plugins:['react-native-reanimated/plugin']` to babel.config.js.
- Versions in package.json: first real run (Windows, Session 3 follow-up) needed `expo-asset`, `query-string@7` added and react-native 0.76.9. App now bundles; web sign-in screen + gate verified. Still unrun: auth against Supabase, onboarding, Today data, edge functions, push, animation.
- Logo asset exports, Feed/Inbox/Profile tabs: not started.
### Verified on the user's machine (Windows, Chrome web, real Supabase project)
Sign-up (email, confirm off), session gate, Today on Supabase (add task, persists), `submit-proof` deployed with `supabase functions deploy submit-proof --use-api`:
short text -> Needs follow-up card, real text -> accepted + task done + streak 1, link accepted, duplicate link -> Not accepted + Appeal. Migrations 0001+0002 applied via SQL editor.
Supabase now issues `sb_publishable_` keys instead of anon keys: works as EXPO_PUBLIC_SUPABASE_ANON_KEY.
Still unverified: onboarding chat details, streak history screen, image proof (photo/screenshot, phash, EXIF strip), appeal submit, accepted animation visibility, ping-engine, push, cutoff alarm, Google sign-in, Android.
## Session 5 (code written, NOT yet run; tests 60/60 in Node)
**Environment limit again:** no npm/Supabase network. Verified here: `npm test` (60/60), a tsc pass over app/ + src/ against permissive shims (only shim gaps remain),
SQL read-through. NEVER executed: migration 0003, the three new/changed edge functions, any new screen. The user will test later with `docs/TEST_PLAN.md`.
**The spec PDF and BUILD-PROMPT were again NOT received** (only the zip). Reconciliation against them is still undone.
### Added
- Core (tested): `aiprompt.ts` (prompts, daily cap by trust, score/flag/ping-copy parsers), `safety.ts` (report reasons, rate limits, body checks, mutual-follow DM rule, friendlyError),
  `social.ts` (reaction summary, visibility filter, convo pair, unread, timeAgo, search clean), `appeal.ts` (what uphold/overturn do), `schedule.ts` (HH:MM, wake/sleep/cutoff validation).
- Migration `0003_social.sql` (RLS enabled with each table): follows, blocks, reactions, comments, reports, conversations, messages, app_usage; `profiles.is_moderator` (not client-writable);
  helpers `is_blocked_pair/are_mutual/can_view_proof/in_conversation/can_send_in`; rate-limit triggers (comments 20/h, messages 60/h, reports 10/h, follows 100/day);
  block removes follows; reports validate target and auto-hide a proof/comment at 3 distinct reporters; `start_conversation()` (mutual follow only); `feed_items` view (owner-run, only
  accepted + not hidden + public author + you follow them); `public_profile()` RPC; `bump_ai_usage()` (service role only); `messages` added to realtime; mutual follows can read each other's profile.
- Edge functions: `ai-proxy` (JWT, cap, Gemini key in secrets, serious-topic softening), `moderate` (is_moderator re-checked server side: list/resolve appeals, list/resolve reports),
  `_shared/gemini.ts` (Gemini call, cap, `aiRelatedness`, `moderateImage`, `aiPingCopy`). `submit-proof`: AI relatedness for text and images feeds `decideProof.relatedScore`;
  image moderation hook (flagged -> not_accepted, stored hidden, file deleted, auto report); second appeal on the same proof is refused (409). `ping-engine`: AI-written copy with fixed-text fallback.
- App: `askAI` now calls `ai-proxy` when `EXPO_PUBLIC_AI_MODE=gemini` (falls back to the mock prompts on any failure; shows the cap message on 429); tabs Today, Feed, Inbox, Chat, Profile;
  routes `u/[id]` (public profile: follow, message, block, report), `proof/[id]` (comments), `thread/[id]` (realtime chat), `moderation` (appeal + report queues).
  Profile: name/bio, public toggle, wake/sleep/cutoff, enable push, weekly AI review, blocked list, streak history link, moderation link, sign out (moved from Today).
  Today: "Not today" asks the missed-task question. ProofStatusCard shows pending/upheld appeal state.
- Logo exports from the brand sheet (top-left mark, auto-cut transparent): `icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png`, `notification-icon.png`, `logo-mark.png`; wired in app.json.
- Tokens added: `size.avatar`, `size.avatarLg`, `size.preview`.
### Known gaps / caveats
- Logo mark was cut from a 1536px sheet (mark is ~290px tall), so the 1024px icon is upscaled and slightly soft. Replace with a vector/hi-res original for store release.
- Image proofs show as "Photo proof" in the Feed (storage bucket is private; no signed-URL path for followers yet).
- No push for new DMs or comments yet; no unread badge on the Inbox tab icon.
- Moderation image moderation is Gemini-based and FAILS OPEN when AI is off/capped. The report flow + moderators are the backstop.
- Reaction/comment author names of private profiles show as "Member" (profiles RLS).
- Moderator access is granted by SQL only. No account deletion, no appeal notification inside the app (push only).
- Gemini default model `gemini-2.5-flash` is unverified; change with the `GEMINI_MODEL` secret if the API says model not found.
- Android run, FCM, Google sign-in, cron schedule: still unverified (see docs/TEST_PLAN.md H).
## Session 6 (code written, NOT yet run; tests 69/69 in Node)
**Scope:** only work that needs no manual verification to write. The spec PDF and BUILD-PROMPT were STILL not received (only the zip), so reconciliation is still undone. TEST_PLAN A-H was not walked: nothing in Session 5 was run, and this session also had no npm/Supabase access.
### Added
- Migration `0004_session6.sql`: `proofs.appeal_resolved_at`; `can_view_proof_image()` + a storage SELECT policy so followers can get signed URLs for image proofs they are allowed to see; `feed_items` rebuilt (adds `media_path`, now also returns your OWN accepted proofs so the proof page and notification links open; the Feed screen filters own proofs out with `.neq('user_id', me)`; the public-profile rule now lives only in `can_view_proof`).
- Image proofs in Feed + proof page: `loadFeedImages` (1-hour signed URLs), `FeedItemCard` shows the picture (alt text names the task). Core: `imagePaths`.
- Unread badge on the Inbox tab: `src/lib/unread.ts` (realtime + 60 s poll), `badgeLabel` (core, 9+ cap).
- Push for DMs and comments: edge function `notify-social` (caller must be the author of the row; recipient looked up server-side; skips blocks, hidden rows, own comments, and stops after 3 unread messages in a thread). Notification text never contains the message body. Rules + wording are pure in `src/core/socialpush.ts`. `sendMessage`/`addComment` call it best-effort. `public/sw.js` now opens the tapped screen.
- Account deletion: edge function `delete-account` (needs `{"confirm":"DELETE"}`, deletes the user's storage folder, then the auth user; all tables cascade), `src/lib/account.ts`, Profile "Delete account" card (type DELETE), `Button` gained a token-only `danger` variant. Core: `isDeleteConfirmed`.
- In-app appeal result notice on Today: `moderate` stamps `appeal_resolved_at`; `src/lib/notices.ts` + core `unseenAppealNotices` / `newestStamp`; dismissal is remembered per device (AsyncStorage), so a second device shows it again.
- Tests added: notices, socialpush, badgeLabel, imagePaths, isDeleteConfirmed (69 total).
### Known gaps / caveats
- Android tap-to-open added in app/_layout.tsx (only thread/proof/u links allowed); unverified, needs the dev build.
- Deleting an account also deletes the messages that person sent, so the other person's thread loses them. Stated in the confirm text only as "messages".
- Higher-res logo: needs the original vector/hi-res file (not provided).
- Still unverified: everything in the Session 5 list plus all new code above. Android dev build + FCM and Google sign-in need the user's machine.
- Typecheck here uses permissive shims; remaining reports are shim gaps (FlatList/ViewProps types, `key` on shimmed components).
## Session 7 (real-device/browser testing & verification)
**Environment:** Windows 10, Node 24.18.0, Metro on web (`http://localhost:8081`), Supabase project `ifwyvjqjzihahnmabudn`.
All 6 edge functions deployed (`submit-proof`, `ping-engine`, `ai-proxy`, `moderate`, `notify-social`, `delete-account`).
Walked `docs/TEST_PLAN.md` Sections A through I with automated browser sessions across two distinct accounts. `npm test` remains 69/69 green.

### Passed
- **Static checks & Build**: `npm install`, `npx expo install --check`, `npm test` (69/69 green), `npx tsc --noEmit` (0 errors), SQL migration audit (0001..0004).
- **Run & Auth**: Web bundling, sign-up with email test accounts, full 9-step onboarding writing `profiles`/`goals`/`memory_entries`, and clean tab navigation across Today, Feed, Inbox, Chat, and Profile with zero console or network errors.
- **Proofs & Appeals (B1-B6)**: Image proof upload to private `proofs` bucket, DCT phash duplicate detection rejection, server EXIF stripping/re-encoding, appeal submission (`appeal_status='pending'`), and Reanimated reduced-motion fallback.
- **Moderation Queues (C1-C3)**: In-app moderation queue viewing, appeal overturn (marks task done and updates streak), and appeal uphold (decision stands banner and removes appeal button).
- **Social & Feed (D1-D5)**: Second account onboarding, follow user, signed-URL follower image loading (`can_view_proof_image`), heart reaction toggle with live counts, comment posting and deletion, private profile toggle hiding/restoring feed items.
- **Messaging (E1-E3)**: Non-mutual message blocking guard, mutual follow `start_conversation` RPC, realtime chat delivery, and read receipts (`read_at`).
- **Safety & Rate Limits (F1-F4)**: Proof reporting, 3-report auto-hide from `feed_items`, moderator report restore, user block removing mutual follows, and comment rate limit (20/hr) with friendly user-facing notice.
- **AI Live Features (G1-G4)**: Real Gemini integration verified via `ai-proxy` and `submit-proof`. G1 chat returns dynamic, brief, practical cofounder replies and increments `app_usage.ai_calls`. G2 serious prompts ("exhausted and sick") trigger pressure-free resting advice (`softened: true`). G3 unrelated text proofs ("bought groceries" for a coding task) are scored low and flagged as `needs_followup` ("This does not clearly match the task. What does it show?"), while valid coding proofs pass cleanly (`status: 'accepted'`). G4 "Not today" displays the missed-task question.
- **Automation & Cutoffs (H1, H3)**: `ping-engine` invocation with `x-cron-secret` processing active users and cutoffs.
- **Session 6 Features (I1, I2, I5, I6)**: Follower signed URLs for private storage images, live unread badge on Inbox tab ("Inbox, 1 unread") resetting on read, Today tab in-app appeal resolution banner with dismissal persistence, and throwaway account deletion (invalid word rejected, "DELETE" cleans storage folder, cascades DB rows, deletes auth user).

### Fixed
- `src/theme/tokens.ts`: Changed `fontVariant: ['tabular-nums'] as const` to `['tabular-nums'] as ('tabular-nums')[]` to fix TypeScript compilation against React Native's mutable `TextStyle.fontVariant`.
- `tsconfig.json`: Added `"supabase"` and `"node_modules"` to `"exclude"` so Deno-based edge functions don't cause React Native type check failures.

### Blocked
- **Web Push notifications (H2, I3, I4)**: BLOCKED on VAPID keys (`EXPO_PUBLIC_VAPID_PUBLIC_KEY` in `.env` and `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` in Supabase secrets). Notification logic and edge functions deployed and verified pure.
- **Android FCM, On-device cutoff alarm & Google sign-in (H4, H5)**: BLOCKED as requested; requires physical Android hardware or emulator running a dev build with `google-services.json` and Google OAuth client configuration.
- **Scheduled Cron execution (H1)**: `ping-engine` works when invoked; requires `pg_cron` or an external webhook cron scheduled in the Supabase Dashboard.

### Next manual steps for user
1. **Generate VAPID Keys for Web Push**: Run `npx web-push generate-vapid-keys`, place the public key in `.env` as `EXPO_PUBLIC_VAPID_PUBLIC_KEY`, and run `npx supabase secrets set VAPID_PRIVATE_KEY="..." VAPID_SUBJECT="mailto:you@example.com" --project-ref ifwyvjqjzihahnmabudn`.
2. **Schedule Cron for `ping-engine`**: In Supabase SQL Editor or Dashboard, configure `pg_cron` (or use GitHub Actions / cron-job.org) to POST every minute to `https://ifwyvjqjzihahnmabudn.supabase.co/functions/v1/ping-engine` with header `x-cron-secret: pc_secret_998244353`.
3. **Configure Google OAuth (optional)**: Set up Google OAuth Client IDs in Supabase Dashboard (Authentication -> Providers -> Google) if Google sign-in is required.
4. **Android Dev Build (optional)**: Run `npx expo run:android` with `google-services.json` to verify FCM push notifications and on-device cutoff alarms on physical hardware.

