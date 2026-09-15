import { NextFunction, Request, Response } from 'express';

import { Job } from '../models';
import { jobRepository } from '../repositories';

interface ValidationError {
  field: string;
  message: string;
}

function isRequiredSkill(value: unknown): value is { name: string; mustHave: boolean } {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.name === 'string' && typeof obj.mustHave === 'boolean';
}

function validateJobInput(body: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!body || typeof body !== 'object') {
    return [{ field: 'body', message: 'Request body must be a JSON object' }];
  }

  const input = body as Record<string, unknown>;

  if (typeof input.title !== 'string' || input.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'title is required and must be a non-empty string' });
  }

  if (!Array.isArray(input.requiredSkills)) {
    errors.push({
      field: 'requiredSkills',
      message:
        'requiredSkills is required and must be an array of { name: string, mustHave: boolean }',
    });
  } else if (input.requiredSkills.some((s) => !isRequiredSkill(s))) {
    errors.push({
      field: 'requiredSkills',
      message: 'each item in requiredSkills must have name (string) and mustHave (boolean)',
    });
  }

  if (typeof input.minYearsExperience !== 'number' || Number.isNaN(input.minYearsExperience)) {
    errors.push({
      field: 'minYearsExperience',
      message: 'minYearsExperience is required and must be a number',
    });
  } else if (input.minYearsExperience < 0) {
    errors.push({
      field: 'minYearsExperience',
      message: 'minYearsExperience must be a non-negative number',
    });
  }

  if (typeof input.location !== 'string' || input.location.trim().length === 0) {
    errors.push({ field: 'location', message: 'location is required and must be a non-empty string' });
  }

  if (!input.salaryRange || typeof input.salaryRange !== 'object') {
    errors.push({
      field: 'salaryRange',
      message: 'salaryRange is required and must be an object with min and max',
    });
  } else {
    const range = input.salaryRange as Record<string, unknown>;
    if (typeof range.min !== 'number' || Number.isNaN(range.min)) {
      errors.push({ field: 'salaryRange.min', message: 'salaryRange.min must be a number' });
    } else if (range.min < 0) {
      errors.push({ field: 'salaryRange.min', message: 'salaryRange.min must be non-negative' });
    }
    if (typeof range.max !== 'number' || Number.isNaN(range.max)) {
      errors.push({ field: 'salaryRange.max', message: 'salaryRange.max must be a number' });
    } else if (range.max < 0) {
      errors.push({ field: 'salaryRange.max', message: 'salaryRange.max must be non-negative' });
    }
    if (
      typeof range.min === 'number' &&
      typeof range.max === 'number' &&
      !Number.isNaN(range.min) &&
      !Number.isNaN(range.max) &&
      range.min > range.max
    ) {
      errors.push({
        field: 'salaryRange',
        message: 'salaryRange.min must be less than or equal to salaryRange.max',
      });
    }
  }

  if (typeof input.remoteAllowed !== 'boolean') {
    errors.push({ field: 'remoteAllowed', message: 'remoteAllowed is required and must be a boolean' });
  }

  return errors;
}

export async function createJob(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validateJobInput(request.body);

    if (errors.length > 0) {
      response.status(400).json({ errors });
      return;
    }

    const body = request.body as Omit<Job, 'id'>;

    const job = await jobRepository.create({
      title: body.title.trim(),
      requiredSkills: body.requiredSkills,
      minYearsExperience: body.minYearsExperience,
      location: body.location.trim(),
      salaryRange: {
        min: body.salaryRange.min,
        max: body.salaryRange.max,
      },
      remoteAllowed: body.remoteAllowed,
    });

    response.status(201).json(job);
  } catch (err) {
    next(err);
  }
}

export async function getJobById(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = request.params.id as string;
    const job = await jobRepository.getById(id);

    if (!job) {
      response.status(404).json({ error: 'Job not found' });
      return;
    }

    response.json(job);
  } catch (err) {
    next(err);
  }
}
