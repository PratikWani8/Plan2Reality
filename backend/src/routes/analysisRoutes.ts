import { Router } from 'express';
import {
  uploadFloorPlan,
  analyzeProjectPlan,
  recordExport,
} from '../controllers/analysisController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { uploadMiddleware } from '../middleware/uploadMiddleware.js';

const router = Router();

router.use(authenticateToken as any);

router.post('/:id/upload', uploadMiddleware.single('file'), uploadFloorPlan as any);
router.post('/:id/analyze', analyzeProjectPlan as any);
router.post('/:id/export', recordExport as any);

export default router;
