import { Router } from 'express';
import { TaskController } from '../controllers/TaskController.js';
import { authenticate } from '../../../middlewares/auth.middleware.js';
import { validateRequest } from '../../../middlewares/validate.middleware.js';
import {
  createTaskSchema,
  updateTaskSchema,
  taskIdParamSchema,
  taskQuerySchema,
  bulkOperationSchema,
  reorderSchema,
} from '../validators/task.validators.js';

const router = Router();

router.use(authenticate);

router.post('/', validateRequest(createTaskSchema), TaskController.create);
router.get('/', validateRequest(taskQuerySchema), TaskController.list);
router.post('/bulk', validateRequest(bulkOperationSchema), TaskController.bulkOperation);
router.patch('/reorder', validateRequest(reorderSchema), TaskController.reorder);
router.get('/search', TaskController.search);
router.get('/stats', TaskController.getStatistics);

router.get('/:id', validateRequest(taskIdParamSchema), TaskController.getById);
router.put('/:id', validateRequest(updateTaskSchema), TaskController.update);
router.delete('/:id', validateRequest(taskIdParamSchema), TaskController.delete);
router.post('/:id/duplicate', validateRequest(taskIdParamSchema), TaskController.duplicate);
router.post('/:id/archive', validateRequest(taskIdParamSchema), TaskController.archive);
router.post('/:id/restore', validateRequest(taskIdParamSchema), TaskController.restore);
router.delete('/:id/permanent', validateRequest(taskIdParamSchema), TaskController.permanentDelete);

export default router;
