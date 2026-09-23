# Sandbox Architecture

## Product boundaries

The product has two authenticated experiences with different responsibilities:

- **Student practice**: browse a category, start a challenge, run an assessment, review solved challenges, and track personal progress.
- **Company workspace**: search candidates, review category scores, manage invitations, and later create or assign challenges.

They should share API contracts and visual primitives, but not page state, permissions, or feature modules.

## Backend structure

```text
server/
  modules/
    auth/
    challenges/
      catalog/          # category registry and challenge metadata
      challenges/       # one folder per category as content is migrated
      challenge.service.js
      challenge.controller.js
      challenge.routes.js
    assessments/
    progress/
    leaderboard/
    invitations/
  shared/
    errors/
    middleware/
    pagination/
```

The current `server/challenges/catalog.js` is the compatibility boundary around the legacy catalog. New challenge content should be added through a category module and registered in `categories.js`; controllers must not import raw challenge arrays.

## Challenge model

Every challenge needs a stable `challengeId`, `category`, `difficulty`, `estimatedMinutes`, `skills`, `contentVersion`, and a runner/validator key. Content is private and is returned only after an assessment session is created. Category metadata is safe for browsing and company analytics.

## API direction

- `GET /api/challenges/categories`: category metadata and counts.
- `GET /api/challenges?category=backend-mern`: safe challenge cards, with pagination later.
- `GET /api/progress/current?category=backend-mern`: student selection within a category.
- `POST /api/assessment`: assessment lifecycle and proctoring state.
- `GET /api/company/candidates`: company-only candidate search and category scores.
- `POST /api/company/challenges`: company challenge authoring and assignment, behind company permissions.

## Migration order

1. Route all challenge reads through the catalog service. Done in this increment.
2. Move the three legacy records into `challenges/backend-mern/` without changing IDs.
3. Add React and JavaScript/TypeScript content modules and runners.
4. Split frontend into `student/` and `company/` feature shells with shared API clients.
5. Move company challenge authoring and candidate analytics into company-only modules.
6. Persist challenge metadata and assignments in MongoDB when authoring is required; keep immutable content versions for active assessments.
