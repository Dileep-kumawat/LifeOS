import { z } from 'zod';

const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
const mongoIdSchema = z.string().regex(mongoIdRegex, 'Invalid MongoDB ObjectId');

export const getTasksQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    status: z.enum(['todo', 'in_progress', 'completed']).optional(),
  }),
});

export const getEventsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }),
});

export const getHabitsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  }),
});

export const getNotesQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
    isPinned: z.enum(['true', 'false']).optional().transform((val) => val === 'true'),
    folder: z.string().optional(),
  }),
});

export const getNotificationsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
    isRead: z.enum(['true', 'false']).optional().transform((val) => val === 'true'),
  }),
});

export const getActivityQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    action: z.string().optional(),
  }),
});

export const getFavoritesQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  }),
});

export const markNotificationReadSchema = z.object({
  params: z.object({
    id: mongoIdSchema,
  }),
});
