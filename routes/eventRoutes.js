const express = require('express');
const router = express.Router();
const { authenticateUser, isAdmin } = require('../middleware/authMiddleware');
const eventModel = require('../models/eventModel');

// Public routes for viewing events
router.get('/', async (req, res) => {
  try {
    const pastEvents = await eventModel.getPastEvents();
    const upcomingEvents = await eventModel.getUpcomingEvents();
    res.render('events', {
      events: [...upcomingEvents, ...pastEvents],
      pastEvents,
      upcomingEvents,
      isAdmin: req.user && req.user.role === 'admin'
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).send('Error fetching events');
  }
});

// Admin routes - protected by isAdmin middleware
router.get('/admin/events', [authenticateUser, isAdmin], async (req, res) => {
  try {
    const pastEvents = await eventModel.getPastEvents();
    const upcomingEvents = await eventModel.getUpcomingEvents();
    res.render('admin-events', {
      pastEvents,
      upcomingEvents,
      admin: req.user
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).send('Error fetching events');
  }
});

router.get('/admin/events/new', [authenticateUser, isAdmin], (req, res) => {
  res.render('admin-event-new', { admin: req.user });
});

router.post('/admin/events', [authenticateUser, isAdmin], async (req, res) => {
  try {
    const { title, description, event_date, image_type } = req.body;
    
    if (!title || !event_date) {
      return res.status(400).json({ error: 'Title and event date are required' });
    }

    const image_url = image_type ? `${image_type}.jpg` : 'event1.jpg';

    await eventModel.addEvent({
      title,
      description: description || '',
      event_date,
      image_url
    });

    res.redirect('/admin/events');
  } catch (error) {
    console.error('Error creating event:', error);
    res.render('admin-event-new', {
      error: 'Error creating event. Please try again.',
      formData: req.body,
      admin: req.user
    });
  }
});

router.get('/admin/events/:id/edit', [authenticateUser, isAdmin], async (req, res) => {
  try {
    const event = await eventModel.getEventById(req.params.id);
    if (!event) {
      return res.status(404).send('Event not found');
    }
    res.render('admin-event-edit', { event, admin: req.user });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).send('Error loading event');
  }
});

router.post('/admin/events/:id', [authenticateUser, isAdmin], async (req, res) => {
  try {
    const { title, description, event_date, image_type } = req.body;
    const image_url = `${image_type}.jpg`;

    await eventModel.updateEvent(req.params.id, {
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
});

router.post('/admin/events/:id/delete', [authenticateUser, isAdmin], async (req, res) => {
  try {
    await eventModel.deleteEvent(req.params.id);
    res.redirect('/admin/events');
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).send('Error deleting event');
  }
});

module.exports = router;