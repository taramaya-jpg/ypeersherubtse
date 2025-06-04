const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

// Middleware to check user authentication
exports.isUser = (req, res, next) => {
  const token = req.cookies.jwt;
  if (!token) return res.redirect('/login?error=Please login to continue');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'user') {
      return res.redirect('/login?error=Access denied: Users only');
    }
    req.user = decoded;
    next();
  } catch (err) {
    res.clearCookie('jwt');
    return res.redirect('/login?error=Session expired, please login again');
  }
};

// Get user dashboard logic
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get complete user details
    const user = await db.oneOrNone(
      'SELECT id, first_name, last_name, email, phone, year, course, gender, created_at, is_verified FROM users WHERE id = $1',
      [userId]
    );
    if (!user) {
      console.error('User not found:', userId);
      return res.redirect('/login?error=User not found');
    }

    // Get upcoming events
    const upcomingEvents = await db.any(
      'SELECT id, title, description, image_url, event_date, created_at FROM events WHERE event_date >= CURRENT_DATE ORDER BY event_date ASC'
    );

    // Get past events
    const pastEvents = await db.any(
      'SELECT id, title, description, image_url, event_date, created_at FROM events WHERE event_date < CURRENT_DATE ORDER BY event_date DESC'
    );

    // Format dates for display
    const formatEvents = (events) => {
      return events.map(event => ({
        ...event,
        formatted_date: new Date(event.event_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        formatted_time: new Date(event.event_date).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })
      }));
    };

    res.render('userdashboard', { 
      user,
      upcomingEvents: formatEvents(upcomingEvents),
      pastEvents: formatEvents(pastEvents),
      registrationDate: new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).render('login', { error: 'Error loading dashboard. Please try again.' });
  }
};

// Get events page
exports.getEvents = async (req, res) => {
  try {
    // Get upcoming events
    const upcomingEvents = await db.any(
      'SELECT id, title, description, image_url, event_date, created_at FROM events WHERE event_date >= CURRENT_DATE ORDER BY event_date ASC'
    );

    // Get past events
    const pastEvents = await db.any(
      'SELECT id, title, description, image_url, event_date, created_at FROM events WHERE event_date < CURRENT_DATE ORDER BY event_date DESC'
    );

    res.render('user-events', { 
      user: req.user,
      upcomingEvents,
      pastEvents
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).render('error', { error: 'Error loading events. Please try again.' });
  }
};

// Handle user logout
exports.logout = (req, res) => {
  res.clearCookie('jwt');
  if (req.session) {
    req.session.destroy(err => {
      if (err) console.error('Session destruction error:', err);
    });
  }
  res.redirect('/landing');
};
