# High-Level Design

## Goals

- Support 1,000+ active users and a growing challenge catalog without coupling content, assessment execution, and dashboards.
- Keep student practice and company recruitment as separate product modules with shared contracts only.
- Add categories without changing controllers, navigation primitives, or scoring code.
- Preserve assessment integrity and immutable challenge versions.

## Logical architecture

```text
Browser
  |
  +-- Student web app --------+
  |                           |
  +-- Company web app         +--> API boundary --> Application modules
                              |                       |
                              |                       +--> Challenge catalog
                              |                       +--> Assessment sessions
                              |                       +--> Progress / scoring
                              |                       +--> Company analytics
                              |                       +--> Invitations
                              |
                              +--> MongoDB
                                  +--> users
                                  +--> assessment_sessions
                                  +--> challenges (when authoring is enabled)
                                  +--> invitations
```

The current deployment can remain a modular monolith. At 1,000 users, separate processes and a queue are not required yet; clear module boundaries, indexed queries, rate limits, and stateless API instances are the important scaling controls. A worker process can later execute expensive challenge validation without changing the HTTP contract.

## Bounded contexts

- **Identity**: authentication, roles, verification, session tokens.
- **Challenge Catalog**: categories, metadata, content versions, runner keys.
- **Assessment**: session lifecycle, proctoring events, submission authorization.
- **Practice Progress**: solved challenges, daily limits, category scores.
- **Company Workspace**: candidate search, category aggregation, invitations, challenge assignments.

Modules communicate through services and DTOs, not by importing another module's models or raw data files.

## Scaling decisions

- Use cursor or indexed pagination for candidate and challenge lists.
- Index `User.role`, `User.solvedChallenges`, `AssessmentSession.candidate`, `AssessmentSession.challenge`, and invitation ownership fields.
- Cache category metadata and public challenge cards with React Query and, later, a server cache.
- Keep full challenge files out of list endpoints and load them only for an authorized assessment session.
- Make submissions idempotent using `(candidate, challenge, session)` and atomic user updates.
- Use structured logging and request IDs before adding distributed services.
