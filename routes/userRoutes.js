const express = require('express');
const router = express.Router();

const userController = require('../controller/userController');

// Route for user dashboard - uses isUser middleware and then controller logic
router.get('/userdashboard', userController.isUser, userController.getDashboard);

// Home route - redirects to user dashboard
router.get('/', userController.isUser, (req, res) => {
  res.redirect('/user/userdashboard');
});

// User profile page
router.get('/profile', userController.isUser, (req, res) => {
  res.render('user-profile', { user: req.user });
});

// Events page
router.get('/events', userController.isUser, userController.getEvents);

// Logout route
router.get('/logout', userController.logout);

module.exports = router;
