import { Candidate, Job } from '../models';
import {
  DEFAULT_WEIGHTS,
  ScoreResult,
  scoreJobForCandidate,
} from '../services/scoringService';

describe('scoringService — scoreJobForCandidate', () => {
  const buildCandidate = (overrides: Partial<Candidate> = {}): Candidate => ({
    id: 'c-1',
    name: 'Alice',
    skills: ['TS'],
    yearsOfExperience: 5,
    location: 'NYC',
    expectedSalary: 80000,
    ...overrides,
  });

  const buildJob = (overrides: Partial<Job> = {}): Job => ({
    id: 'j-1',
    title: 'Engineer',
    requiredSkills: [{ name: 'TS', mustHave: true }],
    minYearsExperience: 0,
    location: 'NYC',
    salaryRange: { min: 80000, max: 120000 },
    remoteAllowed: false,
    ...overrides,
  });

  describe('Rule 1 — Must-have filter (early return)', () => {
    it('returns eligible false, totalScore 0, all-zero breakdown when a must-have skill is missing', () => {
      const candidate = buildCandidate({ skills: ['TS'] });
      const job = buildJob({
        requiredSkills: [
          { name: 'TS', mustHave: true },
          { name: 'Node', mustHave: true },
        ],
      });

      const result = scoreJobForCandidate(candidate, job);

      const expected: ScoreResult = {
        totalScore: 0,
        breakdown: { skills: 0, experience: 0, location: 0, salary: 0 },
        eligible: false,
      };
      expect(result).toEqual(expected);
    });
  });

  describe('Rule 2 — Skills scoring', () => {
    it('awards full skills score when all must-haves present and job has zero nice-to-haves', () => {
      const candidate = buildCandidate({ skills: ['TS'] });
      const job = buildJob({
        requiredSkills: [{ name: 'TS', mustHave: true }],
      });

      const result = scoreJobForCandidate(candidate, job, DEFAULT_WEIGHTS);

      expect(result.eligible).toBe(true);
      expect(result.breakdown.skills).toBe(50);
      expect(result.totalScore).toBe(100);
    });

    it('awards correct partial bonus when half of nice-to-haves are matched', () => {
      const candidate = buildCandidate({ skills: ['A', 'B', 'C'] });
      const job = buildJob({
        requiredSkills: [
          { name: 'A', mustHave: true },
          { name: 'B', mustHave: true },
          { name: 'C', mustHave: false },
          { name: 'D', mustHave: false },
        ],
      });

      const result = scoreJobForCandidate(candidate, job, DEFAULT_WEIGHTS);

      // base = 50*0.6 = 30; bonus = 50*0.4 * (1/2) = 10; skills = 40
      expect(result.breakdown.skills).toBe(40);
      // other dims full: experience(20) + location(15) + salary(15) = 50
      expect(result.totalScore).toBe(90);
    });
  });

  describe('Rule 3 — Experience scoring', () => {
    it('awards full experience score when years exactly match the minimum', () => {
      const candidate = buildCandidate({ yearsOfExperience: 5 });
      const job = buildJob({ minYearsExperience: 5 });

      const result = scoreJobForCandidate(candidate, job, DEFAULT_WEIGHTS);

      expect(result.breakdown.experience).toBe(20);
      expect(result.totalScore).toBe(100);
    });

    it('awards proportional (non-zero) experience score when years are below minimum', () => {
      const candidate = buildCandidate({ yearsOfExperience: 5 });
      const job = buildJob({ minYearsExperience: 10 });

      const result = scoreJobForCandidate(candidate, job, DEFAULT_WEIGHTS);

      // 20 * 5/10 = 10 (capped below full)
      expect(result.breakdown.experience).toBe(10);
      expect(result.breakdown.experience).toBeGreaterThan(0);
      // skills(50) + location(15) + salary(15) = 80; +10 = 90
      expect(result.totalScore).toBe(90);
    });

    it('awards full experience score and never divides by zero when minYearsExperience is 0', () => {
      const candidate = buildCandidate({ yearsOfExperience: 7 });
      const job = buildJob({ minYearsExperience: 0 });

      const act = () => scoreJobForCandidate(candidate, job, DEFAULT_WEIGHTS);
      const result = act();

      expect(result.breakdown.experience).toBe(20);
      expect(result.totalScore).toBe(100);
    });
  });

  describe('Rule 4 — Location scoring', () => {
    it('produces three distinct location scores in the correct order: exact > remote > mismatch', () => {
      const baseJob = buildJob({
        requiredSkills: [{ name: 'TS', mustHave: true }],
        minYearsExperience: 0,
        salaryRange: { min: 80000, max: 120000 },
      });
      const candidate = buildCandidate({
        skills: ['TS'],
        location: 'NYC',
        yearsOfExperience: 5,
        expectedSalary: 80000,
      });

      const exact = scoreJobForCandidate(
        candidate,
        { ...baseJob, location: 'NYC', remoteAllowed: false },
        DEFAULT_WEIGHTS
      );
      const remote = scoreJobForCandidate(
        { ...candidate, location: 'SF' },
        { ...baseJob, location: 'NYC', remoteAllowed: true },
        DEFAULT_WEIGHTS
      );
      const mismatch = scoreJobForCandidate(
        { ...candidate, location: 'SF' },
        { ...baseJob, location: 'NYC', remoteAllowed: false },
        DEFAULT_WEIGHTS
      );

      // exact: 15, remote: 10, mismatch: 0
      expect(exact.breakdown.location).toBe(15);
      expect(remote.breakdown.location).toBe(10);
      expect(mismatch.breakdown.location).toBe(0);

      // other dims sum to 85
      expect(exact.totalScore).toBe(100);
      expect(remote.totalScore).toBe(95);
      expect(mismatch.totalScore).toBe(85);

      // strict ordering
      expect(exact.totalScore).toBeGreaterThan(remote.totalScore);
      expect(remote.totalScore).toBeGreaterThan(mismatch.totalScore);
    });
  });

  describe('Rule 5 — Salary scoring', () => {
    it('awards salary score of 0 when expectedSalary exceeds job.salaryRange.max', () => {
      const candidate = buildCandidate({ expectedSalary: 150000 });
      const job = buildJob({
        salaryRange: { min: 80000, max: 120000 },
      });

      const result = scoreJobForCandidate(candidate, job, DEFAULT_WEIGHTS);

      expect(result.breakdown.salary).toBe(0);
      // skills(50) + experience(20) + location(15) = 85
      expect(result.totalScore).toBe(85);
    });

    it('awards full salary score when expectedSalary is exactly at job.min or below', () => {
      const job = buildJob({ salaryRange: { min: 80000, max: 120000 } });

      const atMin = scoreJobForCandidate(
        buildCandidate({ expectedSalary: 80000 }),
        job,
        DEFAULT_WEIGHTS
      );
      const belowMin = scoreJobForCandidate(
        buildCandidate({ expectedSalary: 50000 }),
        job,
        DEFAULT_WEIGHTS
      );

      expect(atMin.breakdown.salary).toBe(15);
      expect(belowMin.breakdown.salary).toBe(15);
      expect(atMin.totalScore).toBe(100);
      expect(belowMin.totalScore).toBe(100);
    });

    it('awards strictly between 0 and full for salaries inside range, with scores closer to the weight max (full) being numerically higher', () => {
      const job = buildJob({ salaryRange: { min: 50000, max: 100000 } });

      // expectedSalary 60000 (low ask, matches well): score = 15 * 40000/50000 = 12
      const lowAsk = scoreJobForCandidate(
        buildCandidate({ expectedSalary: 60000 }),
        job,
        DEFAULT_WEIGHTS
      );
      // expectedSalary 90000 (high ask, tight fit): score = 15 * 10000/50000 = 3
      const highAsk = scoreJobForCandidate(
        buildCandidate({ expectedSalary: 90000 }),
        job,
        DEFAULT_WEIGHTS
      );

      expect(lowAsk.breakdown.salary).toBe(12);
      expect(highAsk.breakdown.salary).toBe(3);

      // both strictly inside (0, 15)
      expect(lowAsk.breakdown.salary).toBeGreaterThan(0);
      expect(lowAsk.breakdown.salary).toBeLessThan(15);
      expect(highAsk.breakdown.salary).toBeGreaterThan(0);
      expect(highAsk.breakdown.salary).toBeLessThan(15);

      // score closer to weight max (15) is numerically higher
      expect(lowAsk.breakdown.salary).toBeGreaterThan(highAsk.breakdown.salary);

      // totals: 50+20+15+12=97 ; 50+20+15+3=88
      expect(lowAsk.totalScore).toBe(97);
      expect(highAsk.totalScore).toBe(88);
    });
  });
});
