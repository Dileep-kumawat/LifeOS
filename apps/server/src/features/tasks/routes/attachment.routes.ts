import { Router } from 'express';
import { AttachmentController } from '../controllers/AttachmentController.js';
import { authenticate } from '../../../middlewares/auth.middleware.js';
import { validateRequest } from '../../../middlewares/validate.middleware.js';
import { attachmentParamSchema } from '../validators/task.validators.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/', validateRequest(attachmentParamSchema), AttachmentController.upload);
router.get('/', AttachmentController.list);
router.delete('/:id', AttachmentController.delete);

export default router;
