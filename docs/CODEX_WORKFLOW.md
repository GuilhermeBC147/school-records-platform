# Codex Workflow

This file explains how to work on this project efficiently with Codex.

## Main principle

The repository is the source of truth. Chat history is temporary.

Codex should use:

- Current code.
- Git history.
- AGENTS.md.
- PROJECT_BRIEF.md, if present.
- SPRINTS.md, if present.
- docs/ARCHITECTURE.md.
- docs/DECISIONS.md.

## Starting a new Codex session

Use this prompt:

```text
Read AGENTS.md, PROJECT_BRIEF.md if it exists, SPRINTS.md if it exists, and docs/ARCHITECTURE.md if relevant.

Use codebase-memory if helpful to find the relevant files.

Today's task:
[describe task]

Before editing, tell me:
1. Which files are relevant.
2. What you plan to change.
3. What is out of scope.