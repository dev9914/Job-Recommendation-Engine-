import { randomUUID } from 'crypto';

import { Candidate } from '../models';
import { pool } from '../db/pool';

type CandidateInput = Candidate | Omit<Candidate, 'id'>;

export class CandidateRepository {
  async create(candidate: CandidateInput): Promise<Candidate> {
    const id = 'id' in candidate && candidate.id ? candidate.id : randomUUID();
    const createdCandidate: Candidate = {
      ...candidate,
      id,
    };

    await pool.query(
      `INSERT INTO candidates (id, name, skills, years_of_experience, location, expected_salary)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [
        createdCandidate.id,
        createdCandidate.name,
        JSON.stringify(createdCandidate.skills),
        createdCandidate.yearsOfExperience,
        createdCandidate.location,
        createdCandidate.expectedSalary,
      ]
    );

    return createdCandidate;
  }

  async getById(id: string): Promise<Candidate | undefined> {
    const result = await pool.query(
      `SELECT id, name, skills, years_of_experience AS "yearsOfExperience",
              location, expected_salary AS "expectedSalary"
       FROM candidates WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return undefined;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      skills: Array.isArray(row.skills) ? row.skills : JSON.parse(row.skills),
      yearsOfExperience: Number(row.yearsOfExperience),
      location: row.location,
      expectedSalary: Number(row.expectedSalary),
    };
  }

  async getAll(): Promise<Candidate[]> {
    const result = await pool.query(
      `SELECT id, name, skills, years_of_experience AS "yearsOfExperience",
              location, expected_salary AS "expectedSalary"
       FROM candidates`
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      skills: Array.isArray(row.skills) ? row.skills : JSON.parse(row.skills),
      yearsOfExperience: Number(row.yearsOfExperience),
      location: row.location,
      expectedSalary: Number(row.expectedSalary),
    }));
  }

  async clear(): Promise<void> {
    await pool.query('DELETE FROM candidates');
  }
}

export const candidateRepository = new CandidateRepository();
