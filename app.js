// app.js
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./config/db');
const { createDefaultAdminUser } = require('./models/adminModel');
const { createEventTable } = require('./models/eventModel');
const { createUsersTable } = require('./models/userModel');

require('dotenv').config();

const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database
    await db.initializeDatabase();

    // Initialize tables and admin user
    await createUsersTable();
    await createDefaultAdminUser();
    await createEventTable();
    console.log('✅ Database initialization complete');

    // Routes setup
    const authRoutes = require('./routes/authRoutes');
    const adminRoutes = require('./routes/adminRoutes');
    const userRoutes = require('./routes/userRoutes');
    const eventRoutes = require('./routes/eventRoutes');

    app.use('/', authRoutes);
    app.use('/verify-email', authRoutes);
    app.use('/admin', adminRoutes);
    app.use('/user', userRoutes);
    app.use('/events', eventRoutes);
    app.use('/home', userRoutes);

    // Redirect root to landing
    app.get('/', (req, res) => {
      res.redirect('/landing');
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error('Server error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });

    // Start the server
    const PORT = process.env.PORT || 3002;
    const tryPort = (port) => {
      const server = app.listen(port, () => {
        console.log(`🚀 Server running at: http://localhost:${port}`);
      }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`❌ Port ${port} is already in use. Trying port ${port + 1}...`);
          server.close();
          tryPort(port + 1);
        } else {
          console.error('❌ Failed to start server:', err);
          process.exit(1);
        }
      });
    };

    tryPort(PORT);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
startServer();
