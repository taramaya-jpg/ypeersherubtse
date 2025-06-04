const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController');
const { isAdmin } = require('../middleware/authMiddleware');

router.get('/clear-cookie', (req, res) => {
  res.clearCookie('jwt');
  res.send('Cookie cleared');
});

router.get('/login', adminController.renderLogin);
router.post('/login', adminController.handleLogin);
router.get('/logout', adminController.logout);

//router.get('/', isAdmin, adminController.dashboard);
router.get('/dashboard', isAdmin, adminController.dashboard);
router.get('/members', isAdmin, adminController.getMembers);
router.get('/events', isAdmin, adminController.getEvents);
router.get('/events/new', isAdmin, adminController.renderNewEventForm);
router.post('/events/create', isAdmin, adminController.createEvent);
router.get('/events/edit/:id', isAdmin, adminController.renderEditEventForm);
router.post('/events/:id', isAdmin, adminController.updateEvent);
router.post('/events/:id/delete', isAdmin, adminController.deleteEvent);

// Member approval routes
router.post('/members/update-status', isAdmin, adminController.updateMemberStatus);

module.exports = router;
