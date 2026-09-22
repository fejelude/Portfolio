# itsmefeje-portfolio
Roblox Developer Portfolio

## Sofra

The public introduction is at `/sofra/about`; the authenticated control panel
remains at `/sofra`. See [SOFRA_RENOVATION.md](SOFRA_RENOVATION.md) for the
architecture review, coordinated bot changes, tests and remaining release gates.
Deployment variables and OAuth setup are in [SOFRA_PANEL_SETUP.md](SOFRA_PANEL_SETUP.md).

## FejeAce

The website game area now contains FejeAce, a session-only play-money cascade game. Its engine, configuration, interface, audio, and development fixtures are separated under `js/fejeace/`; artwork and CC0 audio are centralized under `assets/fejeace/`.

The displayed peso balance has no cash value and is reset to ₱10,000 on every page load. FejeAce has no deposits, purchases, withdrawals, accounts, or persistent game balance.

## Persistent Admin Logs

Visitor activity is recorded by `/api/activity` on every page view and by custom site events. In production, configure durable Redis storage with `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` so logs survive refreshes, server restarts, deployments, and admin inactivity.

Optional: set `ACTIVITY_LOG_LIMIT` to control retained historical events. The default is `10000`, with a safe range from `500` to `50000`.

Without Upstash, the site still records activity to runtime memory for local development, but the admin panel marks that storage as `Runtime Only` because it is not persistent.
