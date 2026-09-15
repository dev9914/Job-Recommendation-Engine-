import 'dotenv/config';
import express from 'express';

import { candidateRouter } from './routes/candidate-routes';
import { jobRouter } from './routes/job-routes';

const app = express();

app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/candidates', candidateRouter);
app.use('/jobs', jobRouter);

export { app };
