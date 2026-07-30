import { Router } from 'express';
import { ActivityController } from '../controllers/ActivityController.js';
import { authenticate } from '../../../middlewares/auth.middleware.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', ActivityController.getTaskActivity);
router.get('/user/me', ActivityController.getUserActivity);

export default router;
