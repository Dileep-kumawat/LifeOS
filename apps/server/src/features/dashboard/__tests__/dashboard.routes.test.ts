import request from 'supertest';
import express from 'express';
import dashboardRoutes from '../dashboard.routes.js';
import { dashboardService } from '../dashboard.service.js';

// Mock dashboard service
jest.mock('../dashboard.service.js', () => ({
  dashboardService: {
    getTodaySummary: jest.fn(),
    getStatistics: jest.fn(),
    getTasks: jest.fn(),
  },
}));

// Mock authentication middleware
jest.mock('../../../middlewares/auth.middleware.js', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { _id: 'mock-user-id' };
    next();
  },
}));

const app = express();
app.use(express.json());
app.use('/api/v1/dashboard', dashboardRoutes);

describe('Dashboard Routes Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/dashboard/summary', () => {
    it('should return 200 with today summary data', async () => {
      const mockSummary = {
        date: '2026-07-29T22:30:00.000Z',
        greeting: 'Good evening',
        currentStreak: 5,
        tasksDueToday: 3,
        tasksCompletedToday: 2,
        habitsRemaining: 1,
        habitsCompletedToday: 2,
        totalHabitsCount: 3,
        eventsCountToday: 1,
        unreadNotifications: 4,
        overallProductivityProgress: 67,
      };

      (dashboardService.getTodaySummary as jest.Mock).mockResolvedValue(mockSummary);

      const response = await request(app)
        .get('/api/v1/dashboard/summary')
        .query({ timezoneOffset: 330 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSummary);
      expect(dashboardService.getTodaySummary).toHaveBeenCalledWith('mock-user-id', 330);
    });
  });

  describe('GET /api/v1/dashboard/tasks', () => {
    it('should validate query parameters and return 200 with tasks data', async () => {
      const mockTasksResponse = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      (dashboardService.getTasks as jest.Mock).mockResolvedValue(mockTasksResponse);

      const response = await request(app)
        .get('/api/v1/dashboard/tasks')
        .query({ page: 1, limit: 10, priority: 'high', status: 'todo' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(dashboardService.getTasks).toHaveBeenCalledWith(
        'mock-user-id',
        { status: 'todo', priority: 'high' },
        1,
        10
      );
    });

    it('should return 400 when invalid query parameters are supplied', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/tasks')
        .query({ priority: 'invalid-priority' }); // fails Zod enum check

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
