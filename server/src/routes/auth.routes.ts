import { Router } from 'express';
import { authController } from '../container';
import { registerValidation, loginValidation } from '../middleware/validator';

const router = Router();

router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);

export default router;
