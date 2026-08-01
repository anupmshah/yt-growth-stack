# ADR 0001: Start as a modular Next.js monolith

Status: accepted

## Context
The product needs a browser application, authenticated server endpoints, integrations, and durable jobs. A separate service fleet would increase operational complexity before traffic proves the need.

## Decision
Use one Next.js repository with explicit feature, server, integration, and shared boundaries. Supabase provides Auth, Postgres, and RLS. Long-running work is represented as durable research jobs.

## Consequences
The first release is easier to operate and understand. Provider or worker modules may later be extracted without rewriting the UI or domain contracts.
