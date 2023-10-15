import express, { Request, Response, NextFunction } from 'express';
import 'express-async-errors';
import APIRouter from './routes/APIRouter.js';

const app = express();

process.env.NODE_ENV ??= 'development';
if (process.env.NODE_ENV !== 'production') {
  await import('dotenv/config');
}

const REQUIRED_ENV = ['PORT'];

if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_ENV = 'development';
}

for (const env of REQUIRED_ENV) {
  if (!(env in process.env)) {
    throw new Error('Missing required environment variable: ' + env);
  }
}

app.use((req, res, next) => {
  res.setHeader(
    'Access-Control-Allow-Origin',
    process.env.NODE_ENV === 'development'
      ? 'http://127.0.0.1:5173'
      : 'https://budgeteer.me/'
  );
  res.setHeader('Access-Control-Allow-Max-Age', '30');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');

  if (req.method === 'OPTIONS') {
    return res.status(200).send();
  }

  next();
});

app.use('/api', APIRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.log('Internal server error:', err.message, err.stack);
  res.status(500).json({
    error: 'Sorry, something went wrong.'
  });
});

app.listen(process.env.PORT, () => {
  console.log('Listening on port ' + process.env.PORT);
});
