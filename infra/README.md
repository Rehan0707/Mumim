# infra/ — Deployment & infrastructure  ·  Owner: Role 1 (DevOps)

| Folder | Purpose |
| --- | --- |
| `docker/` | Dockerfiles + docker-compose (Postgres+pgvector, Redis, backend) |
| `deploy/` | Render/Railway/Vercel configs, env templates for prod vs demo |

Related, already in the repo:
- `../scripts/ngrok.sh` — public webhook tunnel
- `../.github/workflows/ci.yml` — CI (pytest)
- `../docs/DEVOPS.md` — full DevOps & integrations guide

### Roadmap
- `docker-compose.yml`: Postgres 15 + pgvector, Redis, backend (one `docker compose up`)
- Deploy manifests for Render/Railway (backend) + Vercel/Netlify (frontend)
- Separate demo vs dev env files
