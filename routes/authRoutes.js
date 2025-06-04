const express = require('express');
const router = express.Router();
const authController = require('../controller/authController'); // Make sure folder is named 'controller', not 'Controller'
const userModel = require('../models/userModel');

// Landing page route
router.get('/landing', (req, res) => {
  res.render('landing');
});

// Signup Routes
router.get('/signup', authController.getSignup);
router.post('/signup', authController.postSignup);

// Email Verification Route
router.get('/verify-email', authController.verifyEmail);

// Login Routes
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);

// Forgot Password Routes
router.get('/forgot-password', authController.getForgotPassword);
router.post('/forgot-password', authController.forgotPassword);

// Reset Password Routes
router.get('/reset-password', authController.getResetPassword);
router.post('/reset-password', authController.resetPassword);

// Home page route with authentication
router.get('/home', (req, res) => {
  if (!req.cookies.jwt) {
    return res.redirect('/login?error=Please login to continue');
  }
  res.render('home', { user: req.session.user });
});

// Logout Route
router.get('/logout', authController.logout);

module.exports = router;
