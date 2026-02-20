---
name: architect
description: >
  Architecture review and design decisions for new features. MUST be invoked
  before implementing any feature that touches src/** or prisma/schema.prisma.
  Produces an Architecture Decision Record (ADR), sets the active ADR pointer,
  and submits it for automated agent review. Triggers: "new feature", "add report",
  "new API integration", "change data model", "add endpoint", "refactor".
allowed-tools: "Read,Write,Glob,Grep"
---

# Architecture Review

You are acting as a senior software architect for cf-reporting.
Your job: think through the design BEFORE any code is written.

## Process

### Step 1: Understand the requirement
- Read the user's feature request carefully.
- Identify ALL affected components. Check each:
  - [ ] Cloudflare API layer (`src/lib/cloudflare/`)
  - [ ] Report templates (`src/lib/reports/templates/`)
  - [ ] Database schema (`prisma/schema.prisma`)
  - [ ] API routes (`src/app/api/`)
  - [ ] UI components (`src/components/`)
  - [ ] Worker/queue jobs (`src/workers/`)
  - [ ] Docker configuration (exempt from ADR gate, but document if changed)

### Step 2: Research existing patterns
- Use Grep to find similar patterns in the codebase.
- Read `docs/decisions/` for related prior ADRs.
- Read existing report templates to understand conventions.
- If this involves Cloudflare APIs, load the cloudflare-graphql skill's
  reference files in `.claude/skills/cloudflare-graphql/references/`.

### Step 3: Write the ADR
Create file `docs/decisions/{feature-name}.md` with this exact structure:

```markdown
# ADR: {Feature Name}
Date: {today}

## Status: DRAFT

## Context
What problem are we solving? Why now?

## Decision
What approach do we take? Be specific about:
- Which Cloudflare API endpoints/GraphQL nodes
- New TypeScript interfaces (write them out)
- Data flow: API call → processing → storage → rendering
- New database tables/columns (if any)

## File Changes
List every file that will be created or modified:
- `src/lib/cloudflare/queries/{name}.ts` — new GraphQL query
- `src/lib/reports/templates/{name}.ts` — new report template
- etc.

## Alternatives Considered
What else did we think about? Why did we reject it?

## Risks
What could go wrong? How do we mitigate?
```

### Step 4: Set the active ADR pointer
Write the ADR path to `.claude/ACTIVE_ADR`:
```
docs/decisions/{feature-name}.md
```
This file is read by the PreToolUse hook to enforce that an approved ADR
exists before implementation code can be written.

### Step 5: Submit for automated review
After writing the ADR, launch the `adr-reviewer` agent (subagent_type)
using the Task tool with this prompt:

```
Review the ADR at {adr_path}.

Read the ADR file, then follow your review process to evaluate it.
Return your structured verdict (APPROVE or REQUEST CHANGES).
```

### Step 6: Handle the review result

**If APPROVE**: Update `## Status: DRAFT` to `## Status: APPROVED` in the ADR.
Then tell the user:

"ADR reviewed and approved by the architecture review agent. Ready for
implementation — invoke /implement to begin."

**If REQUEST CHANGES**: Read the blocking issues listed by the reviewer.
Fix them in the ADR (update the file directly). Then re-submit to the
adr-reviewer agent (repeat Step 5). Continue until the agent approves.

After fixing and getting approval, tell the user what was changed and that
the ADR is now approved.

DO NOT write any implementation code during the /architect phase.
The architect skill only produces the ADR — implementation is a separate step.
