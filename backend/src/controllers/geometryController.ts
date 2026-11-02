import { Response } from 'express';
import { Project } from '../models/Project.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { memoryStore } from '../services/storageService.js';

export async function getProjectGeometry(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = req.params.id as string;

  try {
    let geometry = null;

    if (memoryStore.isMongoConnected()) {
      const project = await Project.findById(id);
      if (!project || project.owner.toString() !== userId) {
        res.status(404).json({ success: false, message: 'Project not found or access denied.' });
        return;
      }
      geometry = project.geometry;
    } else {
      const memProj = memoryStore.getProjectById(id);
      if (!memProj || memProj.ownerId !== userId) {
        res.status(404).json({ success: false, message: 'Project not found or access denied.' });
        return;
      }
      geometry = memProj.geometry;
    }

    res.json({ success: true, geometry });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateProjectGeometry(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const { geometry } = req.body;

  if (!geometry || typeof geometry !== 'object') {
    res.status(400).json({ success: false, message: 'Valid geometry object required.' });
    return;
  }

  try {
    if (memoryStore.isMongoConnected()) {
      const project = await Project.findById(id);
      if (!project || project.owner.toString() !== userId) {
        res.status(404).json({ success: false, message: 'Project not found or access denied.' });
        return;
      }

      project.geometry = geometry;
      project.status = 'calibrated';
      await project.save();
      res.json({ success: true, message: 'Geometry updated successfully.', geometry: project.geometry });
    } else {
      const memProj = memoryStore.getProjectById(id);
      if (!memProj || memProj.ownerId !== userId) {
        res.status(404).json({ success: false, message: 'Project not found or access denied.' });
        return;
      }

      const updated = memoryStore.updateProject(id, { geometry, status: 'calibrated' });
      res.json({ success: true, message: 'Geometry updated successfully.', geometry: updated?.geometry });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function validateGeometry(req: AuthRequest, res: Response): Promise<void> {
  const { geometry } = req.body;
  if (!geometry) {
    res.status(400).json({ success: false, valid: false, errors: ['Geometry object is missing.'] });
    return;
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(geometry.walls)) {
    errors.push('Geometry must contain a "walls" array.');
  } else {
    geometry.walls.forEach((w: any, idx: number) => {
      if (!w.id || !w.start || !w.end) {
        errors.push(`Wall at index ${idx} is missing required properties (id, start, end).`);
      }
      if (typeof w.height !== 'number' || w.height <= 0) {
        errors.push(`Wall ${w.id || idx} has invalid height.`);
      }
    });
  }

  if (!Array.isArray(geometry.rooms)) {
    warnings.push('No rooms array provided.');
  }

  res.json({
    success: true,
    valid: errors.length === 0,
    errors,
    warnings,
  });
}
