import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import path from 'path';
import 'express-async-errors';
import dotenv from 'dotenv';

// Import database initialization
import { initializeDatabase } from './database/db';

// Import routes
import transactionRoutes from './routes/transactionRoutes';
import categoryRoutes from './routes/categoryRoutes';
import analysisRoutes from './routes/analysisRoutes';

// Load environment variables from .env file
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5001;
console.log(`Server configured to use port ${PORT} (from environment variable: ${process.env.PORT})`);

// Middleware setup
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/analysis', analysisRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    error: message
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Finance Tracker API is running',
    timestamp: new Date().toISOString()
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize SQLite database
    await initializeDatabase();
    
    // Start express server
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check at http://localhost:${PORT}/health`);
      console.log(`API endpoints available at http://localhost:${PORT}/api`);
    });
    
    // Handle graceful shutdown
    setupGracefulShutdown(server);
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Setup graceful shutdown to ensure database operations are completed
function setupGracefulShutdown(server: any) {
  // Import closeDatabase from db.ts
  const { closeDatabase } = require('./database/db');
  
  async function shutdown(signal: string) {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    // First close the HTTP server (stop accepting new connections)
    server.close(() => {
      console.log('HTTP server closed.');
      
      // Then close the database connection
      closeDatabase()
        .then(() => {
          console.log('Database connection properly closed.');
          console.log('Graceful shutdown completed.');
          process.exit(0);
        })
        .catch((err: Error) => {
          console.error('Error during database shutdown:', err);
          process.exit(1);
        });
    });
    
    // Force close after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error('Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  }
  
  // Listen for termination signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Run the server
startServer();
