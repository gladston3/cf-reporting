---
name: implement
description: >
  TDD implementation workflow. Use after an ADR has been approved via
  /architect. Follows Red-Green-Refactor: write failing test first,
  then implement, then clean up. Triggers: "implement", "build this",
  "code this feature", "start implementing", "write the code".
allowed-tools: "Read,Write,Edit,Glob,Grep,Bash(npm *),Bash(npx *),Bash(node *),Bash(git *)"
---

# Implementation (TDD)

You are implementing a feature for cf-reporting. An ADR has already been
approved. Follow TDD strictly.

## Before writing any code

1. Read the approved ADR: check `.claude/ACTIVE_ADR` for the path, then read that file.
2. Review the "File Changes" section — this is your implementation checklist.
3. Read existing files that you'll modify to understand current patterns.

## TDD cycle for each component

### Red: Write a failing test first
- Test file: `tests/unit/{module-name}.test.ts`
- For Cloudflare queries: use mock fixtures from `tests/fixtures/cloudflare/`
- For report templates: test both `fetchData()` (with mocks) and `renderHtml()` (snapshot or string assertions)
- Run the test to confirm it fails: `npx vitest run tests/unit/{file}.test.ts`

### Green: Write minimal code to pass
- Follow the interfaces defined in the ADR exactly.
- Cloudflare queries go in `src/lib/cloudflare/queries/`
- Report templates go in `src/lib/reports/templates/`
- Use the client from `src/lib/cloudflare/client.ts`, never raw fetch.
- Run the test again to confirm it passes.

### Refactor: Clean up
- Extract shared logic into helpers.
- Ensure functions are < 50 lines.
- Remove any `console.log` statements.
- Run full suite: `npx vitest run`

## After all components are implemented

1. Run full checks:
   ```
   npx tsc --noEmit
   npm run lint
   npx vitest run
   ```
2. Commit with a descriptive Conventional Commit message:
   ```
   feat(reports): add gateway DNS report template
   ```
3. Suggest running `/qa-review` for independent code review.

## Cloudflare query conventions

- Always define request/response interfaces in the same file.
- Use `TimeRange` type from `src/lib/cloudflare/types.ts`.
- Wrap errors: `throw new CloudflareApiError(message, { cause: error })`.
- Create a mock fixture: `tests/fixtures/cloudflare/{query-name}-response.json`.

## Report template conventions

- Export: `fetchData(config, client)` and `renderHtml(config, data)`.
- HTML must be self-contained (inline CSS/JS, Chart.js from CDN).
- Follow the design system in `.claude/skills/report-builder/references/design-system.md`.
