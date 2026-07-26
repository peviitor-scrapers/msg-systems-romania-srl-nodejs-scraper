# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
