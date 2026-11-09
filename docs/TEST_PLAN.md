# Test plan (do ONE step at a time; paste what you see into the chat, never into the terminal)
Tick off in order. Each step says what you should see. Stop at the first thing that looks wrong and tell Claude.

## A. Database (SQL editor in the Supabase dashboard)
A1. Run all of `supabase/migrations/0003_social.sql`. See: "Success. No rows returned." (If you see an error, paste it.)
A1b. Run all of `supabase/migrations/0004_session6.sql` the same way. See: "Success. No rows returned."
A2. Make yourself a moderator (see SETUP.md step 10). See: "Success".

## B. Phase 1 items never verified
B1. Onboarding data: Table Editor > `profiles` row has `onboarded = true`, your name/project/stage/field. `goals` has 1 row, `memory_entries` has 1 row (kind `profile`).
B2. Image proof (photo): Today > Add screenshot > pick a picture. See: green "Proof accepted" card, task checked, streak up.
B3. Duplicate image: add a second task, submit the SAME picture. See: "Not accepted: This image matches an earlier proof." with an Appeal button.
B4. EXIF strip: Storage > `proofs` bucket > your folder > open the image: it should open as a normal JPEG (re-encoded by the server).
B5. Appeal: press Appeal on the rejected proof, write a sentence, send. See: "Appeal sent. Waiting for review."
B6. Accepted animation: after any accepted proof, a short animation shows. Turn on "reduce motion" in Windows (Settings > Ease of Access > Display > Show animations off) and repeat: it should show a still card, no movement.

## C. Appeal review (needs A2 and the `moderate` function deployed)
C1. Profile tab > "Moderation queue" > Appeals shows your appeal (task, picture or text, your note).
C2. Press "Overturn: accept it". See: it leaves the queue. Back on Today the proof is accepted and the task is done.
C3. Make another rejected duplicate, appeal it, press "Uphold: keep decision". See on Today: "Appeal reviewed. The decision stands." and no Appeal button.

## D. Feed, follows, reactions, comments (needs a SECOND account: sign up in a private Chrome window)
D1. Account 2 completes onboarding, adds a task, submits a text proof (accepted).
D2. Account 1 > Feed > search the name of account 2 > open > Follow. Feed shows account 2's accepted proof.
D3. Press a reaction: the count goes to 1 and the button turns green. Press again: back to 0.
D4. Comments > write a comment > it appears. Delete it > gone.
D5. Account 2 > Profile > turn OFF "Public profile". Account 1's Feed no longer shows those proofs. Turn it back on.

## E. Inbox
E1. Account 2 follows account 1 back. Inbox > "Start a chat" lists the other person on both sides.
E2. Send a message from 1. See it appear on 2 within a few seconds WITHOUT refreshing (realtime). 2 replies; 1 sees "seen".
E3. Before following back, "Message" on the profile says "You can message people who follow you back."

## F. Safety
F1. Report a proof (Feed > Report > pick reason > Send report). See: button changes to "Reported".
F2. With 3 different accounts reporting the same proof it disappears from feeds (auto-hide). Moderation queue > Reports > Restore it brings it back.
F3. Block: account 1 opens account 2's profile > Block. Account 2 disappears from Feed and search; follows are removed. Profile tab > Blocked > Unblock.
F4. Rate limit: post 21 comments in an hour. The 21st shows "You are going a bit fast."

## G. AI (after SETUP step 8)
G1. Set `EXPO_PUBLIC_AI_MODE=gemini`, restart. Chat tab: a reply that is NOT the fixed sentence. Table `app_usage` shows `ai_calls` going up.
G2. Tell it "I am exhausted and sick": the reply should be gentle and pressure-free.
G3. Submit an unrelated text proof ("bought groceries") for a coding task: expect "Needs follow-up" (relatedness check).
G4. Today > "Not today" shows a question about what got in the way.

## H. Push and cron (SETUP steps 5 and 6)
H1. Deploy ping-engine, set secrets, run the `cron.schedule` SQL. Check: `select * from cron.job;` shows `ping-engine`.
H2. Chrome: Profile > "Turn on notifications on this device" > Allow. `device_tokens` has a `web` row.
H3. Manual run (Command Prompt): `curl -X POST -H "x-cron-secret: <CRON_SECRET>" https://<project>.functions.supabase.co/ping-engine`. See JSON like {"users":1,"pings":0,"cutoffs":0}. (pings stays 0 outside your wake-sleep window or if you already sent proof.)
H4. Cutoff alarm: Profile > set Cutoff to 5 minutes from now, save, make sure no proof today, wait: a notification arrives.
H5. Android FCM needs a development build + google-services.json (SETUP step 7). Google sign-in: enable the provider in Supabase and add redirect URLs (SETUP step 4).

## I. Session 6 additions (deploy first: `npx supabase functions deploy notify-social --use-api`, `delete-account --use-api`, and `moderate --use-api` again)
I1. Image in the Feed: account 2 submits a photo/screenshot proof (accepted). Account 1 (follows account 2) > Feed: the picture shows inside the card. Turn account 2's \"Public profile\" off: the card disappears.
I2. Unread badge: account 2 sends account 1 a message while account 1 is on the Today tab. The Inbox tab gets a small green number within a few seconds. Open the chat: the number goes away.
I3. Push for DMs (needs H2 done on account 1): with the Chrome tab in the background, account 2 sends a message. A notification \"<name> / Sent you a message\" appears. Clicking it opens the chat.
I4. Push for comments: account 2 comments on account 1's proof. Account 1 gets \"<name> commented on your proof\". (Open your own proof page from the notification: it must load, not say \"not available\".)
I5. Appeal notice: repeat C2/C3. Back on Today, a green-bordered card says the appeal was accepted / the decision stands. Press Dismiss: it goes away and stays away after a refresh.
I6. Delete account (use a THROWAWAY account, not your main one): Profile > Delete my account. The red button stays greyed out until you type DELETE exactly. After pressing it you land on the sign-in screen, and signing in with the same email fails. In the Table Editor `profiles` has no row for it and the Storage `proofs` bucket has no folder for it.
