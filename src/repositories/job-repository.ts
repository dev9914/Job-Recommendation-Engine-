import { randomUUID } from 'crypto';

import { Job } from '../models';
import { pool } from '../db/pool';

type JobInput = Job | Omit<Job, 'id'>;

export class JobRepository {
  async create(job: JobInput): Promise<Job> {
    const id = 'id' in job && job.id ? job.id : randomUUID();
    const createdJob: Job = {
      ...job,
      id,
    };

    await pool.query(
      `INSERT INTO jobs (id, title, required_skills, min_years_experience, location, salary_range, remote_allowed)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [
        createdJob.id,
        createdJob.title,
        JSON.stringify(createdJob.requiredSkills),
        createdJob.minYearsExperience,
        createdJob.location,
        JSON.stringify(createdJob.salaryRange),
        createdJob.remoteAllowed,
      ]
    );

    return createdJob;
  }

  async getById(id: string): Promise<Job | undefined> {
    const result = await pool.query(
      `SELECT id, title, required_skills AS "requiredSkills",
              min_years_experience AS "minYearsExperience",
              location, salary_range AS "salaryRange",
              remote_allowed AS "remoteAllowed"
       FROM jobs WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return undefined;
    }

    const row = result.rows[0];
    const salaryRange =
      typeof row.salaryRange === 'string' ? JSON.parse(row.salaryRange) : row.salaryRange;
    const requiredSkills =
      typeof row.requiredSkills === 'string' ? JSON.parse(row.requiredSkills) : row.requiredSkills;

    return {
      id: row.id,
      title: row.title,
      requiredSkills: requiredSkills,
      minYearsExperience: Number(row.minYearsExperience),
      location: row.location,
      salaryRange: {
        min: Number(salaryRange.min),
        max: Number(salaryRange.max),
      },
      remoteAllowed: Boolean(row.remoteAllowed),
    };
  }

  async getAll(): Promise<Job[]> {
    const result = await pool.query(
      `SELECT id, title, required_skills AS "requiredSkills",
              min_years_experience AS "minYearsExperience",
              location, salary_range AS "salaryRange",
              remote_allowed AS "remoteAllowed"
       FROM jobs`
    );

    return result.rows.map((row) => {
      const salaryRange =
        typeof row.salaryRange === 'string' ? JSON.parse(row.salaryRange) : row.salaryRange;
      const requiredSkills =
        typeof row.requiredSkills === 'string' ? JSON.parse(row.requiredSkills) : row.requiredSkills;

      return {
        id: row.id,
        title: row.title,
        requiredSkills: requiredSkills,
        minYearsExperience: Number(row.minYearsExperience),
        location: row.location,
        salaryRange: {
          min: Number(salaryRange.min),
          max: Number(salaryRange.max),
        },
        remoteAllowed: Boolean(row.remoteAllowed),
      };
    });
  }

  async clear(): Promise<void> {
    await pool.query('DELETE FROM jobs');
  }
}

export const jobRepository = new JobRepository();
