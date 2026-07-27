# Known Issues & Operational Considerations

- **Release Version**: v1.0.0
- **Target Institution**: National Forensic Sciences University (NFSU)
- **Status**: Low Severity / Informational

---

## 1. Operational & Environmental Considerations

1.  **WhatsApp Template Approval Delay**: Meta WhatsApp message templates require 24–48 hours for initial approval in Meta Business Manager during sandbox-to-production migration.
2.  **Rate Limiting on Free Tier Gateways**: If operating under free-tier Resend API quotas (100 emails/day), batch notifications exceeding this quota will be queued by the retry processor.
3.  **Local Storage Notification Preferences Fallback**: When database connection is degraded, notification tab preferences fallback gracefully to client-side localStorage.

---

## 2. Mitigation Strategies

*   Pre-approve WhatsApp templates (`efrro_expiry_alert`) in Meta Cloud Console before go-live date.
*   Configure production Resend API plan for institutional domain sending (`nfsu.edu.in`).
