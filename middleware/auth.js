'use strict';

module.exports = {
  ensureAuthenticated: (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    req.flash('error', 'Please sign in to access this page.');
    return res.redirect('/auth/login');
  },

  ensureAdmin: (req, res, next) => {
    if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
      return next();
    }
    req.flash('error', 'Access denied. Admin privileges required.');
    return res.redirect('/dashboard');
  }
};
