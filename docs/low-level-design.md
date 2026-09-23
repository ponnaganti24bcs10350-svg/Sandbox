# Low-Level Design

## Target repository layout

```text
client/src/
  app/
    AppRouter.jsx
    routes.js
    apiClient.js
    queryClient.js
    providers.jsx
  features/
    auth/
      pages/
      api.js
      queries.js
    student/
      challenge-catalog/
      challenge-workspace/
      progress/
      leaderboard/
      practiced/
      invitations/
    company/
      dashboard/
      candidates/
      invitations/
      challenge-management/
  components/
    ui/
    layout/
  lib/
    formatters/
    validation/
  test/
    fixtures/
    setup.js

server/
  app.js
  server.js
  modules/
    auth/
      auth.routes.js
      auth.controller.js
      auth.service.js
      auth.repository.js
      auth.dto.js
    challenges/
      challenge.routes.js
      challenge.controller.js
      challenge.service.js
      challenge.repository.js
      challenge.dto.js
      catalog/
        categories.js
        registry.js
        backend-mern/
        react/
        javascript-typescript/
      runners/
        registry.js
    assessments/
    progress/
    leaderboard/
    company/
    invitations/
  shared/
    middleware/
    errors/
    database/
    observability/
    validation/
  tests/
    unit/
    integration/
    contract/
    fixtures/
```

The existing compatibility files should be migrated into this shape in small batches. Do not move everything mechanically before tests exist.

## Adapter decision

Adapters are useful at external boundaries, not as decoration around every function:

- `MongoUserRepository` adapts Mongoose to the progress and auth service interfaces.
- `ChallengeCatalogAdapter` adapts the current static files to the catalog interface; a `MongoChallengeRepository` can replace it later.
- `ChallengeRunnerAdapter` maps a runner key to an isolated validator implementation.
- `EmailProviderAdapter` isolates Resend/Nodemailer from verification and invitation use cases.
- `FirebaseAuthAdapter` isolates Google/Firebase login details.

Services should depend on these interfaces. Controllers should depend on services and DTO mappers. React pages should depend on feature hooks and API adapters, not raw `fetch`.

## Challenge flow

1. `GET /api/challenges/categories` returns category DTOs.
2. `GET /api/challenges?category=...` returns paginated safe cards.
3. Student starts an assessment; the service snapshots `challengeId` and `contentVersion`.
4. The session service authorizes file retrieval and submissions.
5. Submission service resolves `runnerKey` through the runner registry.
6. A successful result records progress atomically and emits a progress event later.

## Routing policy

Use route constants and feature ownership:

- `/student/*` is student-only.
- `/company/*` is company-only.
- `/auth/*` is public/authenticated identity flow.

Route guards belong in the app shell and authorization belongs in the API. Client routes are not a security boundary.

## Data contracts

Challenge card:

```json
{
  "challengeId": "1",
  "category": "backend-mern",
  "title": "...",
  "difficulty": "advanced-junior",
  "estimatedMinutes": 60,
  "skills": ["authorization", "express", "mongodb"],
  "contentVersion": 1
}
```

Assessment session:

```json
{
  "id": "session-id",
  "challengeId": "1",
  "contentVersion": 1,
  "status": "active",
  "expiresAt": "2026-09-23T14:00:00.000Z"
}
```
