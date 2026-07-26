# Instructions

## Project Purpose

This scraper extracts job listings from MSG Systems Romania careers page and imports them to peviitor.ro.

Target: https://www.msg-systems.ro/en/careers/job-offerings

## Model Schemas

The job and company models are defined in:
- `job-model.md` - Job model schema
- `company-model.md` - Company model schema

## Important

These models are **dynamic** and can change over time. They are based on the official Peviitor Core schemas which may be updated.

## How to Keep Models Updated

When working on this scraper:

1. **Check for updates** in the Peviitor Core repository:
   - Repository: https://github.com/peviitor-ro/peviitor_core
   - Main file: README.md (contains Job and Company model schemas)

2. **When to update**:
   - Before starting new development work
   - If field requirements or validations have changed
   - If new fields have been added

3. **How to update**:
   - Fetch the latest README.md from peviitor_core main branch
   - Compare with current job-model.md and company-model.md
   - Update local files if there are differences
   - Update scraper/index.js mapping logic if field requirements changed

## Technologies

- **Node.js & JavaScript** - For scraping and data extraction
- **Apache SOLR** - For data storage and indexing
- **Claude Code** - For development

## Workflow Steps

1. **Start with brand** - We know the brand (e.g., "MSG Systems")
2. **Search in DemoANAF** - Find company by brand, get CIF from search results
3. **Get company details from ANAF** - Using CIF, fetch full company data from ANAF
4. **Validate with Peviitor** - Verify company exists in Peviitor, get group/brand info
5. **Check existing jobs in SOLR** - Query SOLR by CIF to see what jobs already exist
6. **Check company status** - If ANAF status = "inactive" → DELETE existing jobs from SOLR and STOP
7. **Save ANAF cache** - Save raw ANAF data to `scraper/anaf-cache.json` for offline fallback
8. **Scrape new jobs** - Extract jobs from MSG Systems careers page via HTML parsing (cheerio)
9. **Transform for SOLR** - Validate and fix job data:
   - location: Only Romanian cities allowed
   - tags: lowercase, no diacritics
   - company: uppercase
10. **Upsert to SOLR** - Import/update jobs in SOLR
11. **Verify URLs** - Check existing job URLs still work, delete 404s

## Running the Scraper

```bash
# Set environment variables
export SOLR_AUTH=your-solr-credentials

# Run the full scraper workflow (single command)
node scraper/index.js

# Test mode (one page only, limit 10 jobs)
node scraper/index.js --test
```

> **Important**: Scraper does NOT delete jobs from other sources (ANOFM, etc). It only upserts MSG Systems jobs. Existing jobs are preserved.

## Full Workflow (automatic)

When running `node scraper/index.js`, the following steps happen automatically:

1. **Check existing jobs count** - Query SOLR by CIF (read-only)
2. **Validate company via ANAF** - Check company exists and is active
3. **Scrape jobs** - Extract jobs from MSG Systems careers page via HTML parsing
4. **Transform for SOLR** - Fix locations (only Romanian cities), normalize fields
5. **Upsert to SOLR** - Add/update jobs (SOLR handles duplicates by URL)
6. **Show Summary** - Log job counts

**Important**: We do NOT delete existing jobs! This preserves jobs from other sources (ANOFM, etc).

## Workflow Flowchart

```
scraper/config/company.json (single source of truth: CIF, brand, URLs)
    │
    ▼
scraper/index.js
    │
    ▼
querySOLR(CIF) - just count, don't delete
    │
    ▼
scraper/company.js (validate company)
    ├── check config/company.json lastScraped
    │   └── if fresh (<7 days), skip ANAF entirely
    ├── ANAF API ──► get company name + CIF (only if cache stale/missing)
    ├── Peviitor API ──► validate company model
    └── SOLR ──► check existing jobs count
    │
    ▼ (if active)
scrape MSG Systems careers page (HTML parsing with cheerio)
    │
    ▼
transformJobsForSOLR()
    ├── Filter: keep only Romanian locations
    │         (Bucharest, Cluj-Napoca, etc)
    ├── Fallback: "România" for unknown
    └── Format: lowercase tags, uppercase company
    │
    ▼
upsertJobs() - SOLR handles duplicate by URL
    │
    ▼
generateJobsMarkdown() → docs/jobs.md
    └── committed to repo by CI → available on GitHub Pages
```

## File Responsibilities

