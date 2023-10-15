import express from 'express';
import AuthManager from '../AuthManager.js';
import { User } from '@prisma/client';
import cookieParser from 'cookie-parser';
import ConversationManager from '../ConversationManager.js';
const chatRouter = express.Router();

chatRouter.use(cookieParser());
chatRouter.use(express.json());

chatRouter.post('/begin', AuthManager.authMiddleware, (req, res) => {
  const user: User = res.locals['user'];
  const convoId = ConversationManager.createConversation(user);

  res.json({
    response: `Hello, ${user.username}! To get started, please tell me your monthly income.`,
    conversationId: convoId
  });
});

chatRouter.post('/response', AuthManager.authMiddleware, async (req, res) => {
  const { conversationId, message } = req.body;
  if (typeof conversationId !== 'number' || !Number.isFinite(conversationId)) {
    return res.status(400).json({ error: 'Invalid conversation ID' });
  }

  if (typeof message !== 'string' || message.length === 0) {
    return res.status(400).json({ error: 'Invalid message' });
  }

  const convo = await ConversationManager.getConversation(conversationId);
  if (convo === null) {
    return res.status(400).json({ error: 'Invalid conversation' });
  }

  const convoRes = ConversationManager.handleMessage(message, convo);
  if (convoRes.moveOn) {
    const moveOnRes = ConversationManager.moveOn(convo);
    if (!moveOnRes) {
      return res.json({
        response: ConversationManager.finish(convo),
        finished: true
      });
    }

    return res.json({
      response: moveOnRes
    });
  } else {
    return res.json({
      response: convoRes.error
    });
  }
});

export default chatRouter;
