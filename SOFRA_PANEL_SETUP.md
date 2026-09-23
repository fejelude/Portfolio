# Sofra Panel deployment setup

The public Sofra page is `/sofra/about`. The dashboard and OAuth redirect
destination remain `/sofra`; no existing dashboard URLs need to change.
Deploy the matching bot release to use AutoMod safety controls and bot sync
acknowledgements. See `SOFRA_RENOVATION.md` for verification and known limits.

Sofra Panel connects the Vercel portfolio and the Wispbyte-hosted Sofra bot through one shared Upstash Redis configuration store.

## 1. Create the shared Redis database

Create an Upstash Redis database and copy its REST credentials. The **same** database must be configured on both deployments.

### Vercel environment variables

Set these on the Portfolio project:

```text
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_BOT_TOKEN=...
SOFRA_SESSION_SECRET=...
SOFRA_PUBLIC_URL=https://your-canonical-production-domain.example
SOFRA_BOT_PERMISSIONS=...
```

`SOFRA_SESSION_SECRET` should be a long random value (at least 32 random bytes). It is used to sign the opaque dashboard session cookie.

`DISCORD_BOT_TOKEN` is Sofra's bot token. It is used **only by Vercel serverless functions** to read live server roles/channels and to reconcile the ticket panel. It is never sent to browser JavaScript.

`SOFRA_PUBLIC_URL` is the canonical deployed website **origin** (scheme + host only, no path, query, fragment, or trailing slash). Treat it as required for production OAuth, especially when Vercel exposes both a `.vercel.app` alias and one or more custom domains. Pick exactly one canonical origin. The login endpoint redirects to that origin **before** creating the OAuth state cookie, so the state cookie and Discord callback always return to the same host.

For this project, do not mix origins during one sign-in attempt. For example, if you choose `https://fejelude.xyz` as canonical, keep `SOFRA_PUBLIC_URL=https://fejelude.xyz` even when a visitor enters through `www.fejelude.xyz` or the Vercel deployment URL. Configure the bot's optional `SOFRA_WEBSITE_URL` to the same origin so dashboard links also land on the canonical host.

`SOFRA_BOT_PERMISSIONS` is the Discord permission integer requested by the official **Add Sofra** installation flow. Set it to the minimum permissions required by Sofra's enabled features; it defaults to `0` so deployments never silently request broad access.

## 2. Configure Discord OAuth

In the Discord Developer Portal, open the **same Sofra application** whose Application ID is used for `DISCORD_CLIENT_ID`. Under **OAuth2 → General → Redirects**, add exactly:

```text
https://your-canonical-production-domain.example/api/sofra/auth/callback
```

The scheme, hostname, port (if any), and path must exactly match `SOFRA_PUBLIC_URL + /api/sofra/auth/callback`. Do not register `/sofra` as the callback, and do not use a Vercel preview/alias URL unless that alias is intentionally your `SOFRA_PUBLIC_URL`.

The Portfolio deployment needs:
- `DISCORD_CLIENT_ID` — Sofra's Discord Application ID.
- `DISCORD_CLIENT_SECRET` — the OAuth2 client secret from that same Discord application.
- `SOFRA_PUBLIC_URL` — the one canonical website origin used above.
- `SOFRA_SESSION_SECRET` — a long random secret used to sign the dashboard cookie.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` — required because the successful OAuth callback stores the dashboard session in Redis.
- `DISCORD_BOT_TOKEN` — Sofra's bot token, used by dashboard server/configuration APIs after login. It is not used to exchange the user's OAuth authorization code.

Sofra Panel requests only the `identify` and `guilds` OAuth scopes for dashboard login. Guild-management authorization is verified server-side on every protected request using Discord's current guild permission bitfield.

If Discord login returns to the panel with an error:
- **Authorization canceled** means the user denied/canceled the Discord prompt; no session is created.
- **Invalid/expired sign-in state** usually means the sign-in began on a different host, the state cookie expired, or cookies were cleared. Re-open the canonical `/sofra` page and retry.
- **Discord sign-in failed** means the callback reached the site but token exchange/session creation failed. Verify the exact redirect above, `DISCORD_CLIENT_ID`/`DISCORD_CLIENT_SECRET`, the Upstash credentials, and Vercel function logs.

## 3. Configure Wispbyte

Keep Sofra's existing `DISCORD_TOKEN` and other bot variables, then add:

```text
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
SOFRA_CONFIG_POLL_MS=4000
```

Use the same Upstash REST URL/token as Vercel. `SOFRA_CONFIG_POLL_MS` is optional and accepts 2000–60000 milliseconds; the default is 4000.

## 4. Migration behavior

The integration does not delete Sofra's existing local data.

- Member XP, warning history, channel lockdowns, and active ticket records remain in Sofra's local SQLite database.
- Welcome settings keep a local JSON cache so welcome messages can keep working if the shared store temporarily becomes unreachable.
- Guild **configuration** is mirrored to the shared Redis store.
- When a Redis section does not exist yet, Sofra seeds it from the current local configuration.
- When a Redis section already exists, Sofra applies that dashboard configuration locally.
- Discord-side configuration commands mirror their changes back to Redis, so the panel reflects them on its next load.

## 5. Recommended deployment order

1. Create/configure Upstash.
2. Add the required Vercel environment variables and Discord OAuth redirect.
3. Add the shared Upstash variables to Wispbyte.
4. Deploy the Sofra bot changes.
5. Deploy the Portfolio changes.
6. Open `/sofra`, sign in with Discord, select a server you can manage, and verify the live roles/channels load.
7. Change one low-risk setting (for example Levels enabled/disabled), save it, and confirm Sofra picks it up within the configured polling interval.

## Security boundaries

- Discord client secrets, bot tokens, Redis tokens, and session secrets remain server-side.
- The browser cannot authorize itself by submitting a guild ID or permission value; the API re-checks the signed-in user's Discord guild permissions.
- Every configuration read and write also checks Sofra's bot-token view of the guild. Configuration is never returned for a guild where Sofra is not installed.
- The Add Sofra route re-checks management permission before redirecting to Discord's official, guild-locked app installation flow.
- Configuration writes require both an authenticated session and a session-specific CSRF token.
- Only server owners, Administrators, or members with **Manage Server** are accepted for configuration access.
- Ticket panel creation/update is performed by a server-side bot-token request after the selected channel/category/roles are validated against live Discord guild data.
