import { Router } from 'express';
import { LabelController } from '../controllers/LabelController.js';
import { authenticate } from '../../../middlewares/auth.middleware.js';
import { validateRequest } from '../../../middlewares/validate.middleware.js';
import { createLabelSchema, updateLabelSchema } from '../validators/task.validators.js';

const router = Router();

router.use(authenticate);

router.post('/', validateRequest(createLabelSchema), LabelController.create);
router.get('/', LabelController.list);
router.put('/:id', validateRequest(updateLabelSchema), LabelController.update);
router.delete('/:id', LabelController.delete);

export default router;
