import { Response } from 'express';
import { Project } from '../models/Project.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { memoryStore } from '../services/storageService.js';

export async function listProjects(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  try {
    if (memoryStore.isMongoConnected()) {
      const projects = await Project.find({ owner: userId }).sort({ updatedAt: -1 });
      res.json({ success: true, count: projects.length, data: projects });
    } else {
      const projects = memoryStore.listProjectsByOwner(userId);
      res.json({ success: true, count: projects.length, data: projects });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createProject(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { name, description, geometry } = req.body;

  if (!name) {
    res.status(400).json({ success: false, message: 'Project name is required.' });
    return;
  }

  try {
    if (memoryStore.isMongoConnected()) {
      const project = await Project.create({
        owner: userId,
        name,
        description: description || '',
        geometry: geometry || {},
        status: 'draft',
      });
      res.status(201).json({ success: true, data: project });
    } else {
      const memProj = memoryStore.createProject(userId, name, description, geometry);
      res.status(201).json({ success: true, data: memProj });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getProjectById(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = req.params.id as string;

  try {
    if (memoryStore.isMongoConnected()) {
      const project = await Project.findById(id);
      if (!project) {
        res.status(404).json({ success: false, message: 'Project not found.' });
        return;
      }

      // Ownership enforcement
      if (project.owner.toString() !== userId) {
        res.status(403).json({ success: false, message: 'Access denied. You do not own this project.' });
        return;
      }

      res.json({ success: true, data: project });
    } else {
      const memProj = memoryStore.getProjectById(id);
      if (!memProj) {
        res.status(404).json({ success: false, message: 'Project not found.' });
        return;
      }

      if (memProj.ownerId !== userId) {
        res.status(403).json({ success: false, message: 'Access denied. You do not own this project.' });
        return;
      }

      res.json({ success: true, data: memProj });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateProject(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const { name, description, status, geometry } = req.body;

  try {
    if (memoryStore.isMongoConnected()) {
      const project = await Project.findById(id);
      if (!project) {
        res.status(404).json({ success: false, message: 'Project not found.' });
        return;
      }

      if (project.owner.toString() !== userId) {
        res.status(403).json({ success: false, message: 'Access denied. You do not own this project.' });
        return;
      }

      if (name) project.name = name;
      if (description !== undefined) project.description = description;
      if (status) project.status = status;
      if (geometry) project.geometry = geometry;

      await project.save();
      res.json({ success: true, data: project });
    } else {
      const memProj = memoryStore.getProjectById(id);
      if (!memProj) {
        res.status(404).json({ success: false, message: 'Project not found.' });
        return;
      }

      if (memProj.ownerId !== userId) {
        res.status(403).json({ success: false, message: 'Access denied. You do not own this project.' });
        return;
      }

      const updated = memoryStore.updateProject(id, { name, description, status, geometry });
      res.json({ success: true, data: updated });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function duplicateProject(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = req.params.id as string;

  try {
    if (memoryStore.isMongoConnected()) {
      const project = await Project.findById(id);
      if (!project || project.owner.toString() !== userId) {
        res.status(404).json({ success: false, message: 'Project not found or access denied.' });
        return;
      }

      const duplicate = await Project.create({
        owner: userId,
        name: `${project.name} (Copy)`,
        description: project.description,
        thumbnailUrl: project.thumbnailUrl,
        geometry: project.geometry,
        status: project.status,
      });

      res.status(201).json({ success: true, data: duplicate });
    } else {
      const memProj = memoryStore.getProjectById(id);
      if (!memProj || memProj.ownerId !== userId) {
        res.status(404).json({ success: false, message: 'Project not found or access denied.' });
        return;
      }

      const duplicate = memoryStore.createProject(
        userId,
        `${memProj.name} (Copy)`,
        memProj.description,
        memProj.geometry
      );

      res.status(201).json({ success: true, data: duplicate });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteProject(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = req.params.id as string;

  try {
    if (memoryStore.isMongoConnected()) {
      const project = await Project.findById(id);
      if (!project || project.owner.toString() !== userId) {
        res.status(404).json({ success: false, message: 'Project not found or access denied.' });
        return;
      }

      await Project.findByIdAndDelete(id);
      res.json({ success: true, message: 'Project deleted successfully.' });
    } else {
      const memProj = memoryStore.getProjectById(id);
      if (!memProj || memProj.ownerId !== userId) {
        res.status(404).json({ success: false, message: 'Project not found or access denied.' });
        return;
      }

      memoryStore.deleteProject(id);
      res.json({ success: true, message: 'Project deleted successfully.' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
