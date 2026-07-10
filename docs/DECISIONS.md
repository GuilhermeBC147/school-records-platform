# Decisions

This file records important project decisions so they do not need to be re-discussed in every Codex session.

## Decision format

Use this format:

## YYYY-MM-DD - Decision title

Decision:
Reason:
Consequences:

---

## 2026-07-10 - Use repository documentation as long-term memory

Decision:
Use repository files such as AGENTS.md, PROJECT_BRIEF.md, SPRINTS.md, docs/ARCHITECTURE.md, and docs/DECISIONS.md as the main long-term memory for Codex.

Reason:
Chat history is temporary and can become outdated. The repository should be the source of truth.

Consequences:
Codex should read the relevant docs at the start of each task instead of relying on old chats.

---

## 2026-07-10 - Bench Context Mode and Ultracode for now

Decision:
Do not install Context Mode or Ultracode at this stage.

Reason:
The current project workflow should stay simple. Project docs, AGENTS.md, codebase-memory-mcp, and finding-unknowns-skills are enough for now.

Consequences:
AGENTS.md and docs should not instruct Codex to use Context Mode or Ultracode.