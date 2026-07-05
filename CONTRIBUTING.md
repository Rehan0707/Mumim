# Contributing & Branching Strategy

## Branching model (trunk-based, short-lived branches)

`main` is always deployable and always green (tests pass). All work happens on
short-lived branches cut from `main` and merged back via PR.

| Prefix | Use for | Example |
| --- | --- | --- |
| `feat/` | new feature | `feat/visual-search-fashionclip` |
| `fix/` | bug fix | `fix/oversell-race` |
| `chore/` | tooling, deps, CI | `chore/pin-deps` |
| `docs/` | docs only | `docs/devops-guide` |

During the 48-hour hackathon each role owns a lane and integrates against the
agreed stub contracts, so branches stay small and merge often (see the
Implementation Plan). Prefer many small PRs over one big one.

## Commit messages (Conventional Commits)

```
<type>(<scope>): <summary>

<body — what & why>
```

Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`. Scope is optional
(`backend`, `frontend`, `integrations`, …).

## Definition of Done (per change)

1. Code runs locally (`uvicorn app.main:app` boots clean).
2. `pytest` passes in `backend/`.
3. New behaviour has at least one test.
4. Docs/README updated if the API or setup changed.
5. Committed and pushed; PR opened against `main`.

## Local checks before pushing

```bash
cd backend
source .venv/bin/activate
python -m pytest         # all tests green
uvicorn app.main:app --reload --port 8000   # boots without errors
```
