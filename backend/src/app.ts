import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';

import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import geometryRoutes from './routes/geometryRoutes.js';
import analysisRoutes from './routes/analysisRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ENV } from './config/environment.js';

export const app = express();

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static uploads route
const uploadPath = path.resolve(process.cwd(), ENV.UPLOAD_DIR);
app.use('/uploads', express.static(uploadPath));

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'online',
    service: 'Plan2Reality Express Backend',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/projects', geometryRoutes);
app.use('/api/v1/projects', analysisRoutes);
app.use('/api/v1/assistant', assistantRoutes);

// Error handler
app.use(errorHandler);
