# Notification Provider Health Specification

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 7 - Phase 2 (Production Providers)
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Diagnostics Flow

Every concrete uploader implementing `INotificationProvider` exposes a standard `healthCheck()` operation.

```
+---------------+              +----------------------------+
| Admin Panel   | -----------> | INotificationProvider      |
+---------------+              +----------------------------+
                                             │
                                             ├─► validateConfiguration()
                                             ├─► Ping Gateway API
                                             └─► Read latencies & delivery logs
```

---

## 2. Health Payload Schema

The health status response payload is structured as follows:

```typescript
export interface ProviderHealth {
  providerName: string;
  status: "healthy" | "unhealthy";
  apiReachability: boolean;
  lastSuccessfulDelivery: Date | null;
  lastFailedDelivery: Date | null;
}
```

*   **API Reachability Check**: Dispatches short-timeout (3-second limit) HEAD or GET HTTP requests to check if connection endpoints are reachable.
*   **Audit Metrics Integration**: Reads timestamp logs from the `retention_audit_log` or `notification_delivery_log` to fetch latency details.
