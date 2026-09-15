import { Request, Response } from 'express';

import { Candidate, Job } from '../models';
import { candidateRepository, jobRepository } from '../repositories';
import { DEFAULT_WEIGHTS, scoreJobForCandidate, ScoreResult, Weights } from '../services/scoringService';

type ScoreShape = Omit<ScoreResult, never>;

interface JobWithScore {
  job: Job;
  score: ScoreShape;
}

interface CandidateWithScore {
  candidate: Candidate;
  score: ScoreShape;
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

const WEIGHT_PARAM_MAP: Record<string, keyof Weights> = {
  skillsWeight: 'skills',
  experienceWeight: 'experience',
  locationWeight: 'location',
  salaryWeight: 'salary',
};

function parseWeights(query: Record<string, unknown>): Weights {
  const weights: Weights = { ...DEFAULT_WEIGHTS };

  for (const [paramName, weightKey] of Object.entries(WEIGHT_PARAM_MAP)) {
    const raw = query[paramName];
    if (raw !== undefined && raw !== null && raw !== '') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) {
        weights[weightKey] = parsed;
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

export function getJobRecommendations(request: Request, response: Response): void {
  const id = request.params.id as string;
  const job = jobRepository.getById(id);

  if (!job) {
    response.status(404).json({ error: 'Job not found' });
    return;
  }

  const limit = parseLimit(request.query.limit);
  const weights = parseWeights(request.query as Record<string, unknown>);

  const allCandidates = candidateRepository.getAll();

  const scored: CandidateWithScore[] = [];

  for (const candidate of allCandidates) {
    const scoreResult = scoreJobForCandidate(candidate, job, weights);

    if (!scoreResult.eligible) {
      continue;
    }

    scored.push({
      candidate,
      score: scoreResult,
    });
  }

  scored.sort((a, b) => b.score.totalScore - a.score.totalScore);

  const limited = scored.slice(0, limit);

  response.json(limited);
}
