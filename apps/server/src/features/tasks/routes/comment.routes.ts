import { Router } from 'express';
import { CommentController } from '../controllers/CommentController.js';
import { authenticate } from '../../../middlewares/auth.middleware.js';
import { validateRequest } from '../../../middlewares/validate.middleware.js';
import { createCommentSchema, updateCommentSchema } from '../validators/task.validators.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/', validateRequest(createCommentSchema), CommentController.create);
router.get('/', CommentController.list);
router.put('/:id', validateRequest(updateCommentSchema), CommentController.update);
router.delete('/:id', CommentController.delete);

export default router;
