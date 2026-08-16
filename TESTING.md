# Testing

100% test coverage is the goal — tests make vibe coding safe.

## Run tests
```bash
npm test          # run once
npm run test:watch # watch mode
```

## Stack
- Vitest + jsdom for unit/component tests
- @testing-library/react + jest-dom for React
- Playwright for E2E (to be added)

## Conventions
- Files in `tests/` mirror `src/`
- Use `describe/it/expect` from Vitest
- Setup in `tests/setup.ts`
- Never commit code that makes existing tests fail
