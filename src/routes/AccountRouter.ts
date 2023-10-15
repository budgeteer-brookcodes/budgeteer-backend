import express from 'express';
// import { rateLimit } from 'express-rate-limit';
import db from '../db.js';
import bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import AuthManager from '../AuthManager.js';
import cookieParser from 'cookie-parser';
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   limit: 20
// });

const AccountRouter = express.Router();

// AccountRouter.use(limiter);

AccountRouter.use(express.json());
AccountRouter.use(cookieParser());

AccountRouter.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      error: 'Missing parameters'
    });
  }

  if (
    (await db.user.findFirst({
      where: {
        username
      }
    })) !== null
  ) {
    return res.status(409).json({
      error: 'The username is already in use'
    });
  }

  if (!/^[A-Za-z0-9]{3,20}$/.test(username)) {
    return res.status(400).json({
      error: 'Username must be alphanumeric and between 3-20 chars'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: 'Password must be at least 8 chars'
    });
  }

  // Bcrypt limitations
  if (Buffer.byteLength(password, 'utf-8') > 72) {
    return res.status(400).json({
      error: 'Your password is too long!'
    });
  }

  let user: User;
  try {
    user = await db.user.create({
      data: {
        username,
        password_hash: await bcrypt.hash(password, 11)
      }
    });
  } catch (err) {
    console.log('Failed to create user:', err);
    return res.status(500).json({
      error: 'Unknown error while creating user'
    });
  }

  const token = await AuthManager.createToken(user.id);

  res.cookie('token', token.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(Date.now() + AuthManager.tokenExpiry),
    domain:
      process.env.NODE_ENV === 'production' ? 'budgeteer.cf' : '127.0.0.1',
    sameSite: 'lax'
  });

  console.log(`User with ID ${user.id} created!`);

  return res.json({
    message: 'Your account has been created'
  });
});

AccountRouter.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      error: 'Missing parameters'
    });
  }

  const user = await db.user.findFirst({
    where: {
      username
    }
  });

  if (user === null) {
    return res.status(404).json({
      error: 'The user does not exist'
    });
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    return res.status(401).json({
      error: 'Incorrect username or password'
    });
  }

  //TODO: extract this to a function
  const token = await AuthManager.createToken(user.id);

  res.cookie('token', token.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(Date.now() + AuthManager.tokenExpiry),
    domain:
      process.env.NODE_ENV === 'production' ? 'budgeteer.cf' : '127.0.0.1',
    sameSite: 'lax'
  });

  res.json({
    message: 'You are now logged in as ' + user.username
  });
});
// AccountRouter.use();

AccountRouter.get('/me', AuthManager.authMiddleware, async (req, res) => {
  const user: User = res.locals['user'];

  // console.log(user);

  res.json({
    username: user.username
  });
});

AccountRouter.post('/logout', AuthManager.authMiddleware, async (req, res) => {
  const token: string = res.locals['token'];

  console.log('LOGGED OUT');

  await db.accessToken.delete({
    where: {
      token
    }
  });

  return res.json({
    message: 'Succesfully logged out'
  });
});

AccountRouter.use((req, res) => {
  res.status(404).json({
    error: 'Not found'
  });
});

export default AccountRouter;
