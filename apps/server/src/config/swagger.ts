import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'LifeOS API',
    version: '1.0.0',
    description: 'Production-Grade REST API for LifeOS - AI Powered Personal Operating System',
    contact: {
      name: 'LifeOS Engineering Team',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000/api/v1',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          avatarUrl: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['user', 'admin', 'premium'] },
          authProvider: { type: 'string', enum: ['local', 'google'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          expiresIn: { type: 'number' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          user: { '$ref': '#/components/schemas/User' },
          tokens: { '$ref': '#/components/schemas/AuthTokens' },
        },
      },
      Session: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          ipAddress: { type: 'string', nullable: true },
          userAgent: { type: 'string', nullable: true },
          isValid: { type: 'boolean' },
          lastActiveAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Label: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          name: { type: 'string' },
          color: { type: 'string', description: 'Hex color value e.g. #007FFF' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Comment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          taskId: { type: 'string' },
          userId: { type: 'string' },
          content: { type: 'string' },
          isEdited: { type: 'boolean' },
          editedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Attachment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          taskId: { type: 'string' },
          userId: { type: 'string' },
          fileName: { type: 'string' },
          fileType: { type: 'string' },
          fileSize: { type: 'integer', description: 'File size in bytes' },
          url: { type: 'string' },
          storageKey: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ActivityLog: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          taskId: { type: 'string' },
          userId: { type: 'string' },
          action: { type: 'string' },
          field: { type: 'string', nullable: true },
          oldValue: { type: 'string', nullable: true },
          newValue: { type: 'string', nullable: true },
          meta: { type: 'object', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      RecurrenceRule: {
        type: 'object',
        properties: {
          frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'] },
          interval: { type: 'integer', default: 1 },
          daysOfWeek: { type: 'array', items: { type: 'integer' }, description: '0 = Sunday, 6 = Saturday' },
          dayOfMonth: { type: 'integer' },
          monthOfYear: { type: 'integer' },
          endDate: { type: 'string', format: 'date-time' },
          count: { type: 'integer' },
        },
      },
      Task: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['inbox', 'todo', 'in_progress', 'waiting', 'blocked', 'completed', 'archived'] },
          priority: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'urgent'] },
          progress: { type: 'integer' },
          startDate: { type: 'string', format: 'date-time', nullable: true },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          reminderAt: { type: 'string', format: 'date-time', nullable: true },
          labels: { type: 'array', items: { '$ref': '#/components/schemas/Label' } },
          labelIds: { type: 'array', items: { type: 'string' } },
          estimatedDuration: { type: 'integer', nullable: true },
          actualDuration: { type: 'integer', nullable: true },
          isRecurring: { type: 'boolean' },
          recurrenceRule: { '$ref': '#/components/schemas/RecurrenceRule', nullable: true },
          parentTaskId: { type: 'string', nullable: true },
          subTaskCount: { type: 'integer' },
          completedSubTaskCount: { type: 'integer' },
          isFavorite: { type: 'boolean' },
          isArchived: { type: 'boolean' },
          isTrashed: { type: 'boolean' },
          isDeleted: { type: 'boolean' },
          sortOrder: { type: 'integer' },
          attachmentCount: { type: 'integer' },
          commentCount: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      TaskStatistics: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          active: { type: 'integer' },
          completed: { type: 'integer' },
          overdue: { type: 'integer' },
          archived: { type: 'integer' },
          trashed: { type: 'integer' },
          favorites: { type: 'integer' },
          completionRate: { type: 'number' },
          avgCompletionTimeMinutes: { type: 'number' },
          byStatus: { type: 'object' },
          byPriority: { type: 'object' },
          completedToday: { type: 'integer' },
          completedThisWeek: { type: 'integer' },
          dueToday: { type: 'integer' },
          dueThisWeek: { type: 'integer' },
        },
      },
      TaskListResponse: {
        type: 'object',
        properties: {
          tasks: { type: 'array', items: { '$ref': '#/components/schemas/Task' } },
          total: { type: 'integer' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
          totalPages: { type: 'integer' },
          hasNextPage: { type: 'boolean' },
          hasPrevPage: { type: 'boolean' },
        },
      },
    },
  },
  paths: {
    // ─── Health ──────────────────────────────────────────────────────────────────
    '/health': {
      get: {
        summary: 'System Health Check',
        description: 'Returns real-time status of database connection, system uptime, and memory usage.',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'System is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    statusCode: { type: 'number', example: 200 },
                    message: { type: 'string', example: 'System health retrieved successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'ok' },
                        uptimeSeconds: { type: 'number', example: 124.5 },
                        timestamp: { type: 'string', example: '2026-07-28T10:00:00.000Z' },
                        database: {
                          type: 'object',
                          properties: {
                            status: { type: 'string', example: 'connected' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    // ─── Auth ─────────────────────────────────────────────────────────────────────
    '/auth/register': {
      post: {
        summary: 'Register a new user',
        description: 'Creates a new local user account with email, password, and name.',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                  password: { type: 'string', minLength: 8, example: 'Password123!' },
                  name: { type: 'string', example: 'John Doe' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    statusCode: { type: 'number', example: 201 },
                    message: { type: 'string', example: 'Account created successfully' },
                    data: { '$ref': '#/components/schemas/AuthResponse' },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login user',
        description: 'Authenticates a user with email and password, returning access and refresh tokens.',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                  password: { type: 'string', example: 'Password123!' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    statusCode: { type: 'number', example: 200 },
                    message: { type: 'string', example: 'Logged in successfully' },
                    data: { '$ref': '#/components/schemas/AuthResponse' },
                  },
                },
              },
            },
          },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/refresh-token': {
      post: {
        summary: 'Refresh access token',
        description: 'Issues a new JWT access token using a valid refresh token. Pass it in the request body or via the x-refresh-token header.',
        tags: ['Auth'],
        parameters: [
          {
            name: 'x-refresh-token',
            in: 'header',
            description: 'Refresh token passed via header',
            required: false,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string', example: 'd3b07384d113edec49eaa6238ad5ff00' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token refreshed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    statusCode: { type: 'number', example: 200 },
                    message: { type: 'string', example: 'Token refreshed successfully' },
                    data: { '$ref': '#/components/schemas/AuthTokens' },
                  },
                },
              },
            },
          },
          '401': { description: 'Invalid or expired refresh token' },
        },
      },
    },
    '/auth/google': {
      get: {
        summary: 'Google OAuth Redirect',
        description: 'Redirects the client to Google consent screen to begin OAuth 2.0 flow.',
        tags: ['Auth'],
        responses: {
          '302': { description: 'Redirect to Google authentication consent screen' },
        },
      },
    },
    '/auth/google/callback': {
      get: {
        summary: 'Google OAuth Callback',
        description: 'OAuth 2.0 callback URL. Google redirects here after authentication. The server then redirects the client with JWT tokens in the URL.',
        tags: ['Auth'],
        responses: {
          '302': { description: 'Redirects client with access and refresh tokens as query params' },
        },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Logout user',
        description: 'Invalidates the current session and refresh token.',
        tags: ['Auth'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Logged out successfully' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get current user profile',
        description: 'Returns the profile of the currently authenticated user.',
        tags: ['Auth'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Profile fetched successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    statusCode: { type: 'number', example: 200 },
                    message: { type: 'string', example: 'User profile fetched successfully' },
                    data: { '$ref': '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/auth/sessions': {
      get: {
        summary: 'Get active login sessions',
        description: 'Lists all active login sessions associated with the authenticated user account.',
        tags: ['Auth'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Active sessions retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    statusCode: { type: 'number', example: 200 },
                    message: { type: 'string', example: 'Active sessions retrieved' },
                    data: { type: 'array', items: { '$ref': '#/components/schemas/Session' } },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/auth/sessions/{sessionId}': {
      delete: {
        summary: 'Revoke session',
        description: 'Revokes and invalidates a specific login session.',
        tags: ['Auth'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Session revoked successfully' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Session not found' },
        },
      },
    },
    // ─── Dashboard ────────────────────────────────────────────────────────────────
    '/dashboard/summary': {
      get: {
        summary: "Get Today's Summary",
        description: "Returns today's aggregate productivity summary including habits remaining, tasks due, events scheduled, and current streak.",
        tags: ['Dashboard'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'timezoneOffset',
            in: 'query',
            description: "User's local timezone offset in minutes (e.g. 330 for UTC+5:30)",
            required: false,
            schema: { type: 'integer', default: 0 },
          },
        ],
        responses: {
          '200': {
            description: 'Dashboard summary retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    statusCode: { type: 'number', example: 200 },
                    message: { type: 'string', example: "Today's summary retrieved successfully" },
                    data: {
                      type: 'object',
                      properties: {
                        date: { type: 'string', example: '2026-07-29T22:30:00.000Z' },
                        greeting: { type: 'string', example: 'Good evening' },
                        currentStreak: { type: 'number', example: 5 },
                        tasksDueToday: { type: 'number', example: 3 },
                        tasksCompletedToday: { type: 'number', example: 2 },
                        habitsRemaining: { type: 'number', example: 1 },
                        habitsCompletedToday: { type: 'number', example: 2 },
                        totalHabitsCount: { type: 'number', example: 3 },
                        eventsCountToday: { type: 'number', example: 1 },
                        unreadNotifications: { type: 'number', example: 4 },
                        overallProductivityProgress: { type: 'number', example: 67 },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/dashboard/statistics': {
      get: {
        summary: 'Get Productivity Statistics',
        description: 'Returns historical performance metrics including task completion rates, project counts, goals progress, and weekly charts.',
        tags: ['Dashboard'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'timezoneOffset',
            in: 'query',
            description: "User's local timezone offset in minutes",
            required: false,
            schema: { type: 'integer', default: 0 },
          },
        ],
        responses: {
          '200': {
            description: 'Productivity statistics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    statusCode: { type: 'number', example: 200 },
                    message: { type: 'string', example: 'Productivity statistics retrieved successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        totalTasks: { type: 'number', example: 25 },
                        completedTasks: { type: 'number', example: 18 },
                        activeProjects: { type: 'number', example: 3 },
                        goalsCount: { type: 'number', example: 5 },
                        goalsProgress: { type: 'number', example: 42 },
                        habitCompletionRate: { type: 'number', example: 85 },
                        notesCount: { type: 'number', example: 12 },
                        productivityScore: { type: 'number', example: 80 },
                        weeklyActivity: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              day: { type: 'string', example: 'Mon' },
                              count: { type: 'number', example: 4 },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/dashboard/tasks': {
      get: {
        summary: 'Get Dashboard Tasks',
        description: 'Retrieves a filtered list of tasks for dashboard display.',
        tags: ['Dashboard'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['todo', 'in_progress', 'completed'] } },
        ],
        responses: {
          '200': {
            description: 'Dashboard tasks retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/TaskListResponse' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/dashboard/events': {
      get: {
        summary: 'Get Dashboard Events',
        description: 'Retrieves calendar events within an optional date range.',
        tags: ['Dashboard'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'start', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'end', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: {
          '200': { description: 'Events retrieved successfully' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/dashboard/habits': {
      get: {
        summary: 'Get Dashboard Habits',
        description: 'Retrieves habits and their tracking information.',
        tags: ['Dashboard'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          '200': { description: 'Habits retrieved successfully' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/dashboard/notes': {
      get: {
        summary: 'Get Dashboard Notes',
        description: 'Retrieves a list of user notes.',
        tags: ['Dashboard'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'isPinned', in: 'query', schema: { type: 'boolean' } },
          { name: 'folder', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Notes retrieved successfully' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/dashboard/notifications': {
      get: {
        summary: 'Get User Notifications',
        description: 'Retrieves notifications for the authenticated user.',
        tags: ['Dashboard'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'isRead', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: {
          '200': { description: 'Notifications retrieved successfully' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/dashboard/activity': {
      get: {
        summary: 'Get Dashboard Activity Logs',
        description: 'Retrieves general activity logs for the dashboard.',
        tags: ['Dashboard'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'action', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Activity logs retrieved successfully' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/dashboard/favorites': {
      get: {
        summary: 'Get User Favorites',
        description: 'Lists all user-favorited items.',
        tags: ['Dashboard'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          '200': { description: 'Favorites retrieved successfully' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/dashboard/notifications/{id}/read': {
      patch: {
        summary: 'Mark notification as read',
        description: 'Marks a specific notification as read.',
        tags: ['Dashboard'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Notification marked as read' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Notification not found' },
        },
      },
    },
    // ─── Tasks ────────────────────────────────────────────────────────────────────
    '/tasks': {
      get: {
        summary: 'List and filter tasks',
        description: 'Queries tasks with advanced filtering, sorting, and pagination.',
        tags: ['Tasks'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25 } },
          { name: 'sortField', in: 'query', schema: { type: 'string', enum: ['dueDate', 'createdAt', 'updatedAt', 'title', 'priority', 'estimatedDuration', 'sortOrder', 'status'] } },
          { name: 'sortDir', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Filter by status' },
          { name: 'priority', in: 'query', schema: { type: 'string' }, description: 'Filter by priority' },
          { name: 'labelIds', in: 'query', schema: { type: 'string' }, description: 'Comma-separated label IDs' },
          { name: 'isFavorite', in: 'query', schema: { type: 'string' } },
          { name: 'isArchived', in: 'query', schema: { type: 'string' } },
          { name: 'isTrashed', in: 'query', schema: { type: 'string' } },
          { name: 'dueDateFrom', in: 'query', schema: { type: 'string' } },
          { name: 'dueDateTo', in: 'query', schema: { type: 'string' } },
          { name: 'createdFrom', in: 'query', schema: { type: 'string' } },
          { name: 'createdTo', in: 'query', schema: { type: 'string' } },
          { name: 'parentTaskId', in: 'query', schema: { type: 'string' } },
          { name: 'goalId', in: 'query', schema: { type: 'string' } },
          { name: 'projectId', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Tasks retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    statusCode: { type: 'number', example: 200 },
                    data: { '$ref': '#/components/schemas/TaskListResponse' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
      post: {
        summary: 'Create a task',
        description: 'Creates a new task record.',
        tags: ['Tasks'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string', example: 'Design landing page' },
                  description: { type: 'string', example: 'Full redesign of the marketing landing page' },
                  notes: { type: 'string' },
                  status: { type: 'string', enum: ['inbox', 'todo', 'in_progress', 'waiting', 'blocked', 'completed', 'archived'], default: 'inbox' },
                  priority: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'urgent'], default: 'none' },
                  labelIds: { type: 'array', items: { type: 'string' } },
                  startDate: { type: 'string', format: 'date-time' },
                  dueDate: { type: 'string', format: 'date-time' },
                  reminderAt: { type: 'string', format: 'date-time' },
                  estimatedDuration: { type: 'integer', description: 'Duration in minutes' },
                  parentTaskId: { type: 'string' },
                  isRecurring: { type: 'boolean' },
                  recurrenceRule: { '$ref': '#/components/schemas/RecurrenceRule' },
                  goalId: { type: 'string' },
                  projectId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Task created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    statusCode: { type: 'number', example: 201 },
                    data: { '$ref': '#/components/schemas/Task' },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/tasks/bulk': {
      post: {
        summary: 'Bulk task operations',
        description: 'Performs an operation on multiple tasks at once (delete, archive, restore, trash, status/priority change, label assign/remove).',
        tags: ['Tasks'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['taskIds', 'operation'],
                properties: {
                  taskIds: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 100 },
                  operation: { type: 'string', enum: ['delete', 'archive', 'restore', 'trash', 'status_change', 'priority_change', 'label_assign', 'label_remove'] },
                  payload: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', enum: ['inbox', 'todo', 'in_progress', 'waiting', 'blocked', 'completed', 'archived'] },
                      priority: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'urgent'] },
                      labelId: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Bulk operation completed successfully' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/tasks/reorder': {
      patch: {
        summary: 'Reorder tasks',
        description: 'Updates the sort order of multiple tasks in one request.',
        tags: ['Tasks'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['tasks'],
                properties: {
                  tasks: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 100,
                    items: {
                      type: 'object',
                      required: ['id', 'sortOrder'],
                      properties: {
                        id: { type: 'string' },
                        sortOrder: { type: 'integer', minimum: 0 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Tasks reordered successfully' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/tasks/search': {
      get: {
        summary: 'Search tasks',
        description: 'Performs full-text search on tasks.',
        tags: ['Tasks'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' }, description: 'Search query text (required)' },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'priority', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 50 } },
        ],
        responses: {
          '200': {
            description: 'Search results returned',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { '$ref': '#/components/schemas/Task' } },
                  },
                },
              },
            },
          },
          '400': { description: 'Missing search query' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/tasks/stats': {
      get: {
        summary: 'Get task statistics',
        description: 'Returns comprehensive task performance metrics (counts by status, priority, completion rates, averages).',
        tags: ['Tasks'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Task statistics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/TaskStatistics' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/tasks/{id}': {
      get: {
        summary: 'Get task by ID',
        description: 'Retrieves full details of a single task.',
        tags: ['Tasks'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'MongoDB ObjectId of the task' },
        ],
        responses: {
          '200': {
            description: 'Task retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/Task' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Task not found' },
        },
      },
      put: {
        summary: 'Update task',
        description: 'Updates an existing task with partial or full field updates.',
        tags: ['Tasks'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  notes: { type: 'string', nullable: true },
                  status: { type: 'string', enum: ['inbox', 'todo', 'in_progress', 'waiting', 'blocked', 'completed', 'archived'] },
                  priority: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'urgent'] },
                  progress: { type: 'integer', minimum: 0, maximum: 100 },
                  labelIds: { type: 'array', items: { type: 'string' } },
                  startDate: { type: 'string', format: 'date-time', nullable: true },
                  dueDate: { type: 'string', format: 'date-time', nullable: true },
                  reminderAt: { type: 'string', format: 'date-time', nullable: true },
                  estimatedDuration: { type: 'integer', nullable: true },
                  actualDuration: { type: 'integer', nullable: true },
                  parentTaskId: { type: 'string', nullable: true },
                  isRecurring: { type: 'boolean' },
                  recurrenceRule: { '$ref': '#/components/schemas/RecurrenceRule', nullable: true },
                  isFavorite: { type: 'boolean' },
                  sortOrder: { type: 'integer' },
                  goalId: { type: 'string', nullable: true },
                  projectId: { type: 'string', nullable: true },
                  calendarEventId: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Task updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/Task' },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Task not found' },
        },
      },
      delete: {
        summary: 'Trash task (soft-delete)',
        description: 'Moves a task to trash. Use /tasks/{id}/permanent for hard delete.',
        tags: ['Tasks'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Task moved to trash successfully' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Task not found' },
        },
      },
    },
    '/tasks/{id}/duplicate': {
      post: {
        summary: 'Duplicate task',
        description: 'Clones an existing task and returns the copy.',
        tags: ['Tasks'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '201': {
            description: 'Task duplicated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/Task' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Task not found' },
        },
      },
    },
    '/tasks/{id}/archive': {
      post: {
        summary: 'Archive task',
        description: 'Marks a task as archived.',
        tags: ['Tasks'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Task archived successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/Task' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Task not found' },
        },
      },
    },
    '/tasks/{id}/restore': {
      post: {
        summary: 'Restore task',
        description: 'Restores a trashed or archived task back to active state.',
        tags: ['Tasks'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Task restored successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/Task' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Task not found' },
        },
      },
    },
    '/tasks/{id}/permanent': {
      delete: {
        summary: 'Permanently delete task',
        description: 'Hard-deletes a task from the database. This action is irreversible.',
        tags: ['Tasks'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Task permanently deleted' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Task not found' },
        },
      },
    },
    // ─── Labels ───────────────────────────────────────────────────────────────────
    '/tasks/labels': {
      get: {
        summary: 'List all labels',
        description: 'Retrieves all labels created by the authenticated user.',
        tags: ['Labels'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Labels retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { '$ref': '#/components/schemas/Label' } },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
      post: {
        summary: 'Create label',
        description: 'Creates a new label with a name and hex color.',
        tags: ['Labels'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'color'],
                properties: {
                  name: { type: 'string', maxLength: 50, example: 'Work' },
                  color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', example: '#007FFF' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Label created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/Label' },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/tasks/labels/{id}': {
      put: {
        summary: 'Update label',
        description: 'Updates a label name or color.',
        tags: ['Labels'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', maxLength: 50 },
                  color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Label updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/Label' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Label not found' },
        },
      },
      delete: {
        summary: 'Delete label',
        description: 'Permanently deletes a label.',
        tags: ['Labels'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Label deleted successfully' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Label not found' },
        },
      },
    },
    // ─── Comments ─────────────────────────────────────────────────────────────────
    '/tasks/{taskId}/comments': {
      get: {
        summary: 'List task comments',
        description: 'Retrieves all comments for a specific task.',
        tags: ['Comments'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'taskId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Comments retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { '$ref': '#/components/schemas/Comment' } },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Task not found' },
        },
      },
      post: {
        summary: 'Create comment on task',
        description: 'Adds a new comment to a specific task.',
        tags: ['Comments'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'taskId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  content: { type: 'string', minLength: 1, maxLength: 5000, example: 'This looks great!' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Comment created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/Comment' },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Task not found' },
        },
      },
    },
    '/tasks/{taskId}/comments/{id}': {
      put: {
        summary: 'Update comment',
        description: 'Edits the content of an existing comment.',
        tags: ['Comments'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'taskId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  content: { type: 'string', minLength: 1, maxLength: 5000 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Comment updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/Comment' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Comment or task not found' },
        },
      },
      delete: {
        summary: 'Delete comment',
        description: 'Deletes a comment from a task.',
        tags: ['Comments'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'taskId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Comment deleted successfully' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Comment or task not found' },
        },
      },
    },
    // ─── Attachments ──────────────────────────────────────────────────────────────
    '/tasks/{taskId}/attachments': {
      get: {
        summary: 'List task attachments',
        description: 'Retrieves all file attachments for a task.',
        tags: ['Attachments'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'taskId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Attachments retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { '$ref': '#/components/schemas/Attachment' } },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Task not found' },
        },
      },
      post: {
        summary: 'Upload task attachment',
        description: 'Uploads a file and attaches it to a task.',
        tags: ['Attachments'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'taskId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Attachment uploaded successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { '$ref': '#/components/schemas/Attachment' },
                  },
                },
              },
            },
          },
          '400': { description: 'File validation error' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Task not found' },
        },
      },
    },
    '/tasks/{taskId}/attachments/{id}': {
      delete: {
        summary: 'Delete task attachment',
        description: 'Removes a file attachment from a task.',
        tags: ['Attachments'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'taskId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Attachment deleted successfully' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Attachment or task not found' },
        },
      },
    },
    // ─── Activity ─────────────────────────────────────────────────────────────────
    '/tasks/{taskId}/activity': {
      get: {
        summary: 'Get task activity log',
        description: 'Retrieves the full audit activity history for a specific task.',
        tags: ['Activity'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'taskId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Task activity log retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { '$ref': '#/components/schemas/ActivityLog' } },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Task not found' },
        },
      },
    },
    '/tasks/{taskId}/activity/user/me': {
      get: {
        summary: "Get current user's activity log",
        description: 'Retrieves paginated activity logs for the authenticated user. Note: taskId is required by the route mount structure but is not used in the handler.',
        tags: ['Activity'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'taskId', in: 'path', required: true, schema: { type: 'string' }, description: 'Any valid string (required by route structure, not used in handler)' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25 } },
        ],
        responses: {
          '200': {
            description: 'User activity logs retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { '$ref': '#/components/schemas/ActivityLog' } },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
  },
};

export const setupSwagger = (app: Express): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};
