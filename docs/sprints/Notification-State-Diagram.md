# Notification State Diagram

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 7 - Enterprise Notification Infrastructure
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. State Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> QUEUED : Idempotency Key Passed
    
    QUEUED --> CANCELLED : Student Uploads Renewal File
    QUEUED --> EXPIRED : Expire Time Window Reached
    QUEUED --> PROCESSING : Queue Worker Picks Up Alert
    
    PROCESSING --> SENT : Provider Dispatches Successfully
    PROCESSING --> QUEUED : Attempt Fails (Retry Count < Max)
    PROCESSING --> FAILED : Attempt Fails (Retry Count >= Max)
    
    SENT --> DELIVERED : Webhook Delivery Signal Received
    DELIVERED --> READ : Webhook Read Signal Received
```
