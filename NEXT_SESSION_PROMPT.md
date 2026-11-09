CONTEXT FROM END OF SESSION 6 (read first)
- The user is a beginner on Windows 10 (Command Prompt, Node 22, Chrome). ONE small step at a time, plain words, say what they should see. Never tell them to run `npm audit fix`. They paste terminal output and screenshots into the chat, never into the terminal. The cloud sandbox has no npm/Supabase access: you cannot run the app; rely on what they paste.
- Their folder: C:\Users\Administrator\Downloads\pocket-cofounder-session3\pocket-cofounder (zips unpack into a nested folder; commands run in the INNER one). Supabase project ifwyvjqjzihahnmabudn, CLI logged in and linked. Deploy functions with `npx supabase functions deploy <name> --use-api`.
- VERIFIED LIVE earlier: email sign-up, session gate, tasks in DB, text + link proofs, duplicate-link rejection + Appeal button, streak history. Unit tests: 69/69 (`npm test`).
- Sessions 5 and 6 WROTE BUT NEVER RAN: migrations 0003 and 0004, functions ai-proxy / moderate / submit-proof / ping-engine / notify-social / delete-account, tabs Feed / Inbox / Profile, routes u/[id], proof/[id], thread/[id], moderation, image proofs in Feed, Inbox badge, appeal notice, account deletion. Read HANDOFF.md "Session 5" and "Session 6".
- ASK FOR THE SPEC PDF AND BUILD-PROMPT: never received in Sessions 3 to 6 (only the zip). If attached now, read both FIRST and reconcile. If still missing, say so once and carry on.
- User-run steps are in docs/TEST_PLAN.md (A to I). Walk them one at a time, in order, and fix whatever breaks. Likely first failures: running 0003 then 0004 in the SQL editor (typos), functions not deployed, the Feed `feed_items` view returning nothing (check follows + is_public), the storage policy not letting followers see images, realtime not delivering.
- Still unverified from Phase 1: onboarding saved data, image proofs (duplicate image, EXIF strip), appeal submit, accepted animation, ping-engine deploy + cron, Web Push, Android FCM, cutoff alarm, Google sign-in, Android run.

You are continuing the build of Pocket Cofounder (Expo + TypeScript + Supabase, Android + Chrome web). Do not redo the code reading list in HANDOFF.md; read HANDOFF.md, docs/SETUP.md, docs/TEST_PLAN.md first.

Session 7 goals, in order:
1) Reconcile with spec + BUILD-PROMPT if provided.
2) Walk TEST_PLAN A-I with the user, fixing bugs found (paste-driven).
3) Remaining gaps: higher-res logo (needs original), Android dev build + FCM, Google sign-in, Phase 3 launch prep.
4) Tests for any new pure logic in src/core; keep `npm test` green.
Rules: tokens only for styling (add tokens, never literals); touch targets >= layout.touchMin; reduced-motion fallback for every animation; clients never write proofs or trust_level.
Finish by updating HANDOFF.md, zipping the project (no node_modules), and writing the next session prompt.
