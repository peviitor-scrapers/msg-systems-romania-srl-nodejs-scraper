# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.1] - 2026-07-31

### Added
- `scraper/job-validator.js`: `validateByBrowser()` — deep validation in headless Chromium (Playwright) for JS-rendered 404 pages; new expired keyword `"the page you are looking for doesn't exist"`
- `tests/validate-msg-jobs.js`: validation modes `--head` (default), `--content`, `--browser` + `--timeout` flag
- `.github/workflows/job-deep-validate.yml` — manual deep-validate workflow (browser mode, catches JS 404s)
- `.github/workflows/automation-template-sync-check.yml` — weekly check against the EPAM template version; opens a `template-sync` issue when the template is ahead
- `tests/consistency/version.test.js` — package.json version must match latest CHANGELOG version
- `tests/consistency/root-files.test.js` — required root open-source files must exist
- `tests/unit/student-programs.test.js` — unit tests for `scraper/student-programs.js` (parseStudentPrograms, slug URLs, location parsing, getStudentPrograms); exports `parseStudentPrograms` for testing
- `CONTRIBUTING.md` moved to repo root (derived-scraper note for the EPAM template)
- `playwright` devDependency

## [1.1.0] - 2026-07-26

### Changed
- **Major restructuring:** All scraper code moved to `scraper/` directory
- AI prompt/instruction files moved to `ai/` directory
- Removed `src/` directory (files merged into `scraper/`)
- `config/` moved into `scraper/config/`
- `company.json` (ANAF cache) moved to `scraper/`
- `delete_request.json` moved to `scraper/`
- Added `CODE_OF_CONDUCT.md` (standard open source)
- Added no-tmp-folder rule to AGENTS.md and INSTRUCTIONS.md
- Updated all import paths in tests, workflows, and code
- Updated all documentation with new paths

## [1.0.0] - 2026-07-23

### Added
- Initial release
- Job scraping from MSG Systems Romania careers page (HTML/cheerio)
- Company validation via ANAF
- SOLR integration for job storage
- GitHub Actions workflows for daily scraping and testing
- Comprehensive test suite (unit, integration, E2E)
- ANAF API fallback with cached data support
- Node 24 compatibility

### Features
- Automated daily job scraping
- Company core validation and management
- Job URL validation
- Data integrity checks
- Romanian location filtering
- Work mode normalization

## License

Copyright (c) 2024-2026 BOGA SEBASTIAN-NICOLAE
Licensed under MIT License
