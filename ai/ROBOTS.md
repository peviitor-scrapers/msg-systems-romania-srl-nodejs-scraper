# Robots.txt Analysis — MSG Systems

## Site Structure

MSG Systems Romania careers page: https://www.msg-systems.ro/en/careers/job-offerings

The careers page is a standard HTML page listing all current job openings. The scraper fetches this single page and parses it with cheerio to extract job cards.

## Scraping Approach

The scraper uses **HTML parsing** (not API calls) to extract job listings:
- Single page fetch: `https://www.msg-systems.ro/en/careers/job-offerings`
- Parses `.framedSection.smallPadding.bgWhite .col-sm-4` job cards
- Extracts title (`h4`), location (paragraph with 📌 emoji), and link (`a[href]`)
- One request total — no pagination needed

## Rate Limiting & Politeness

| Setting | Value |
|---------|-------|
| Requests per scrape | 1 (single page) |
| User-Agent | `job_seeker_ro_spider` |
| Concurrency | 1 (sequential) |
| Request timeout | 10000 ms |

## Recomandare

robots.txt NU este legal binding, dar reprezintă intenția proprietarului site-ului.

- Paginile de careers sunt accesibile public, fără restricții în robots.txt
- Scraperul face o singură cerere HTML per rulare — comportament rezonabil, nu agresiv
- Nu se folosește API — doar parsing HTML al paginii publice de job-uri

**Concluzie**: Risc minim. Pagina e publică, răspunde fără autentificare, iar scraperul e politicos (o singură cerere, User-Agent identificabil).
