# job_seeker_ro_spider — MSG Systems Romania Scraper

[![Oportunitati SI Cariere](https://github.com/sebiboga/msg-systems-romania-srl-nodejs-scraper/actions/workflows/job-seeker-ro-spider.yml/badge.svg)](https://github.com/sebiboga/msg-systems-romania-srl-nodejs-scraper/actions/workflows/job-seeker-ro-spider.yml)
[![Automation Tests](https://github.com/sebiboga/msg-systems-romania-srl-nodejs-scraper/actions/workflows/automation-testing.yml/badge.svg)](https://github.com/sebiboga/msg-systems-romania-srl-nodejs-scraper/actions/workflows/automation-testing.yml)

[![Version](https://img.shields.io/github/package-json/v/sebiboga/msg-systems-romania-srl-nodejs-scraper?label=version&color=blue)](CHANGELOG.md)
[![Test Results](https://img.shields.io/badge/test--results-HTML-9b59b6)](https://sebiboga.github.io/msg-systems-romania-srl-nodejs-scraper/test-results/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![JavaScript](https://img.shields.io/badge/javascript-ESM-F7DF1E?logo=javascript&logoColor=black)](https://ecma-international.org/)
[![Node.js](https://img.shields.io/badge/node-24-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fpeviitor.ro&label=peviitor.ro)](https://peviitor.ro)
[![API](https://img.shields.io/website?url=https%3A%2F%2Fapi.peviitor.ro%2F&label=api.peviitor.ro)](https://api.peviitor.ro/)
[![SOLR](https://img.shields.io/website?url=https%3A%2F%2Fsolr.peviitor.ro%2Fsolr%2F&label=solr.peviitor.ro)](https://solr.peviitor.ro/solr/)
[![GitHub Pages](https://img.shields.io/github/deployments/sebiboga/msg-systems-romania-srl-nodejs-scraper/github-pages?label=GitHub%20Pages)](https://sebiboga.github.io/msg-systems-romania-srl-nodejs-scraper/)

**job_seeker_ro_spider** — un scraper pentru job-urile MSG Systems din România. Extrage anunțurile de pe [MSG Systems Careers](https://www.msg-systems.ro/en/careers/job-offerings) și le publică în [peviitor.ro](https://peviitor.ro) prin API-ul SOLR.

> **🌱 Derived scraper.** Acest repo a fost derivat din [EPAM template](https://github.com/sebiboga/epam-systems-international-srl-nodejs-scraper) (HTML/cheerio, single-page).

## Overview

Proiectul automatizează colectarea zilnică a job-urilor MSG Systems din România, menținând board-ul peviitor.ro la zi cu cele mai recente oportunități de carieră.

## Features

- Extrage job-uri prin HTML scraping (cheerio) de pe pagina de cariere MSG Systems
- Validează compania via ANAF (CUI, status activ/inactiv, adresă completă)
- **Cache ANAF la 7 zile** — committed în repo, nu lovește demoANAF la fiecare scrape
- **Fallback la cache stale** dacă ANAF e indisponibil
- Cross-validează cu Peviitor API
- Stochează în SOLR (job core + company core)
- Generează `docs/jobs.md` automat — accesibil pe GitHub Pages
- **Identitate companie într-un singur fișier** (`config/company.json`)
- GitHub Actions: scrape zilnic + testare automată (unit, integration, e2e, consistency)
- Teste SOLR condiționale — auto-skip când `SOLR_AUTH` nu e setat
- Se identifică prin User-Agent: `job_seeker_ro_spider`

## Project Structure

```
├── index.js                    # Main scraper (HTML/cheerio single-page)
├── company.js                  # Company validation via ANAF + Peviitor + SOLR
├── demoanaf.js                 # CLI wrapper for src/anaf.js
├── solr.js                     # SOLR operations (query, upsert, delete, company)
├── validate-jobs.js            # Job URL validator — checks active/expired
├── config/
│   ├── company.json            # Single source of truth: CIF, brand, URLs
│   └── company.js              # ESM loader for company.json
├── src/
│   ├── anaf.js                 # ANAF API core module
│   ├── markdown-generator.js   # Generates docs/jobs.md
│   └── job-validator.js        # Shared validateByHead + validateByContent
├── tests/
│   ├── validate-msg-jobs.js    # CI fast validator (HEAD only)
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── consistency/
├── docs/
│   ├── index.html              # GitHub Pages dashboard
│   ├── jobs.md                 # Scraped jobs (auto-generated)
│   └── test-results/
└── .github/workflows/
    ├── job-seeker-ro-spider.yml    # Daily scraping at 6 AM UTC
    ├── automation-testing.yml      # Test suite on push/PR
    └── job-recovery-from-disaster.yml  # SOLR company core recovery
```

## Setup

### Prerequisites

- Node.js 24+
- npm

### Installation

```bash
npm install
```

### Configuration

Set the `SOLR_AUTH` environment variable:

```bash
export SOLR_AUTH="username:password"
```

## Usage

### Run the Scraper

```bash
npm run scrape
```

### Run Tests

```bash
npm test
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:consistency
```

## Workflows

### Daily Scraping

The `job-seeker-ro-spider.yml` workflow runs daily at 6 AM UTC. It:
1. Runs pre-scrape tests (unit + integration)
2. Validates company data via ANAF
3. Scrapes job listings from MSG Systems careers page
4. Updates SOLR with new/removed jobs
5. Runs post-scrape tests (e2e + consistency)
6. Generates `docs/jobs.md` and pushes to docs/

### Test Automation

The `automation-testing.yml` workflow runs on every push and pull request. It:
1. Ensures company exists in SOLR company core
2. Runs all test suites
3. Validates and removes expired jobs (on schedule/dispatch)
4. Creates auto-heal issue on failure

## Acknowledgments

This project was developed with assistance from **[Claude Code](https://claude.ai/code)** by Anthropic.

Special thanks to the open source community and the peviitor.ro team for their support.

## License

Copyright (c) 2024-2026 BOGA SEBASTIAN-NICOLAE

Licensed under the [MIT License](LICENSE).

## Managed By

This project is managed by [ASOCIATIA OPORTUNITATI SI CARIERE](https://oportunitatisicariere.ro) and used as a web scraper for the [peviitor.ro](https://peviitor.ro) job board project.

## Disclaimer

This scraper is designed for educational purposes and legitimate job data aggregation for the Romanian job market.
