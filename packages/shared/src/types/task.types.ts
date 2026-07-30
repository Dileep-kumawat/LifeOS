// ─── Task Status ──────────────────────────────────────────────────────────────

export enum TaskStatus {
  INBOX = 'inbox',
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  WAITING = 'waiting',
  BLOCKED = 'blocked',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.INBOX]: 'Inbox',
  [TaskStatus.TODO]: 'To Do',
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.WAITING]: 'Waiting',
  [TaskStatus.BLOCKED]: 'Blocked',
  [TaskStatus.COMPLETED]: 'Completed',
  [TaskStatus.ARCHIVED]: 'Archived',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, { bg: string; text: string }> = {
  [TaskStatus.INBOX]: { bg: '#F7F6F3', text: '#787774' },
  [TaskStatus.TODO]: { bg: '#E1F3FE', text: '#1F6C9F' },
  [TaskStatus.IN_PROGRESS]: { bg: '#FBF3DB', text: '#956400' },
  [TaskStatus.WAITING]: { bg: '#FDEBEC', text: '#9F2F2D' },
  [TaskStatus.BLOCKED]: { bg: '#FDEBEC', text: '#7C1D1B' },
  [TaskStatus.COMPLETED]: { bg: '#EDF3EC', text: '#346538' },
  [TaskStatus.ARCHIVED]: { bg: '#F7F6F3', text: '#787774' },
};

// ─── Task Priority ────────────────────────────────────────────────────────────

export enum TaskPriority {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  [TaskPriority.NONE]: 'No Priority',
  [TaskPriority.LOW]: 'Low',
  [TaskPriority.MEDIUM]: 'Medium',
  [TaskPriority.HIGH]: 'High',
  [TaskPriority.URGENT]: 'Urgent',
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  [TaskPriority.NONE]: '#787774',
  [TaskPriority.LOW]: '#1F6C9F',
  [TaskPriority.MEDIUM]: '#956400',
  [TaskPriority.HIGH]: '#9F2F2D',
  [TaskPriority.URGENT]: '#7C1D1B',
};

export const TASK_PRIORITY_SORT_ORDER: Record<TaskPriority, number> = {
  [TaskPriority.URGENT]: 0,
  [TaskPriority.HIGH]: 1,
  [TaskPriority.MEDIUM]: 2,
  [TaskPriority.LOW]: 3,
  [TaskPriority.NONE]: 4,
};

// ─── Recurrence ───────────────────────────────────────────────────────────────

export enum RecurrenceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // e.g. every 2 weeks
  daysOfWeek?: number[]; // 0=Sun … 6=Sat
  dayOfMonth?: number;
  monthOfYear?: number;
  endDate?: string; // ISO date
  count?: number; // max occurrences
  // Future: rrule string for full RFC 5545 support
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export enum ActivityAction {
  CREATED = 'created',
  UPDATED = 'updated',
  COMPLETED = 'completed',
  REOPENED = 'reopened',
  ARCHIVED = 'archived',
  RESTORED = 'restored',
  TRASHED = 'trashed',
  DELETED = 'deleted',
  DUPLICATED = 'duplicated',
  COMMENT_ADDED = 'comment_added',
  COMMENT_EDITED = 'comment_edited',
  COMMENT_DELETED = 'comment_deleted',
  ATTACHMENT_UPLOADED = 'attachment_uploaded',
  ATTACHMENT_DELETED = 'attachment_deleted',
  LABEL_ADDED = 'label_added',
  LABEL_REMOVED = 'label_removed',
  PRIORITY_CHANGED = 'priority_changed',
  STATUS_CHANGED = 'status_changed',
  DUE_DATE_SET = 'due_date_set',
  DUE_DATE_REMOVED = 'due_date_removed',
  SUBTASK_ADDED = 'subtask_added',
  DEPENDENCY_ADDED = 'dependency_added',
  DEPENDENCY_REMOVED = 'dependency_removed',
}

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface ILabel {
  id: string;
  userId: string;
  name: string;
  color: string; // hex e.g. "#FDEBEC"
  createdAt: string;
  updatedAt: string;
}

export interface IComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
  // future: mentions, reactions
}

export interface IAttachment {
  id: string;
  taskId: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number; // bytes
  url: string;
  storageKey: string;
  createdAt: string;
}

export interface IActivityLog {
  id: string;
  taskId: string;
  userId: string;
  action: ActivityAction;
  field?: string;
  oldValue?: string;
  newValue?: string;
  meta?: Record<string, any>;
  createdAt: string;
}

// ─── Integration Extension Points (stubs — not implemented yet) ───────────────

