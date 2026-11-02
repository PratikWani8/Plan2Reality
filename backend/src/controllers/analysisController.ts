import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { Project } from '../models/Project.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { ENV } from '../config/environment.js';
import { memoryStore } from '../services/storageService.js';

export async function uploadFloorPlan(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const file = req.file;

  if (!file) {
    res.status(400).json({ success: false, message: 'No file uploaded.' });
    return;
  }

  try {
    const fileMeta = {
      filename: file.filename,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
    };

    if (memoryStore.isMongoConnected()) {
      const project = await Project.findById(id);
      if (!project || project.owner.toString() !== userId) {
        res.status(404).json({ success: false, message: 'Project not found or access denied.' });
        return;
      }

      project.originalFile = fileMeta;
      project.status = 'analyzing';
      await project.save();
      res.json({ success: true, message: 'File uploaded successfully.', file: fileMeta });
    } else {
      const memProj = memoryStore.getProjectById(id);
      if (!memProj || memProj.ownerId !== userId) {
        res.status(404).json({ success: false, message: 'Project not found or access denied.' });
        return;
      }

      memoryStore.updateProject(id, { originalFile: fileMeta, status: 'analyzing' });
      res.json({ success: true, message: 'File uploaded successfully.', file: fileMeta });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function analyzeProjectPlan(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const { calibration, page } = req.body;

  try {
    let filePath = '';
    let fileName = '';

    if (memoryStore.isMongoConnected()) {
      const project = await Project.findById(id);
      if (!project || project.owner.toString() !== userId) {
        res.status(404).json({ success: false, message: 'Project not found or access denied.' });
        return;
      }
      if (!project.originalFile?.path) {
        res.status(400).json({ success: false, message: 'Please upload a floor plan first before running analysis.' });
        return;
      }
      filePath = project.originalFile.path;
      fileName = project.originalFile.filename;
    } else {
      const memProj = memoryStore.getProjectById(id);
      if (!memProj || memProj.ownerId !== userId) {
        res.status(404).json({ success: false, message: 'Project not found or access denied.' });
        return;
      }
      if (!memProj.originalFile?.path) {
        res.status(400).json({ success: false, message: 'Please upload a floor plan first before running analysis.' });
        return;
      }
      filePath = memProj.originalFile.path;
      fileName = memProj.originalFile.filename;
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: 'Uploaded plan file is missing from disk.' });
      return;
    }

    // Call FastAPI microservice
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), fileName);
    if (calibration) form.append('calibration', JSON.stringify(calibration));
    form.append('page', (page || 0).toString());

    const aiRes = await axios.post(`${ENV.AI_SERVICE_URL}/api/v1/analyze`, form, {
      headers: form.getHeaders(),
      timeout: 45000,
    });

    const analyzedGeometry = aiRes.data.geometry;

    // Persist geometry to project
    if (memoryStore.isMongoConnected()) {
      await Project.findByIdAndUpdate(id, {
        geometry: analyzedGeometry,
        status: 'completed',
      });
    } else {
      memoryStore.updateProject(id, {
        geometry: analyzedGeometry,
        status: 'completed',
      });
    }

    res.json({
      success: true,
      message: 'Plan analyzed successfully.',
      geometry: analyzedGeometry,
      confidence: aiRes.data.confidence,
      warnings: aiRes.data.warnings,
      suggestions: aiRes.data.suggestions,
    });
  } catch (err: any) {
    console.error('Analysis error:', err.message);
    res.status(500).json({ success: false, message: 'AI Analysis microservice error: ' + err.message });
  }
}

export async function recordExport(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const { format, sizeBytes } = req.body;

  try {
    const exportEntry = {
      format: format || 'glb',
      timestamp: new Date(),
      sizeBytes: sizeBytes || 0,
    };

    if (memoryStore.isMongoConnected()) {
      const project = await Project.findById(id);
      if (!project || project.owner.toString() !== userId) {
        res.status(404).json({ success: false, message: 'Project not found or access denied.' });
        return;
      }

      project.exportHistory = project.exportHistory || [];
      project.exportHistory.push(exportEntry as any);
      await project.save();
    } else {
      const memProj = memoryStore.getProjectById(id);
      if (!memProj || memProj.ownerId !== userId) {
        res.status(404).json({ success: false, message: 'Project not found or access denied.' });
        return;
      }

      memProj.exportHistory.push(exportEntry);
    }

    res.json({ success: true, message: 'Export logged.', exportEntry });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
