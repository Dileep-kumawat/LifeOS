import { DashboardService } from '../dashboard.service.js';
import { dashboardRepository } from '../dashboard.repository.js';

// Mock the dashboard repository
jest.mock('../dashboard.repository.js', () => ({
  dashboardRepository: {
    getTodaySummaryData: jest.fn(),
    getStatisticsData: jest.fn(),
  },
}));

describe('DashboardService', () => {
  let dashboardService: DashboardService;

  beforeEach(() => {
    dashboardService = new DashboardService();
    jest.clearAllMocks();
  });

  describe('getTodaySummary', () => {
    it('should generate "Good morning" greeting when local hour is in the morning', async () => {
      // Mock repository data
      const mockSummaryData = {
        currentStreak: 4,
        tasksDueToday: 2,
        tasksCompletedToday: 1,
        habitsRemaining: 1,
        habitsCompletedToday: 2,
        totalHabitsCount: 3,
        eventsCountToday: 2,
        unreadNotifications: 5,
      };
      (dashboardRepository.getTodaySummaryData as jest.Mock).mockResolvedValue(mockSummaryData);

      // Force hour to 8 AM local time (offset = 0)
      const mockTime = new Date('2026-07-29T08:00:00.000Z');
      jest.useFakeTimers().setSystemTime(mockTime);

      const result = await dashboardService.getTodaySummary('mock-user-id', 0);

      expect(result.greeting).toBe('Good morning');
      expect(result.currentStreak).toBe(4);
      expect(result.tasksDueToday).toBe(2);
      expect(result.overallProductivityProgress).toBe(50); // (1 task completed + 2 habits completed) / (2 due + 1 completed + 3 habits) = 3 / 6 = 50%
      
      jest.useRealTimers();
    });

    it('should generate "Good afternoon" greeting when local hour is in the afternoon', async () => {
      const mockSummaryData = {
        currentStreak: 2,
        tasksDueToday: 0,
        tasksCompletedToday: 0,
        habitsRemaining: 0,
        habitsCompletedToday: 0,
        totalHabitsCount: 0,
        eventsCountToday: 0,
        unreadNotifications: 0,
      };
      (dashboardRepository.getTodaySummaryData as jest.Mock).mockResolvedValue(mockSummaryData);

      // Force hour to 14:00 (2 PM) local time
      const mockTime = new Date('2026-07-29T14:00:00.000Z');
      jest.useFakeTimers().setSystemTime(mockTime);

      const result = await dashboardService.getTodaySummary('mock-user-id', 0);

      expect(result.greeting).toBe('Good afternoon');
      expect(result.overallProductivityProgress).toBe(0);

      jest.useRealTimers();
    });

    it('should generate "Good evening" greeting when local hour is in the evening', async () => {
      const mockSummaryData = {
        currentStreak: 2,
        tasksDueToday: 0,
        tasksCompletedToday: 0,
        habitsRemaining: 0,
        habitsCompletedToday: 0,
        totalHabitsCount: 0,
        eventsCountToday: 0,
        unreadNotifications: 0,
      };
      (dashboardRepository.getTodaySummaryData as jest.Mock).mockResolvedValue(mockSummaryData);

      // Force hour to 20:00 (8 PM) local time
      const mockTime = new Date('2026-07-29T20:00:00.000Z');
      jest.useFakeTimers().setSystemTime(mockTime);

      const result = await dashboardService.getTodaySummary('mock-user-id', 0);

      expect(result.greeting).toBe('Good evening');

      jest.useRealTimers();
    });
  });
});
