# Sofra Panel deployment setup

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
SOFRA_PUBLIC_URL=https://your-production-domain.example
```

`SOFRA_SESSION_SECRET` should be a long random value (at least 32 random bytes). It is used to sign the opaque dashboard session cookie.

`DISCORD_BOT_TOKEN` is Sofra's bot token. It is used **only by Vercel serverless functions** to read live server roles/channels and to reconcile the ticket panel. It is never sent to browser JavaScript.

`SOFRA_PUBLIC_URL` should be the canonical deployed website origin with no trailing slash. It is optional when Vercel's forwarded host is reliable, but setting it explicitly is recommended for production OAuth.

## 2. Configure Discord OAuth

In the Discord Developer Portal for Sofra's application, add this exact redirect URI:

```text
https://your-production-domain.example/api/sofra/auth/callback
```

Sofra Panel requests only the `identify` and `guilds` OAuth scopes for dashboard login. Guild-management authorization is verified server-side on every protected request using Discord's current guild permission bitfield.

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
- Configuration writes require both an authenticated session and a session-specific CSRF token.
- Only server owners, Administrators, or members with **Manage Server** are accepted for configuration access.
- Ticket panel creation/update is performed by a server-side bot-token request after the selected channel/category/roles are validated against live Discord guild data.
