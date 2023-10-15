import { AccessToken } from '@prisma/client';
import db from './db.js';
import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

class AuthManager {
  // token lifetime in ms
  public static readonly tokenExpiry: number = 1 * 1000 * 60 * 60 * 24 * 7;
  public static async createToken(userId: number): Promise<AccessToken> {
    const bytes = crypto.randomBytes(128).toString('hex');
    const created = await db.accessToken.create({
      data: {
        token: bytes,
        userId,
        expires: new Date(Date.now() + AuthManager.tokenExpiry)
      }
    });

    return created;
  }
  public static async getUserIdFromToken(
    token: string
  ): Promise<number | null> {
    const tokenObj = await db.accessToken.findFirst({
      where: {
        token
      },
      include: {
        user: {
          select: {
            id: true
          }
        }
      }
    });

    if (tokenObj === null) {
      return null;
    }

    // expiry date in the past
    if (tokenObj.expires.getTime() < Date.now()) {
      await db.accessToken.delete({
        where: {
          token
        }
      });

      return null;
    }

    return tokenObj.user.id;
  }

  public static async revokeToken(token: string) {
    if (
      (await db.accessToken.findFirst({
        where: { token }
      })) == null
    ) {
      return false;
    }

    // TODO: maybe return false for expired token?

    await db.accessToken.delete({
      where: {
        token
      }
    });

    return true;
  }

  public static async authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { token } = req.cookies;

    if (typeof token !== 'string') {
      return res.status(401).json({
        error: 'You must be logged in to do that'
      });
    }

    const userId = await AuthManager.getUserIdFromToken(token);

    if (userId === null) {
      res.clearCookie('token');
      return res.status(401).json({
        error: 'Invalid session. Try logging in again'
      });
    }

    const user = await db.user.findFirst({
      where: {
        id: userId
      }
    });

    if (user === null) {
      res.clearCookie('token');
      return res.status(500).json({
        error: 'Something went wrong!'
      });
    }

    res.locals['user'] = user;
    res.locals['token'] = token;
    next();
  }
}

export default AuthManager;
