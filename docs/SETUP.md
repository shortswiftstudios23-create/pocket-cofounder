# Setup (run these on your machine; Session 3 could not reach npm or Supabase)
1. `cp .env.example .env`, fill `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_VAPID_PUBLIC_KEY` (web push).
2. `npm install && npx expo install --check` (fixes any version drift), then `npm test`, then `npx expo start --web`.
3. Database: `supabase db push` (applies 0001 + 0002 + 0003). If you apply by hand instead, run `supabase/migrations/0003_social.sql` in the SQL editor once.
4. Auth: Supabase dashboard > Authentication > Providers: enable Email and Google. Add redirect URLs: your web origin (e.g. http://localhost:8081) and `pocketcofounder://auth-callback`.
5. Edge functions:
   `supabase functions deploy submit-proof`
   `supabase functions deploy ping-engine --no-verify-jwt`
   `supabase secrets set CRON_SECRET=<random> VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com FIREBASE_SERVICE_ACCOUNT='<service account json>'`
   Generate VAPID keys with `npx web-push generate-vapid-keys`.
6. Cron (SQL editor), every 5 minutes:
   ```sql
   select cron.schedule('ping-engine', '*/5 * * * *', $$ select net.http_post(
     url := 'https://<project>.functions.supabase.co/ping-engine', headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>')) $$);
   ```
   (enable the `pg_cron` and `pg_net` extensions first).
7. Android push needs a development build, not Expo Go: add `google-services.json` from Firebase, set `android.googleServicesFile` in app.json, then `npx expo run:android`.

## Session 5 additions (Phase 2)
8. AI (optional, app works without it): get a key at Google AI Studio, then
   `npx supabase secrets set GEMINI_API_KEY=<key>` (optional: `GEMINI_MODEL=<model name>` if the default `gemini-2.5-flash` is retired).
   `npx supabase functions deploy ai-proxy --use-api`, then in `.env` set `EXPO_PUBLIC_AI_MODE=gemini` and restart `npx expo start --web`.
   Daily cap per person: 30 calls (new accounts), 60 (trust 3+), 100 (trust 10+). Proof checks, ping copy and moderation count against it.
9. Redeploy the functions that changed: `npx supabase functions deploy submit-proof --use-api` and `npx supabase functions deploy ping-engine --no-verify-jwt --use-api`.
10. Moderation: `npx supabase functions deploy moderate --use-api`. Make yourself a moderator in the SQL editor:
    `update profiles set is_moderator = true where id = (select id from auth.users where email = 'you@example.com');`
    Sign out and in again, then Profile shows "Moderation queue".
11. Inbox realtime: migration 0003 adds `messages` to the `supabase_realtime` publication. If messages only show after a refresh, check Database > Replication in the dashboard.

## Session 6 additions
12. Run `supabase/migrations/0004_session6.sql` in the SQL editor (after 0003).
13. Deploy the new and changed functions:
    `npx supabase functions deploy notify-social --use-api`
    `npx supabase functions deploy delete-account --use-api`
    `npx supabase functions deploy moderate --use-api`
    (`notify-social` and `delete-account` check the signed-in user themselves, so the default JWT check can stay on.)
