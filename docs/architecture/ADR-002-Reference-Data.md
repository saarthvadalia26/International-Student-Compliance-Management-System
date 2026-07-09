# ADR-002: Consolidated Reference Data Strategy

- **Status**: Approved
- **Owner**: Database Architect
- **Purpose**: Establish lookup/configuration database normalization strategy.
- **Scope**: Applied to all shared lookup lists (visa types, schools, courses, etc.).
- **Dependencies**: [ADR-001-UUID-Strategy](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/architecture/ADR-001-UUID-Strategy.md)
- **Related Documents**: [Database Design Specification](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/database/Database-Design-Specification.md)

## Table of Contents
1. [Overview](#overview)
2. [Details](#details)
3. [Future Updates](#future-updates)
4. [Revision History](#revision-history)

## Overview
A consolidated category/value reference_data table is used rather than creating dozens of small lookup tables for each configuration type. This implements Architectural Decision Record 002 (ADR-002).

## Details
*   **Table Proliferation Control**: Avoids the maintenance overhead of managing 11 or more individual tables with identical structural patterns.
*   **Descriptive Joined Codes**: Uses alphanumeric codes as the join target key rather than UUIDs to allow human-readable select outputs without heavy nested joins.
*   **Extensibility**: Adding new configuration categories (e.g., lodging types, document types) requires adding configuration records, not running schema migrations.

## Future Updates
- Dynamic category mappings will be updated in the migration seed file.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Database Architect | Initial Approval & Setup |
