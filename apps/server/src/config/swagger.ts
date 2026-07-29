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
  paths: {
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
    '/dashboard/summary': {
      get: {
        summary: "Get Today's Summary",
        description: "Returns today's aggregate productivity summary, including habits remaining, tasks due, events scheduled, and current streak.",
        tags: ['Dashboard'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'timezoneOffset',
            in: 'query',
            description: "User's local timezone offset in minutes (e.g. 330 for UTC+5:30)",
            required: false,
            schema: { type: 'integer', default: 0 }
          }
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
                        overallProductivityProgress: { type: 'number', example: 67 }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': { description: 'Unauthorized access' }
        }
      }
    },
    '/dashboard/statistics': {
      get: {
        summary: 'Get Productivity Statistics',
        description: 'Returns historical performance metrics, including total tasks completion rates, active project counts, goals progress, and weekly completion charts.',
        tags: ['Dashboard'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'timezoneOffset',
            in: 'query',
            description: "User's local timezone offset in minutes",
            required: false,
            schema: { type: 'integer', default: 0 }
          }
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
                              count: { type: 'number', example: 4 }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': { description: 'Unauthorized access' }
        }
      }
    },
  },
};

export const setupSwagger = (app: Express): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};
