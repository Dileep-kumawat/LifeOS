import { Router } from 'express';
import { DashboardController } from './dashboard.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import {
  getTasksQuerySchema,
  getEventsQuerySchema,
  getHabitsQuerySchema,
  getNotesQuerySchema,
  getNotificationsQuerySchema,
  getActivityQuerySchema,
  getFavoritesQuerySchema,
  markNotificationReadSchema,
} from './dashboard.validator.js';

const router = Router();

// Apply authentication to all dashboard endpoints
router.use(authenticate);

router.get('/summary', DashboardController.getSummary);
router.get('/statistics', DashboardController.getStatistics);
router.get('/tasks', validateRequest(getTasksQuerySchema), DashboardController.getTasks);
router.get('/events', validateRequest(getEventsQuerySchema), DashboardController.getEvents);
router.get('/habits', validateRequest(getHabitsQuerySchema), DashboardController.getHabits);
router.get('/notes', validateRequest(getNotesQuerySchema), DashboardController.getNotes);
router.get('/notifications', validateRequest(getNotificationsQuerySchema), DashboardController.getNotifications);
router.get('/activity', validateRequest(getActivityQuerySchema), DashboardController.getActivity);
router.get('/favorites', validateRequest(getFavoritesQuerySchema), DashboardController.getFavorites);
router.patch('/notifications/:id/read', validateRequest(markNotificationReadSchema), DashboardController.markNotificationRead);

export default router;
