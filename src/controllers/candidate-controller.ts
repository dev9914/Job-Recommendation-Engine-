import { Request, Response } from 'express';

import { Candidate } from '../models';
import { candidateRepository } from '../repositories';

interface ValidationError {
  field: string;
  message: string;
}

function validateCandidateInput(body: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!body || typeof body !== 'object') {
    return [{ field: 'body', message: 'Request body must be a JSON object' }];
  }

  const input = body as Record<string, unknown>;

  if (typeof input.name !== 'string' || input.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'name is required and must be a non-empty string' });
  }

  if (!Array.isArray(input.skills)) {
    errors.push({ field: 'skills', message: 'skills is required and must be an array of strings' });
  } else if (input.skills.some((s) => typeof s !== 'string')) {
    errors.push({ field: 'skills', message: 'skills must be an array of strings' });
  }

  if (typeof input.yearsOfExperience !== 'number' || Number.isNaN(input.yearsOfExperience)) {
    errors.push({
      field: 'yearsOfExperience',
      message: 'yearsOfExperience is required and must be a number',
    });
  } else if (input.yearsOfExperience < 0) {
    errors.push({
      field: 'yearsOfExperience',
      message: 'yearsOfExperience must be a non-negative number',
    });
  }

  if (typeof input.location !== 'string' || input.location.trim().length === 0) {
    errors.push({ field: 'location', message: 'location is required and must be a non-empty string' });
  }

  if (typeof input.expectedSalary !== 'number' || Number.isNaN(input.expectedSalary)) {
    errors.push({
      field: 'expectedSalary',
      message: 'expectedSalary is required and must be a number',
    });
  } else if (input.expectedSalary < 0) {
    errors.push({
      field: 'expectedSalary',
      message: 'expectedSalary must be a non-negative number',
    });
  }

  return errors;
}

export function createCandidate(request: Request, response: Response): void {
  const errors = validateCandidateInput(request.body);

  if (errors.length > 0) {
    response.status(400).json({ errors });
    return;
  }

  const body = request.body as Omit<Candidate, 'id'>;

  const candidate = candidateRepository.create({
    name: body.name.trim(),
    skills: body.skills,
    yearsOfExperience: body.yearsOfExperience,
    location: body.location.trim(),
    expectedSalary: body.expectedSalary,
  });

  response.status(201).json(candidate);
}

export function getCandidateById(request: Request, response: Response): void {
  const id = request.params.id as string;
  const candidate = candidateRepository.getById(id);

  if (!candidate) {
    response.status(404).json({ error: 'Candidate not found' });
    return;
  }

  response.json(candidate);
}
