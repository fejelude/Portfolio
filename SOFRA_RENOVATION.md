# Sofra / Portfolio renovation

## Product direction

Keep the creator portfolio, gallery and arcade, while giving Sofra a distinct
product introduction. Preserve Sofra's rose/lavender palette and self-hosted
animated assets. Use clear language, simpler hierarchy, generous spacing and
practical guidance rather than claims about features or scale that do not exist.

## Routes and integration

| Route | Purpose |
| --- | --- |
| `/` | Creator portfolio; new featured Sofra project and navigation entry |
| `/sofra/about` | Public Sofra introduction, features, setup guide and FAQ |
| `/sofra` | Existing authenticated dashboard; URL and OAuth flow preserved |
| `/api/sofra/*` | Existing server-side OAuth, permissions and configuration APIs |

The public Add Sofra action goes through the existing dashboard/server picker.
It does not invent an application ID or a privileged invite URL. The server-side
installation flow uses configured application credentials and requested permissions.

## Delivered changes

- Product page with responsive hero, animated mascot, feature cards, onboarding,
  FAQ, studio links, pause control and reduced-motion support. Illustrative
  messages are labeled as examples; there are no fake live counters.
- Portfolio project section and metadata; personal biography, games, and gallery
  remain intact rather than being rewritten without a product reason.
- Dashboard setup checklist, guide link and manual settings/status refresh.
- Bot-runtime acknowledgement display; installation is no longer called online.
- Pending/applied section states based on bot hashes, with 180-second freshness.
- New AutoMod log-only, flood and mention controls matching the bot schema.
- Keyboard-operable module cards, modal focus handling, skip link and focus rings.
- Ordered deferred scripts replace `document.write` bootstrapping.
- Reduced-motion and background-tab checks pause dashboard videos.
- Request generation guards prevent stale guild loads replacing newer selections.
- Save requests are serialized in the UI, freeze their target guild, and disable
  edited controls until completion. Unsaved edits are protected on refresh.
- Neutral ticket copy, no reward promises or expiring studio banner.
- Discord mutation requests are not retried blindly; long rate limits are not
  shortened. Server-list installation probes use bounded concurrency.
- Internal server errors no longer echo infrastructure details from `guild.js`.
- Tests and fixture-only browser smoke coverage are included in CI.

## Deployment

Read `SOFRA_PANEL_SETUP.md`. Deploy the accompanying bot changes first. The new
runtime contract uses `sofra:guild:{guildId}:runtime` as an expiring Redis string
containing `{lastSyncedAt, applied:{section:sha256(JSON.stringify(config))}}`.
The configuration key remains `sofra:guild:{guildId}:config`; its existing
section structure is unchanged apart from additive AutoMod safety fields.

An old bot can still work with the dashboard, but will show unknown sync status
and will not apply the new safety fields. Do not label that combination complete.

## Verification commands

```sh
node --test api/sofra/*.test.js tests/*.test.js tests/*.test.mjs
node --check sofra-panel-core.js
node --check sofra-panel.js
node --check sofra-product.js
```

For the optional browser smoke test, install Playwright and Chromium, then run:

```sh
node verification/sofra-smoke.cjs
```

It serves local fixture data, checks desktop/mobile overflow, sign-in, dashboard
load, reduced motion and saving new AutoMod settings. It never authenticates to
Discord. Live OAuth and guild-permission checks must still be tested in staging.

## Remaining release gates

- Local verification: **52 tests passed**, plus fixture browser smoke tests at
  1440px and 390px, with screenshot review of the public page and dashboard.
- Production browser review, real OAuth callback and install tests, slow-network
  testing, keyboard/screen-reader review and actual Discord validation.
- Atomic configuration revisions, write throttling and a durable ticket-panel
  outbox; Redis and Discord writes are not currently transactional together.
- Accurate operator-approved privacy/terms/support pages. Existing portfolio
  visitor-activity logging and third-party AI processing must be disclosed.
- Remove the remaining large dashboard branding/DOM-observer layer in a later
  module-by-module refactor; do not combine that rewrite with a framework switch.
- A real service-status endpoint, consent-aware analytics, server-side pagination,
  and measured caching if usage grows. No public member data or invented stats.
- The wider feature wishlist remains a roadmap, not advertised functionality.

## PR handoff

Suggested title: **Renovate Sofra product experience and dashboard safety**.
Companion bot branch: `feat/public-launch-foundation`.
This branch: `feat/sofra-product-experience`.
Do not merge solely on automated tests: confirm the bot branch, deployment
variables, browser review, and staging checklist before public promotion.
