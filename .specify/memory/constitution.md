<!--
Sync Impact Report
- Version change: template (unversioned) -> 1.0.0
- Modified principles:
  - Placeholder Principle 1 -> I. Canonical Organization and Player Identity
  - Placeholder Principle 2 -> II. Authorized and Separated Competition Records
  - Placeholder Principle 3 -> III. Auditable and Correctable Results
  - Placeholder Principle 4 -> IV. Deterministic Competitive Calculations
  - Placeholder Principle 5 -> V. Secure, Private, and Sustainable Delivery
- Added sections:
  - Data Architecture and Operational Constraints
  - Development Workflow and Quality Gates
- Removed sections: none
- Templates requiring updates:
  - ✅ updated: .specify/templates/plan-template.md
  - ✅ updated: .specify/templates/spec-template.md
  - ✅ updated: .specify/templates/tasks-template.md
  - ✅ reviewed, no change required: .specify/templates/constitution-template.md
  - ✅ reviewed, no change required: .specify/templates/agent-file-template.md
  - ✅ reviewed, no change required: .specify/templates/checklist-template.md
  - ✅ reviewed: .specify/templates/commands/ (directory not present)
  - ✅ reviewed: runtime guidance (README.md, docs/, and AGENTS.md not present)
- Follow-up TODOs: none
-->

# Pickleball Competition Data Constitution

## Core Principles

### I. Canonical Organization and Player Identity

Every organization MUST use the single canonical `Club` domain model. Every participant in a
ranked match MUST have a verified account linked to exactly one canonical player identity. Guest,
ghost, anonymous, and duplicate player identities MUST NOT appear in ranked competition data. A
player's identity MUST remain stable across clubs, while club-owned memberships, permissions, and
operational data MUST remain isolated by club. These rules prevent fragmented organizations,
inflated participation, impersonation, and split competitive histories.

### II. Authorized and Separated Competition Records

Only an authorized user acting for an active subscribed club MAY submit or finalize an official
match. Authorization and subscription status MUST be validated when the official record is
created or finalized, not inferred from client state. Ranked and unranked matches MUST be stored
and queried as distinct record classes; unranked results MUST NOT affect ratings, ranked win rates,
ranked streaks, or rankings. This preserves the legitimacy and interpretability of official
competition data.

### III. Auditable and Correctable Results

Every official result MUST retain an immutable audit trail covering its source club, participants,
submitter, timestamps, original values, status transitions, and every correction. Corrections MUST
use an authenticated, role-authorized workflow with a stated reason; they MUST NOT silently mutate
or erase history. Recalculation following a correction MUST be traceable and reproducible, and
affected parties MUST be able to see the current authoritative result and its correction status.
This makes disputes resolvable without sacrificing historical accountability.

### IV. Deterministic Competitive Calculations

Ratings, win rates, streaks, standings, and leaderboard rankings MUST be computed by centralized,
versioned domain rules from eligible official records. Given identical ordered inputs and a rule
version, every execution MUST produce identical outputs. Tie-breaking, rounding, eligibility,
forfeit, correction, and ordering rules MUST be explicit. Material rule changes MUST include a
migration or bounded recomputation plan and regression fixtures. This ensures that competitive
outcomes are consistent, explainable, and reproducible.

### V. Secure, Private, and Sustainable Delivery

All operations MUST enforce server-side role-based permissions, least-privilege access, club data
isolation, and privacy appropriate to personal and competition data. Primary participant and club
workflows MUST be usable on supported mobile viewports and MUST define measurable performance
targets. Domain rules MUST be maintained in cohesive, testable modules rather than duplicated
across clients or endpoints. Automated tests MUST cover every leaderboard-critical workflow,
including identity verification, official submission authorization, ranked separation,
corrections, recalculation, tie-breaking, and cross-club isolation. These safeguards keep the
system trustworthy as its usage and implementation evolve.

## Data Architecture and Operational Constraints

- Player identity and match data MUST be owned by this system. Third-party sports platforms MUST
  NOT be authoritative dependencies for identity resolution, match ingestion, or record recovery.
- External services MAY provide non-authoritative conveniences only when failure cannot prevent
  core identity, match, audit, correction, or ranking workflows.
- Club-scoped data access MUST include an explicit club boundary in storage queries and service
  authorization. Cross-club aggregation MAY expose only data permitted by the product's privacy
  rules; it MUST NOT grant access to another club's private operational records.
- Specifications and plans MUST define retention, visibility, and performance expectations for
  sensitive or leaderboard-critical data when those concerns are affected by a feature.
- Official-event processing MUST be resilient to duplicate submissions and retries. Idempotency or
  an equivalent deterministic safeguard MUST prevent duplicate official matches and calculations.

## Development Workflow and Quality Gates

- Every feature specification MUST identify affected identities, club boundaries, record class
  (ranked or unranked), authorization roles, audit events, correction behavior, calculation rules,
  privacy exposure, mobile journeys, and measurable performance expectations, marking an item not
  applicable only with a stated reason.
- Every implementation plan MUST pass the Constitution Check before research and again after
  design. Any exception requires an explicit complexity entry, risk analysis, approving owner, and
  time-bounded remediation or amendment proposal.
- Tests for leaderboard-critical behavior are mandatory and MUST be written from normative domain
  examples. Unit tests MUST cover calculation boundaries; integration or contract tests MUST cover
  authorization, persistence, audit history, corrections, and isolation.
- Changes to schemas or competitive rules MUST include safe migration and rollback or recovery
  procedures. Reviews MUST verify that existing histories remain reproducible.
- A change MUST NOT merge while required constitutional tests fail or while an unresolved design
  allows prohibited identity types, unauthorized official results, ranked/unranked contamination,
  silent correction, non-deterministic calculations, or cross-club data leakage.

## Governance

This constitution supersedes conflicting project practices, specifications, plans, and local
conventions. Amendments MUST be proposed in writing with the changed principles, rationale,
compatibility impact, migration needs, and updates to affected templates or guidance. Approval by
the project maintainers is required before an amendment takes effect.

Versions follow semantic versioning: MAJOR for incompatible governance changes or principle
removals or redefinitions; MINOR for new principles or materially expanded obligations; PATCH for
clarifications that do not change obligations. The amendment date MUST be updated whenever the
version changes; the original ratification date MUST remain unchanged.

Every feature plan and code review MUST record constitutional compliance. Periodic release reviews
MUST verify permissions, privacy boundaries, audit completeness, deterministic calculation
fixtures, mobile usability, performance targets, and automated coverage of leaderboard-critical
workflows. Exceptions are invalid unless documented and approved through the amendment process.

**Version**: 1.0.0 | **Ratified**: 2026-09-01 | **Last Amended**: 2026-09-01
