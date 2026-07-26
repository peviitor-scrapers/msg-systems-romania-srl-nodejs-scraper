import fetch from "node-fetch";
import * as cheerio from "cheerio";

const STUDENT_PROGRAMS_URL = "https://www.msg-systems.ro/en/careers/student-programs/";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchStudentProgramsPage() {
  const res = await fetch(STUDENT_PROGRAMS_URL, {
    headers: {
      "User-Agent": "job_seeker_ro_spider",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
  });

  if (!res.ok) {
    throw new Error(`Student programs page error: ${res.status}`);
  }

  return await res.text();
}

function parseStudentPrograms(html) {
  const $ = cheerio.load(html);
  const programs = [];

  $("section.framedSection.bgWhite").each((i, section) => {
    const $section = $(section);
    const title = $section.find("h4").first().text().trim();

    if (!title || title.includes("Career Fairs") || title.includes("video below")) {
      return;
    }

    const details = {};
    $section.find(".accordion-wrapper").each((_, acc) => {
      const label = $(acc).find("button.accordion").text().trim();
      const content = $(acc).find(".panel").text().trim();
      if (label && content) {
        details[label] = content;
      }
    });

    const technologies = details["Technologies you will work with"]
      || details["Technologies you'll work with"]
      || "";

    const periodLocation = details["Period & location"] || "";
    const periodMatch = periodLocation.match(/(.+?)\s*📍\s*(.+)/s);
    const period = periodMatch ? periodMatch[1].trim() : periodLocation;
    const locationRaw = periodMatch ? periodMatch[2].trim() : "";
    const location = locationRaw.split(",").map(s => s.trim()).filter(Boolean);

    const description = details["About the internship program"] || "";
    const requirements = details["Who is this program for?"] || "";
    const howToApply = details["How to apply?"] || "";

    const applyLink = $section.find("a[href*='mailto:']").first().attr("href") || "";

    if (title) {
      const slug = title.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      const url = `${STUDENT_PROGRAMS_URL}#${slug}`;

      programs.push({
        title,
        url,
        description,
        technologies,
        period,
        location,
        requirements,
        howToApply,
        applyLink,
        source: "msg-systems.ro",
        type: "student-program"
      });
    }
  });

  return programs;
}

export async function getStudentPrograms() {
  console.log("=== Fetching student programs ===\n");

  const html = await fetchStudentProgramsPage();
  const programs = parseStudentPrograms(html);

  console.log(`Found ${programs.length} student programs:`);
  for (const p of programs) {
    console.log(`  - ${p.title} (${p.location.join(", ")})`);
  }

  return programs;
}
