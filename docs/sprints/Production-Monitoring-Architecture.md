# Production Monitoring Architecture (SRE)

- **Status**: Completed
- **Core Technology**: `@sentry/nextjs`, Custom Structured Logger

## Architecture Design
1. **Error Tracking**: Sentry is injected at the build layer (`next.config.ts`) and wrapped around Edge, Server, and Client boundaries. It intercepts unhandled exceptions, strips stack traces from the end-user response, and logs them to the central Sentry dashboard tagged with unique Correlation IDs.
2. **Health APIs**: We maintain a live telemetry stream via `/api/health`, interrogating PostgreSQL connectivity, Memory Heap stats, and Vercel build versions natively.
3. **Observability UI**: An admin-restricted `/admin/monitoring` React portal parses the Health API to present real-time cluster status to sysadmins.
