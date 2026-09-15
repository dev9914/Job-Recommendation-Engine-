import 'dotenv/config';
import express from 'express';

import { candidateRouter } from './routes/candidate-routes';
import { jobRouter } from './routes/job-routes';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/candidates', candidateRouter);
app.use('/jobs', jobRouter);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
