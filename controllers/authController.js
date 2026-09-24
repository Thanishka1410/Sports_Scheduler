'use strict';

const bcrypt = require('bcrypt');
const passport = require('passport');
const { User } = require('../models');

module.exports = {
  getSignup: (req, res) => {
    if (req.isAuthenticated()) {
      return res.redirect('/dashboard');
    }
    return res.render('signup', { title: 'Sign Up - Sports Scheduler' });
  },

  postSignup: async (req, res, next) => {
    try {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password) {
        req.flash('error', 'Name, email, and password are required fields.');
        return res.redirect('/auth/signup');
      }

      if (password.length < 6) {
        req.flash('error', 'Password must be at least 6 characters long.');
        return res.redirect('/auth/signup');
      }

      const existingUser = await User.findOne({ where: { email: email.toLowerCase().trim() } });
      if (existingUser) {
        req.flash('error', 'An account with this email address already exists.');
        return res.redirect('/auth/signup');
      }

      const userRole = role === 'admin' ? 'admin' : 'player';
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: userRole
      });

      req.login(user, (err) => {
        if (err) return next(err);
        req.flash('success', `Welcome to Sports Scheduler, ${user.name}!`);
        return res.redirect('/dashboard');
      });
    } catch (err) {
      console.error('Signup error:', err);
      req.flash('error', 'Failed to register account. Please try again.');
      return res.redirect('/auth/signup');
    }
  },

  getLogin: (req, res) => {
    if (req.isAuthenticated()) {
      return res.redirect('/dashboard');
    }
    return res.render('login', { title: 'Sign In - Sports Scheduler' });
  },

  postLogin: (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        req.flash('error', info && info.message ? info.message : 'Invalid credentials.');
        return res.redirect('/auth/login');
      }
      req.login(user, (err) => {
        if (err) return next(err);
        req.flash('success', `Welcome back, ${user.name}!`);
        const redirectTo = req.session.returnTo || '/dashboard';
        delete req.session.returnTo;
        return res.redirect(redirectTo);
      });
    })(req, res, next);
  },

  logout: (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.flash('success', 'You have been signed out successfully.');
      return res.redirect('/auth/login');
    });
  }
};
