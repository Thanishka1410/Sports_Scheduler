'use strict';

require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const csrf = require('csurf');

// Initialize Passport config
require('./config/passport')(passport);

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static assets and Body parser
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'sports_scheduler_super_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
  })
);

// Flash messages & Passport middleware
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Enable CSRF protection (disabled in test mode for automated test suites)
if (process.env.NODE_ENV !== 'test') {
  app.use(csrf());
}

// Global variables for templates
app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.csrfToken = process.env.NODE_ENV === 'test' ? '' : req.csrfToken();
  next();
});

// Route Bindings
app.use('/auth', require('./routes/auth'));
app.use('/sports', require('./routes/sports'));
app.use('/sessions', require('./routes/sessions'));
app.use('/reports', require('./routes/reports'));
app.use('/', require('./routes/index'));

// 404 Handler
app.use((req, res) => {
  return res.status(404).render('error', {
    title: '404 - Page Not Found',
    message: 'The requested page or resource could not be found.'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    req.flash('error', 'Form submission expired due to invalid CSRF token. Please try again.');
    return res.redirect('back');
  }
  console.error('Unhandled Server Error:', err);
  return res.status(500).render('error', {
    title: '500 - Server Error',
    message: err.message || 'An unexpected error occurred. Please try again later.'
  });
});

// Start Server when run directly
if (require.main === module) {
  const { sequelize } = require('./models');
  const PORT = process.env.PORT || 3000;
  sequelize.authenticate()
    .then(() => {
      console.log('Database connected successfully.');
      app.listen(PORT, () => {
        console.log(`Sports Scheduler App running at http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to connect to database:', err.message);
      process.exit(1);
    });
}

module.exports = app;
