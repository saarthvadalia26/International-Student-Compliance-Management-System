# Provider Delivery Sequence Diagram

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 7 - Enterprise Notification Infrastructure
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Sequence Diagram

The following diagram illustrates the flow of processing pending alerts through the decoupled abstraction layer:

```mermaid
sequenceDiagram
    autonumber
    participant Scheduler as Cron Scheduler
    participant Queue as QueueProcessor
    participant Factory as NotificationProviderFactory
    participant Provider as INotificationProvider (e.g. Resend)
    participant DB as Supabase Database

    Scheduler->>Queue: processPendingQueue(batchSize)
    activate Queue
    Queue->>DB: getPendingNotifications(batchSize)
    DB-->>Queue: return alerts array
    
    loop for each alert
        Queue->>DB: updateNotificationStatus(alertId, "processing")
        
        Queue->>Factory: getEmailProvider() / getWhatsAppProvider()
        Factory-->>Queue: return provider singleton instance
        
        Queue->>Queue: interpolateTemplate(bodyText, variables)
        
        Queue->>Provider: sendEmail() / sendWhatsApp()
        activate Provider
        Provider-->>Queue: return ProviderResponse (gatewayId, success, error)
        deactivate Provider
        
        alt Success
            Queue->>DB: updateNotificationStatus(alertId, "sent")
            Queue->>DB: logDeliveryAttempt(alertId, attemptNumber, "sent", latencyMs)
        else Failure
            Queue->>DB: logDeliveryAttempt(alertId, attemptNumber, "failed", error)
            alt Retry limit exceeded
                Queue->>DB: updateNotificationStatus(alertId, "failed")
            else Within retry budget
                Queue->>DB: updateNotificationStatus(alertId, "queued", nextRetryTime)
            end
        end
    end
    
    Queue-->>Scheduler: return results (processed, failures)
    deactivate Queue
```
