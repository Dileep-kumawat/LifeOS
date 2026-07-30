import {
  TaskStatus,
  TaskPriority,
  ActivityAction,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
  TASK_PRIORITY_SORT_ORDER,
} from '@lifeos/shared';

// Re-export from shared for convenience in server-internal usage
export {
  TaskStatus,
  TaskPriority,
  ActivityAction,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
  TASK_PRIORITY_SORT_ORDER,
};

export const DEFAULT_TASK_STATUS_WORKFLOW: TaskStatus[] = [
  TaskStatus.INBOX,
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.WAITING,
  TaskStatus.BLOCKED,
  TaskStatus.COMPLETED,
];

export const TERMINAL_STATUSES = new Set<TaskStatus>([
  TaskStatus.COMPLETED,
  TaskStatus.ARCHIVED,
]);

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
  'audio/mpeg',
  'audio/wav',
  'video/mp4',
  'video/quicktime',
];

export const MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export const TASK_SORT_FIELDS = [
  'dueDate',
  'createdAt',
  'updatedAt',
  'title',
  'priority',
  'estimatedDuration',
  'sortOrder',
  'status',
] as const;

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
export const MAX_BULK_TASK_COUNT = 100;
export const MAX_SUBTASK_DEPTH = 5;
