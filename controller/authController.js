const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const db = require('../config/db');
const { getAdminByEmail } = require('../models/adminModel');
const { getUserByEmail, registerUser } = require('../models/userModel');
require('dotenv').config();

const saltRounds = 10;

// Nodemailer Transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Render login page
exports.getLogin = (req, res) => {
  res.render('login', {
    message: req.query.message || null,
    error: req.query.error || null
  });
};

// Handle login
exports.postLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // First check if it's an admin
    const admin = await getAdminByEmail(email);
    if (admin && (await bcrypt.compare(password, admin.password))) {
      const token = jwt.sign(
        { userId: admin.id, role: 'admin', email: admin.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600000,
      });

      return res.redirect('/admin/dashboard');
    }

    const user = await getUserByEmail(email);
    if (!user || !user.is_verified || !(await bcrypt.compare(password, user.password))) {
      return res.render('login', { error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        year: user.year,
        course: user.course,
        gender: user.gender,
        registration_date: user.registration_date,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000,
    });

    req.session.user = {
      id: user.id,
      role: user.role,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      year: user.year,
      course: user.course,
      gender: user.gender,
      registration_date: user.registration_date,
    };

    res.redirect('/home');
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { error: 'An error occurred during login' });
  }
};

// Logout
exports.logout = (req, res) => {
  res.clearCookie('jwt');
  if (req.session) {
    req.session.destroy(err => {
      if (err) console.error('Session destruction error:', err);
    });
  }
  res.redirect('/landing');
};

// Render signup page
exports.getSignup = (req, res) => {
  res.render('signup', { message: null });
};

// Handle signup
exports.postSignup = async (req, res) => {
  const { first_name, last_name, email, phone, year, course, gender, password } = req.body;

  try {
    const existingUser = await db.oneOrNone('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser) {
      return res.render('signup', { message: 'Email already registered!' });
    }

    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const newUser = await registerUser(first_name, last_name, email, phone, year, course, gender, password);
    await db.none('UPDATE users SET verification_token = $1 WHERE email = $2', [verificationToken, email]);

    const verificationLink = `${process.env.BASE_URL}/verify-email?token=${verificationToken}`;
    console.log('Verification link:', verificationLink); // For debugging

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email',
      html: await ejs.renderFile(path.join(__dirname, '../views/emailverification.ejs'), { verificationLink })
    };

    await transporter.sendMail(mailOptions);
    res.redirect('/login?message=Signup successful! Please check your email to verify your account.');
  } catch (error) {
    console.error('Signup error:', error);
    res.render('signup', { message: 'Error during signup. Please try again.' });
  }
};

// Email verification
exports.verifyEmail = async (req, res) => {
  const { token } = req.query;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    const user = await db.oneOrNone('SELECT * FROM users WHERE email = $1 AND verification_token = $2', [email, token]);
    
    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    await db.none('UPDATE users SET is_verified = true, verification_token = null WHERE email = $1', [email]);
    res.render('emailverification-success');
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(400).render('emailverification-failed', {
      loginUrl: `${process.env.BASE_URL}/login`
    });
  }
};

// Render forgot password page
exports.getForgotPassword = (req, res) => {
  res.render('forgot-password', { message: null });
};

// Handle forgot password
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await getUserByEmail(email);

    if (!user) {
      return res.render('forgot-password', {
        message: 'If an account exists with this email, a password reset link will be sent.'
      });
    }

    const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    await db.none(
      'UPDATE users SET reset_token = $1, reset_token_expires = NOW() + INTERVAL \'1 hour\' WHERE email = $2',
      [resetToken, email]
    );

    const resetLink = `${process.env.BASE_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset</h1>
        <p>Click below to reset your password:</p>
        <a href="${resetLink}" style="padding: 10px 20px; background-color: #4CAF50; color: white; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    res.render('forgot-password', { message: 'Password reset link has been sent to your email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.render('forgot-password', { message: 'Something went wrong. Please try again.' });
  }
};

// Render reset password page
exports.getResetPassword = (req, res) => {
  const { token } = req.query;
  res.render('reset-password', { message: null, token });
};

// Handle password reset
exports.resetPassword = async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  if (!token) {
    return res.render('reset-password', { message: 'Reset token is missing', token: '' });
  }

  const user = await db.oneOrNone('SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()', [token]);

  if (!user) {
    return res.render('reset-password', { message: 'Token is invalid or expired', token: '' });
  }

  if (password !== confirmPassword) {
    return res.render('reset-password', { message: 'Passwords do not match', token });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.render('reset-password', {
      message: 'Password must be at least 8 characters and contain uppercase, lowercase, and numbers',
      token
    });
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);

  await db.none(
    'UPDATE users SET password = $1, reset_token = null, reset_token_expires = null WHERE id = $2',
    [hashedPassword, user.id]
  );

  res.redirect('/login?message=Password successfully reset. You can now log in.');
};
