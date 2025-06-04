const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { getAdminByEmail } = require('../models/adminModel');
const { getAllEvents, getUpcomingEvents, getPastEvents, addEvent, updateEvent, deleteEvent } = require('../models/eventModel');
require('dotenv').config();

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Render admin login page
exports.renderLogin = (req, res) => {
  res.render('adminLogin', { error: null });
};

// Handle admin login
exports.handleLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Get admin user by email
    const admin = await getAdminByEmail(email);

    if (!admin) {
      return res.render('adminLogin', { error: 'Invalid email or password' });
    }

    // Compare submitted password with hashed password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.render('adminLogin', { error: 'Invalid email or password' });
    }

    // Generate JWT token for logged-in admin
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role || 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Set JWT token in httpOnly cookie
    res.cookie('jwt', token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000 // 1 hour
    });

    // Store admin info in session
    req.session.user = {
      id: admin.id,
      role: 'admin',
      email: admin.email
    };

    res.redirect('/admindashboard');
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).send('Server error');
  }
};

// Logout admin
exports.logout = (req, res) => {
  // Clear the JWT cookie
  res.clearCookie('jwt');
  
  // Destroy the session
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        console.error('Error during session destruction:', err);
      }
    });
  }

  // Redirect to landing page
  res.redirect('/landing');
};

// Admin dashboard with statistics
exports.dashboard = async (req, res) => {
  try {
    // Get total members count
    const totalMembers = await db.one('SELECT COUNT(*) FROM users WHERE role = $1', ['user']);
    
    // Get verified members count
    const verifiedMembers = await db.one('SELECT COUNT(*) FROM users WHERE role = $1 AND is_verified = true', ['user']);
    
    // Get total events count
    const totalEvents = await db.one('SELECT COUNT(*) FROM events');
    
    // Get upcoming events count
    const upcomingEvents = await db.one('SELECT COUNT(*) FROM events WHERE event_date >= CURRENT_DATE');
    
    // Get recent activities
    const recentActivities = await db.any(`
      SELECT 
        title,
        activity_date,
        CASE 
          WHEN type = 'event' THEN 'fas fa-calendar-alt'
          WHEN type = 'member' THEN 'fas fa-user-plus'
          ELSE 'fas fa-star'
        END as icon
      FROM (
        SELECT title, event_date as activity_date, 'event' as type FROM events
        UNION ALL
        SELECT CONCAT(first_name, ' ', last_name) as title, created_at as activity_date, 'member' as type FROM users WHERE role = 'user'
      ) combined
      ORDER BY activity_date DESC
      LIMIT 5
    `);

    res.render('admindashboard', { 
      admin: req.user,
      totalMembers: totalMembers.count,
      verifiedMembers: verifiedMembers.count,
      totalEvents: totalEvents.count,
      upcomingEvents: upcomingEvents.count,
      recentActivities: recentActivities.map(activity => ({
        ...activity,
        date: new Date(activity.activity_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }))
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Server error');
  }
};

// Members page showing list of registered users
exports.getMembers = async (req, res) => {
  try {
    // Check if users table exists
    const usersExist = await db.one(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')"
    );

    if (!usersExist.exists) {
      console.error('Users table does not exist');
      return res.status(500).send('Database tables not properly initialized. Please restart the server.');
    }

    // Fetch users with explicit column selection and approval status
    const users = await db.any(`
      SELECT 
        id, 
        first_name,
        last_name,
        email, 
        phone, 
        year, 
        course, 
        gender, 
        role, 
        is_verified, 
        is_approved,
        approval_status,
        created_at,
        CASE 
          WHEN is_approved = true THEN 'Approved'
          WHEN is_approved = false AND approval_status = 'rejected' THEN 'Rejected'
          ELSE 'Pending'
        END as status
      FROM users
      WHERE role = 'user'
      ORDER BY created_at DESC
    `);

    // Format dates and prepare user data
    const formattedUsers = users.map(user => ({
      ...user,
      created_at: new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }));

    res.render('admin-members', { 
      admin: req.user, 
      users: formattedUsers
    });
  } catch (error) {
    console.error('Error in admin dashboard:', error);
    res.status(500).send('Error loading admin dashboard. Details: ' + error.message);
  }
};

// Handle member approval
exports.updateMemberStatus = async (req, res) => {
  try {
    const { userId, action } = req.body;
    
    if (!userId || !action) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Get user details for email notification
    const user = await db.oneOrNone('SELECT email, first_name, last_name FROM users WHERE id = $1', [userId]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user approval status
    await db.none(`
      UPDATE users 
      SET 
        is_verified = $1,
        is_approved = $1,
        approval_status = $2,
        approval_date = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [action === 'approve', action, userId]);

    // Prepare email content
    const emailSubject = action === 'approve' ? 'Y-PEER Membership Approved!' : 'Y-PEER Membership Application Status';
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: emailSubject,
      html: `
        <h1>Membership ${action === 'approve' ? 'Approved' : 'Rejected'}</h1>
        <p>Dear ${user.first_name} ${user.last_name},</p>
        <p>Your Y-PEER membership has been ${action === 'approve' ? 'approved' : 'rejected'}.</p>
        ${action === 'approve' ? '<p>You can now log in and access all member features.</p>' : ''}
      `
    };

    await transporter.sendMail(mailOptions);

    return res.json({
      success: true,
      message: `Member successfully ${action}d`,
      status: action === 'approve' ? 'Approved' : 'Rejected'
    });
  } catch (error) {
    console.error('Error updating member status:', error);
    res.status(500).json({ error: 'Failed to update member status' });
  }
};


// Get all events for admin view
exports.getEvents = async (req, res) => {
  try {
    const upcomingEvents = await getUpcomingEvents();
    const pastEvents = await getPastEvents();

    res.render('admin-events', {
      upcomingEvents,
      pastEvents,
      admin: req.user
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).send('Error loading events');
  }
};

// Render new event form
exports.renderNewEventForm = (req, res) => {
  res.render('admin-event-new', {
    admin: req.user
  });
};

// Create new event
exports.createEvent = async (req, res) => {
  const { title, event_date, description, image_type } = req.body;

  if (!title || !event_date) {
    const formData = { title, description, image_type, event_date };
    return res.render('admin-event-new', {
      error: 'Title and Event Date are required fields',
      formData,
      admin: req.user
    });
  }

  try {
    const eventData = {
      title,
      description,
      event_date,
      image_url: image_type ? `${image_type}.jpg` : null
    };

    await addEvent(eventData);
    res.redirect('/admin/events');
  } catch (error) {
    console.error('Error creating event:', error);
    res.render('admin-event-new', {
      error: 'Server error while creating the event',
      formData: req.body,
      admin: req.user
    });
  }
};


// Render edit event form
exports.renderEditEventForm = async (req, res) => {
  try {
    const event = await db.one('SELECT * FROM events WHERE id = $1', [req.params.id]);
    res.render('admin-event-edit', {
      event,
      admin: req.user
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).send('Error loading event');
  }
};

// Update event
exports.updateEvent = async (req, res) => {
  try {
    const { title, description, event_date, image_type } = req.body;
    const image_url = `${image_type}.jpg`;

    await updateEvent(req.params.id, {
      title,
      description,
      event_date,
      image_url
    });

    res.redirect('/admin/events');
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).send('Error updating event');
  }
};

// Delete event
exports.deleteEvent = async (req, res) => {
  try {
    await deleteEvent(req.params.id);
    res.redirect('/admin/events');
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).send('Error deleting event');
  }
};
