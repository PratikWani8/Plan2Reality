import dotenv from 'dotenv';
import path from 'path';

// Load .env from current directory and root repository
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export const ENV = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/plan2reality',
  JWT_SECRET: process.env.JWT_SECRET || 'plan2reality_jwt_secret_dev_key_2026_secure',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
};
