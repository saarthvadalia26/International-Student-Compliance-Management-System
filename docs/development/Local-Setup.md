# Local Setup

- **Status**: Approved
- **Owner**: Lead Backend Engineer
- **Purpose**: Define requirements and setup routines to establish a fully functional local development workstation.
- **Scope**: Applied to developers setting up workspace configurations on local devices.
- **Dependencies**: Node.js 20+, Docker, Supabase CLI, Git
- **Related Documents**: [Development-Workflow](file:///d:/Saarth/Saarth/International Student Compliance Management System/docs/development/Development-Workflow.md)

## Table of Contents
1. [Overview](#overview)
2. [Detailed Guidance](#detailed-guidance)
3. [Best Practices](#best-practices)
4. [Examples](#examples)
5. [Future Updates](#future-updates)
6. [Revision History](#revision-history)

## Overview
This guide outlines prerequisites, software versions, dependencies installation, and local configuration steps.

## Detailed Guidance
*   **Prerequisites Installation**:
    *   **Node.js**: Install version 20 LTS or later.
    *   **Docker**: Docker Desktop must be installed and running (required for local Supabase emulation).
    *   **Supabase CLI**: Install via npm globally or via package manager.
*   **Environment Configuration**:
    *   Copy `.env.example` to `.env.local`.
    *   Configure local development keys pointing to localhost API endpoints.

## Best Practices
*   Keep Docker running in the background before running local Supabase.
*   Do not share personal local config values in code commits.

## Examples
```bash
# Install Supabase CLI locally (Windows PowerShell)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Clone and initialize
git clone https://github.com/your-org/isms.git
cd isms
npm ci
```

## Future Updates
*   Keep package versions locked in package-lock.json.

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Release Manager | Initial Version Release |
