# Passwordless Auth (Email Magic Link + Google) with Supabase in Expo Router

Research for GitHub issue #4. Stack: Expo SDK 52, `expo-router` ~4, `@supabase/supabase-js` ^2.45, `expo-secure-store` ~14, `expo-linking` ~7. App scheme: `meucaramelo`. Runs as a dev client (`expo start --dev-client`), not Expo Go.

> Key gotcha up front: the current client in `src/lib/supabase.ts` does **not** set `flowType`, so it defaults to the **implicit** flow. PKCE (magic link + browser OAuth deep-link callback with `exchangeCodeForSession`) requires `flowType: 'pkce'`. Add it.

## 0. Packages to add

```bash
npx expo install expo-auth-session expo-web-browser expo-crypto
# Native Google (recommended, see §2):
npx expo install @react-native-google-signin/google-signin
```
`expo-auth-session` gives `makeRedirectUri` + `QueryParams`; `expo-crypto` is required by PKCE in RN. Source: [Native Mobile Deep Linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking).

## 1. Email magic link — `signInWithOtp` + `emailRedirectTo`

Build the redirect URI from the scheme (never hardcode) and pass it as `emailRedirectTo`:

```ts
import { makeRedirectUri } from 'expo-auth-session';

// -> "meucaramelo://auth-callback" in a dev/standalone build
const redirectTo = makeRedirectUri({ scheme: 'meucaramelo', path: 'auth-callback' });

async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      // shouldCreateUser: true (default) also handles first-time signups
    },
  });
  if (error) throw error;
}
```

