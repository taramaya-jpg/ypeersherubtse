const jwt = require('jsonwebtoken');

function authenticateUser(req, res, next) {
  // Check for session first
  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  }

  // If no session, check JWT
  const token = req.cookies.jwt;
  if (!token) {
    return res.redirect('/login?message=Please login first');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    // Store user info in session for future requests
    req.session.user = decoded;
    
    next();
  } catch (err) {
    console.log('Authentication error:', err.message);
    res.clearCookie('jwt');
    return res.redirect('/login?message=Session expired. Please login again.');
  }
}

function isAdmin(req, res, next) {
  // Check session first
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    req.user = req.session.user;
    return next();
  }

  // If no session, check JWT
  const token = req.cookies.jwt;
  if (!token) {
    return res.redirect('/login?message=Please login first');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.redirect('/login?message=Admin access required');
    }
    
    req.user = decoded;
    // Store admin info in session
    req.session.user = decoded;
    
    next();
  } catch (err) {
    console.error('Admin authentication error:', err.message);
    res.clearCookie('jwt');
    return res.redirect('/login?message=Session expired');
  }
}

module.exports = {
  authenticateUser,
  isAdmin
};
