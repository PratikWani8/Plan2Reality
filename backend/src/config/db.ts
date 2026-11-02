import mongoose from 'mongoose';
import { ENV } from './environment.js';

export async function connectDB(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log('MongoDB successfully connected to:', ENV.MONGODB_URI);
  } catch (error) {
    console.warn('MongoDB connection failed (Daemon might not be running locally):', (error as Error).message);
    console.warn('Backend operating in resilient memory persistence mode.');
  }
}
