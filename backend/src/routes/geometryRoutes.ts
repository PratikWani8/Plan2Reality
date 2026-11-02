import { Router } from 'express';
import {
  getProjectGeometry,
  updateProjectGeometry,
  validateGeometry,
} from '../controllers/geometryController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken as any);

router.get('/:id/geometry', getProjectGeometry as any);
router.put('/:id/geometry', updateProjectGeometry as any);
router.post('/validate', validateGeometry as any);

export default router;
