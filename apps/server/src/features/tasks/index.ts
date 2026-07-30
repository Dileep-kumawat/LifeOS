import { Router } from 'express';
import taskRoutes from './routes/task.routes.js';
import labelRoutes from './routes/label.routes.js';
import commentRoutes from './routes/comment.routes.js';
import attachmentRoutes from './routes/attachment.routes.js';
import activityRoutes from './routes/activity.routes.js';

const router = Router();

// Mount individual sub-routers
router.use('/labels', labelRoutes); // handles /tasks/labels routes
router.use('/:taskId/comments', commentRoutes); // handles nested /tasks/:taskId/comments
router.use('/:taskId/attachments', attachmentRoutes); // handles nested /tasks/:taskId/attachments
router.use('/:taskId/activity', activityRoutes); // handles nested /tasks/:taskId/activity
router.use('/', taskRoutes); // handles base /tasks routes


export default router;
