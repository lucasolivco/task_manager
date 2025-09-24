// routes/accessRoutes.ts
import { Router } from 'express';
import { validateAccessCode } from '../controllers/accessController';

const router = Router();

router.post('/validate-code', validateAccessCode);

export default router;