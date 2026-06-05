# Vercel Audit

## Reachability

| URL | Status |
| --- | --- |
| `https://ai-hiring-os.vercel.app` | PASS |

## Routing

Frontend SPA route fallback is configured in `frontend/vercel.json`.

## API Integration

The deployed Vercel JavaScript bundle contains:

```text
https://ai-hiring-os.duckdns.org
```

The DuckDNS backend currently exposes required agentic routes, so integration is functional.

## Build Status

Local production build passes:

```text
npm run build
```

## Risks

- Deployed Vercel bundle does not appear to reflect the newest local build artifact name from this audit run.
- Vercel project environment variables/build logs were not accessible from this local audit.

## Recommendation

Redeploy Vercel after this commit and confirm the deployed bundle is rebuilt from the latest `main`.
