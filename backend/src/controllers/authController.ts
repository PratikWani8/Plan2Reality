import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { ENV } from '../config/environment.js';
import { memoryStore } from '../services/storageService.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

function signToken(user: { id: string; email: string; name: string; role: string }) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (memoryStore.isMongoConnected()) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        res.status(409).json({ success: false, message: 'An account with this email already exists.' });
        return;
      }

      const user = await User.create({ name, email: normalizedEmail, password });
      const token = signToken({ id: user._id.toString(), email: user.email, name: user.name, role: user.role });

      res.status(201).json({
        success: true,
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
      });
    } else {
      // In-memory fallback
      const existing = memoryStore.findUserByEmail(normalizedEmail);
      if (existing) {
        res.status(409).json({ success: false, message: 'An account with this email already exists.' });
        return;
      }

      const memUser = await memoryStore.createUser(name, normalizedEmail, password);
      const token = signToken({ id: memUser.id, email: memUser.email, name: memUser.name, role: memUser.role });

      res.status(201).json({
        success: true,
        token,
        user: { id: memUser.id, name: memUser.name, email: memUser.email, role: memUser.role },
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Registration failed.' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (memoryStore.isMongoConnected()) {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user || !(await user.comparePassword(password))) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      const token = signToken({ id: user._id.toString(), email: user.email, name: user.name, role: user.role });
      res.json({
        success: true,
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
      });
    } else {
      const memUser = memoryStore.findUserByEmail(normalizedEmail);
      if (!memUser || !(await bcrypt.compare(password, memUser.passwordHash))) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      const token = signToken({ id: memUser.id, email: memUser.email, name: memUser.name, role: memUser.role });
      res.json({
        success: true,
        token,
        user: { id: memUser.id, name: memUser.name, email: memUser.email, role: memUser.role },
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Login failed.' });
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  res.json({
    success: true,
    user: req.user,
  });
}
