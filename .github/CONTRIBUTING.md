# Contributing

## Purpose
This project follows a strict micro-commit and PR-driven workflow to ensure high quality and maintainability, even for solo development. Every change must be verifiable, reversible, and easy to review.

## Commit Rules
- Commit message format is mandatory: `type(scope): concise intent`.
- Allowed `type` values: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.
- Examples:
  - `feat(app): scaffold nextjs starter baseline`
  - `docs(github): add contributing rules`
- Each commit must represent exactly one narrow change and must leave the branch in a verifiable state for that slice.
- Do not mix behavior changes, refactors, docs rewrites, and test harness changes in the same commit unless the test is required to validate that exact behavior change.
- If a commit cannot be explained in one sentence without using `and`, it is too large and must be split.
- Large batch commits are strictly forbidden.

## Micro-Commit Rules
- Every implementation task must be broken into the smallest safe coding slices; do not batch unrelated changes just because they belong to the same numbered task.
- Preferred commit size: one narrow behavior, one contract, one validator, one route, one docs slice, or one verification slice per commit.
- If a task touches multiple concerns, sequence them as separate micro-commits that each leave the repo in a passing state.
- After each micro-commit, the relevant local verification for that slice must pass before moving to the next slice.
- When uncertain, split further; optimize for reviewability and reversibility over speed.

## Branch Naming
- Preferred branch naming: `task-<NN>-<short-slug>` for planned work and `followup-<short-slug>` for post-review fixes.

## Pull Request Rules
- Preferred PR size: one micro-goal per PR. Default target is 1 commit per PR; 2-3 commits are acceptable only when they are tightly sequential parts of the same micro-goal.
- Each PR must map to one specific slice from the plan, not a whole wave and not a whole feature cluster.
- Open PRs as **draft** first, then promote to **ready** only after the PR checklist passes locally.
- Every PR description must include: purpose, exact files changed, verification run, out-of-scope items, and rollback impact.

## Merge Strategy
- Preferred merge strategy is `Rebase and merge` so the tiny commit history is preserved without merge bubbles. If the hosting settings force squash merge, then keep the PR to one commit.

## Self-Review Checklist
- Every PR must pass a self-review checklist before merge:
  - Scope is minimal.
  - Commit(s) are atomic.
  - Tests/build for the slice passed.
  - Docs updated if needed.
  - No unrelated file changes remain.
