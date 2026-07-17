# Supabase Auth rollout

Apply these steps before merging the authentication PR into production.

1. In Supabase Authentication > URL Configuration, set:
   - Site URL: `https://helio-therapist.vercel.app`
   - Redirect URL: `https://helio-therapist.vercel.app/**`
2. In Supabase Authentication > Users, invite the therapist's email address.
   Public self-registration is disabled in the frontend.
3. From the linked project directory, apply the migration:

   ```powershell
   npx supabase@latest db push
   ```

4. Confirm Vercel Production contains:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI=https://helio-therapist.vercel.app/api/google/callback`
   - `APP_URL=https://helio-therapist.vercel.app`
5. Deploy the PR and verify:
   - unauthenticated visitors see the sign-in screen;
   - the invited email receives a magic link;
   - the magic link returns to the production domain;
   - Google connect completes;
   - `integrations.user_id` equals the signed-in Supabase user;
   - calendar events load;
   - sign-out returns to the sign-in screen.

The migration deletes the temporary Google integration row that used the
all-zero placeholder user ID. Google Calendar must be reconnected once after
rollout.
