# Technical Debt & Future Refactoring Roadmap

- **Release Version**: v1.0.0
- **Target Institution**: National Forensic Sciences University (NFSU)
- **Status**: Tracked for Future Releases

---

## 1. Tracked Non-Blocking Technical Debt

1.  **Multi-Language UI Translations**: While notification templates fully support multilingual rendering (English, Hindi, etc.), the core administrative UI string constants are currently English-only.
2.  **SMS & Push Notification Adapter Implementations**: `INotificationProvider` interface supports SMS and Push channels, but concrete providers for Twilio/Firebase can be added in post-1.0 iterations.
3.  **PDF Generation Optimization**: PDF export generation currently executes server-side on demand; high-concurrency environments may benefit from delegating PDF rendering to a dedicated background worker worker thread.

---

## 2. Recommended Post-1.0 Enhancement Backlog

*   Integrate SMS gateway (e.g. Twilio or CDAC DLT SMS) for Indian student numbers.
*   Implement web push notifications for staff dashboard alerts.
*   Add automated PDF batch compression for multi-student archival reports.
