import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/environment.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Authentication token required. Please sign in.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name || 'Architect',
      role: decoded.role || 'architect',
    };
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: 'Invalid or expired authentication token.',
    });
  }
}
