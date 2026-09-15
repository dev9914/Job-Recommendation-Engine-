import request from 'supertest';

import { app } from '../app';
import { Candidate, Job } from '../models';
import { candidateRepository, jobRepository } from '../repositories';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is required to run API integration tests. ' +
      'Make sure PostgreSQL is running via `docker compose up` first, ' +
      'then run: npm run test:api'
  );
}

describe('API Integration Tests', () => {
  beforeEach(async () => {
    await candidateRepository.clear();
    await jobRepository.clear();
  });

  describe('POST /candidates', () => {
    const validCandidate = {
      name: 'Alice',
      skills: ['TypeScript', 'Node'],
      yearsOfExperience: 5,
      location: 'NYC',
      expectedSalary: 90000,
    };

    it('returns 201 and creates a candidate on valid input', async () => {
      const response = await request(app)
        .post('/candidates')
        .send(validCandidate);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: 'Alice',
        skills: ['TypeScript', 'Node'],
        yearsOfExperience: 5,
        location: 'NYC',
        expectedSalary: 90000,
      });
      expect(typeof response.body.id).toBe('string');
    });

    it('returns 400 when yearsOfExperience is missing', async () => {
      const { yearsOfExperience: _ignored, ...withoutYears } = validCandidate;
      void _ignored;

      const response = await request(app)
        .post('/candidates')
        .send(withoutYears);

      expect(response.status).toBe(400);
      expect(Array.isArray(response.body.errors)).toBe(true);
      const fieldErrors = response.body.errors.map((e: { field: string }) => e.field);
      expect(fieldErrors).toContain('yearsOfExperience');
    });
  });

  describe('POST /jobs', () => {
    const validJob = {
      title: 'Senior Engineer',
      requiredSkills: [
        { name: 'TypeScript', mustHave: true },
        { name: 'Node', mustHave: false },
      ],
      minYearsExperience: 3,
      location: 'NYC',
      salaryRange: { min: 80000, max: 140000 },
      remoteAllowed: false,
    };

    it('returns 201 and creates a job on valid input', async () => {
      const response = await request(app).post('/jobs').send(validJob);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: 'Senior Engineer',
        requiredSkills: [
          { name: 'TypeScript', mustHave: true },
          { name: 'Node', mustHave: false },
        ],
        minYearsExperience: 3,
        location: 'NYC',
        salaryRange: { min: 80000, max: 140000 },
        remoteAllowed: false,
      });
      expect(typeof response.body.id).toBe('string');
    });

    it('returns 400 when salaryRange.min > salaryRange.max', async () => {
      const invalidJob = {
        ...validJob,
        salaryRange: { min: 150000, max: 100000 },
      };

      const response = await request(app).post('/jobs').send(invalidJob);

      expect(response.status).toBe(400);
      expect(Array.isArray(response.body.errors)).toBe(true);
      const fieldErrors = response.body.errors.map((e: { field: string }) => e.field);
      expect(fieldErrors).toContain('salaryRange');
    });
  });

  describe('GET /candidates/:id', () => {
    it('returns 200 with the candidate for an existing id', async () => {
      const created = await candidateRepository.create({
        name: 'Bob',
        skills: ['Python'],
        yearsOfExperience: 3,
        location: 'SF',
        expectedSalary: 100000,
      } as Omit<Candidate, 'id'>);

      const response = await request(app).get(`/candidates/${created.id}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(created.id);
      expect(response.body.name).toBe('Bob');
    });

    it('returns 404 for a non-existent candidate id', async () => {
      const response = await request(app).get('/candidates/00000000-0000-0000-0000-000000000001');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Candidate not found');
    });
  });

  describe('GET /jobs/:id', () => {
    it('returns 200 with the job for an existing id', async () => {
      const created = await jobRepository.create({
        title: 'Data Scientist',
        requiredSkills: [{ name: 'Python', mustHave: true }],
        minYearsExperience: 2,
        location: 'SF',
        salaryRange: { min: 90000, max: 150000 },
        remoteAllowed: true,
      } as Omit<Job, 'id'>);

      const response = await request(app).get(`/jobs/${created.id}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(created.id);
      expect(response.body.title).toBe('Data Scientist');
    });

    it('returns 404 for a non-existent job id', async () => {
      const response = await request(app).get('/jobs/00000000-0000-0000-0000-000000000002');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Job not found');
    });
  });

  describe('GET /candidates/:id/recommendations', () => {
    const baseCandidate: Omit<Candidate, 'id'> = {
      name: 'Alice',
      skills: ['TypeScript', 'Node', 'React'],
      yearsOfExperience: 5,
      location: 'NYC',
      expectedSalary: 100000,
    };

    it('returns jobs sorted descending by totalScore', async () => {
      const candidate = await candidateRepository.create({ ...baseCandidate });

      const perfectJob = await jobRepository.create({
        title: 'Perfect Match',
        requiredSkills: [{ name: 'TypeScript', mustHave: true }],
        minYearsExperience: 5,
        location: 'NYC',
        salaryRange: { min: 80000, max: 120000 },
        remoteAllowed: false,
      } as Omit<Job, 'id'>);

      const decentJob = await jobRepository.create({
        title: 'Decent Match',
        requiredSkills: [{ name: 'TypeScript', mustHave: true }],
        minYearsExperience: 5,
        location: 'SF',
        salaryRange: { min: 80000, max: 120000 },
        remoteAllowed: false,
      } as Omit<Job, 'id'>);

      const response = await request(app).get(`/candidates/${candidate.id}/recommendations`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);

      const scores = response.body.map((r: { score: { totalScore: number } }) => r.score.totalScore);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
      }

      expect(response.body[0].job.id).toBe(perfectJob.id);
      expect(response.body[1].job.id).toBe(decentJob.id);
    });

    it('respects the ?limit= query parameter', async () => {
      const candidate = await candidateRepository.create({ ...baseCandidate });

      for (let i = 0; i < 5; i++) {
        await jobRepository.create({
          title: `Job ${i}`,
          requiredSkills: [{ name: 'TypeScript', mustHave: true }],
          minYearsExperience: 0,
          location: 'NYC',
          salaryRange: { min: 80000, max: 120000 },
          remoteAllowed: false,
        } as Omit<Job, 'id'>);
      }

      const response = await request(app)
        .get(`/candidates/${candidate.id}/recommendations`)
        .query({ limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });

    it('excludes ineligible jobs (missing must-have skill -> score 0 not returned)', async () => {
      const candidate = await candidateRepository.create({
        ...baseCandidate,
        skills: ['TypeScript'],
      });

      const eligibleJob = await jobRepository.create({
        title: 'Eligible',
        requiredSkills: [{ name: 'TypeScript', mustHave: true }],
        minYearsExperience: 0,
        location: 'NYC',
        salaryRange: { min: 80000, max: 120000 },
        remoteAllowed: false,
      } as Omit<Job, 'id'>);

      await jobRepository.create({
        title: 'Ineligible — Missing Must-Have',
        requiredSkills: [
          { name: 'TypeScript', mustHave: true },
          { name: 'Rust', mustHave: true },
        ],
        minYearsExperience: 0,
        location: 'NYC',
        salaryRange: { min: 80000, max: 120000 },
        remoteAllowed: false,
      } as Omit<Job, 'id'>);

      const response = await request(app).get(`/candidates/${candidate.id}/recommendations`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].job.id).toBe(eligibleJob.id);
      expect(response.body[0].score.eligible).toBe(true);
    });
  });

  describe('GET /jobs/:id/recommendations', () => {
    const baseJob: Omit<Job, 'id'> = {
      title: 'Senior Engineer',
      requiredSkills: [
        { name: 'TypeScript', mustHave: true },
        { name: 'Node', mustHave: false },
      ],
      minYearsExperience: 5,
      location: 'NYC',
      salaryRange: { min: 80000, max: 140000 },
      remoteAllowed: false,
    };

    it('returns candidates sorted descending by totalScore', async () => {
      const job = await jobRepository.create({ ...baseJob });

      const perfectCandidate = await candidateRepository.create({
        name: 'Perfect',
        skills: ['TypeScript', 'Node'],
        yearsOfExperience: 5,
        location: 'NYC',
        expectedSalary: 80000,
      } as Omit<Candidate, 'id'>);

      const weakerCandidate = await candidateRepository.create({
        name: 'Weaker',
        skills: ['TypeScript'],
        yearsOfExperience: 3,
        location: 'SF',
        expectedSalary: 130000,
      } as Omit<Candidate, 'id'>);

      const response = await request(app).get(`/jobs/${job.id}/recommendations`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);

      const scores = response.body.map((r: { score: { totalScore: number } }) => r.score.totalScore);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
      }

      expect(response.body[0].candidate.id).toBe(perfectCandidate.id);
      expect(response.body[1].candidate.id).toBe(weakerCandidate.id);
    });

    it('respects the ?limit= query parameter', async () => {
      const job = await jobRepository.create({ ...baseJob });

      for (let i = 0; i < 5; i++) {
        await candidateRepository.create({
          name: `Candidate ${i}`,
          skills: ['TypeScript'],
          yearsOfExperience: 5,
          location: 'NYC',
          expectedSalary: 90000,
        } as Omit<Candidate, 'id'>);
      }

      const response = await request(app)
        .get(`/jobs/${job.id}/recommendations`)
        .query({ limit: 3 });

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(3);
    });

    it('excludes ineligible candidates (missing must-have skill)', async () => {
      const job = await jobRepository.create({
        ...baseJob,
        requiredSkills: [
          { name: 'TypeScript', mustHave: true },
          { name: 'Rust', mustHave: true },
        ],
      });

      const eligibleCandidate = await candidateRepository.create({
        name: 'Eligible',
        skills: ['TypeScript', 'Rust'],
        yearsOfExperience: 5,
        location: 'NYC',
        expectedSalary: 90000,
      } as Omit<Candidate, 'id'>);

      await candidateRepository.create({
        name: 'Ineligible',
        skills: ['TypeScript'],
        yearsOfExperience: 5,
        location: 'NYC',
        expectedSalary: 90000,
      } as Omit<Candidate, 'id'>);

      const response = await request(app).get(`/jobs/${job.id}/recommendations`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].candidate.id).toBe(eligibleCandidate.id);
      expect(response.body[0].score.eligible).toBe(true);
    });
  });
});
