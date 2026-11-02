import { Router } from 'express';
import {
  chatWithAssistant,
  checkAssistantStatus,
} from '../controllers/assistantController.js';

const router = Router();

router.get('/status', checkAssistantStatus);
router.post('/chat', chatWithAssistant);

export default router;
