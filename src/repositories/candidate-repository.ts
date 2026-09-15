import { randomUUID } from 'crypto';

import { Candidate } from '../models';

type CandidateInput = Candidate | Omit<Candidate, 'id'>;

export class CandidateRepository {
  private readonly candidates = new Map<string, Candidate>();

  create(candidate: CandidateInput): Candidate {
    const id = 'id' in candidate && candidate.id ? candidate.id : randomUUID();
    const createdCandidate: Candidate = {
      ...candidate,
      id,
    };

    this.candidates.set(createdCandidate.id, createdCandidate);
    return createdCandidate;
  }

  getById(id: string): Candidate | undefined {
    return this.candidates.get(id);
  }

  getAll(): Candidate[] {
    return Array.from(this.candidates.values());
  }

  clear(): void {
    this.candidates.clear();
  }
}

export const candidateRepository = new CandidateRepository();
