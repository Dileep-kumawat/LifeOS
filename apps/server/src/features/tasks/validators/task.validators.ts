import { z } from 'zod';
import { TaskStatus, TaskPriority, RecurrenceFrequency, BulkTaskOperationType } from '@lifeos/shared';

// ─── Shared sub-schemas ───────────────────────────────────────────────────────

const recurrenceRuleSchema = z.object({
  frequency: z.nativeEnum(RecurrenceFrequency),
  interval: z.number().int().min(1).default(1),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  monthOfYear: z.number().int().min(1).max(12).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
  count: z.number().int().min(1).optional(),
});

const mongoIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');
const optionalMongoId = mongoIdSchema.optional().nullable();

// ─── Task CRUD ────────────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, 'Title is required').max(500),
    description: z.string().max(10000).optional(),
    notes: z.string().max(50000).optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    labelIds: z.array(mongoIdSchema).optional(),
    startDate: z.string().datetime({ offset: true }).optional().nullable(),
    dueDate: z.string().datetime({ offset: true }).optional().nullable(),
    reminderAt: z.string().datetime({ offset: true }).optional().nullable(),
    estimatedDuration: z.number().int().min(0).optional(),
    parentTaskId: optionalMongoId,
    isRecurring: z.boolean().optional(),
    recurrenceRule: recurrenceRuleSchema.optional(),
    goalId: optionalMongoId,
    projectId: optionalMongoId,
  }),
});

export const updateTaskSchema = z.object({
  params: z.object({ id: mongoIdSchema }),
  body: z.object({
    title: z.string().trim().min(1).max(500).optional(),
    description: z.string().max(10000).optional().nullable(),
    notes: z.string().max(50000).optional().nullable(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    labelIds: z.array(mongoIdSchema).optional(),
    startDate: z.string().datetime({ offset: true }).optional().nullable(),
    dueDate: z.string().datetime({ offset: true }).optional().nullable(),
    reminderAt: z.string().datetime({ offset: true }).optional().nullable(),
    estimatedDuration: z.number().int().min(0).optional().nullable(),
    actualDuration: z.number().int().min(0).optional().nullable(),
    parentTaskId: optionalMongoId,
    isRecurring: z.boolean().optional(),
    recurrenceRule: recurrenceRuleSchema.optional().nullable(),
    isFavorite: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    goalId: optionalMongoId,
    projectId: optionalMongoId,
    calendarEventId: optionalMongoId,
  }).strict(),
});

export const taskIdParamSchema = z.object({
  params: z.object({ id: mongoIdSchema }),
});

// ─── Task Query ───────────────────────────────────────────────────────────────

export const taskQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(25),
    sortField: z.enum(['dueDate', 'createdAt', 'updatedAt', 'title', 'priority', 'estimatedDuration', 'sortOrder', 'status']).optional(),
    sortDir: z.enum(['asc', 'desc']).optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    labelIds: z.string().optional(), // comma-separated
    isFavorite: z.string().optional(),
    isArchived: z.string().optional(),
    isTrashed: z.string().optional(),
    dueDateFrom: z.string().optional(),
    dueDateTo: z.string().optional(),
    createdFrom: z.string().optional(),
    createdTo: z.string().optional(),
    parentTaskId: z.string().optional(),
    goalId: z.string().optional(),
    projectId: z.string().optional(),
    search: z.string().optional(),
  }),
});

export const searchQuerySchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required'),
    status: z.string().optional(),
    priority: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  }),
});

// ─── Bulk Operations ──────────────────────────────────────────────────────────

export const bulkOperationSchema = z.object({
  body: z.object({
    taskIds: z.array(mongoIdSchema).min(1).max(100),
    operation: z.enum(['delete', 'archive', 'restore', 'trash', 'status_change', 'priority_change', 'label_assign', 'label_remove'] as [BulkTaskOperationType, ...BulkTaskOperationType[]]),
    payload: z.object({
      status: z.nativeEnum(TaskStatus).optional(),
      priority: z.nativeEnum(TaskPriority).optional(),
      labelId: mongoIdSchema.optional(),
    }).optional(),
  }),
});

export const reorderSchema = z.object({
  body: z.object({
    tasks: z.array(z.object({
      id: mongoIdSchema,
      sortOrder: z.number().int().min(0),
    })).min(1).max(100),
  }),
});

// ─── Labels ───────────────────────────────────────────────────────────────────

export const createLabelSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(50),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  }),
});

export const updateLabelSchema = z.object({
  params: z.object({ id: mongoIdSchema }),
  body: z.object({
    name: z.string().trim().min(1).max(50).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }).strict(),
});

// ─── Comments ─────────────────────────────────────────────────────────────────

export const createCommentSchema = z.object({
  params: z.object({ taskId: mongoIdSchema }),
  body: z.object({
    content: z.string().trim().min(1).max(5000),
  }),
});

export const updateCommentSchema = z.object({
  params: z.object({ taskId: mongoIdSchema, id: mongoIdSchema }),
  body: z.object({
    content: z.string().trim().min(1).max(5000),
  }),
});

// ─── Attachments ──────────────────────────────────────────────────────────────

export const attachmentParamSchema = z.object({
  params: z.object({ taskId: mongoIdSchema }),
});
