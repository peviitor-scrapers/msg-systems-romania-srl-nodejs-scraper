import { jest } from '@jest/globals';

const mockFetch = jest.fn();

jest.unstable_mockModule('node-fetch', () => ({
  default: mockFetch
}));

const STUDENT_PROGRAMS_URL = "https://www.msg-systems.ro/en/careers/student-programs/";

function htmlResponse(body) {
  return {
    ok: true,
    status: 200,
    text: async () => body
  };
}

function errorResponse(status) {
  return {
    ok: false,
    status,
    text: async () => 'Error'
  };
}

function programSection({
  title = 'Future Leaders Program',
  technologies = 'Java, Spring Boot',
  period = 'July - September',
  location = 'Bucharest, Cluj-Napoca, Iași',
  description = 'Hands-on experience on real projects.',
  requirements = 'IT students in their final year',
  howToApply = 'Send CV and motivation letter',
  applyHref = 'mailto:apply@msg-systems.ro',
  extraClasses = ''
}) {
  return `<section class="framedSection bgWhite ${extraClasses}">
    <h4>${title}</h4>
    <div class="accordion-wrapper">
      <button class="accordion">Technologies you will work with</button>
      <div class="panel">${technologies}</div>
    </div>
    <div class="accordion-wrapper">
      <button class="accordion">Period &amp; location</button>
      <div class="panel">${location ? `${period} 📍 ${location}` : period}</div>
    </div>
    <div class="accordion-wrapper">
      <button class="accordion">About the internship program</button>
      <div class="panel">${description}</div>
    </div>
    <div class="accordion-wrapper">
      <button class="accordion">Who is this program for?</button>
      <div class="panel">${requirements}</div>
    </div>
    <div class="accordion-wrapper">
      <button class="accordion">How to apply?</button>
      <div class="panel">${howToApply}</div>
    </div>
    <a href="${applyHref}">Apply now</a>
  </section>`;
}

const FULL_HTML = `<html><body>
  ${programSection({})}
  ${programSection({ title: 'Software Engineering Internship', location: 'Timișoara' })}
</body></html>`;

