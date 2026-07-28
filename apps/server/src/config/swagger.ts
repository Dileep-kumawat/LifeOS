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
  },
};

export const setupSwagger = (app: Express): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};
