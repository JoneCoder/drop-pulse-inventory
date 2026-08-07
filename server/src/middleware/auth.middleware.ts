import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sneaker_drop_secret_key_12345';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Authentication required: Token not provided' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
  if (!token) {
    return res.status(401).json({ message: 'Invalid token format' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired session token' });
  }
};
