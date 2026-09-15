import { randomUUID } from 'crypto';

import { Job } from '../models';

type JobInput = Job | Omit<Job, 'id'>;

export class JobRepository {
  private readonly jobs = new Map<string, Job>();

  create(job: JobInput): Job {
    const id = 'id' in job && job.id ? job.id : randomUUID();
    const createdJob: Job = {
      ...job,
      id,
    };

    this.jobs.set(createdJob.id, createdJob);
    return createdJob;
  }

  getById(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  getAll(): Job[] {
    return Array.from(this.jobs.values());
  }
}

export const jobRepository = new JobRepository();
