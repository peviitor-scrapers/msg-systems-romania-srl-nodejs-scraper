import { jest } from '@jest/globals';
import fs from 'fs';

const mockFetch = jest.fn();

jest.unstable_mockModule('node-fetch', () => ({
  default: mockFetch
}));

const COMPANY_JSON_PATH = 'scraper/anaf-cache.json';
const ROOT_COMPANY_JSON_PATH = 'scraper/config/company.json';

function backupFile(path) {
  if (fs.existsSync(path)) {
    fs.renameSync(path, `${path}.bak`);
  }
}

function restoreFile(path) {
  if (fs.existsSync(`${path}.bak`)) {
    fs.renameSync(`${path}.bak`, path);
  }
}

function clearAnafCache() {
  if (fs.existsSync(COMPANY_JSON_PATH)) fs.unlinkSync(COMPANY_JSON_PATH);
}

function anafCompanyResponse(data) {
  return {
    ok: true,
    json: async () => ({ data, success: true })
  };
}

function peviitorResponse(companies) {
  return {
    ok: true,
    json: async () => ({ companies })
  };
}

function solrResponse(total, data) {
  return {
    ok: true,
    json: async () => ({ success: true, total, count: data.length, data })
  };
}

const MSG_ANAF_RECORD = {
  cui: 24415960,
  name: 'MSG SYSTEMS ROMÂNIA SRL',
  address: 'STR. BARBU VACARESCU, 164, Bucureşti Sectorul 2, Bucureşti',
  caenCode: '6201',
  inactive: false,
  vatRegistered: true,
  eFacturaRegistered: false,
  headquartersAddress: { locality: 'Bucureşti Sectorul 2' }
};

const COMPANY_CONFIG_TEMPLATE = {
  id: "24415960",
  company: "MSG SYSTEMS ROMÂNIA SRL",
  brand: ".msg",
  status: "activ",
  location: ["Cluj-Napoca"],
  website: ["https://www.msg-systems.ro"],
  career: ["https://www.msg-systems.ro/en/careers/job-offerings/"],
  scraperFile: "https://github.com/peviitor-scrapers/msg-systems-romania-srl-nodejs-scraper/actions/workflows/job-seeker-ro-spider.yml"
};

function writeCompanyConfig(lastScraped) {
  fs.mkdirSync("scraper/config", { recursive: true });
  fs.writeFileSync(ROOT_COMPANY_JSON_PATH, JSON.stringify({
    ...COMPANY_CONFIG_TEMPLATE,
    lastScraped
  }), 'utf-8');
}

describe('company.js', () => {
  let company;
  let companyConfig;

  beforeAll(async () => {
    fs.mkdirSync("scraper", { recursive: true });
    backupFile(COMPANY_JSON_PATH);
    backupFile(ROOT_COMPANY_JSON_PATH);
    writeCompanyConfig(new Date().toISOString().split('T')[0]);
    company = await import('../../scraper/company.js');
    const configMod = await import('../../scraper/config/company.js');
    companyConfig = configMod.default;
  });

  afterAll(() => {
    restoreFile(COMPANY_JSON_PATH);
    restoreFile(ROOT_COMPANY_JSON_PATH);
  });

  beforeEach(() => {
    mockFetch.mockReset();
    clearAnafCache();
  });

  describe('getCompanyData (no cache)', () => {
    beforeEach(() => {
      companyConfig.lastScraped = '2020-01-01';
    });

    afterEach(() => {
      companyConfig.lastScraped = new Date().toISOString().split('T')[0];
    });

    it('should fetch MSG via direct CIF lookup and return company data', async () => {
      mockFetch.mockResolvedValueOnce(anafCompanyResponse(MSG_ANAF_RECORD));

      const result = await company.getCompanyData();

      expect(result).toHaveProperty('company', 'MSG SYSTEMS ROMÂNIA SRL');
      expect(result).toHaveProperty('cif', '24415960');
      expect(result).toHaveProperty('active', true);
      expect(result).toHaveProperty('anafData');
      expect(result.anafData.name).toBe('MSG SYSTEMS ROMÂNIA SRL');
    });

    it('should fall back to company config when ANAF returns no data', async () => {
      mockFetch.mockResolvedValueOnce(anafCompanyResponse(null));

      const result = await company.getCompanyData();

      expect(result).toEqual({
        company: 'MSG SYSTEMS ROMÂNIA SRL',
        cif: '24415960',
        active: true,
        anafData: null
      });
    });

    it('should fall back to company config when ANAF returns no company name', async () => {
      mockFetch.mockResolvedValueOnce(anafCompanyResponse({ cui: 24415960, name: null }));

      const result = await company.getCompanyData();

      expect(result).toEqual({
        company: 'MSG SYSTEMS ROMÂNIA SRL',
        cif: '24415960',
        active: true,
        anafData: null
      });
    });
  });

  describe('getCompanyData (with cache)', () => {
    const cachedData = {
      validatedAt: new Date().toISOString(),
      anaf: MSG_ANAF_RECORD,
      summary: {
        company: 'MSG SYSTEMS ROMÂNIA SRL',
        cif: '24415960',
        active: true
      }
    };

    beforeEach(() => {
      companyConfig.lastScraped = new Date().toISOString().split('T')[0];
      fs.writeFileSync(COMPANY_JSON_PATH, JSON.stringify(cachedData), 'utf-8');
    });

    it('should use cached company data when available', async () => {
      const result = await company.getCompanyData();

      expect(result.company).toBe('MSG SYSTEMS ROMÂNIA SRL');
      expect(result.cif).toBe('24415960');
      expect(result.active).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('validateAndGetCompany', () => {
    beforeEach(() => {
      companyConfig.lastScraped = new Date().toISOString().split('T')[0];
      writeCompanyConfig(companyConfig.lastScraped);
    });

    it('should return company data with status active', async () => {
      mockFetch
        .mockResolvedValueOnce(solrResponse(5, [
          { url: 'https://test.com/1', title: 'Job 1' },
          { url: 'https://test.com/2', title: 'Job 2' }
        ]))
        .mockResolvedValueOnce(peviitorResponse([{ company: 'MSG SYSTEMS ROMÂNIA SRL' }]));

      const result = await company.validateAndGetCompany();

      expect(result).toHaveProperty('status', 'active');
      expect(result).toHaveProperty('company', 'MSG SYSTEMS ROMÂNIA SRL');
      expect(result).toHaveProperty('cif', '24415960');
      expect(result).toHaveProperty('existingJobsCount');
      expect(typeof result.existingJobsCount).toBe('number');
    });
  });
});
