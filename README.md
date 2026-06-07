# itsmefeje-portfolio
Roblox Developer Portfolio

## Persistent Admin Logs

Visitor activity is recorded by `/api/activity` on every page view and by custom site events. In production, configure durable Redis storage with `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` so logs survive refreshes, server restarts, deployments, and admin inactivity.

Optional: set `ACTIVITY_LOG_LIMIT` to control retained historical events. The default is `10000`, with a safe range from `500` to `50000`.

Without Upstash, the site still records activity to runtime memory for local development, but the admin panel marks that storage as `Runtime Only` because it is not persistent.
