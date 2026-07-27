# AGENTS.md — Rules for AI agents

## Project
MSG Systems scraper for peviitor.ro (Node.js, ESM, Jest)

## Critical Rules

### 0. Background tasks — always pass `--repo` explicitly to `gh`

When polling a workflow run with `until [ "$(gh run view ID --json status -q .status)" = "completed" ]; do sleep N; done`, the `gh run view` command implicitly uses the current working directory's git remote. If the CWD is a different repo (e.g. you cd-ed elsewhere mid-task), `gh` looks in the wrong repo and returns 404 — the loop's check becomes `"" != "completed"` (always true) and the background task sleeps forever.

**Always specify the repo explicitly:**
```bash
gh run view <RUN_ID> --repo sebiboga/msg-systems-romania-srl-nodejs-scraper --json status -q .status
```

Before starting any `gh run watch` or polling loop in the background, sanity-check:
- Does the command include `--repo`?
- Is the run ID from the same repo as `--repo`?

If you spawn a stuck task, kill it immediately rather than letting it hang.

### 1. Temporary Files — NO TMP FOLDER
**NU folosi `tmp/` niciodată.** Toate fișierele temporare/scratch trebuie scrise în folderul `scraper/` sau în subfolderele lui. Nu crea directoare separate temporare.

### 2. Issues & GitHub
- **Orice modificare de cod trebuie să aibă un issue în GitHub Issues** (vezi [ISSUES.md](ISSUES.md))
- Excepții: typo-uri, whitespace, documentație minoră
- Create a GitHub issue before implementing any change
- Commit messages must reference the issue they close
- Never commit credentials (`.env.local`, `*.pem`, etc.)
- Push after commit

### 3. Environment Variables
- `.env.local` is loaded automatically at runtime via `dotenv` (see `package.json`) — never commit it
- `SOLR_AUTH` is no longer needed — all operations go through `api.peviitor.ro/v1`. Only `validate-msg-jobs.js` (skip guard) and `repo.test.js` (secret check) reference it
- Consistency tests also need `GITHUB_REPOSITORY` (format: `owner/repo`) and `GITHUB_TOKEN`

### 4. Testing
```bash
# All tests
npm test

# Unit tests (no env vars needed)
npm run test:unit

# Integration tests (ANAF public API, Peviitor API conditional)
npm run test:integration

# E2E tests (real MSG Systems website, Peviitor API conditional)
npm run test:e2e

# Consistency tests (GitHub repo config — needs GITHUB_REPOSITORY + GITHUB_TOKEN)
npm run test:consistency
```

### 5. ESM + Jest
- Use `jest.unstable_mockModule` (NOT `jest.mock`) for mocking ESM modules
- Run with `--experimental-vm-modules` flag
- Integration/e2e tests use conditional `HAS_API` checks — auto-skip when `api.peviitor.ro/v1` is unreachable

### 6. Verification
- După orice modificare, urmează [VERIFY.md](VERIFY.md) pas cu pas
- Ultimul pas = rulează scraperul prin GitHub Actions, verifică job-urile în SOLR, și verifică că `docs/jobs.md` a fost generat și este accesibil pe GitHub Pages
- Toate workflow-urile din `.github/workflows/` trebuie să treacă înainte de merge

### 7. Module Structure
- `scraper/config/company.json` + `scraper/config/company.js` — single source of truth for company identity
- `scraper/anaf.js` — company data module (imported by company.js); ANAF + CUIScan fallback + CUIFirma search fallback. No retries.
- `scraper/markdown-generator.js` — generates `docs/jobs.md` after each scrape; called from index.js
- `scraper/job-validator.js` — shared `validateByHead` + `validateByContent` used by both validator CLIs
- `scraper/student-programs.js` — scrapes student programs (internships) from /en/careers/student-programs/; integrated into main scraper
- `scraper/demoanaf.js` — CLI wrapper around anaf.js
- `scraper/company.js` — company validation (ANAF + Peviitor + SOLR); reads from `scraper/config/company.json`, writes `scraper/anaf-cache.json` for offline fallback
- `scraper/api.js` — API operations module (all Solr operations via peviitor API: query, delete, upsert)
- `scraper/validate-jobs.js` — manual deep validator (content-aware); thin wrapper over job-validator.js
- `scraper/delete_request.json` — SOLR delete payload (maintenance tool)
- `tests/validate-msg-jobs.js` — CI fast validator (HEAD only); thin wrapper over job-validator.js + api.js
- `scraper/index.js` — main scraper orchestrator

### 8. Caching Behavior
- `scraper/config/company.json` — single source of truth; `lastScraped` updated on each run
- `scraper/anaf-cache.json` — ANAF raw data for offline fallback (gitignored)
- If ANAF is unreachable AND `lastScraped` exists, the code falls back to stale config rather than failing
- `docs/company.json` is copied from config on every scrape for GitHub Pages (gitignored)

### 9. Auto-Heal Issues
When the `Automation Tests` workflow fails, a **GitHub Issue** is auto-created with label `auto-heal`. The issue contains:
- Run URL, branch, commit, and trigger event
- Instructions for opencode to investigate, fix, commit, push, and close

**When you see an `auto-heal` labeled issue:**
1. Read the issue body for the run URL and branch
2. Checkout that branch
3. Review the workflow logs to diagnose the failure
4. Apply the fix
5. Commit, push, and close the issue

### 10. Maintenance Agent
See [MAINTENANCE.md](MAINTENANCE.md) for the full maintenance workflow.

**On every session:**
1. Check open GitHub issues: `gh issue list --repo sebiboga/msg-systems-romania-srl-nodejs-scraper --state open`
2. Prioritize: `critical` → `bug` → `enhancement` → `documentation`
3. Fix all issues, commit with `#issue` reference, close the issue