| File | Role |
|------|------|
| `scraper/config/company.json` | **Single source of truth** for company identity (CIF, brand, URLs) |
| `scraper/config/company.js` | ESM wrapper that loads `scraper/config/company.json` for Node code |
| `scraper/index.js` | Main entry point - full workflow: validate company → scrape → transform → upsert → generate docs/jobs.md |
| `scraper/company.js` | Validates company via ANAF + Peviitor; writes `scraper/anaf-cache.json` for offline fallback |
| `scraper/solr.js` | SOLR operations module - query, delete, upsert jobs + standalone commands |
| `scraper/validate-jobs.js` | Manual deep validator (content-aware); thin CLI wrapper over `scraper/job-validator.js` |
| `scraper/anaf.js` | Company data module - ANAF (demoanaf.ro) + CUIScan (cuiscan.ro) fallback + CUIFirma search fallback. No retries — fast fail + fallback. |
| `scraper/markdown-generator.js` | Generates `docs/jobs.md` with company info and all scraped jobs |
| `scraper/job-validator.js` | Shared validation primitives: `validateByHead`, `validateByContent`, `DEFAULT_EXPIRED_KEYWORDS` |
| `scraper/demoanaf.js` | CLI entry point for ANAF module (thin wrapper around `scraper/anaf.js`) |
| `tests/validate-msg-jobs.js` | CI fast validator (HEAD only); thin CLI over `scraper/job-validator.js` + `scraper/solr.js` |
| `tests/unit/index.test.js` | Unit tests for parseMsgJobs, mapToJobModel, transformJobsForSOLR |
| `tests/unit/company.test.js` | Unit tests for validateAndGetCompany and fallback caching |
| `tests/unit/solr.test.js` | Unit tests for SOLR query, upsert, delete operations |
| `tests/unit/demoanaf.test.js` | Unit tests for ANAF search and company retrieval |
| `tests/integration/workflow.test.js` | Live integration tests - ANAF + SOLR |
| `tests/e2e/scraper.test.js` | End-to-end tests with real MSG Systems website |
| `tests/consistency/public.test.js` | Verifies repo is public on GitHub |
| `tests/consistency/repo.test.js` | Verifies branch, Pages, secrets, workflow files |
| `tests/consistency/topics.test.js` | Verifies required repo topics |
| `tests/consistency/workflow-naming.test.js` | Validates workflow naming conventions |

## API Endpoints

- **DemoANAF Search**: `https://demoanaf.ro/api/search?q=BRAND` - Search companies by name/brand
- **DemoANAF Company**: `https://demoanaf.ro/api/company/:cui` - Get company details by CIF
- **Peviitor API**: `https://api.peviitor.ro/v1/company/`
- **Solr**: `https://solr.peviitor.ro/solr/job` (auth: via `SOLR_AUTH` environment variable)

## Rate Limiting & Politeness

The scraper is intentionally slow to be a good citizen:

| Setting | Value | Where |
|---------|-------|-------|
| Request timeout | 10000 ms | `scraper/index.js` — `TIMEOUT` constant |
| ANAF fallback | 1 try demoanaf.ro → 1 try cuiscan.ro → cache | `scraper/anaf.js` |
| Concurrency | 1 (sequential) | No `Promise.all` for paginated fetches |
| User-Agent | `job_seeker_ro_spider` | Identifies the scraper in server logs |

Derived scrapers should keep these defaults unless the target site explicitly permits otherwise.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SOLR_AUTH` | SOLR credentials in format `user:password` |
| `GITHUB_REPOSITORY` | Used by consistency tests — format: `owner/repo` |
| `GITHUB_TOKEN` | GitHub API token for consistency tests |

`dotenv` loads `.env.local` automatically at startup — set variables there for local runs. Never commit `.env.local`.

## Standalone Commands

```bash
# Verify jobs in SOLR by CIF
node scraper/solr.js <CIF>

# Extract existing jobs from SOLR by CIF
node scraper/solr.js extract <CIF>

# Query company in SOLR
node scraper/solr.js company <search_term>

# Get company details from ANAF by CIF
node scraper/demoanaf.js <CIF>

# Search companies in ANAF by brand
node scraper/demoanaf.js search <brand>

# Validate job URLs from SOLR by CIF (check active/expired)
node scraper/validate-jobs.js <CIF>

# Validate a single job URL
node scraper/validate-jobs.js url <url>

# Delete expired jobs from SOLR by CIF
node scraper/validate-jobs.js <CIF> --delete
```

## Testing

This project requires multiple levels of testing:

1. **Unit Tests** - Test individual modules (solr.js, company.js) in isolation
2. **Integration Tests** - Test API interactions (ANAF, Peviitor, SOLR) in `/tests/integration` folder
3. **E2E Tests** - Test full workflow in `/tests/e2e` folder

Run tests:
```bash
npm test
```

## Temporary Files

**NU folosi `tmp/` niciodată.** Toate fișierele temporare/scratch trebuie scrise în folderul `scraper/` sau în subfolderele lui. Nu crea directoare separate temporare.

## Technical Debt / Completed

- [x] Extract demoanaf.js to separate module (#2)
- [x] Write Unit Tests for all modules (#3)
- [x] Write Integration Tests in separate folder (#4)
- [x] Write E2E automated tests in separate folder (#5)
- [ ] Write Unit/Component/E2E tests for index.js
