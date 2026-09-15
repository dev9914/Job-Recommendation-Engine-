import { Router } from 'express';

import { createCandidate, getCandidateById } from '../controllers/candidate-controller';
import { getCandidateRecommendations } from '../controllers/recommendation-controller';

const candidateRouter = Router();

candidateRouter.post('/', createCandidate);
candidateRouter.get('/:id', getCandidateById);
candidateRouter.get('/:id/recommendations', getCandidateRecommendations);

export { candidateRouter };
