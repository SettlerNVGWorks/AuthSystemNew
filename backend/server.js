const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { initDatabase } = require('./database_mongo');
const authRoutes = require('./routes/auth_mongo');
const apiRoutes = require('./routes/api_mongo');
const telegramRoutes = require('./routes/telegram_webhook');
const Scheduler = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 8001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.set('trust proxy', 1); // Trust first proxy
app.use(helmet());
app.use(limiter);
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://582a75d7-0115-41c7-8b28-4bbdb8b838e0.preview.emergentagent.com'
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Sport Predictions API - Node.js',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// API routes (with /api prefix for consistency)
app.use('/api', apiRoutes);

// Telegram webhook routes
app.use('/api/telegram', telegramRoutes);

// Initialize scheduler
let scheduler;

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initDatabase();
    
    // Initialize scheduler for daily match updates
    scheduler = new Scheduler();
    console.log('⏰ Scheduler инициализирован для ежедневного обновления матчей');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔧 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`📅 Матчи обновляются каждый день в 12:00 МСК`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;