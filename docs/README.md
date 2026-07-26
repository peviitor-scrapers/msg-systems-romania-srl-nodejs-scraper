# job_seeker_ro_spider

**job_seeker_ro_spider** — scraper pentru job-urile MSG Systems din România.

Extrage anunțurile de pe [MSG Systems Careers](https://msg-systems.ro/en/careers/job-offerings) și le publică în [peviitor.ro](https://peviitor.ro) prin API-ul SOLR.

## Identificare

Toate request-urile HTTP folosesc User-Agent-ul:

```
job_seeker_ro_spider
```

## Ce face

1. **Validează compania** — interoghează API-ul public ANAF ([demoanaf.ro](https://demoanaf.ro)) după CIF-ul MSG (24415960) și verifică:
   - Denumirea oficială: MSG SYSTEMS ROMÂNIA SRL
   - Status: activ/inactiv/radiat
   - Adresa completă din registrul comerțului
2. **Cross-validează cu Peviitor** — verifică existența companiei în API-ul Peviitor
3. **Scrape-uiește job-urile** — extrage lista completă de job-uri de pe pagina de careers a MSG Systems prin parsing HTML (cheerio)
4. **Transformă datele** — normalizează locațiile (doar orașe românești), tag-urile (lowercase), workmode-ul (remote/on-site/hybrid)
5. **Stochează în SOLR** — upsert în `job` core (job-urile) și `company` core (datele companiei cu adresa completă)
6. **Generează docs/jobs.md** — fișier markdown cu informații companie + toate job-urile curente, publicat pe [GitHub Pages](https://sebiboga.github.io/msg-systems-romania-srl-nodejs-scraper/jobs.md)

## Structură proiect

```
├── scraper/
│   ├── index.js                # Orchestrator principal
│   ├── company.js              # Validare companie (ANAF + Peviitor + SOLR) cu cache 7 zile
│   ├── api.js                   # Operații API (query, upsert, delete jobs — fără acces direct SOLR)
│   ├── demoanaf.js             # CLI wrapper pentru anaf.js
│   ├── validate-jobs.js        # Validator job URLs (activ/expirat)
│   ├── anaf.js                 # Modul ANAF API (search + company details)
│   ├── markdown-generator.js   # Generează docs/jobs.md după scrape
│   ├── job-validator.js        # Primitivă comună: validateByHead, validateByContent
│   ├── delete_request.json     # Payload SOLR delete (mentenanță)
│   └── config/
│       ├── company.json        # Sursa unică de adevăr (CIF, brand, URL-uri)
│       └── company.js          # Loader ESM pentru config/company.json
├── ai/                         # Prompturi instrucțiuni AI
│   ├── AGENTS.md
│   ├── INSTRUCTIONS.md
│   ├── VERIFY.md
│   └── ...
├── tests/
│   ├── unit/          # Teste unitare (API-uri mock-uite)
│   ├── integration/   # Teste de integrare (ANAF + SOLR live)
│   └── e2e/           # Teste end-to-end (pipelin complet)
│   └── consistency/   # Verificări repo (public, branch, topics)
└── .github/workflows/
    ├── job-seeker-ro-spider.yml     # Rulează zilnic la 6 AM UTC
    └── automation-testing.yml       # Teste automate la fiecare push/PR
```

## API-uri folosite

| API | URL | Autentificare |
|---|---|---|
| MSG Systems Careers | `https://www.msg-systems.ro/en/careers/job-offerings` | Public (HTML) |
| ANAF (demoanaf) | `https://demoanaf.ro/api/...` | Public |
| Peviitor | `https://api.peviitor.ro/v1/` | Public |
| SOLR (direct — doar integration/e2e tests) | `https://solr.peviitor.ro/solr/job` | `SOLR_AUTH` |

## Robots.txt

MSG Systems careers pages sunt accesibile public. Scraper-ul face o singură cerere HTML per pagină, parsing-ul cu cheerio, fără autentificare.

Pentru analiza completă, vezi [ROBOTS.md](../ai/ROBOTS.md).

## Testare

```bash
# Toate testele
npm test

# Doar unitare
npm run test:unit

# Doar integrare (necesită ANAF live, SOLR conditional)
npm run test:integration

# Doar E2E (API real MSG + ANAF + SOLR)
npm run test:e2e
```

Testele de integrare/e2e folosesc `itIfSolr` — se auto-skip dacă variabila `SOLR_AUTH` nu e setată.
