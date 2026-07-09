# ADR-001: UUID Primary Key Strategy

- **Status**: Approved
- **Owner**: Database Architect
- **Purpose**: Define the primary key strategy across all database entities.
- **Scope**: Applied to all database tables generated in migrations.
- **Dependencies**: None
- **Related Documents**: [Database Design Specification](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/database/Database-Design-Specification.md)

## Table of Contents
1. [Overview](#overview)
2. [Details](#details)
3. [Future Updates](#future-updates)
4. [Revision History](#revision-history)

## Overview
All table primary keys must use PostgreSQL `UUID v4` generated via the `gen_random_uuid()` function. This implements Architectural Decision Record 001 (ADR-001) as specified in the Database Design Specification.

## Details
*   **Prevent Enumeration Attacks**: Using sequential integer IDs (like SERIAL) allows malicious actors to guess and access profiles easily by iterating IDs. UUIDs are random 128-bit numbers, preventing URL enumeration.
*   **Decoupled Sync**: Enables client-side generation of IDs safely without querying the database for the next sequence.
*   **Multi-Region Scaling**: Simplifies multi-region active-active database syncing and merges because ID collisions are statistically impossible.

## Future Updates
- None planned. This strategy remains frozen for the project lifetime.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Database Architect | Initial Approval & Setup |
