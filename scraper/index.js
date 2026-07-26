import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";
import { fileURLToPath } from "url";
import { validateAndGetCompany } from "./company.js";
import { querySOLR, upsertJobs, upsertCompany } from "./solr.js";
import { generateJobsMarkdown } from "./markdown-generator.js";
import companyConfig from "./config/company.js";

const COMPANY_ID = companyConfig.id;

const TIMEOUT = 10000;

const LISTING_URL = "https://www.msg-systems.ro/en/careers/job-offerings";

let COMPANY_NAME = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchListingPage() {
  const res = await fetch(LISTING_URL, {
    headers: {
      "User-Agent": "job_seeker_ro_spider",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
  });

  if (!res.ok) {
    throw new Error(`Listing page error: ${res.status}`);
  }

  return await res.text();
}

function parseMsgJobs(html) {
  const $ = cheerio.load(html);
  const jobs = [];

  $(".col-sm-4").each((i, el) => {
    const $card = $(el);

    const title = $card.find("h4").first().text().trim();

    const paragraphs = $card.find("p");
    let category = "";
    let location = [];

    paragraphs.each((_, pEl) => {
      const text = $(pEl).text().trim();
      if (text.includes("\uD83D\uDCCD")) {
        const locRaw = text.replace("\uD83D\uDCCD", "").trim();
        location = locRaw.split(",").map((s) => s.trim()).filter(Boolean);
      } else if (text && !$(pEl).hasClass("button")) {
        if (!category) category = text;
      }
    });

    const linkEl = $card.find("a[href]").filter((_, a) => {
      const href = $(a).attr("href") || "";
      return href.startsWith("/en/careers/job-offerings/");
    }).first();

    let url = "";
    if (linkEl.length) {
      const href = linkEl.attr("href");
      url = href.startsWith("http") ? href : `https://www.msg-systems.ro${href}`;
    }

    if (title && url) {
      const workmode = "on-site";
      const tags = [category.toLowerCase()].filter(Boolean);

      jobs.push({
        url,
        title,
        workmode,
        location,
        tags
      });
    }
  });

  return {
    jobs,
    total: jobs.length
  };
}

async function scrapeAllListings(testOnlyOnePage = false) {
  const allJobs = [];
  const seenUrls = new Set();

  console.log("Fetching MSG Systems listing page...");
  const html = await fetchListingPage();
  const result = parseMsgJobs(html);
  const jobs = result.jobs;

  console.log(`Total jobs found on listing page: ${jobs.length}`);

  for (const job of jobs) {
    if (!seenUrls.has(job.url)) {
      seenUrls.add(job.url);
      allJobs.push(job);
    }
  }

  console.log(`Total unique jobs collected: ${allJobs.length}`);
  return allJobs;
}

function mapToJobModel(rawJob, cif, companyName = COMPANY_NAME) {
  const now = new Date().toISOString();

  const job = {
    url: rawJob.url,
    title: rawJob.title,
    company: companyName,
    cif: cif,
    location: rawJob.location?.length ? rawJob.location : undefined,
    tags: rawJob.tags?.length ? rawJob.tags : undefined,
    workmode: rawJob.workmode || undefined,
    date: now,
    status: "scraped"
  };

  Object.keys(job).forEach((k) => job[k] === undefined && delete job[k]);

  return job;
}

function transformJobsForSOLR(payload) {
  const romanianCities = [
    'Bucharest', 'București', 'Cluj-Napoca', 'Cluj Napoca',
    'Timișoara', 'Timisoara', 'Iași', 'Iasi', 'Brașov', 'Brasov',
    'Constanța', 'Constanta', 'Craiova', 'Bacău', 'Sibiu',
    'Târgu Mureș', 'Targu Mures', 'Oradea', 'Baia Mare', 'Satu Mare',
    'Ploiești', 'Ploiesti', 'Pitești', 'Pitesti', 'Arad', 'Galați', 'Galati',
    'Brăila', 'Braila', 'Drobeta-Turnu Severin', 'Râmnicu Vâlcea', 'Ramnicu Valcea',
    'Buzău', 'Buzau', 'Botoșani', 'Botosani', 'Zalău', 'Zalau', 'Hunedoara', 'Deva',
    'Suceava', 'Bistrița', 'Bistrita', 'Tulcea', 'Călărași', 'Calarasi',
    'Giurgiu', 'Alba Iulia', 'Slatina', 'Piatra Neamț', 'Piatra Neamt', 'Roman',
    'Dumbrăvița', 'Dumbravita', 'Voluntari', 'Popești-Leordeni', 'Popesti-Leordeni',
    'Chitila', 'Mogoșoaia', 'Mogosoaia', 'Otopeni'
  ];

  const citySet = new Set(romanianCities.map(c => c.toLowerCase()));

  const normalizeWorkmode = (wm) => {
    if (!wm) return undefined;
    const lower = wm.toLowerCase();
    if (lower.includes('remote')) return 'remote';
    if (lower.includes('office') || lower.includes('on-site') || lower.includes('site')) return 'on-site';
    return 'hybrid';
  };

  const transformed = {
    ...payload,
    company: payload.company?.toUpperCase(),
    jobs: payload.jobs.map(job => {
      const validLocations = (job.location || []).filter(loc => {
        const lower = loc.toLowerCase().trim();
        if (lower === 'romania' || lower === 'românia') return true;
        return citySet.has(lower);
      }).map(loc => loc.toLowerCase() === 'romania' ? 'România' : loc);

      return {
        ...job,
        location: validLocations.length > 0 ? validLocations : ['România'],
        workmode: normalizeWorkmode(job.workmode)
      };
    })
  };

  return transformed;
}

async function main() {
  const testOnlyOnePage = process.argv.includes("--test");

  try {
    fs.mkdirSync("scraper", { recursive: true });

    console.log("=== Step 1: Get existing jobs count ===");
    const existingResult = await querySOLR(COMPANY_ID);
    const existingCount = existingResult.numFound;
    console.log(`Found ${existingCount} existing jobs in SOLR`);

    console.log("=== Step 2: Validate company via ANAF ===");
    const { company, cif, address } = await validateAndGetCompany();
    COMPANY_NAME = company;
    const localCif = cif;

    try {
      await upsertCompany({
        id: cif,
        company,
        brand: companyConfig.brand || undefined,
        status: "activ",
        location: address ? [address] : companyConfig.location,
        website: companyConfig.website,
        career: companyConfig.career,
        scraperFile: companyConfig.scraperFile,
        lastScraped: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      console.log(`Note: Could not upsert company to SOLR core: ${err.message}`);
    }

    const rawJobs = await scrapeAllListings(testOnlyOnePage);
    const scrapedCount = rawJobs.length;
    console.log(`Jobs scraped from MSG Systems website: ${scrapedCount}`);

    const jobs = rawJobs.map(job => mapToJobModel(job, localCif));

    const payload = {
      source: "msg-systems.ro",
      scrapedAt: new Date().toISOString(),
      company: COMPANY_NAME,
      cif: localCif,
      jobs
    };

    console.log("Transforming jobs for SOLR...");
    const transformedPayload = transformJobsForSOLR(payload);
    const validCount = transformedPayload.jobs.filter(j => j.location).length;
    console.log(`Jobs with valid Romanian locations: ${validCount}`);

    fs.writeFileSync("scraper/jobs.json", JSON.stringify(transformedPayload, null, 2), "utf-8");
    console.log("Saved scraper/jobs.json");

    const companyData = {
      id: localCif,
      company: transformedPayload.company,
      brand: companyConfig.brand || undefined,
      status: "activ",
      location: address ? [address] : companyConfig.location,
      website: companyConfig.website,
      career: companyConfig.career,
      lastScraped: new Date().toISOString().split('T')[0]
    };
    const markdown = generateJobsMarkdown(companyData, transformedPayload.jobs);
    fs.mkdirSync("docs", { recursive: true });
    fs.writeFileSync("docs/jobs.md", markdown, "utf-8");
    console.log("Saved docs/jobs.md");

    fs.copyFileSync("scraper/config/company.json", "docs/company.json");
    console.log("Copied scraper/config/company.json → docs/company.json");

    console.log("\n=== Step 4: Upsert jobs to SOLR ===");
    await upsertJobs(transformedPayload.jobs);

    const finalResult = await querySOLR(COMPANY_ID);
    console.log(`\n=== SUMMARY ===`);
    console.log(`Jobs existing in SOLR before scrape: ${existingCount}`);
    console.log(`Jobs scraped from MSG Systems website: ${scrapedCount}`);
    console.log(`Jobs in SOLR after scrape: ${finalResult.numFound}`);
    console.log(`====================`);

    console.log("\n=== DONE ===");
    console.log("Scraper completed successfully!");

  } catch (err) {
    console.error("Scraper failed:", err);
    process.exit(1);
  }
}

export { parseMsgJobs, mapToJobModel, transformJobsForSOLR };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
