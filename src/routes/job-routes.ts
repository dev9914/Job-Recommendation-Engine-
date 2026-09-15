import { Router } from 'express';

import { createJob, getJobById } from '../controllers/job-controller';

const jobRouter = Router();

jobRouter.post('/', createJob);
jobRouter.get('/:id', getJobById);

export { jobRouter };