export interface ITaskGoalRef {
  goalId: string;
  goalTitle: string;
}

export interface ITaskProjectRef {
  projectId: string;
  projectTitle: string;
}

export interface ITaskCalendarRef {
  calendarEventId: string;
}

export interface ITaskHabitRef {
  habitId: string;
}

// ─── Main Task Interface ───────────────────────────────────────────────────────

export interface ITask {
  id: string;
  userId: string;

  // Core fields
  title: string;
  description?: string;
  notes?: string; // rich text / markdown
  status: TaskStatus;
  priority: TaskPriority;
  progress: number; // 0-100

  // Dates
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  reminderAt?: string;

  // Organization
  labels: ILabel[];
  labelIds: string[];

  // Time tracking
  estimatedDuration?: number; // minutes
  actualDuration?: number; // minutes

  // Recurrence
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule;
  recurrenceParentId?: string;

  // Hierarchy
  parentTaskId?: string;
  subTasks: ITask[];
  subTaskCount: number;
  completedSubTaskCount: number;

  // Dependencies
  blockedBy: string[]; // task IDs
  blocks: string[]; // task IDs
  relatedTasks: string[]; // task IDs

  // Collaboration (future-ready)
  assignedTo?: string;
  watchers?: string[];

  // Integration references (future-ready stubs)
  goalRef?: ITaskGoalRef;
  projectRef?: ITaskProjectRef;
  calendarEventRef?: ITaskCalendarRef;
  habitRef?: ITaskHabitRef;

  // State flags
  isFavorite: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  isDeleted: boolean;

  // Sorting
  sortOrder: number;

  // Attachments & comments counts
  attachmentCount: number;
  commentCount: number;

  // Audit
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;

  // Future: custom metadata for plugins/extensions
  customMetadata?: Record<string, any>;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateTaskInput {
  title: string;
  description?: string;
  notes?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  labelIds?: string[];
  startDate?: string;
  dueDate?: string;
  reminderAt?: string;
  estimatedDuration?: number;
  parentTaskId?: string;
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule;
  // Integration refs (stubs)
  goalId?: string;
  projectId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  notes?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  progress?: number;
  labelIds?: string[];
  startDate?: string | null;
  dueDate?: string | null;
  reminderAt?: string | null;
  estimatedDuration?: number | null;
  actualDuration?: number | null;
  parentTaskId?: string | null;
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule | null;
  isFavorite?: boolean;
  sortOrder?: number;
  goalId?: string | null;
  projectId?: string | null;
  calendarEventId?: string | null;
}

export interface CreateLabelInput {
  name: string;
  color: string;
}

export interface UpdateLabelInput {
  name?: string;
  color?: string;
}

export interface CreateCommentInput {
  content: string;
}

export interface UpdateCommentInput {
  content: string;
}

// ─── Query / Filter / Sort ────────────────────────────────────────────────────

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  labelIds?: string[];
  isFavorite?: boolean;
  isArchived?: boolean;
  isTrashed?: boolean;
  dueDateFrom?: string;
  dueDateTo?: string;
  createdFrom?: string;
  createdTo?: string;
  parentTaskId?: string | null;
  goalId?: string;
  projectId?: string;
  search?: string;
}

export type TaskSortField =
  | 'dueDate'
  | 'createdAt'
  | 'updatedAt'
  | 'title'
  | 'priority'
  | 'estimatedDuration'
  | 'sortOrder'
  | 'status';

export interface TaskSortOptions {
  field: TaskSortField;
  direction: 'asc' | 'desc';
}

export type TaskGroupBy = 'status' | 'priority' | 'label' | 'dueDate' | 'none';

// ─── Bulk Operations ──────────────────────────────────────────────────────────

export type BulkTaskOperationType =
  | 'delete'
  | 'archive'
  | 'restore'
  | 'trash'
  | 'status_change'
  | 'priority_change'
  | 'label_assign'
  | 'label_remove';

export interface BulkTaskOperation {
  taskIds: string[];
  operation: BulkTaskOperationType;
  payload?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    labelId?: string;
  };
}

// ─── Statistics ───────────────────────────────────────────────────────────────

export interface TaskStatistics {
  total: number;
  active: number;
  completed: number;
  overdue: number;
  archived: number;
  trashed: number;
  favorites: number;
  completionRate: number; // 0-100 %
  avgCompletionTimeMinutes: number;
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
  completedToday: number;
  completedThisWeek: number;
  dueToday: number;
  dueThisWeek: number;
}

// ─── API Response shapes ──────────────────────────────────────────────────────

export interface TaskListResponse {
  tasks: ITask[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
