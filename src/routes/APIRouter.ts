import express from 'express';
import AccountRouter from './AccountRouter.js';
import chatRouter from './ChatRouter.js';

const APIRouter = express.Router();

APIRouter.use('/account', AccountRouter);
APIRouter.use('/chat', chatRouter);

export default APIRouter;
