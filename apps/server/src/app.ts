import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import passport from 'passport';
import { env } from './config/env.js';
import { configurePassport } from './config/passport.js';
import { requestLogger } from './middlewares/logger.middleware.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';
import { setupSwagger } from './config/swagger.js';
import healthRoutes from './features/health/health.routes.js';
import authRoutes from './features/auth/auth.routes.js';
import dashboardRoutes from './features/dashboard/dashboard.routes.js';
import taskRoutes from './features/tasks/index.js';
import { AppError } from './core/errors/AppError.js';

export const createApp = (): Express => {
  const app: Express = express();

  // Security Middlewares
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-refresh-token'],
    }),
  );

  // Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      statusCode: 429,
      message: 'Too many requests from this IP, please try again after 15 minutes',
    },
  });
  app.use(limiter);

  // Parsers & Loggers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(requestLogger);

  // Passport & OAuth Handshake Sessions
  app.use(
    session({
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: { secure: env.NODE_ENV === 'production' },
    }),
  );
  configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());

  // OpenAPI Swagger Documentation
  setupSwagger(app);

  // API Routes
  app.use('/api/v1', healthRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/tasks', taskRoutes);

  // 404 Route Handler
  app.use('*', (_req: Request, _res: Response, next) => {
    next(AppError.notFound('Requested API endpoint does not exist'));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
