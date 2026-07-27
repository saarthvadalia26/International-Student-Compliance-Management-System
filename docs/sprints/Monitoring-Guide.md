# Observability & Monitoring Telemetry Guide

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 10 - Production Integrations & Deployment
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Monitoring Telemetry Metrics

Metrics are captured dynamically across the application layer:
*   **Database Connectivity Status**: Ping state check on `/health` endpoint.
*   **Storage Access Probe**: Validates connection to Supabase private storage assets.
*   **Email Service Latency**: Measures HTTP response execution times for Resend API calls.
*   **WhatsApp Gateway Reachability**: Logs Meta Cloud API response status codes and latencies.

---

## 2. Structured Log Schema

Logs are mapped in JSON format inside application logs:

```json
{
  "timestamp": "2026-07-27T14:48:12Z",
  "level": "INFO",
  "correlation_id": "uuid-xxxx-xxxx",
  "component": "QueueProcessor",
  "message": "Attempting notification delivery",
  "metadata": {
    "student_id": "uuid-student",
    "channel": "email",
    "provider": "resend-email-provider"
  }
}
```

*   **Correlation ID**: Traces a single notification attempt from scheduler detection to delivery status log.
*   **Performance Latency**: Measures database query execution and provider API request-response delays in milliseconds.
*   **Error Reports**: Integrates Sentry/Log Rocket triggers on uncaught exceptions.
