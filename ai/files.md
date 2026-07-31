# Project Files

## JavaScript Files — scraper/

| File | Description |
|------|-------------|
| `scraper/index.js` | Main scraper - full workflow: validate company → scrape → transform → upsert → generate docs/jobs.md |
| `scraper/company.js` | Validates company via ANAF + Peviitor APIs, checks if company is active/inactive |
| `scraper/api.js` | API operations module - all Solr operations via peviitor API (query, delete, upsert jobs) + standalone verify/extract/company commands |
| `scraper/demoanaf.js` | CLI entry point for ANAF module (thin wrapper around anaf.js) |
| `scraper/validate-jobs.js` | **Generic deep validator (manual use).** Full GET requests, parses page body for "no longer available" keywords. Works with any CIF, single URL, or file. Slower but catches soft-404s. Not used by CI. |
| `scraper/anaf.js` | ANAF API core module - exports getCompanyFromANAF(cif), getCompanyFromANAFWithFallback(cif, cached), searchCompany(brandName) |
| `scraper/markdown-generator.js` | Generates docs/jobs.md - exports generateJobsMarkdown(companyData, jobs) |
| `scraper/job-validator.js` | Shared validation primitives - exports validateByHead(url), validateByContent(url, opts), DEFAULT_EXPIRED_KEYWORDS. Used by both `validate-jobs.js` and `tests/validate-msg-jobs.js`. |
| `scraper/student-programs.js` | Scrapes student programs from /en/careers/student-programs/ — exports getStudentPrograms(). Extracts internships (Java Training, Python Training, SAP Summer School). Integrated into main scraper workflow. |

## Config — scraper/config/

| File | Description |
|------|-------------|
| `scraper/config/company.json` | **Single source of truth for company identity.** All scraper code, CI workflows, and the static HTML read from this file. To derive a scraper for a different company, this is the primary file to edit. |
| `scraper/config/company.js` | ESM wrapper that imports and exposes `scraper/config/company.json` to Node code |

## Test Files — tests/

| File | Description |
|------|-------------|
| `tests/validate-msg-jobs.js` | **MSG-specific fast validator (used by CI).** HEAD requests only, uses CIF from scraper/config/company.json. Called nightly by `automation-testing.yml`. Supports `--dry-run` and `--delete`. |
| `tests/unit/index.test.js` | Unit tests for index.js - parseMsgJobs, mapToJobModel, transformJobsForSOLR |
| `tests/unit/company.test.js` | Unit tests for company.js - getCompanyBrand, validateAndGetCompany, fallback caching |
| `tests/unit/api.test.js` | Unit tests for api.js - query, upsert, delete, HTTP error handling |
| `tests/unit/demoanaf.test.js` | Unit tests for ANAF search and company retrieval with mocked responses |
| `tests/integration/workflow.test.js` | Integration tests - ANAF live API, Peviitor API, SOLR company/job cores |
| `tests/e2e/scraper.test.js` | E2E tests - full pipeline with real MSG Systems website, ANAF, and SOLR |
| `tests/consistency/public.test.js` | Verifies repository is public on GitHub |
| `tests/consistency/repo.test.js` | Verifies default branch, GitHub Pages, secrets, workflow files |
| `tests/consistency/topics.test.js` | Verifies repository has required topics: job-seeker-ro-spider, peviitor-ro |
| `tests/consistency/workflow-naming.test.js` | Validates workflow file naming conventions |

## AI Prompt Files — ai/

| File | Description |
|------|-------------|
| `ai/AGENTS.md` | Rules for AI agents working on this project |
| `ai/INSTRUCTIONS.md` | Project documentation - workflow, technologies, API endpoints, how to update models |
| `ai/files.md` | This file - documents role of each project file |
| `ai/job-model.md` | Job schema definition (Peviitor Core) - fields, types, validation rules |
| `ai/company-model.md` | Company schema definition (Peviitor Core) - fields, types, validation rules |
| `ai/VERIFY.md` | Step-by-step verification checklist after changes |
| `ai/BRANCH.md` | Branch strategy and naming conventions |
| `ai/ISSUES.md` | Issue tracking conventions |
| `ai/PUBLIC.md` | Notes on public visibility and data policies |
| `ai/ROBOTS.md` | robots.txt analysis and scraping policy for MSG Systems |
| `ai/TOPICS.md` | Repository topics documentation |
| `ai/UPDATE-REPO-ABOUT.md` | Instructions for updating repo description/about |
| `ai/MAINTENANCE.md` | Maintenance Agent instructions — issue triage, fix workflow, validation checks |

## Open Source Files — root

| File | Description |
|------|-------------|
| `README.md` | Public-facing project README with badges, structure, and usage |
| `CHANGELOG.md` | Version history and notable changes |
| `CONTRIBUTING.md` | Contribution guidelines |
| `SECURITY.md` | Security policy and vulnerability reporting |
| `CODE_OF_CONDUCT.md` | Contributor Covenant Code of Conduct |
| `LICENSE` | MIT License |

## Configuration Files

| File | Description |
|------|-------------|
| `package.json` | Node.js project config - dependencies (node-fetch, cheerio), scripts |
| `package-lock.json` | Locked dependency versions |
| `.npmrc` | npm configuration |
| `.gitignore` | Ignores node_modules/, tmp/, .env.local, docs/company.json, scraper/anaf-cache.json |
| `.env.local` | Local environment variables - NOT committed (no longer needed; all operations go through api.peviitor.ro/v1) |
| `.github/CODEOWNERS` | Code ownership rules for PR reviews |
| `.github/workflows/job-seeker-ro-spider.yml` | Daily scraping workflow (6 AM UTC) |
| `.github/workflows/automation-testing.yml` | Automated tests on every push/PR |

## Data Files

| File | Description |
|------|-------------|
| `scraper/anaf-cache.json` | **ANAF cache (gitignored).** Raw ANAF + Peviitor data for offline fallback. Regenerated on each run. |
| `scraper/delete_request.json` | **Manual maintenance tool** — SOLR payload to delete ALL jobs for CIF 24415960. Use only when you need to wipe MSG Systems jobs from SOLR entirely. |
| `docs/company.json` | **Generated (gitignored).** Copy of `scraper/config/company.json` created by `index.js` for GitHub Pages. |
| `docs/jobs.md` | Scraped jobs in markdown format - company info + all current jobs (generated by CI after each scrape) |

## Notes

- All `.md` schema files (job-model.md, company-model.md) are dynamic — check peviitor_core README.md for updates
- Full workflow: validate company (ANAF+Peviitor) → scrape MSG Systems → transform → upsert SOLR → generate docs/jobs.md
