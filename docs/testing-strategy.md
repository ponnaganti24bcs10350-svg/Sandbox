# Testing Strategy

## Test pyramid

### Unit tests

Fast tests for pure services, catalog filtering, DTOs, scoring, permissions, and runner registry behavior. These live beside the owning module or in `server/tests/unit` and do not require MongoDB.

### Integration tests

Test an Express route with a test database or repository fakes. Cover authentication, category filtering, assessment authorization, atomic solve updates, and company-only endpoints.

### Contract tests

Assert response shapes shared by the React API adapters and server routes. These protect the student/company boundary while implementations change.

### Browser tests

Exercise the highest-value flows only:

- student login -> category -> start assessment -> submit result;
- student practiced challenge -> reopen;
- company login -> candidate filtering -> invitation;
- unauthorized student/company route access.

## Test layout

```text
server/tests/
  unit/
    challengeCatalog.test.js
    scoring.test.js
  integration/
    challenges.routes.test.js
    assessment.routes.test.js
    company.routes.test.js
  contract/
    challenge.contract.test.js
  fixtures/
    users.js
    challenges.js
client/src/test/
  setup.js
  fixtures/
  features/
    challenge-catalog.test.jsx
    auth.test.jsx
```

## CI gates

1. `npm test` in `server`.
2. `npm run lint` and `npm run build` in `client`.
3. Integration tests with a disposable MongoDB.
4. Browser smoke tests against the built client and test API.
5. Dependency and vulnerability scan.

The current repository already has runner tests plus a catalog unit test. The remaining test groups should be added as each module is migrated; avoid making a large folder move without preserving test coverage.
