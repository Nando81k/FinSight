import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createLogger } from './utils/logger';
import { errorHandler } from './middleware/error-handler';
import authRouter from './routes/auth';
import { salaryRouter } from './routes/salary';
import { budgetRouter } from './routes/budget';
import { taxRouter } from './routes/tax';

// Load environment variables
dotenv.config();

const app = express();
const logger = createLogger('server');
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(compression());

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/salary', salaryRouter);
app.use('/api/budget', budgetRouter);
app.use('/api/tax', taxRouter);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 FinSight API Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { app };