describe('scraper/student-programs.js', () => {
  let sp;

  beforeAll(async () => {
    sp = await import('../../scraper/student-programs.js');
  });

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('parseStudentPrograms', () => {
    it('extracts the correct number of programs from HTML', () => {
      const programs = sp.parseStudentPrograms(FULL_HTML);
      expect(programs).toHaveLength(2);
    });

    it('extracts full program fields', () => {
      const programs = sp.parseStudentPrograms(FULL_HTML);
      const first = programs[0];

      expect(first.title).toBe('Future Leaders Program');
      expect(first.technologies).toBe('Java, Spring Boot');
      expect(first.period).toBe('July - September');
      expect(first.location).toEqual(['Bucharest', 'Cluj-Napoca', 'Iași']);
      expect(first.description).toBe('Hands-on experience on real projects.');
      expect(first.requirements).toBe('IT students in their final year');
      expect(first.howToApply).toBe('Send CV and motivation letter');
      expect(first.applyLink).toBe('mailto:apply@msg-systems.ro');
      expect(first.source).toBe('msg-systems.ro');
      expect(first.type).toBe('student-program');
    });

    it('returns empty array for empty HTML', () => {
      expect(sp.parseStudentPrograms('')).toEqual([]);
    });

    it('returns empty array for HTML without framed sections', () => {
      const html = '<html><body><div class="some-other">no programs</div></body></html>';
      expect(sp.parseStudentPrograms(html)).toEqual([]);
    });

    it('skips sections with no title and Career Fairs / video sections', () => {
      const html = `<html><body>
        ${programSection({ title: 'Career Fairs' })}
        ${programSection({ title: 'Watch the video below to learn more' })}
        <section class="framedSection bgWhite"><p>No h4 here</p></section>
      </body></html>`;
      expect(sp.parseStudentPrograms(html)).toEqual([]);
    });
  });

  describe('URL generation', () => {
    it('builds slug-based #fragment URLs', () => {
      const programs = sp.parseStudentPrograms(FULL_HTML);
      expect(programs[0].url).toBe(`${STUDENT_PROGRAMS_URL}#future-leaders-program`);
      expect(programs[1].url).toBe(`${STUDENT_PROGRAMS_URL}#software-engineering-internship`);
    });

    it('strips special characters and collapses spaces/dashes in slugs', () => {
      const html = `<html><body>${programSection({ title: 'C# / C++ & DevOps Program' })}</body></html>`;
      const programs = sp.parseStudentPrograms(html);
      expect(programs[0].url).toBe(`${STUDENT_PROGRAMS_URL}#c-c-devops-program`);
    });

    it('produces unique URLs for distinct program titles', () => {
      const programs = sp.parseStudentPrograms(FULL_HTML);
      const urls = programs.map(p => p.url);
      expect(new Set(urls).size).toBe(urls.length);
    });
  });

  describe('Location parsing', () => {
    it('splits multiple emoji-separated cities into an array', () => {
      const html = `<html><body>${programSection({ location: 'Bucharest, Cluj-Napoca, Iași, Timișoara' })}</body></html>`;
      const programs = sp.parseStudentPrograms(html);
      expect(programs[0].location).toEqual(['Bucharest', 'Cluj-Napoca', 'Iași', 'Timișoara']);
    });

    it('handles a single city', () => {
      const html = `<html><body>${programSection({ location: 'Bucharest' })}</body></html>`;
      const programs = sp.parseStudentPrograms(html);
      expect(programs[0].location).toEqual(['Bucharest']);
    });

    it('handles whitespace around commas', () => {
      const html = `<html><body>${programSection({ location: ' Bucharest ,  Cluj-Napoca ' })}</body></html>`;
      const programs = sp.parseStudentPrograms(html);
      expect(programs[0].location).toEqual(['Bucharest', 'Cluj-Napoca']);
    });

    it('returns empty location when no emoji separator present', () => {
      const html = `<html><body>${programSection({ period: 'July - September', location: '' })}</body></html>`;
      const programs = sp.parseStudentPrograms(html);
      expect(programs[0].period).toBe('July - September');
      expect(programs[0].location).toEqual([]);
    });
  });

  describe('Missing fields and malformed HTML', () => {
    it('handles sections with no accordions', () => {
      const html = `<html><body><section class="framedSection bgWhite"><h4>Program</h4></section></body></html>`;
      const programs = sp.parseStudentPrograms(html);
      expect(programs).toHaveLength(1);
      expect(programs[0].technologies).toBe('');
      expect(programs[0].period).toBe('');
      expect(programs[0].location).toEqual([]);
      expect(programs[0].applyLink).toBe('');
    });

    it('uses alternate technologies label', () => {
      const html = `<html><body>
        <section class="framedSection bgWhite">
          <h4>Program</h4>
          <div class="accordion-wrapper">
            <button class="accordion">Technologies you'll work with</button>
            <div class="panel">React, TypeScript</div>
          </div>
        </section>
      </body></html>`;
      const programs = sp.parseStudentPrograms(html);
      expect(programs[0].technologies).toBe('React, TypeScript');
    });

    it('handles accordions with empty label or content', () => {
      const html = `<html><body>
        <section class="framedSection bgWhite">
          <h4>Program</h4>
          <div class="accordion-wrapper">
            <button class="accordion"></button>
            <div class="panel">ignored</div>
          </div>
          <div class="accordion-wrapper">
            <button class="accordion">Empty panel</button>
            <div class="panel"></div>
          </div>
        </section>
      </body></html>`;
      const programs = sp.parseStudentPrograms(html);
      expect(programs).toHaveLength(1);
      expect(programs[0].technologies).toBe('');
    });
  });

  describe('getStudentPrograms', () => {
    it('fetches the student programs page and returns mapped programs', async () => {
      mockFetch.mockResolvedValue(htmlResponse(FULL_HTML));

      const programs = await sp.getStudentPrograms();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(STUDENT_PROGRAMS_URL, expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'job_seeker_ro_spider'
        })
      }));
      expect(programs).toHaveLength(2);
      expect(programs[0].type).toBe('student-program');
      expect(programs[1].location).toEqual(['Timișoara']);
    });

    it('throws when the page returns a non-OK status', async () => {
      mockFetch.mockResolvedValue(errorResponse(404));

      await expect(sp.getStudentPrograms()).rejects.toThrow('Student programs page error: 404');
    });

    it('throws when fetch itself fails', async () => {
      mockFetch.mockRejectedValue(new Error('network down'));

      await expect(sp.getStudentPrograms()).rejects.toThrow('network down');
    });
  });
});
