import { Router } from 'express';
import { dropController } from '../container';
import { createDropValidation, reserveItemValidation, purchaseItemValidation } from '../middleware/validator';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.get('/', dropController.getActiveDrops);
router.post('/create', createDropValidation, dropController.createDrop);
router.post('/reserve', authenticateJWT, reserveItemValidation, dropController.reserveItem);
router.post('/purchase', authenticateJWT, purchaseItemValidation, dropController.purchaseItem);

export default router;
