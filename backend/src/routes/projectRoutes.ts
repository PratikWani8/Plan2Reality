import { Router } from 'express';
import {
  listProjects,
  createProject,
  getProjectById,
  updateProject,
  duplicateProject,
  deleteProject,
} from '../controllers/projectController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken as any);

router.get('/', listProjects as any);
router.post('/', createProject as any);
router.get('/:id', getProjectById as any);
router.patch('/:id', updateProject as any);
router.post('/:id/duplicate', duplicateProject as any);
router.delete('/:id', deleteProject as any);

export default router;
