import { Request, Response } from 'express';

import { Job } from '../models';
import { candidateRepository, jobRepository } from '../repositories';
import { DEFAULT_WEIGHTS, scoreJobForCandidate, Weights } from '../services/scoringService';

interface JobWithScore {
  job: Job;
  score: {
    totalScore: number;
    breakdown: {
      skills: number;
      experience: number;
      location: number;
      salary: number;
    };
    eligible: boolean;
  };
}

function parseLimit(limitParam: unknown): number {
  if (limitParam === undefined || limitParam === null || limitParam === '') {
    return 10;
  }

  const parsed = Number(limitParam);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
    return 10;
  }

  return parsed;
}

function parseWeights(query: Record<string, unknown>): Weights {
  const weights: Weights = { ...DEFAULT_WEIGHTS };

  for (const key of Object.keys(weights) as (keyof Weights)[]) {
    const raw = query[key];
    if (raw !== undefined && raw !== null && raw !== '') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed >= 0) {
        weights[key] = parsed;
      }
    }
  }

  return weights;
}

export function getCandidateRecommendations(request: Request, response: Response): void {
  const id = request.params.id as string;
  const candidate = candidateRepository.getById(id);

  if (!candidate) {
    response.status(404).json({ error: 'Candidate not found' });
    return;
  }

  const limit = parseLimit(request.query.limit);
  const weights = parseWeights(request.query as Record<string, unknown>);

  const allJobs = jobRepository.getAll();

  const scored: JobWithScore[] = [];

  for (const job of allJobs) {
    const scoreResult = scoreJobForCandidate(candidate, job, weights);

    if (!scoreResult.eligible) {
      continue;
    }

    scored.push({
      job,
      score: scoreResult,
    });
  }

  scored.sort((a, b) => b.score.totalScore - a.score.totalScore);

  const limited = scored.slice(0, limit);

  response.json(limited);
}
