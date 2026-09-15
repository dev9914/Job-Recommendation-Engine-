import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';

import { candidateRouter } from './routes/candidate-routes';
import { jobRouter } from './routes/job-routes';

const app = express();

app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/candidates', candidateRouter);
app.use('/jobs', jobRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Internal server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export { app };