Flow: user taps the emailed link → OS opens `meucaramelo://auth-callback?code=<auth_code>` → app exchanges the `code` for a session (§3). With PKCE the link carries a `code` query param, **not** tokens. Source: [Native Mobile Deep Linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking), [signInWithOtp](https://supabase.com/docs/reference/javascript/auth-signinwithotp).

## 2. Google — recommendation: **native `signInWithIdToken`** for the dev client

Two options:

- **Native** — `@react-native-google-signin/google-signin` gets a Google `idToken`, passed to `supabase.auth.signInWithIdToken`. No browser round-trip, no deep-link callback needed. **Recommended here** because the project already ships a custom dev client (native modules allowed), it gives the native account-picker UX, and it avoids the fragile browser-redirect-back step.
- **Browser** — `signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } })` + `WebBrowser.openAuthSessionAsync`, then `exchangeCodeForSession`. Simpler config, works in Expo Go, but relies on the deep-link bounce-back. Keep as fallback.

Native example (from the official Google provider doc):

```tsx
import {
  GoogleSignin, GoogleSigninButton, statusCodes, isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import { supabase } from '../lib/supabase';

GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', // the *Web* OAuth client
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com', // iOS client
});

async function onGoogle() {
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  if (isSuccessResponse(response) && response.data.idToken) {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: response.data.idToken,
    });
    if (error) throw error;
  }
}
```

Supabase verifies the `idToken` server-side against Google's public keys, so an intercepted token cannot be forged. Nonce validation is on by default (toggle "Skip Nonce Check" only if the library can't provide one). Source: [Sign in with Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [signInWithIdToken](https://supabase.com/docs/reference/javascript/auth-signinwithidtoken).

Browser fallback:

```tsx
import * as WebBrowser from 'expo-web-browser';

async function onGoogleBrowser() {
  const { data } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  const res = await WebBrowser.openAuthSessionAsync(data?.url ?? '', redirectTo);
  if (res.type === 'success') await createSessionFromUrl(res.url); // see §3
}
```

## 3. Expo Router deep-link callback + `exchangeCodeForSession` (PKCE)

Helper that parses the incoming URL and exchanges the code:

```ts
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from '../lib/supabase';

export async function createSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);
  const { code } = params;                       // PKCE returns ?code=...
  if (!code) return;
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  return data.session;
}
```

`exchangeCodeForSession(authCode)` takes the raw code string and is specifically for the PKCE flow. Source: [exchangeCodeForSession](https://supabase.com/docs/reference/javascript/auth-exchangecodeforsession).

Wire it in a route so both cold-start and warm deep links are handled. Create `app/auth-callback.tsx`:

```tsx
import { useEffect } from 'react';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { createSessionFromUrl } from '../lib/auth-callback';

export default function AuthCallback() {
  const url = Linking.useURL(); // current deep-link URL
  useEffect(() => {
    if (!url) return;
    createSessionFromUrl(url)
      .then((session) => { if (session) router.replace('/'); })
      .catch(console.error);
  }, [url]);
  return null;
}
```

Notes:
- `path: 'auth-callback'` in `makeRedirectUri` must match the route filename so `meucaramelo://auth-callback` resolves to this screen.
- Keep `detectSessionInUrl: false` (correct for RN — there is no browser URL to auto-parse; you exchange manually).
- The **native** Google path (§2) does **not** hit this route — no browser, no callback. Only magic link and browser OAuth use it.

## 4. Session persistence (`expo-secure-store` already wired) — what to add

Current config is good (`storage: SecureStoreAdapter`, `autoRefreshToken`, `persistSession`). Two changes:

1. **Add `flowType: 'pkce'`** (required for §1/§3):

```ts
export const supabase = createClient(url, anonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
```

2. **Tie auto-refresh to `AppState`** so the refresh loop only runs while the app is foregrounded (do this once at app startup, e.g. root layout):

```ts
import { AppState } from 'react-native';
import { supabase } from './lib/supabase';

AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
```

Without this the timer keeps firing while suspended and the session can be stale on resume. Source: [Use Supabase Auth with React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native).

> Caveat: `expo-secure-store` values are capped at ~2048 bytes; a Supabase session (JWT + refresh token + user) can exceed that and warn/fail. If you hit it, wrap SecureStore with a chunking/`LargeSecureStore` adapter (Supabase's Expo tutorial ships one). Source: [Expo React Native tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native).

Also handle auth state app-wide with `supabase.auth.onAuthStateChange((event, session) => ...)` to route signed-in vs signed-out.

## 5. Supabase dashboard + Google Cloud config

**Supabase → Authentication → URL Configuration → Redirect URLs** — add:
```
meucaramelo://auth-callback
meucaramelo://**
```
(The wildcard `meucaramelo://**` covers any path; the explicit one documents the callback. Site URL can stay your web/prod URL.) Source: [Native Mobile Deep Linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking).

**Supabase → Authentication → Providers → Google** — enable it. Then:
- For the **browser** OAuth flow: paste the **Web** OAuth client ID + secret.
- For the **native** `signInWithIdToken` flow: add the **iOS** and **Web** client IDs to the provider's **Authorized Client IDs** list so Supabase accepts those `idToken`s. Nonce check on by default.

**Google Cloud Console → Credentials — OAuth 2.0 Client IDs needed:**
| Type | Used for |
|------|----------|
| **Web** | Supabase browser callback + `webClientId` in `GoogleSignin.configure` (this is the audience of the ID token) |
| **iOS** | native sign-in on iOS (bundle id `com.meucaramelo.app`) |
| **Android** | native sign-in on Android (package `com.meucaramelo.app` + release/dev **SHA-1** fingerprint) |

Browser-flow callback URL to authorize on the Web client: `https://<project-ref>.supabase.co/auth/v1/callback`. Configure the OAuth consent screen too. Source: [Sign in with Google](https://supabase.com/docs/guides/auth/social-login/auth-google).

## Sources
- Native Mobile Deep Linking — https://supabase.com/docs/guides/auth/native-mobile-deep-linking
- Sign in with Google — https://supabase.com/docs/guides/auth/social-login/auth-google
- exchangeCodeForSession — https://supabase.com/docs/reference/javascript/auth-exchangecodeforsession
- signInWithOtp — https://supabase.com/docs/reference/javascript/auth-signinwithotp
- signInWithIdToken — https://supabase.com/docs/reference/javascript/auth-signinwithidtoken
- Use Supabase Auth with React Native — https://supabase.com/docs/guides/auth/quickstarts/react-native
- Build a User Management App with Expo React Native — https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
- Expo makeRedirectUri (AuthSession) — https://docs.expo.dev/versions/latest/sdk/auth-session/
