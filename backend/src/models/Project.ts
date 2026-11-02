import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  owner: mongoose.Types.ObjectId | string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  originalFile?: {
    filename: string;
    path: string;
    mimetype: string;
    size: number;
  };
  status: 'draft' | 'analyzing' | 'calibrated' | 'completed';
  geometry: Record<string, any>;
  exportHistory?: Array<{
    format: string;
    timestamp: Date;
    sizeBytes?: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    owner: { type: Schema.Types.Mixed, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    thumbnailUrl: { type: String, default: '' },
    originalFile: {
      filename: { type: String },
      path: { type: String },
      mimetype: { type: String },
      size: { type: Number },
    },
    status: {
      type: String,
      enum: ['draft', 'analyzing', 'calibrated', 'completed'],
      default: 'draft',
    },
    geometry: { type: Schema.Types.Mixed, default: {} },
    exportHistory: [
      {
        format: { type: String },
        timestamp: { type: Date, default: Date.now },
        sizeBytes: { type: Number },
      },
    ],
  },
  { timestamps: true }
);

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
