import { Router } from 'express';

import { createJob, getJobById } from '../controllers/job-controller';
import { getJobRecommendations } from '../controllers/recommendation-controller';

const jobRouter = Router();

jobRouter.post('/', createJob);
jobRouter.get('/:id/recommendations', getJobRecommendations);
jobRouter.get('/:id', getJobById);

export { jobRouter };
